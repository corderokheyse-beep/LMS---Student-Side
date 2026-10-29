const {
  GradeCategory,
  Grade,
  GradeHistory,
  ClassMembership,
  ClassSection,
  CourseOffering,
  Assignment,
  Assessment,
  User
} = require('../models');

function mapScoreToInstitutionalGrade(numericScore) {
  if (numericScore === null || numericScore === undefined || Number.isNaN(Number(numericScore))) {
    return { numericGrade: null, letter: 'N/A', remarks: 'In Progress' };
  }
  const s = Number(numericScore);
  if (s >= 96) return { numericGrade: '1.00', letter: 'A+', remarks: 'Passed (Excellent)' };
  if (s >= 91) return { numericGrade: '1.25', letter: 'A', remarks: 'Passed (Very Good)' };
  if (s >= 86) return { numericGrade: '1.50', letter: 'B+', remarks: 'Passed (Good)' };
  if (s >= 80) return { numericGrade: '2.00', letter: 'B', remarks: 'Passed (Satisfactory)' };
  if (s >= 75) return { numericGrade: '3.00', letter: 'C', remarks: 'Passed' };
  return { numericGrade: '5.00', letter: 'F', remarks: 'Needs Support / Below Passing' };
}

/**
 * Calculates the full weighted gradebook for a class section or a specific student.
 * Prevents division-by-zero when categories have no graded items yet, and handles
 * exemptions, missing work, and extra credit accurately.
 */
async function calculateClassGradebook(classId, { studentIdFilter = null, publishedOnly = false } = {}) {
  const categories = await GradeCategory.findAll({
    where: { classId },
    order: [['orderIndex', 'ASC'], ['id', 'ASC']]
  });

  const membershipWhere = { classId, status: ['enrolled', 'completed'] };
  if (studentIdFilter) {
    membershipWhere.studentId = studentIdFilter;
  }

  const memberships = await ClassMembership.findAll({
    where: membershipWhere,
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber']
      }
    ],
    order: [['id', 'ASC']]
  });

  const gradeWhere = { classId };
  if (studentIdFilter) gradeWhere.studentId = studentIdFilter;
  if (publishedOnly) gradeWhere.status = ['published', 'submitted_final', 'approved_final'];

  const grades = await Grade.findAll({
    where: gradeWhere,
    order: [['id', 'ASC']]
  });

  const assignments = await Assignment.findAll({
    where: { classId, publicationStatus: 'published' },
    attributes: ['id', 'title', 'maxScore', 'dueDate', 'gradeCategoryId', 'assignmentType']
  });

  const assessments = await Assessment.findAll({
    where: { classId, publicationStatus: ['published', 'closed'] },
    attributes: ['id', 'title', 'maxScore', 'closeDate', 'gradeCategoryId', 'assessmentType']
  });

  const classSection = await ClassSection.findByPk(classId, {
    include: [{ model: CourseOffering, as: 'courseOffering' }]
  });
  const passingScore = Number(classSection?.courseOffering?.passingScore || 75);

  const totalConfiguredWeight = categories.reduce((acc, c) => acc + Number(c.weightPercent || 0), 0);

  const studentRows = memberships.map((m) => {
    const studentGrades = grades.filter((g) => g.studentId === m.studentId);

    let weightedSum = 0;
    let activeWeightSum = 0;
    const categoryBreakdown = {};

    for (const cat of categories) {
      const catWeight = Number(cat.weightPercent || 0);
      const catGrades = studentGrades.filter((g) => g.gradeCategoryId === cat.id && !g.isExempt);

      let earnedPoints = 0;
      let possiblePoints = 0;

      for (const g of catGrades) {
        const max = Number(g.maxScore || 0);
        if (max <= 0) continue;
        const scoreVal = g.isMissing ? 0 : (g.score !== null && g.score !== undefined ? Number(g.score) : null);
        if (scoreVal !== null) {
          earnedPoints += scoreVal + Number(g.extraCreditPoints || 0);
          possiblePoints += max;
        }
      }

      if (possiblePoints > 0) {
        const categoryPercentage = Math.min(100, Number(((earnedPoints / possiblePoints) * 100).toFixed(2)));
        categoryBreakdown[cat.id] = {
          categoryId: cat.id,
          categoryName: cat.name,
          weightPercent: catWeight,
          earnedPoints: Number(earnedPoints.toFixed(2)),
          possiblePoints: Number(possiblePoints.toFixed(2)),
          percentage: categoryPercentage,
          weightedContribution: Number(((categoryPercentage * catWeight) / 100).toFixed(2))
        };
        weightedSum += (categoryPercentage * catWeight);
        activeWeightSum += catWeight;
      } else {
        categoryBreakdown[cat.id] = {
          categoryId: cat.id,
          categoryName: cat.name,
          weightPercent: catWeight,
          earnedPoints: 0,
          possiblePoints: 0,
          percentage: null,
          weightedContribution: 0
        };
      }
    }

    const standingPercentage = activeWeightSum > 0
      ? Number((weightedSum / activeWeightSum).toFixed(2))
      : null;

    const eq = mapScoreToInstitutionalGrade(standingPercentage);

    return {
      membershipId: m.id,
      studentId: m.studentId,
      studentNumber: m.student?.studentNumber || `STU-${m.studentId}`,
      studentName: m.student ? `${m.student.firstName} ${m.student.lastName}` : `Student #${m.studentId}`,
      studentEmail: m.student?.email || '',
      enrollmentStatus: m.status,
      standingPercentage,
      institutionalGrade: eq.numericGrade,
      letterGrade: eq.letter,
      isPassing: standingPercentage !== null ? standingPercentage >= passingScore : true,
      remarks: eq.remarks,
      categoryBreakdown,
      grades: studentGrades
    };
  });

  return {
    classId: Number(classId),
    finalGradesStatus: classSection?.finalGradesStatus || 'in_progress',
    passingScore,
    totalConfiguredWeight: Number(totalConfiguredWeight.toFixed(2)),
    categories,
    assignments,
    assessments,
    students: studentRows
  };
}

