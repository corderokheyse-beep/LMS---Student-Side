const path = require('path');
const fs = require('fs');
const {
  sequelize,
  Assignment,
  AssignmentAttachment,
  GradingRubric,
  RubricCriterion,
  Submission,
  SubmissionVersion,
  QuestionBank,
  Question,
  QuestionOption,
  Assessment,
  AssessmentQuestion,
  AssessmentAttempt,
  AssessmentAnswer,
  ClassMembership,
  InstructorAssignment,
  TeachingAssistantAssignment,
  User
} = require('../models');
const env = require('../config/env');
const { AppError } = require('../middleware/error.middleware');
const { verifyClassAccess } = require('../middleware/auth.middleware');
const { verifyUploadedFileSafety } = require('../middleware/upload.middleware');
const { upsertGradeWithHistory } = require('../services/gradebook.service');
const { recalculateStudentCourseProgress } = require('../services/progress.service');
const { createNotification } = require('../utils/notifyUser');
const { recordAudit } = require('../utils/auditLogger');
const { assignmentSchema, questionSchema, assessmentSchema } = require('../validators/schemas');

// ============================================================================
// ASSIGNMENTS & SUBMISSIONS
// ============================================================================

async function listAssignments(req, res, next) {
  try {
    const { classId, courseId } = req.query;
    const where = {};
    if (classId) where.classId = Number(classId);
    if (courseId) where.courseId = Number(courseId);

    if (req.user.primaryRole === 'student') {
      where.publicationStatus = 'published';
      if (!classId) {
        const memberships = await ClassMembership.findAll({
          where: { studentId: req.user.id, status: ['enrolled', 'completed'] }
        });
        where.classId = memberships.map((m) => m.classId);
      }
    } else if (req.user.primaryRole === 'instructor' && !classId) {
      const assigned = await InstructorAssignment.findAll({ where: { instructorId: req.user.id } });
      where.classId = assigned.map((a) => a.classId);
    } else if (req.user.primaryRole === 'teaching_assistant' && !classId) {
      const assigned = await TeachingAssistantAssignment.findAll({ where: { taUserId: req.user.id } });
      where.classId = assigned.map((a) => a.classId);
    }

    const assignments = await Assignment.findAll({
      where,
      include: [
        {
          model: GradingRubric,
          as: 'rubric',
          include: [{ model: RubricCriterion, as: 'criteria' }]
        },
        { model: AssignmentAttachment, as: 'attachments' },
        {
          model: Submission,
          as: 'submissions',
          ...(req.user.primaryRole === 'student' ? { where: { studentId: req.user.id }, required: false } : {})
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    return res.status(200).json({ success: true, data: { assignments } });
  } catch (err) {
    return next(err);
  }
}

async function getAssignmentById(req, res, next) {
  try {
    const assignment = await Assignment.findByPk(req.params.id, {
      include: [
        {
          model: GradingRubric,
          as: 'rubric',
          include: [{ model: RubricCriterion, as: 'criteria' }]
        },
        { model: AssignmentAttachment, as: 'attachments' }
      ]
    });

    if (!assignment) throw new AppError('Assignment not found.', 404);
    await verifyClassAccess(req.user, assignment.classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
      allowStudent: true
    });

    const submissionWhere = { assignmentId: assignment.id };
    if (req.user.primaryRole === 'student') {
      submissionWhere.studentId = req.user.id;
    }

    const submissions = await Submission.findAll({
      where: submissionWhere,
      include: [
        { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] },
        { model: SubmissionVersion, as: 'versions' }
      ],
      order: [['submittedAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: { assignment, submissions }
    });
  } catch (err) {
    return next(err);
  }
}

async function createAssignment(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const payload = assignmentSchema.parse(req.body);
    await verifyClassAccess(req.user, payload.classId, { allowAdmin: true, allowInstructor: true });

    const assignment = await Assignment.create({
      ...payload,
      createdBy: req.user.id
    }, { transaction: t });

    if (Array.isArray(payload.rubricCriteria) && payload.rubricCriteria.length > 0) {
      const totalPts = payload.rubricCriteria.reduce((acc, c) => acc + Number(c.maxPoints || 0), 0);
      const rubric = await GradingRubric.create({
        assignmentId: assignment.id,
        title: `${assignment.title} Rubric`,
        totalPoints: totalPts
      }, { transaction: t });

      for (let i = 0; i < payload.rubricCriteria.length; i += 1) {
        const c = payload.rubricCriteria[i];
        await RubricCriterion.create({
          rubricId: rubric.id,
          criterionName: c.criterionName,
          description: c.description || null,
          maxPoints: c.maxPoints,
          orderIndex: i + 1
        }, { transaction: t });
      }
    }

    await t.commit();

    // Notify enrolled students
    const members = await ClassMembership.findAll({ where: { classId: assignment.classId, status: 'enrolled' } });
    for (const m of members) {
      await createNotification({
        userId: m.studentId,
        type: 'assignment',
        title: `New Assignment: ${assignment.title}`,
        message: `Due on ${new Date(assignment.dueDate).toLocaleDateString()}.`,
        destinationUrl: '/student/assignments'
      });
    }

    await recordAudit({
      req,
      action: 'ASSIGNMENT_CREATED',
      category: 'assessment',
      entityType: 'Assignment',
      entityId: assignment.id,
      metadata: { classId: assignment.classId, title: assignment.title }
    });

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully.',
      data: { assignment }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function listSubmissions(req, res, next) {
  try {
    const { classId, assignmentId, status } = req.query;
    const where = {};
    if (classId) where.classId = Number(classId);
    if (assignmentId) where.assignmentId = Number(assignmentId);
    if (status) where.status = status;

    if (req.user.primaryRole === 'student') {
      where.studentId = req.user.id;
    } else if (req.user.primaryRole === 'instructor' && !classId) {
      const assigned = await InstructorAssignment.findAll({ where: { instructorId: req.user.id } });
      where.classId = assigned.map((a) => a.classId);
    } else if (req.user.primaryRole === 'teaching_assistant' && !classId) {
      const assigned = await TeachingAssistantAssignment.findAll({ where: { taUserId: req.user.id } });
      where.classId = assigned.map((a) => a.classId);
    }

    const submissions = await Submission.findAll({
      where,
      include: [
        { model: Assignment, as: 'assignment' },
        { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] },
        { model: SubmissionVersion, as: 'versions' }
      ],
      order: [['updatedAt', 'DESC']]
    });

    return res.status(200).json({ success: true, data: { submissions } });
  } catch (err) {
    return next(err);
  }
}

async function submitAssignmentWork(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const assignmentId = Number(req.params.assignmentId || req.body.assignmentId);
    const {
      textResponse,
      codeSubmission,
      repositoryUrl,
      isDraft = false
    } = req.body;

    const assignment = await Assignment.findByPk(assignmentId, { transaction: t });
    if (!assignment) throw new AppError('Assignment not found.', 404);

    await verifyClassAccess(req.user, assignment.classId, { allowStudent: true });

    const now = new Date();
    const isPastDue = now > new Date(assignment.dueDate);
    if (!isDraft && isPastDue && !assignment.allowLateSubmissions) {
      throw new AppError('The submission deadline has passed and late submissions are not permitted for this assignment.', 400, 'DEADLINE_PASSED');
    }

    if (assignment.cutoffDate && now > new Date(assignment.cutoffDate)) {
      throw new AppError('The final cutoff window for this assignment has closed.', 400, 'CUTOFF_PASSED');
    }

    let fileFields = {};
    if (req.file) {
      const fullPath = path.join(env.UPLOAD_DIR, req.file.filename);
      if (!verifyUploadedFileSafety(fullPath)) {
        fs.unlinkSync(fullPath);
        throw new AppError('Uploaded file failed binary safety check.', 400, 'UNSAFE_FILE');
      }
      fileFields = {
        storedFilename: req.file.filename,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSizeBytes: req.file.size
      };
    }

    let submission = await Submission.findOne({
      where: { assignmentId: assignment.id, studentId: req.user.id },
      transaction: t
    });

    const targetStatus = isDraft === true || isDraft === 'true'
      ? 'draft'
      : (isPastDue ? 'late' : 'submitted');

    if (submission) {
      if (!isDraft && submission.status === 'graded' && !assignment.allowResubmission) {
        throw new AppError('Resubmissions are not allowed after grading for this assignment.', 400, 'RESUBMISSION_NOT_ALLOWED');
      }
      const nextAttempt = isDraft ? submission.attemptNumber : (submission.attemptNumber || 0) + (submission.status === 'draft' ? 0 : 1);
      if (!isDraft && nextAttempt > assignment.maxAttempts) {
        throw new AppError(`Maximum attempt limit (${assignment.maxAttempts}) reached.`, 400, 'MAX_ATTEMPTS_REACHED');
      }

      await submission.update({
        status: targetStatus,
        attemptNumber: nextAttempt,
        textResponse: textResponse !== undefined ? textResponse : submission.textResponse,
        codeSubmission: codeSubmission !== undefined ? codeSubmission : submission.codeSubmission,
        repositoryUrl: repositoryUrl !== undefined ? repositoryUrl : submission.repositoryUrl,
        submittedAt: isDraft ? submission.submittedAt : now,
        isLate: !isDraft && isPastDue,
        ...fileFields
      }, { transaction: t });
    } else {
      submission = await Submission.create({
        assignmentId: assignment.id,
        classId: assignment.classId,
        studentId: req.user.id,
        status: targetStatus,
        attemptNumber: 1,
        textResponse: textResponse || null,
        codeSubmission: codeSubmission || null,
        repositoryUrl: repositoryUrl || null,
        submittedAt: isDraft ? null : now,
        isLate: !isDraft && isPastDue,
        ...fileFields
      }, { transaction: t });
    }

    if (!isDraft) {
      const versionCount = await SubmissionVersion.count({ where: { submissionId: submission.id }, transaction: t });
      await SubmissionVersion.create({
        submissionId: submission.id,
        versionNumber: versionCount + 1,
        textResponse: submission.textResponse,
        codeSubmission: submission.codeSubmission,
        storedFilename: submission.storedFilename,
        originalFilename: submission.originalFilename,
        submittedAt: now
      }, { transaction: t });
    }

    await t.commit();

    if (!isDraft) {
      await recalculateStudentCourseProgress(assignment.classId, req.user.id);
    }

    return res.status(200).json({
      success: true,
      message: isDraft ? 'Draft saved.' : 'Assignment submitted successfully.',
      data: { submission }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function reviewOrGradeSubmission(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const submissionId = Number(req.params.id);
    const {
      score,
      feedback,
      preliminaryFeedback,
      rubricEvaluation,
      flaggedForInstructorReview,
      flagReason,
      returnForRevision = false,
      reason = 'Instructor submission grading'
    } = req.body;

    const submission = await Submission.findByPk(submissionId, {
      include: [{ model: Assignment, as: 'assignment' }],
      transaction: t
    });

    if (!submission) throw new AppError('Submission not found.', 404);

    // Check role access
    const access = await verifyClassAccess(req.user, submission.classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
      requiredTaFlag: 'canReviewSubmissions'
    });

    // Teaching Assistants can provide preliminary feedback, apply rubrics if permitted, or flag for instructor,
    // but CANNOT publish final official grades!
    if (access.accessRole === 'teaching_assistant') {
      if (rubricEvaluation && !access.taAssignment.canApplyRubrics) {
        throw new AppError('You do not have permission to apply grading rubrics in this class.', 403, 'TA_RUBRIC_FORBIDDEN');
      }
      if (score !== undefined && score !== null && req.body.publishOfficialGrade) {
        throw new AppError('Teaching Assistants are not permitted to publish final official grades.', 403, 'TA_PUBLISH_GRADE_FORBIDDEN');
      }

      await submission.update({
        status: 'under_review',
        preliminaryFeedback: preliminaryFeedback !== undefined ? preliminaryFeedback : submission.preliminaryFeedback,
        rubricEvaluation: rubricEvaluation !== undefined ? rubricEvaluation : submission.rubricEvaluation,
        flaggedForInstructorReview: flaggedForInstructorReview !== undefined ? Boolean(flaggedForInstructorReview) : submission.flaggedForInstructorReview,
        flagReason: flagReason !== undefined ? flagReason : submission.flagReason
      }, { transaction: t });

      await t.commit();
      return res.status(200).json({
        success: true,
        message: 'TA preliminary review and flags recorded for instructor.',
        data: { submission }
      });
    }

    // Instructor / Admin grading
    if (returnForRevision) {
      await submission.update({
        status: 'returned_for_revision',
        feedback: feedback || submission.feedback,
        gradedBy: req.user.id,
        gradedAt: new Date()
      }, { transaction: t });

      await t.commit();

      await createNotification({
        userId: submission.studentId,
        type: 'feedback',
        title: `Submission Returned for Revision: ${submission.assignment.title}`,
        message: feedback || 'Please review instructor feedback and resubmit.',
        destinationUrl: '/student/assignments'
      });

      return res.status(200).json({
        success: true,
        message: 'Submission returned to student for revision.',
        data: { submission }
      });
    }

    const numericScore = Number(score);
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > Number(submission.assignment.maxScore)) {
      throw new AppError(`Score must be between 0 and ${submission.assignment.maxScore}.`, 400);
    }

    await submission.update({
      status: 'graded',
      score: numericScore,
      feedback: feedback !== undefined ? feedback : submission.feedback,
      rubricEvaluation: rubricEvaluation !== undefined ? rubricEvaluation : submission.rubricEvaluation,
      flaggedForInstructorReview: false,
      gradedBy: req.user.id,
      gradedAt: new Date(),
      isGradePublished: true
    }, { transaction: t });

    await upsertGradeWithHistory({
      classId: submission.classId,
      gradeCategoryId: submission.assignment.gradeCategoryId,
      studentId: submission.studentId,
      sourceType: 'assignment',
      sourceId: submission.assignmentId,
      itemTitle: submission.assignment.title,
      score: numericScore,
      maxScore: submission.assignment.maxScore,
      feedback: feedback || null,
      status: 'published',
      actorId: req.user.id,
      reason,
      transaction: t
    });

    await t.commit();

    await recalculateStudentCourseProgress(submission.classId, submission.studentId);

    await createNotification({
      userId: submission.studentId,
      type: 'grade',
      title: `Grade Published: ${submission.assignment.title}`,
      message: `You received ${numericScore} / ${submission.assignment.maxScore}.`,
      destinationUrl: '/student/grades'
    });

    await recordAudit({
      req,
      action: 'SUBMISSION_GRADED',
      category: 'grade',
      entityType: 'Submission',
      entityId: submission.id,
      metadata: { studentId: submission.studentId, score: numericScore }
    });

    return res.status(200).json({
      success: true,
      message: 'Submission graded and recorded in class gradebook.',
      data: { submission }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

// ============================================================================
// QUESTION BANKS & QUESTIONS
// ============================================================================

async function listQuestionBanks(req, res, next) {
  try {
    const { courseId } = req.query;
    const where = { isArchived: false };
    if (courseId) where.courseId = Number(courseId);

    const banks = await QuestionBank.findAll({
      where,
      include: [
        {
          model: Question,
          as: 'questions',
          where: { isArchived: false },
          required: false,
          include: [{ model: QuestionOption, as: 'options' }]
        }
      ],
      order: [['id', 'ASC']]
    });

    return res.status(200).json({ success: true, data: { questionBanks: banks } });
  } catch (err) {
    return next(err);
  }
}

async function createQuestionBank(req, res, next) {
  try {
    const { courseId, title, topic, description } = req.body;
    if (!courseId || !title || !topic) {
      throw new AppError('courseId, title, and topic are required.', 400);
    }

    const bank = await QuestionBank.create({
      courseId: Number(courseId),
      title,
      topic,
      description: description || null,
      createdBy: req.user.id
    });

    return res.status(201).json({ success: true, message: 'Question bank created.', data: { questionBank: bank } });
  } catch (err) {
    return next(err);
  }
}

async function createQuestion(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const payload = questionSchema.parse(req.body);
    const question = await Question.create({
      questionBankId: payload.questionBankId,
      courseId: payload.courseId,
      topic: payload.topic,
      questionType: payload.questionType,
      difficulty: payload.difficulty,
      prompt: payload.prompt,
      codeSnippet: payload.codeSnippet || null,
      points: payload.points,
      correctAnswerText: payload.correctAnswerText || null,
      matchingPairs: payload.matchingPairs || null,
      explanation: payload.explanation || null
    }, { transaction: t });

    if (Array.isArray(payload.options) && payload.options.length > 0) {
      for (let i = 0; i < payload.options.length; i += 1) {
        await QuestionOption.create({
          questionId: question.id,
          optionText: payload.options[i].optionText,
          isCorrect: Boolean(payload.options[i].isCorrect),
          orderIndex: i + 1
        }, { transaction: t });
      }
    }

    await t.commit();

    const fullQuestion = await Question.findByPk(question.id, {
      include: [{ model: QuestionOption, as: 'options' }]
    });

    return res.status(201).json({
      success: true,
      message: 'Question added to bank.',
      data: { question: fullQuestion }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

// ============================================================================
// ASSESSMENTS & ATTEMPTS (SERVER-TIMED & AUTO/MANUAL GRADED)
// ============================================================================

async function listAssessments(req, res, next) {
  try {
    const { classId, courseId } = req.query;
    const where = {};
    if (classId) where.classId = Number(classId);
    if (courseId) where.courseId = Number(courseId);

    if (req.user.primaryRole === 'student') {
      where.publicationStatus = ['published', 'closed'];
      if (!classId) {
        const memberships = await ClassMembership.findAll({
          where: { studentId: req.user.id, status: ['enrolled', 'completed'] }
        });
        where.classId = memberships.map((m) => m.classId);
      }
    } else if (req.user.primaryRole === 'instructor' && !classId) {
      const assigned = await InstructorAssignment.findAll({ where: { instructorId: req.user.id } });
      where.classId = assigned.map((a) => a.classId);
    }

    const assessments = await Assessment.findAll({
      where,
      include: [
        { model: AssessmentQuestion, as: 'assessmentQuestions' },
        {
          model: AssessmentAttempt,
          as: 'attempts',
          ...(req.user.primaryRole === 'student' ? { where: { studentId: req.user.id }, required: false } : {})
        }
      ],
      order: [['closeDate', 'ASC']]
    });

    return res.status(200).json({ success: true, data: { assessments } });
  } catch (err) {
    return next(err);
  }
}

async function createAssessment(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const payload = assessmentSchema.parse(req.body);
    await verifyClassAccess(req.user, payload.classId, { allowAdmin: true, allowInstructor: true });

    const assessment = await Assessment.create({
      ...payload,
      createdBy: req.user.id
    }, { transaction: t });

    if (Array.isArray(payload.questionIds) && payload.questionIds.length > 0) {
      for (let i = 0; i < payload.questionIds.length; i += 1) {
        await AssessmentQuestion.create({
          assessmentId: assessment.id,
          questionId: Number(payload.questionIds[i]),
          orderIndex: i + 1
        }, { transaction: t });
      }
    }

    await t.commit();

    return res.status(201).json({
      success: true,
      message: 'Assessment created.',
      data: { assessment }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

/**
 * Starts or resumes an assessment attempt.
 * Strips protected answer keys (`isCorrect`, `correctAnswerText`, `explanation`) from student payload!
 */
async function startOrResumeAttempt(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    const assessment = await Assessment.findByPk(assessmentId, {
      include: [
        {
          model: AssessmentQuestion,
          as: 'assessmentQuestions',
          include: [
            {
              model: Question,
              as: 'question',
              include: [{ model: QuestionOption, as: 'options' }]
            }
          ]
        }
      ]
    });

    if (!assessment) throw new AppError('Assessment not found.', 404);
    await verifyClassAccess(req.user, assessment.classId, { allowStudent: true, allowInstructor: true, allowAdmin: true });

    const now = new Date();
    if (assessment.closeDate && now > new Date(assessment.closeDate) && !assessment.allowLateAttempts) {
      throw new AppError('This assessment has closed.', 400, 'ASSESSMENT_CLOSED');
    }

    // Check for existing in-progress attempt
    let attempt = await AssessmentAttempt.findOne({
      where: {
        assessmentId: assessment.id,
        studentId: req.user.id,
        status: 'in_progress'
      },
      include: [{ model: AssessmentAnswer, as: 'answers' }]
    });

    if (!attempt) {
      const priorAttemptsCount = await AssessmentAttempt.count({
        where: { assessmentId: assessment.id, studentId: req.user.id }
      });

      if (priorAttemptsCount >= assessment.maxAttempts) {
        throw new AppError(`You have used all ${assessment.maxAttempts} permitted attempt(s) for this assessment.`, 400, 'MAX_ATTEMPTS_EXCEEDED');
      }

      const expiresAt = new Date(now.getTime() + (assessment.timeLimitMinutes || 45) * 60000);
      attempt = await AssessmentAttempt.create({
        assessmentId: assessment.id,
        classId: assessment.classId,
        studentId: req.user.id,
        attemptNumber: priorAttemptsCount + 1,
        status: 'in_progress',
        startedAt: now,
        expiresAt
      });
      attempt.answers = [];
    }

    // Sanitize questions so students NEVER see protected answer keys during an active attempt
    let orderedQuestions = [...(assessment.assessmentQuestions || [])].sort((a, b) => a.orderIndex - b.orderIndex);
    if (assessment.randomizeQuestions) {
      orderedQuestions = orderedQuestions.sort(() => Math.random() - 0.5);
    }

    const sanitizedQuestions = orderedQuestions.map((aq) => {
      const q = aq.question;
      let opts = (q.options || []).map((o) => ({
        id: o.id,
        optionText: o.optionText,
        orderIndex: o.orderIndex
      }));
      if (assessment.randomizeOptions) {
        opts = opts.sort(() => Math.random() - 0.5);
      }

      return {
        assessmentQuestionId: aq.id,
        questionId: q.id,
        questionType: q.questionType,
        prompt: q.prompt,
        codeSnippet: q.codeSnippet,
        points: Number(aq.pointsOverride || q.points || 1),
        options: opts,
        matchingPrompts: Array.isArray(q.matchingPairs) ? q.matchingPairs.map((p) => p.left) : null,
        matchingChoices: Array.isArray(q.matchingPairs) ? q.matchingPairs.map((p) => p.right) : null
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        attempt: {
          id: attempt.id,
          assessmentId: assessment.id,
          title: assessment.title,
          instructions: assessment.instructions,
          attemptNumber: attempt.attemptNumber,
          status: attempt.status,
          startedAt: attempt.startedAt,
          expiresAt: attempt.expiresAt,
          remainingSeconds: Math.max(0, Math.floor((new Date(attempt.expiresAt) - now) / 1000)),
          savedAnswers: attempt.answers || []
        },
        questions: sanitizedQuestions
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function saveAttemptAnswers(req, res, next) {
  try {
    const attemptId = Number(req.params.attemptId);
    const { answers } = req.body;

    const attempt = await AssessmentAttempt.findByPk(attemptId);
    if (!attempt || attempt.studentId !== req.user.id) {
      throw new AppError('Attempt not found or unauthorized.', 404);
    }

    if (attempt.status !== 'in_progress') {
      throw new AppError('Attempt has already been submitted.', 400, 'ATTEMPT_ALREADY_SUBMITTED');
    }

    if (Array.isArray(answers)) {
      for (const ans of answers) {
        const [record, created] = await AssessmentAnswer.findOrCreate({
          where: { attemptId: attempt.id, questionId: Number(ans.questionId) },
          defaults: {
            attemptId: attempt.id,
            questionId: Number(ans.questionId),
            selectedOptionIds: ans.selectedOptionIds || null,
            textAnswer: ans.textAnswer || null,
            matchingResponse: ans.matchingResponse || null
          }
        });
        if (!created) {
          await record.update({
            selectedOptionIds: ans.selectedOptionIds !== undefined ? ans.selectedOptionIds : record.selectedOptionIds,
            textAnswer: ans.textAnswer !== undefined ? ans.textAnswer : record.textAnswer,
            matchingResponse: ans.matchingResponse !== undefined ? ans.matchingResponse : record.matchingResponse
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Answers saved automatically.'
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Evaluates and submits an assessment attempt on the server.
 * Never trusts client-submitted scores!
 */
async function submitAttempt(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const attemptId = Number(req.params.attemptId);
    const { answers } = req.body;

    const attempt = await AssessmentAttempt.findByPk(attemptId, {
      include: [
        {
          model: Assessment,
          as: 'assessment',
          include: [
            {
              model: AssessmentQuestion,
              as: 'assessmentQuestions',
              include: [
                {
                  model: Question,
                  as: 'question',
                  include: [{ model: QuestionOption, as: 'options' }]
                }
              ]
            }
          ]
        }
      ],
      transaction: t
    });

    if (!attempt || attempt.studentId !== req.user.id) {
      throw new AppError('Assessment attempt not found.', 404);
    }

    if (attempt.status !== 'in_progress') {
      throw new AppError('This attempt has already been submitted.', 400, 'ATTEMPT_ALREADY_SUBMITTED');
    }

    // Save any final answers submitted with the request
    if (Array.isArray(answers)) {
      for (const ans of answers) {
        const [record, created] = await AssessmentAnswer.findOrCreate({
          where: { attemptId: attempt.id, questionId: Number(ans.questionId) },
          defaults: {
            attemptId: attempt.id,
            questionId: Number(ans.questionId),
            selectedOptionIds: ans.selectedOptionIds || null,
            textAnswer: ans.textAnswer || null,
            matchingResponse: ans.matchingResponse || null
          },
          transaction: t
        });
        if (!created) {
          await record.update({
            selectedOptionIds: ans.selectedOptionIds !== undefined ? ans.selectedOptionIds : record.selectedOptionIds,
            textAnswer: ans.textAnswer !== undefined ? ans.textAnswer : record.textAnswer,
            matchingResponse: ans.matchingResponse !== undefined ? ans.matchingResponse : record.matchingResponse
          }, { transaction: t });
        }
      }
    }

    const storedAnswers = await AssessmentAnswer.findAll({
      where: { attemptId: attempt.id },
      transaction: t
    });

    let autoScore = 0;
    let possiblePointsSum = 0;
    let requiresManual = false;

    for (const aq of attempt.assessment.assessmentQuestions || []) {
      const q = aq.question;
      const maxPts = Number(aq.pointsOverride || q.points || 1);
      possiblePointsSum += maxPts;

      const studentAns = storedAnswers.find((a) => a.questionId === q.id);
      if (!studentAns) continue;

      let isCorrect = false;
      let awarded = 0;

      if (q.questionType === 'multiple_choice' || q.questionType === 'true_false') {
        const correctOpt = (q.options || []).find((o) => o.isCorrect);
        const selectedId = Array.isArray(studentAns.selectedOptionIds) ? Number(studentAns.selectedOptionIds[0]) : null;
        const expected = (q.correctAnswerText || '').trim().toLowerCase();
        const given = (studentAns.textAnswer || '').trim().toLowerCase();
        if (correctOpt && selectedId === correctOpt.id) {
          isCorrect = true;
          awarded = maxPts;
        } else if (expected && given === expected) {
          isCorrect = true;
          awarded = maxPts;
        }
      } else if (q.questionType === 'multiple_select') {
        const correctIds = (q.options || []).filter((o) => o.isCorrect).map((o) => o.id).sort();
        const selectedIds = (studentAns.selectedOptionIds || []).map(Number).sort();
        if (
          correctIds.length === selectedIds.length
          && correctIds.every((val, idx) => val === selectedIds[idx])
        ) {
          isCorrect = true;
          awarded = maxPts;
        }
      } else if (q.questionType === 'identification' || q.questionType === 'fill_in_the_blank') {
        const expected = (q.correctAnswerText || '').trim().toLowerCase();
        const given = (studentAns.textAnswer || '').trim().toLowerCase();
        if (expected && given === expected) {
          isCorrect = true;
          awarded = maxPts;
        }
      } else if (q.questionType === 'matching') {
        const pairs = q.matchingPairs || [];
        const resp = studentAns.matchingResponse || {};
        if (pairs.length > 0 && pairs.every((p) => resp[p.left] === p.right)) {
          isCorrect = true;
          awarded = maxPts;
        }
      } else if (q.questionType === 'essay' || q.questionType === 'short_answer') {
        requiresManual = true;
        isCorrect = null;
        awarded = 0;
      }

      autoScore += awarded;
      await studentAns.update({
        isCorrect,
        pointsAwarded: awarded
      }, { transaction: t });
    }

    // Normalize score to assessment.maxScore if question sum differs
    const assessmentMax = Number(attempt.assessment.maxScore || 100);
    const normalizedAutoScore = (!requiresManual && possiblePointsSum > 0 && possiblePointsSum !== assessmentMax)
      ? Number(((autoScore / possiblePointsSum) * assessmentMax).toFixed(2))
      : Number(autoScore.toFixed(2));

    const finalStatus = requiresManual ? 'submitted' : 'graded';
    const isPublished = !requiresManual && Boolean(attempt.assessment.autoPublishResults);

    await attempt.update({
      status: finalStatus,
      submittedAt: new Date(),
      autoScore: normalizedAutoScore,
      totalScore: normalizedAutoScore,
      RequiresManualGrading: requiresManual,
      isPublished,
      gradedAt: requiresManual ? null : new Date()
    }, { transaction: t });

    if (isPublished) {
      await upsertGradeWithHistory({
        classId: attempt.classId,
        gradeCategoryId: attempt.assessment.gradeCategoryId,
        studentId: req.user.id,
        sourceType: 'assessment',
        sourceId: attempt.assessmentId,
        itemTitle: attempt.assessment.title,
        score: normalizedAutoScore,
        maxScore: assessmentMax,
        feedback: 'Auto-graded assessment attempt',
        status: 'published',
        actorId: req.user.id,
        reason: `Auto-graded attempt #${attempt.attemptNumber}`,
        transaction: t
      });
    }

    await t.commit();

    const courseProgress = await recalculateStudentCourseProgress(attempt.classId, req.user.id);
    const percentage = assessmentMax > 0
      ? Number(((normalizedAutoScore / assessmentMax) * 100).toFixed(2))
      : 0;
    const passingScore = Number(attempt.assessment.passingScore || 75);
    const passed = percentage >= passingScore;

    return res.status(200).json({
      success: true,
      message: requiresManual
        ? 'Assessment submitted! Subjective responses are queued for instructor grading.'
        : `Assessment submitted! You scored ${percentage}% (${normalizedAutoScore}/${assessmentMax}).`,
      data: {
        attempt,
        percentage,
        maxScore: assessmentMax,
        passingScore,
        passed,
        courseProgress
      }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function manualGradeAttempt(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const attemptId = Number(req.params.attemptId);
    const { manualScore, instructorFeedback, publishResult = true } = req.body;

    const attempt = await AssessmentAttempt.findByPk(attemptId, {
      include: [{ model: Assessment, as: 'assessment' }],
      transaction: t
    });

    if (!attempt) throw new AppError('Attempt not found.', 404);
    await verifyClassAccess(req.user, attempt.classId, { allowAdmin: true, allowInstructor: true });

    const manualPts = Number(manualScore || 0);
    const totalScore = Math.min(
      Number(attempt.assessment.maxScore || 100),
      Number((Number(attempt.autoScore || 0) + manualPts).toFixed(2))
    );

    await attempt.update({
      manualScore: manualPts,
      totalScore,
      status: 'graded',
      RequiresManualGrading: false,
      isPublished: Boolean(publishResult),
      instructorFeedback: instructorFeedback || attempt.instructorFeedback,
      gradedBy: req.user.id,
      gradedAt: new Date()
    }, { transaction: t });

    if (publishResult) {
      await upsertGradeWithHistory({
        classId: attempt.classId,
        gradeCategoryId: attempt.assessment.gradeCategoryId,
        studentId: attempt.studentId,
        sourceType: 'assessment',
        sourceId: attempt.assessmentId,
        itemTitle: attempt.assessment.title,
        score: totalScore,
        maxScore: attempt.assessment.maxScore,
        feedback: instructorFeedback || 'Graded by instructor',
        status: 'published',
        actorId: req.user.id,
        reason: 'Instructor manual assessment grading',
        transaction: t
      });
    }

    await t.commit();

    await createNotification({
      userId: attempt.studentId,
      type: 'grade',
      title: `Assessment Graded: ${attempt.assessment.title}`,
      message: `Your final score is ${totalScore} / ${attempt.assessment.maxScore}.`,
      destinationUrl: '/student/assessments'
    });

    return res.status(200).json({
      success: true,
      message: 'Assessment attempt graded and published.',
      data: { attempt }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

module.exports = {
  listAssignments,
  getAssignmentById,
  createAssignment,
  listSubmissions,
  submitAssignmentWork,
  reviewOrGradeSubmission,
  listQuestionBanks,
  createQuestionBank,
  createQuestion,
  listAssessments,
  createAssessment,
  startOrResumeAttempt,
  saveAttemptAnswers,
  submitAttempt,
  manualGradeAttempt
};

