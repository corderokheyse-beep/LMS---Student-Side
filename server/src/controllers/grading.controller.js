const crypto = require('crypto');
const {
  sequelize,
  GradeCategory,
  Grade,
  GradeHistory,
  ClassSection,
  ClassMembership,
  CourseOffering,
  Course,
  Department,
  Certificate,
  Submission,
  Assignment,
  User
} = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { verifyClassAccess } = require('../middleware/auth.middleware');
const { calculateClassGradebook, upsertGradeWithHistory } = require('../services/gradebook.service');
const { recordAudit } = require('../utils/auditLogger');
const { createNotification } = require('../utils/notifyUser');
const { gradeCategoriesBulkSchema } = require('../validators/schemas');

async function getClassGradebookView(req, res, next) {
  try {
    const classId = Number(req.params.classId || req.query.classId);
    if (!classId) throw new AppError('classId is required.', 400);

    const access = await verifyClassAccess(req.user, classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
      allowStudent: true
    });

    // Students can NEVER view another student's grades
    const studentIdFilter = access.accessRole === 'student' ? req.user.id : null;
    const publishedOnly = access.accessRole === 'student';

    const gradebook = await calculateClassGradebook(classId, {
      studentIdFilter,
      publishedOnly
    });

    const historyWhere = { classId };
    if (studentIdFilter) historyWhere.studentId = studentIdFilter;

    const history = await GradeHistory.findAll({
      where: historyWhere,
      include: [{ model: User, as: 'editor', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    return res.status(200).json({
      success: true,
      data: {
        ...gradebook,
        history
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function getStudentPersonalGrades(req, res, next) {
  try {
    const studentId = req.user.primaryRole === 'student'
      ? req.user.id
      : Number(req.query.studentId || req.user.id);

    if (req.user.primaryRole === 'student' && studentId !== req.user.id) {
      throw new AppError('Forbidden: Students cannot view another student’s gradebook.', 403, 'FORBIDDEN_STUDENT_GRADES');
    }

    const memberships = await ClassMembership.findAll({
      where: { studentId, status: ['enrolled', 'completed'] },
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          include: [
            {
              model: CourseOffering,
              as: 'courseOffering',
              include: [{ model: Course, as: 'course' }]
            }
          ]
        }
      ]
    });

    const classSummaries = [];
    for (const m of memberships) {
      const gb = await calculateClassGradebook(m.classId, {
        studentIdFilter: studentId,
        publishedOnly: req.user.primaryRole === 'student'
      });
      const row = gb.students[0];
      classSummaries.push({
        classId: m.classId,
        sectionCode: m.classSection?.sectionCode,
        courseCode: m.classSection?.courseOffering?.course?.code,
        courseTitle: m.classSection?.courseOffering?.course?.title,
        finalGradesStatus: gb.finalGradesStatus,
        standingPercentage: row?.standingPercentage ?? null,
        institutionalGrade: row?.institutionalGrade ?? null,
        letterGrade: row?.letterGrade ?? 'N/A',
        remarks: row?.remarks ?? 'In Progress',
        categoryBreakdown: row?.categoryBreakdown ?? {},
        grades: row?.grades ?? []
      });
    }

    return res.status(200).json({
      success: true,
      data: { classes: classSummaries }
    });
  } catch (err) {
    return next(err);
  }
}

async function updateClassGradeCategories(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const classId = Number(req.params.classId);
    await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true });

    const { categories } = gradeCategoriesBulkSchema.parse(req.body);
    const totalWeight = categories.reduce((acc, c) => acc + Number(c.weightPercent || 0), 0);

    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new AppError(`Category weights must sum to exactly 100% (currently ${totalWeight.toFixed(2)}%).`, 400, 'INVALID_WEIGHT_SUM');
    }

    const updatedCategories = [];
    for (let i = 0; i < categories.length; i += 1) {
      const cat = categories[i];
      if (cat.id) {
        const existing = await GradeCategory.findOne({ where: { id: cat.id, classId }, transaction: t });
        if (existing) {
          await existing.update({
            name: cat.name,
            categoryType: cat.categoryType,
            weightPercent: cat.weightPercent,
            orderIndex: i + 1
          }, { transaction: t });
          updatedCategories.push(existing);
          continue;
        }
      }
      const created = await GradeCategory.create({
        classId,
        name: cat.name,
        categoryType: cat.categoryType,
        weightPercent: cat.weightPercent,
        orderIndex: i + 1
      }, { transaction: t });
      updatedCategories.push(created);
    }

    await t.commit();

    await recordAudit({
      req,
      action: 'GRADE_CATEGORIES_CONFIGURED',
      category: 'grade',
      entityType: 'ClassSection',
      entityId: classId,
      metadata: { categories }
    });

    return res.status(200).json({
      success: true,
      message: 'Grade categories and weights updated (Total = 100%).',
      data: { categories: updatedCategories }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function recordOrUpdateManualGrade(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const classId = Number(req.params.classId);
    await verifyClassAccess(req.user, classId, { allowAdmin: false, allowInstructor: true });

    const {
      gradeId,
      gradeCategoryId,
      studentId,
      itemTitle,
      score,
      maxScore = 100,
      isExempt = false,
      isMissing = false,
      extraCreditPoints = 0,
      feedback,
      status = 'published',
      reason
    } = req.body;

    if (gradeId) {
      const existing = await Grade.findByPk(Number(gradeId), { transaction: t });
      if (existing && existing.status === 'published' && (!reason || String(reason).trim().length < 3)) {
        throw new AppError('Modifying an already published grade requires a documented revision reason for the audit history.', 400, 'REVISION_REASON_REQUIRED');
      }
    }

    const grade = await upsertGradeWithHistory({
      classId,
      gradeCategoryId: Number(gradeCategoryId),
      studentId: Number(studentId),
      sourceType: 'manual',
      sourceId: gradeId ? Number(gradeId) : null,
      itemTitle: itemTitle || 'Manual Assessment Item',
      score: score !== null && score !== undefined && score !== '' ? Number(score) : null,
      maxScore: Number(maxScore),
      isExempt: Boolean(isExempt),
      isMissing: Boolean(isMissing),
      extraCreditPoints: Number(extraCreditPoints || 0),
      feedback: feedback || null,
      status,
      actorId: req.user.id,
      reason: reason || 'Manual gradebook entry',
      transaction: t
    });

    await t.commit();

    await recordAudit({
      req,
      action: 'GRADE_RECORDED_OR_REVISED',
      category: 'grade',
      entityType: 'Grade',
      entityId: grade.id,
      metadata: { classId, studentId, score, reason }
    });

    return res.status(200).json({
      success: true,
      message: 'Grade saved and logged in revision history.',
      data: { grade }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function submitFinalGradesForApproval(req, res, next) {
  try {
    const classId = Number(req.params.classId);
    const { classSection } = await verifyClassAccess(req.user, classId, { allowAdmin: false, allowInstructor: true });

    await classSection.update({
      finalGradesStatus: 'submitted_for_approval',
      finalGradesSubmittedAt: new Date()
    });

    await recordAudit({
      req,
      action: 'FINAL_GRADES_SUBMITTED_FOR_APPROVAL',
      category: 'grade',
      entityType: 'ClassSection',
      entityId: classId
    });

    return res.status(200).json({
      success: true,
      message: 'Final class grades submitted to Academic Administration for approval.',
      data: { classSection }
    });
  } catch (err) {
    return next(err);
  }
}

async function approveOrReturnFinalGrades(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const classId = Number(req.params.classId);
    const { decision = 'approved', remarks } = req.body;

    const classSection = await ClassSection.findByPk(classId, { transaction: t });
    if (!classSection) throw new AppError('Class section not found.', 404);

    if (!['approved', 'published', 'returned'].includes(decision)) {
      throw new AppError('Decision must be approved, published, or returned.', 400);
    }

    await classSection.update({
      finalGradesStatus: decision,
      finalGradesApprovedBy: req.user.id,
      finalGradesApprovedAt: new Date()
    }, { transaction: t });

    if (decision === 'approved' || decision === 'published') {
      const gb = await calculateClassGradebook(classId);
      for (const s of gb.students) {
        await ClassMembership.update({
          finalNumericGrade: s.standingPercentage,
          finalLetterGrade: s.institutionalGrade,
          remarks: remarks || s.remarks
        }, {
          where: { classId, studentId: s.studentId },
          transaction: t
        });
      }
    }

    await t.commit();

    await recordAudit({
      req,
      action: `FINAL_GRADES_${decision.toUpperCase()}`,
      category: 'grade',
      severity: 'info',
      entityType: 'ClassSection',
      entityId: classId,
      metadata: { decision, remarks }
    });

    return res.status(200).json({
      success: true,
      message: `Class final grades marked as ${decision}.`,
      data: { classSection }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

// ============================================================================
// CERTIFICATES & VERIFICATION
// ============================================================================

async function listCertificates(req, res, next) {
  try {
    const where = {};
    if (req.user.primaryRole === 'student') {
      where.studentId = req.user.id;
    } else if (req.query.studentId) {
      where.studentId = Number(req.query.studentId);
    }

    const certificates = await Certificate.findAll({
      where,
      include: [
        { model: Course, as: 'course', attributes: ['id', 'code', 'title', 'category', 'level', 'creditUnits'] },
        { model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode'] },
        { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] }
      ],
      order: [['issuedAt', 'DESC']]
    });

    return res.status(200).json({ success: true, data: { certificates } });
  } catch (err) {
    return next(err);
  }
}

async function verifyCertificate(req, res, next) {
  try {
    const { code } = req.params;
    const cert = await Certificate.findOne({
      where: { certificateCode: code.trim() },
      include: [
        { model: Course, as: 'course', attributes: ['code', 'title', 'creditUnits'] }
      ]
    });

    if (!cert) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'No valid certificate found matching that verification code.'
      });
    }

    return res.status(200).json({
      success: true,
      verified: cert.status === 'active',
      data: { certificate: cert }
    });
  } catch (err) {
    return next(err);
  }
}

async function issueCertificateManually(req, res, next) {
  try {
    const { classId, studentId } = req.body;
    await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true });

    const classSection = await ClassSection.findByPk(Number(classId), {
      include: [{ model: CourseOffering, as: 'courseOffering', include: [{ model: Course, as: 'course' }] }]
    });
    const student = await User.findByPk(Number(studentId));
    if (!classSection || !student) throw new AppError('Class or student not found.', 404);

    const gb = await calculateClassGradebook(Number(classId), { studentIdFilter: student.id });
    const standing = gb.students[0]?.standingPercentage ?? 85;
    const passing = Number(classSection.courseOffering?.passingScore || 75);

    if (standing < passing) {
      throw new AppError(`Student standing (${standing}%) is below the required passing score (${passing}%).`, 400, 'BELOW_PASSING_SCORE');
    }

    const course = classSection.courseOffering.course;
    const certCode = `AIT-CERT-${new Date().getFullYear()}-${classId}${student.id}${Math.floor(100 + Math.random() * 900)}`;
    const verifyHash = crypto.createHash('sha256').update(`${certCode}:${student.email}:${course.id}`).digest('hex');

    const [cert] = await Certificate.findOrCreate({
      where: { classId: Number(classId), studentId: student.id },
      defaults: {
        certificateCode: certCode,
        verificationHash: verifyHash,
        studentId: student.id,
        courseId: course.id,
        classId: Number(classId),
        recipientName: `${student.firstName} ${student.lastName}`,
        courseTitle: course.title,
        courseCode: course.code,
        finalScore: standing,
        issuedBy: req.user.id,
        status: 'active'
      }
    });

    await createNotification({
      userId: student.id,
      type: 'certificate',
      title: `Certificate Issued: ${course.title}`,
      message: `Your completion certificate (${cert.certificateCode}) is ready for download.`,
      destinationUrl: '/student/certificates'
    });

    return res.status(201).json({
      success: true,
      message: 'Certificate issued successfully.',
      data: { certificate: cert }
    });
  } catch (err) {
    return next(err);
  }
}

// ============================================================================
// AUTHORIZED REPORTS & EXPORTS (CSV, EXCEL-COMPATIBLE, JSON)
// ============================================================================

function toCsvString(headers, rows) {
  const escapeCell = (val) => {
    const str = val === null || val === undefined ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const headerLine = headers.map((h) => escapeCell(h.label)).join(',');
  const dataLines = rows.map((r) => headers.map((h) => escapeCell(r[h.key])).join(','));
  return [headerLine, ...dataLines].join('\n');
}

async function generateReport(req, res, next) {
  try {
    const { type = 'enrollments', format = 'json', classId } = req.query;

    let reportTitle = 'Institutional Academic Report';
    let headers = [];
    let rows = [];

    if (type === 'users') {
      if (!req.user.roles.includes('super_admin') && !req.user.roles.includes('academic_admin')) {
        throw new AppError('Forbidden: Insufficient permissions for user report.', 403);
      }
      reportTitle = 'Platform Users & Role Directory';
      headers = [
        { key: 'id', label: 'ID' },
        { key: 'fullName', label: 'Full Name' },
        { key: 'email', label: 'Email' },
        { key: 'identifier', label: 'ID Number' },
        { key: 'status', label: 'Status' }
      ];
      const users = await User.findAll({ order: [['id', 'ASC']] });
      rows = users.map((u) => ({
        id: u.id,
        fullName: `${u.firstName} ${u.lastName}`,
        email: u.email,
        identifier: u.studentNumber || u.employeeNumber || 'N/A',
        status: u.status
      }));
    } else if (type === 'gradebook' && classId) {
      await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true });
      reportTitle = `Class Gradebook Report (Class #${classId})`;
      const gb = await calculateClassGradebook(Number(classId));
      headers = [
        { key: 'studentNumber', label: 'Student Number' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'studentEmail', label: 'Email' },
        { key: 'standingPercentage', label: 'Weighted Standing (%)' },
        { key: 'institutionalGrade', label: 'Equivalent Grade' },
        { key: 'letterGrade', label: 'Letter' },
        { key: 'remarks', label: 'Remarks' }
      ];
      rows = gb.students;
    } else if (type === 'submissions') {
      reportTitle = 'Assignment Submissions Report';
      const where = {};
      if (classId) where.classId = Number(classId);
      const subs = await Submission.findAll({
        where,
        include: [
          { model: User, as: 'student', attributes: ['firstName', 'lastName', 'email', 'studentNumber'] },
          { model: Assignment, as: 'assignment', attributes: ['title', 'maxScore'] }
        ]
      });
      headers = [
        { key: 'studentName', label: 'Student' },
        { key: 'assignmentTitle', label: 'Assignment' },
        { key: 'status', label: 'Status' },
        { key: 'score', label: 'Score' },
        { key: 'maxScore', label: 'Max Score' },
        { key: 'submittedAt', label: 'Submitted At' }
      ];
      rows = subs.map((s) => ({
        studentName: s.student ? `${s.student.firstName} ${s.student.lastName}` : `Student #${s.studentId}`,
        assignmentTitle: s.assignment?.title || '',
        status: s.status,
        score: s.score ?? 'Pending',
        maxScore: s.assignment?.maxScore ?? 100,
        submittedAt: s.submittedAt ? new Date(s.submittedAt).toISOString() : 'N/A'
      }));
    } else if (type === 'departments') {
      reportTitle = 'Department & Course Summary Report';
      const depts = await Department.findAll({ include: [{ model: Course, as: 'courses' }] });
      headers = [
        { key: 'code', label: 'Department Code' },
        { key: 'name', label: 'Department Name' },
        { key: 'headName', label: 'Department Head' },
        { key: 'courseCount', label: 'Active Courses' }
      ];
      rows = depts.map((d) => ({
        code: d.code,
        name: d.name,
        headName: d.headName || 'TBA',
        courseCount: (d.courses || []).length
      }));
    } else {
      // Default: enrollments / class roster
      reportTitle = 'Student Enrollment & Roster Report';
      const where = {};
      if (classId) where.classId = Number(classId);
      const enrollments = await ClassMembership.findAll({
        where,
        include: [
          { model: User, as: 'student', attributes: ['firstName', 'lastName', 'email', 'studentNumber'] },
          {
            model: ClassSection,
            as: 'classSection',
            include: [{ model: CourseOffering, as: 'courseOffering', include: [{ model: Course, as: 'course' }] }]
          }
        ]
      });
      headers = [
        { key: 'studentNumber', label: 'Student Number' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'email', label: 'Email' },
        { key: 'sectionCode', label: 'Class Section' },
        { key: 'courseCode', label: 'Course Code' },
        { key: 'status', label: 'Enrollment Status' }
      ];
      rows = enrollments.map((e) => ({
        studentNumber: e.student?.studentNumber || `STU-${e.studentId}`,
        studentName: e.student ? `${e.student.firstName} ${e.student.lastName}` : '',
        email: e.student?.email || '',
        sectionCode: e.classSection?.sectionCode || '',
        courseCode: e.classSection?.courseOffering?.course?.code || '',
        status: e.status
      }));
    }

    await recordAudit({
      req,
      action: 'REPORT_EXPORTED',
      category: 'academic',
      metadata: { type, format, rowCount: rows.length }
    });

    if (format === 'csv' || format === 'excel') {
      const csv = toCsvString(headers, rows);
      const ext = format === 'excel' ? 'xls' : 'csv';
      const mime = format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv';
      res.setHeader('Content-Type', `${mime}; charset=utf-8`);
      res.setHeader('Content-Disposition', `attachment; filename="lms-report-${type}-${Date.now()}.${ext}"`);
      return res.status(200).send(csv);
    }

    return res.status(200).json({
      success: true,
      data: {
        reportTitle,
        generatedAt: new Date().toISOString(),
        headers,
        rows
      }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getClassGradebookView,
  getStudentPersonalGrades,
  updateClassGradeCategories,
  recordOrUpdateManualGrade,
  submitFinalGradesForApproval,
  approveOrReturnFinalGrades,
  listCertificates,
  verifyCertificate,
  issueCertificateManually,
  generateReport
};

