const crypto = require('crypto');
const {
  Lesson,
  LessonProgress,
  CourseProgress,
  Assignment,
  Submission,
  Assessment,
  AssessmentAttempt,
  ClassSection,
  ClassMembership,
  CourseOffering,
  Course,
  Certificate,
  User
} = require('../models');
const { calculateClassGradebook } = require('./gradebook.service');
const { createNotification } = require('../utils/notifyUser');

/**
 * Recomputes a student's overall CourseProgress for a specific class section.
 * Enforces NetAcad-style automatic course completion:
 * - Lessons are automatically tracked as completed as the student progresses.
 * - Completing the course requires BOTH completing all published lessons AND passing the course quizzes
 *   that verify what the student learned in the course.
 * - Automatically marks the enrollment as completed and issues a completion certificate when met.
 */
async function recalculateStudentCourseProgress(classId, studentId, lastLessonId = null) {
  const classSection = await ClassSection.findByPk(classId, {
    include: [
      {
        model: CourseOffering,
        as: 'courseOffering',
        include: [{ model: Course, as: 'course' }]
      }
    ]
  });

  if (!classSection || !classSection.courseOffering) return null;
  const courseId = classSection.courseOffering.courseId;
  const passingScore = Number(classSection.courseOffering.passingScore || 75);

  const [
    totalLessonsCount,
    completedLessonsCount,
    totalAssignmentsCount,
    completedAssignmentsCount,
    publishedAssessments,
    studentAttempts
  ] = await Promise.all([
    Lesson.count({ where: { courseId, publicationStatus: 'published' } }),
    LessonProgress.count({ where: { classId, studentId, status: 'completed' } }),
    Assignment.count({ where: { classId, publicationStatus: 'published' } }),
    Submission.count({ where: { classId, studentId, status: ['submitted', 'late', 'under_review', 'graded'] } }),
    Assessment.findAll({ where: { classId, publicationStatus: ['published', 'closed'] } }),
    AssessmentAttempt.findAll({
      where: { classId, studentId, status: ['submitted', 'graded'] }
    })
  ]);

  const totalAssessmentsCount = publishedAssessments.length;
  const completedAssessmentIds = new Set(studentAttempts.map((a) => a.assessmentId));
  const completedAssessmentsCount = completedAssessmentIds.size;

  // Identify course completion / checkpoint quizzes (or all assessments if none are typed as quiz)
  const checkpointQuizzes = publishedAssessments.filter((a) =>
    ['quiz', 'module_exam'].includes(a.assessmentType)
  );
  const requiredQuizzes = checkpointQuizzes.length > 0 ? checkpointQuizzes : publishedAssessments;

  // Check how many required quizzes the student has completed and passed
  let passedQuizzesCount = 0;
  let quizScoreSum = 0;
  for (const quiz of requiredQuizzes) {
    const attemptsForQuiz = studentAttempts.filter((a) => a.assessmentId === quiz.id);
    if (attemptsForQuiz.length > 0) {
      const bestAttemptScore = Math.max(...attemptsForQuiz.map((a) => Number(a.totalScore || 0)));
      const quizPassMark = Number(quiz.passingScore || passingScore || 75);
      if (bestAttemptScore >= quizPassMark) {
        passedQuizzesCount += 1;
      }
      quizScoreSum += bestAttemptScore;
    }
  }

  const allLessonsDone = totalLessonsCount > 0 && completedLessonsCount >= totalLessonsCount;
  // NetAcad rule: There MUST be at least one course quiz and all required course quizzes must be passed
  const allRequiredQuizzesPassed =
    requiredQuizzes.length > 0 && passedQuizzesCount >= requiredQuizzes.length;

  const isCompleted = allLessonsDone && allRequiredQuizzesPassed;

  // Calculate progress percentage across lessons and required quizzes (capped at 95% until quiz is passed)
  const coreTotalItems = totalLessonsCount + requiredQuizzes.length;
  const coreCompletedItems =
    Math.min(totalLessonsCount, completedLessonsCount) +
    Math.min(requiredQuizzes.length, passedQuizzesCount);

  let progressPercentage = 0;
  if (isCompleted) {
    progressPercentage = 100;
  } else if (coreTotalItems > 0) {
    progressPercentage = Math.min(
      95,
      Number(((coreCompletedItems / coreTotalItems) * 100).toFixed(2))
    );
  }

  // Check gradebook standing (or fallback to average quiz score if gradebook has no other graded items yet)
  const gb = await calculateClassGradebook(classId, { studentIdFilter: studentId });
  const avgQuizScore = requiredQuizzes.length > 0 ? Number((quizScoreSum / requiredQuizzes.length).toFixed(2)) : 0;
  const studentStanding = gb.students[0]?.standingPercentage ?? avgQuizScore;

  const effectiveScore = Math.max(Number(studentStanding || 0), avgQuizScore, isCompleted ? passingScore : 0);
  const certificateEligible = isCompleted && effectiveScore >= passingScore;

  const [record] = await CourseProgress.findOrCreate({
    where: { classId, studentId },
    defaults: {
      classId,
      courseId,
      studentId,
      completedLessonsCount,
      totalLessonsCount,
      completedAssignmentsCount,
      totalAssignmentsCount,
      completedAssessmentsCount,
      totalAssessmentsCount,
      progressPercentage,
      lastLessonId,
      lastAccessedAt: new Date(),
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      certificateEligible
    }
  });

  await record.update({
    courseId,
    completedLessonsCount,
    totalLessonsCount,
    completedAssignmentsCount,
    totalAssignmentsCount,
    completedAssessmentsCount,
    totalAssessmentsCount,
    progressPercentage,
    lastLessonId: lastLessonId || record.lastLessonId,
    lastAccessedAt: new Date(),
    isCompleted,
    completedAt: isCompleted && !record.completedAt ? new Date() : record.completedAt,
    certificateEligible
  });

  // Automatically mark the student's ClassMembership as completed when course is completed
  if (isCompleted) {
    await ClassMembership.update(
      { status: 'completed' },
      { where: { classId, studentId, status: 'enrolled' } }
    );
  }

  // Auto-issue certificate if eligible and not yet issued
  if (certificateEligible && classSection.courseOffering.certificateEnabled !== false) {
    const existingCert = await Certificate.findOne({ where: { classId, studentId } });
    if (!existingCert) {
      const student = await User.findByPk(studentId);
      const course = classSection.courseOffering.course;
      const certCode = `AIT-CERT-${new Date().getFullYear()}-${classId}${studentId}${Math.floor(100 + Math.random() * 900)}`;
      const verifyHash = crypto.createHash('sha256').update(`${certCode}:${student?.email}:${courseId}`).digest('hex');

      await Certificate.create({
        certificateCode: certCode,
        verificationHash: verifyHash,
        studentId,
        courseId,
        classId,
        recipientName: student ? `${student.firstName} ${student.lastName}` : `Student #${studentId}`,
        courseTitle: course?.title || 'Course Completion',
        courseCode: course?.code || 'COURSE',
        finalScore: effectiveScore,
        issuedAt: new Date(),
        status: 'active'
      });

      await createNotification({
        userId: studentId,
        type: 'certificate',
        title: `Course Completed & Certificate Earned: ${course?.title}`,
        message: `Congratulations! You passed the course quizzes and completed all lessons. Certificate ${certCode} has been automatically issued.`,
        destinationUrl: '/student/certificates'
      });
    }
  }

  return record;
}

module.exports = {
  recalculateStudentCourseProgress
};