/**
 * Creates or updates a Grade record and logs the revision in GradeHistory.
 */
async function upsertGradeWithHistory({
  classId,
  gradeCategoryId,
  studentId,
  sourceType,
  sourceId = null,
  itemTitle,
  score,
  maxScore = 100,
  isExempt = false,
  isMissing = false,
  extraCreditPoints = 0,
  feedback = null,
  status = 'published',
  actorId,
  reason = 'Instructor grade entry or update',
  transaction = null
}) {
  let resolvedCategoryId = gradeCategoryId;
  if (!resolvedCategoryId) {
    const firstCat = await GradeCategory.findOne({ where: { classId }, transaction });
    if (firstCat) {
      resolvedCategoryId = firstCat.id;
    } else {
      const createdCat = await GradeCategory.create({
        classId,
        name: 'General Assessments',
        categoryType: 'assignment',
        weightPercent: 100
      }, { transaction });
      resolvedCategoryId = createdCat.id;
    }
  }

  const whereClause = sourceId
    ? { classId, studentId, sourceType, sourceId }
    : { classId, studentId, sourceType, itemTitle };

  const existing = await Grade.findOne({ where: whereClause, transaction });

  if (existing) {
    const prevScore = existing.score;
    const prevStatus = existing.status;

    await existing.update({
      gradeCategoryId: resolvedCategoryId,
      score,
      maxScore,
      isExempt,
      isMissing,
      extraCreditPoints,
      feedback: feedback !== undefined ? feedback : existing.feedback,
      status,
      gradedBy: actorId,
      publishedAt: status === 'published' ? new Date() : existing.publishedAt
    }, { transaction });

    await GradeHistory.create({
      gradeId: existing.id,
      classId,
      studentId,
      previousScore: prevScore,
      newScore: score,
      previousStatus: prevStatus,
      newStatus: status,
      reason,
      changedBy: actorId
    }, { transaction });

    return existing;
  }

  const created = await Grade.create({
    classId,
    gradeCategoryId: resolvedCategoryId,
    studentId,
    sourceType,
    sourceId,
    itemTitle,
    score,
    maxScore,
    isExempt,
    isMissing,
    extraCreditPoints,
    feedback,
    status,
    gradedBy: actorId,
    publishedAt: status === 'published' ? new Date() : null
  }, { transaction });

  await GradeHistory.create({
    gradeId: created.id,
    classId,
    studentId,
    previousScore: null,
    newScore: score,
    previousStatus: null,
    newStatus: status,
    reason,
    changedBy: actorId
  }, { transaction });

  return created;
}

module.exports = {
  mapScoreToInstitutionalGrade,
  calculateClassGradebook,
  upsertGradeWithHistory
};

