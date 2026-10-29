const argon2 = require('argon2');
const {
  sequelize,
  Institution,
  Department,
  Program,
  AcademicYear,
  Semester,
  Course,
  CourseOffering,
  ClassSection,
  InstructorAssignment,
  TeachingAssistantAssignment,
  ClassMembership,
  GradeCategory,
  Module,
  Lesson,
  LearningResource,
  CourseProgress,
  User,
  Role,
  UserRole
} = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { recordAudit } = require('../utils/auditLogger');
const { createNotification } = require('../utils/notifyUser');
const { recalculateStudentCourseProgress } = require('../services/progress.service');
const {
  departmentSchema,
  programSchema,
  academicYearSchema,
  semesterSchema,
  courseSchema,
  courseOfferingSchema,
  classSectionSchema
} = require('../validators/schemas');

// Institutions
async function getInstitution(req, res, next) {
  try {
    const institution = await Institution.findOne();
    return res.status(200).json({ success: true, data: { institution } });
  } catch (err) {
    return next(err);
  }
}

async function updateInstitution(req, res, next) {
  try {
    const institution = await Institution.findOne();
    if (!institution) throw new AppError('Institution record not found.', 404);
    await institution.update(req.body);
    await recordAudit({
      req,
      action: 'INSTITUTION_UPDATED',
      category: 'academic',
      entityType: 'Institution',
      entityId: institution.id
    });
    return res.status(200).json({ success: true, message: 'Institution settings updated.', data: { institution } });
  } catch (err) {
    return next(err);
  }
}

// Departments
async function listDepartments(req, res, next) {
  try {
    const departments = await Department.findAll({
      include: [
        { model: Program, as: 'programs' },
        { model: Course, as: 'courses', attributes: ['id', 'code', 'title'] }
      ],
      order: [['code', 'ASC']]
    });
    return res.status(200).json({ success: true, data: { departments } });
  } catch (err) {
    return next(err);
  }
}

async function createDepartment(req, res, next) {
  try {
    const payload = departmentSchema.parse(req.body);
    const inst = await Institution.findOne();
    const department = await Department.create({
      institutionId: inst?.id || 1,
      ...payload
    });
    await recordAudit({
      req,
      action: 'DEPARTMENT_CREATED',
      category: 'academic',
      entityType: 'Department',
      entityId: department.id,
      metadata: payload
    });
    return res.status(201).json({ success: true, message: 'Department created.', data: { department } });
  } catch (err) {
    return next(err);
  }
}

async function updateDepartment(req, res, next) {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) throw new AppError('Department not found.', 404);
    await department.update(req.body);
    return res.status(200).json({ success: true, message: 'Department updated.', data: { department } });
  } catch (err) {
    return next(err);
  }
}

async function deleteDepartment(req, res, next) {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');

    const [coursesCount, programsCount] = await Promise.all([
      Course.count({ where: { departmentId: department.id } }),
      Program.count({ where: { departmentId: department.id } })
    ]);

    if (coursesCount > 0 || programsCount > 0) {
      throw new AppError(
        `Cannot delete department "${department.code}" because it is referenced by ${coursesCount} course(s) and ${programsCount} program(s). Archive or deactivate it instead.`,
        409,
        'REFERENCED_RECORD_PROTECTED'
      );
    }

    await department.destroy();
    await recordAudit({
      req,
      action: 'DEPARTMENT_DELETED',
      category: 'academic',
      entityType: 'Department',
      entityId: department.id
    });

    return res.status(200).json({
      success: true,
      message: 'Department deleted successfully.'
    });
  } catch (err) {
    return next(err);
  }
}

async function getPublicCatalog(req, res, next) {
  try {
    const courses = await Course.findAll({
      where: { publicationStatus: 'published' },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'code', 'name'] },
        { model: Program, as: 'program', attributes: ['id', 'code', 'name'] }
      ],
      order: [['code', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: { courses }
    });
  } catch (err) {
    return next(err);
  }
}

// Programs
async function listPrograms(req, res, next) {
  try {
    const programs = await Program.findAll({
      include: [{ model: Department, as: 'department' }],
      order: [['code', 'ASC']]
    });
    return res.status(200).json({ success: true, data: { programs } });
  } catch (err) {
    return next(err);
  }
}

async function createProgram(req, res, next) {
  try {
    const payload = programSchema.parse(req.body);
    const program = await Program.create(payload);
    await recordAudit({
      req,
      action: 'PROGRAM_CREATED',
      category: 'academic',
      entityType: 'Program',
      entityId: program.id,
      metadata: payload
    });
    return res.status(201).json({ success: true, message: 'Academic program created.', data: { program } });
  } catch (err) {
    return next(err);
  }
}

async function updateProgram(req, res, next) {
  try {
    const program = await Program.findByPk(req.params.id);
    if (!program) throw new AppError('Program not found.', 404);
    await program.update(req.body);
    return res.status(200).json({ success: true, message: 'Program updated.', data: { program } });
  } catch (err) {
    return next(err);
  }
}

// Academic Years & Semesters
async function listAcademicYears(req, res, next) {
  try {
    const academicYears = await AcademicYear.findAll({
      include: [{ model: Semester, as: 'semesters' }],
      order: [['startDate', 'DESC']]
    });
    return res.status(200).json({ success: true, data: { academicYears } });
  } catch (err) {
    return next(err);
  }
}

async function createAcademicYear(req, res, next) {
  try {
    const payload = academicYearSchema.parse(req.body);
    const inst = await Institution.findOne();
    if (payload.isCurrent) {
      await AcademicYear.update({ isCurrent: false }, { where: {} });
    }
    const academicYear = await AcademicYear.create({
      institutionId: inst?.id || 1,
      ...payload
    });
    return res.status(201).json({ success: true, message: 'Academic year created.', data: { academicYear } });
  } catch (err) {
    return next(err);
  }
}

async function listSemesters(req, res, next) {
  try {
    const semesters = await Semester.findAll({
      include: [{ model: AcademicYear, as: 'academicYear' }],
      order: [['startDate', 'DESC']]
    });
    return res.status(200).json({ success: true, data: { semesters } });
  } catch (err) {
    return next(err);
  }
}

async function createSemester(req, res, next) {
  try {
    const payload = semesterSchema.parse(req.body);
    if (payload.isCurrent) {
      await Semester.update({ isCurrent: false }, { where: {} });
    }
    const semester = await Semester.create(payload);
    return res.status(201).json({ success: true, message: 'Semester created.', data: { semester } });
  } catch (err) {
    return next(err);
  }
}

// Courses (Reusable Academic Subject)
async function listCourses(req, res, next) {
  try {
    const { departmentId, category, publicationStatus } = req.query;
    const where = {};
    if (departmentId) where.departmentId = Number(departmentId);
    if (category) where.category = category;
    if (publicationStatus) {
      where.publicationStatus = publicationStatus;
    } else if (req.user.primaryRole === 'student') {
      where.publicationStatus = 'published';
    }

    const courses = await Course.findAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'code', 'name'] },
        { model: Program, as: 'program', attributes: ['id', 'code', 'name'] },
        {
          model: Module,
          as: 'modules',
          include: [{ model: Lesson, as: 'lessons', attributes: ['id', 'title', 'lessonType', 'orderIndex', 'publicationStatus', 'estimatedMinutes'] }]
        },
        {
          model: CourseOffering,
          as: 'offerings',
          include: [
            { model: Semester, as: 'semester' },
            {
              model: ClassSection,
              as: 'classes',
              include: [
                {
                  model: InstructorAssignment,
                  as: 'instructorAssignments',
                  include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] }]
                },
                { model: ClassMembership, as: 'memberships', attributes: ['id', 'studentId', 'status'] }
              ]
            }
          ]
        }
      ],
      order: [['code', 'ASC']]
    });

    return res.status(200).json({ success: true, data: { courses } });
  } catch (err) {
    return next(err);
  }
}

async function getCourseById(req, res, next) {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        { model: Department, as: 'department' },
        { model: Program, as: 'program' },
        {
          model: Module,
          as: 'modules',
          include: [
            {
              model: Lesson,
              as: 'lessons',
              include: [{ model: LearningResource, as: 'resources' }]
            },
            { model: LearningResource, as: 'resources' }
          ]
        },
        { model: LearningResource, as: 'resources' },
        {
          model: CourseOffering,
          as: 'offerings',
          include: [
            { model: Semester, as: 'semester' },
            { model: ClassSection, as: 'classes' }
          ]
        }
      ],
      order: [
        [{ model: Module, as: 'modules' }, 'orderIndex', 'ASC'],
        [{ model: Module, as: 'modules' }, { model: Lesson, as: 'lessons' }, 'orderIndex', 'ASC']
      ]
    });

    if (!course) throw new AppError('Course not found.', 404, 'COURSE_NOT_FOUND');

    return res.status(200).json({ success: true, data: { course } });
  } catch (err) {
    return next(err);
  }
}

async function createCourse(req, res, next) {
  try {
    const payload = courseSchema.parse(req.body);
    const course = await Course.create({
      ...payload,
      createdBy: req.user.id
    });

    await recordAudit({
      req,
      action: 'COURSE_CREATED',
      category: 'course',
      entityType: 'Course',
      entityId: course.id,
      metadata: { code: course.code, title: course.title }
    });

    return res.status(201).json({ success: true, message: 'Course created successfully.', data: { course } });
  } catch (err) {
    return next(err);
  }
}

async function updateCourse(req, res, next) {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) throw new AppError('Course not found.', 404);
    await course.update(req.body);
    await recordAudit({
      req,
      action: 'COURSE_UPDATED',
      category: 'course',
      entityType: 'Course',
      entityId: course.id
    });
    return res.status(200).json({ success: true, message: 'Course updated.', data: { course } });
  } catch (err) {
    return next(err);
  }
}

// Course Offerings
async function listCourseOfferings(req, res, next) {
  try {
    const offerings = await CourseOffering.findAll({
      include: [
        { model: Course, as: 'course' },
        { model: AcademicYear, as: 'academicYear' },
        { model: Semester, as: 'semester' },
        {
          model: ClassSection,
          as: 'classes',
          include: [
            {
              model: InstructorAssignment,
              as: 'instructorAssignments',
              include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] }]
            },
            { model: ClassMembership, as: 'memberships', attributes: ['id', 'studentId', 'status'] }
          ]
        }
      ],
      order: [['id', 'DESC']]
    });
    return res.status(200).json({ success: true, data: { offerings } });
  } catch (err) {
    return next(err);
  }
}

async function createCourseOffering(req, res, next) {
  try {
    const payload = courseOfferingSchema.parse(req.body);
    const offering = await CourseOffering.create(payload);
    await recordAudit({
      req,
      action: 'COURSE_OFFERING_CREATED',
      category: 'academic',
      entityType: 'CourseOffering',
      entityId: offering.id,
      metadata: payload
    });
    return res.status(201).json({ success: true, message: 'Course offering created.', data: { offering } });
  } catch (err) {
    return next(err);
  }
}

async function updateCourseOffering(req, res, next) {
  try {
    const offering = await CourseOffering.findByPk(req.params.id);
    if (!offering) throw new AppError('Course offering not found.', 404);
    await offering.update(req.body);
    return res.status(200).json({ success: true, message: 'Course offering updated.', data: { offering } });
  } catch (err) {
    return next(err);
  }
}

// Classes / Sections
async function listClasses(req, res, next) {
  try {
    const role = req.user.primaryRole;
    const where = {};

    if (role === 'instructor') {
      const assigned = await InstructorAssignment.findAll({ where: { instructorId: req.user.id } });
      where.id = assigned.map((a) => a.classId);
    } else if (role === 'teaching_assistant') {
      const assigned = await TeachingAssistantAssignment.findAll({ where: { taUserId: req.user.id } });
      where.id = assigned.map((a) => a.classId);
    }

    const classes = await ClassSection.findAll({
      where,
      include: [
        {
          model: CourseOffering,
          as: 'courseOffering',
          include: [
            { model: Course, as: 'course' },
            { model: Semester, as: 'semester' },
            { model: AcademicYear, as: 'academicYear' }
          ]
        },
        {
          model: InstructorAssignment,
          as: 'instructorAssignments',
          include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        },
        {
          model: TeachingAssistantAssignment,
          as: 'taAssignments',
          include: [{ model: User, as: 'teachingAssistant', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        },
        {
          model: ClassMembership,
          as: 'memberships',
          include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] }]
        }
      ],
      order: [['id', 'ASC']]
    });

    return res.status(200).json({ success: true, data: { classes } });
  } catch (err) {
    return next(err);
  }
}

async function getClassById(req, res, next) {
  try {
    const classSection = await ClassSection.findByPk(req.params.id, {
      include: [
        {
          model: CourseOffering,
          as: 'courseOffering',
          include: [
            {
              model: Course,
              as: 'course',
              include: [
                {
                  model: Module,
                  as: 'modules',
                  include: [{ model: Lesson, as: 'lessons' }]
                },
                { model: LearningResource, as: 'resources' }
              ]
            },
            { model: Semester, as: 'semester' }
          ]
        },
        {
          model: InstructorAssignment,
          as: 'instructorAssignments',
          include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        },
        {
          model: TeachingAssistantAssignment,
          as: 'taAssignments',
          include: [{ model: User, as: 'teachingAssistant', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        },
        {
          model: ClassMembership,
          as: 'memberships',
          include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] }]
        },
        { model: GradeCategory, as: 'gradeCategories' }
      ]
    });

    if (!classSection) throw new AppError('Class section not found.', 404);
    return res.status(200).json({ success: true, data: { classSection } });
  } catch (err) {
    return next(err);
  }
}

async function createClassSection(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const payload = classSectionSchema.parse(req.body);
    const classSection = await ClassSection.create({
      courseOfferingId: payload.courseOfferingId,
      sectionCode: payload.sectionCode,
      name: payload.name,
      room: payload.room || null,
      schedule: payload.schedule || null,
      capacity: payload.capacity || 40,
      allowLateSubmissions: payload.allowLateSubmissions ?? true,
      latePenaltyPercent: payload.latePenaltyPercent ?? 10
    }, { transaction: t });

    // Seed default weighted grade categories (20 / 25 / 25 / 30)
    await GradeCategory.bulkCreate([
      { classId: classSection.id, name: 'Quizzes', categoryType: 'quiz', weightPercent: 20, orderIndex: 1 },
      { classId: classSection.id, name: 'Assignments', categoryType: 'assignment', weightPercent: 25, orderIndex: 2 },
      { classId: classSection.id, name: 'Laboratory Activities', categoryType: 'laboratory', weightPercent: 25, orderIndex: 3 },
      { classId: classSection.id, name: 'Major Examination', categoryType: 'major_exam', weightPercent: 30, orderIndex: 4 }
    ], { transaction: t });

    if (payload.instructorId) {
      await InstructorAssignment.create({
        classId: classSection.id,
        instructorId: payload.instructorId,
        isPrimary: true,
        assignedBy: req.user.id
      }, { transaction: t });
    }

    await t.commit();

    await recordAudit({
      req,
      action: 'CLASS_SECTION_CREATED',
      category: 'academic',
      entityType: 'ClassSection',
      entityId: classSection.id,
      metadata: payload
    });

    return res.status(201).json({
      success: true,
      message: 'Class section created with default grading categories.',
      data: { classSection }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function assignInstructorToClass(req, res, next) {
  try {
    const classId = Number(req.params.id);
    const { instructorId, isPrimary = true } = req.body;

    const [assignment] = await InstructorAssignment.findOrCreate({
      where: { classId, instructorId: Number(instructorId) },
      defaults: { classId, instructorId: Number(instructorId), isPrimary, assignedBy: req.user.id }
    });

    await recordAudit({
      req,
      action: 'INSTRUCTOR_ASSIGNED_TO_CLASS',
      category: 'academic',
      entityType: 'ClassSection',
      entityId: classId,
      metadata: { instructorId }
    });

    return res.status(200).json({
      success: true,
      message: 'Instructor assigned to class section.',
      data: { assignment }
    });
  } catch (err) {
    return next(err);
  }
}

async function assignTaToClass(req, res, next) {
  try {
    const classId = Number(req.params.id);
    const {
      taUserId,
      canViewRoster = true,
      canReviewSubmissions = true,
      canApplyRubrics = true,
      canManageDiscussions = true,
      canUploadResources = false
    } = req.body;

    const [taAssignment, created] = await TeachingAssistantAssignment.findOrCreate({
      where: { classId, taUserId: Number(taUserId) },
      defaults: {
        classId,
        taUserId: Number(taUserId),
        canViewRoster,
        canReviewSubmissions,
        canApplyRubrics,
        canManageDiscussions,
        canUploadResources,
        assignedBy: req.user.id
      }
    });

    if (!created) {
      await taAssignment.update({
        canViewRoster,
        canReviewSubmissions,
        canApplyRubrics,
        canManageDiscussions,
        canUploadResources
      });
    }

    await recordAudit({
      req,
      action: 'TA_ASSIGNED_OR_UPDATED',
      category: 'academic',
      entityType: 'ClassSection',
      entityId: classId,
      metadata: { taUserId, canReviewSubmissions, canApplyRubrics, canUploadResources }
    });

    return res.status(200).json({
      success: true,
      message: 'Teaching assistant assignment and class permissions saved.',
      data: { taAssignment }
    });
  } catch (err) {
    return next(err);
  }
}

// Enrollments & CSV Import
async function listEnrollments(req, res, next) {
  try {
    const { classId, studentId } = req.query;
    const where = {};
    if (classId) where.classId = Number(classId);
    if (studentId) where.studentId = Number(studentId);
    if (req.user.primaryRole === 'student') {
      where.studentId = req.user.id;
    }

    const enrollments = await ClassMembership.findAll({
      where,
      include: [
        { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] },
        {
          model: ClassSection,
          as: 'classSection',
          include: [
            {
              model: CourseOffering,
              as: 'courseOffering',
              include: [{ model: Course, as: 'course' }, { model: Semester, as: 'semester' }]
            }
          ]
        }
      ],
      order: [['id', 'DESC']]
    });

    return res.status(200).json({ success: true, data: { enrollments } });
  } catch (err) {
    return next(err);
  }
}

async function enrollStudent(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const classId = Number(req.body.classId);
    const studentId = req.user.primaryRole === 'student'
      ? req.user.id
      : Number(req.body.studentId);

    if (!classId || !studentId) {
      throw new AppError('classId and studentId are required.', 400);
    }

    const classSection = await ClassSection.findByPk(classId, {
      include: [
        { model: CourseOffering, as: 'courseOffering', include: [{ model: Course, as: 'course' }] },
        { model: ClassMembership, as: 'memberships' }
      ],
      transaction: t
    });

    if (!classSection) throw new AppError('Class section not found.', 404);

    if (req.user.primaryRole === 'student' && classSection.courseOffering?.enrollmentPolicy === 'admin_only') {
      throw new AppError('This class section requires administrator enrollment.', 403, 'ENROLLMENT_RESTRICTED');
    }

    const existing = await ClassMembership.findOne({
      where: { classId, studentId },
      transaction: t
    });

    if (existing && existing.status === 'enrolled') {
      throw new AppError('Student is already enrolled in this class section.', 409, 'DUPLICATE_ENROLLMENT');
    }

    const status = (req.user.primaryRole === 'student' && classSection.courseOffering?.enrollmentPolicy === 'instructor_approval')
      ? 'pending'
      : 'enrolled';

    let membership;
    if (existing) {
      membership = await existing.update({ status, enrolledAt: new Date(), enrolledBy: req.user.id }, { transaction: t });
    } else {
      membership = await ClassMembership.create({
        classId,
        studentId,
        status,
        enrolledBy: req.user.id
      }, { transaction: t });
    }

    await t.commit();

    await recalculateStudentCourseProgress(classId, studentId);

    await createNotification({
      userId: studentId,
      type: 'enrollment',
      title: `Enrolled in ${classSection.name}`,
      message: `You have been enrolled in ${classSection.name} (${classSection.courseOffering?.course?.code || ''}).`,
      destinationUrl: '/student/courses'
    });

    await recordAudit({
      req,
      action: 'STUDENT_ENROLLED',
      category: 'academic',
      entityType: 'ClassMembership',
      entityId: membership.id,
      metadata: { classId, studentId, status }
    });

    return res.status(201).json({
      success: true,
      message: 'Student enrolled successfully.',
      data: { membership }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function transferStudentSection(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { fromClassId, toClassId, studentId } = req.body;
    const current = await ClassMembership.findOne({
      where: { classId: Number(fromClassId), studentId: Number(studentId) },
      transaction: t
    });

    if (!current) throw new AppError('Source enrollment record not found.', 404);

    await current.update({ status: 'transferred', remarks: `Transferred to class #${toClassId}` }, { transaction: t });

    const [targetMembership] = await ClassMembership.findOrCreate({
      where: { classId: Number(toClassId), studentId: Number(studentId) },
      defaults: {
        classId: Number(toClassId),
        studentId: Number(studentId),
        status: 'enrolled',
        enrolledBy: req.user.id
      },
      transaction: t
    });

    if (targetMembership.status !== 'enrolled') {
      await targetMembership.update({ status: 'enrolled' }, { transaction: t });
    }

    await t.commit();

    await recordAudit({
      req,
      action: 'STUDENT_SECTION_TRANSFERRED',
      category: 'academic',
      entityType: 'ClassMembership',
      entityId: targetMembership.id,
      metadata: { fromClassId, toClassId, studentId }
    });

    return res.status(200).json({
      success: true,
      message: 'Student transferred to new section.',
      data: { membership: targetMembership }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function importRecordsCsv(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { csvText, classId, defaultRole = 'student' } = req.body;
    if (!csvText || typeof csvText !== 'string') {
      throw new AppError('csvText is required (format: firstName,lastName,email,studentNumber).', 400);
    }

    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.toLowerCase().startsWith('firstname'));

    const role = await Role.findOne({ where: { slug: defaultRole }, transaction: t });
    const defaultPasswordHash = await argon2.hash('Stud@12345', { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

    const imported = [];
    for (const line of lines) {
      const [firstName, lastName, email, identifier] = line.split(',').map((s) => s?.trim());
      if (!firstName || !lastName || !email) continue;

      const normalizedEmail = email.toLowerCase();
      let user = await User.findOne({ where: { email: normalizedEmail }, transaction: t });

      if (!user) {
        user = await User.create({
          firstName,
          lastName,
          email: normalizedEmail,
          passwordHash: defaultPasswordHash,
          studentNumber: defaultRole === 'student' ? (identifier || null) : null,
          employeeNumber: defaultRole !== 'student' ? (identifier || null) : null,
          status: 'active'
        }, { transaction: t });

        if (role) {
          await UserRole.create({ userId: user.id, roleId: role.id, assignedBy: req.user.id }, { transaction: t });
        }
      }

      if (classId && defaultRole === 'student') {
        await ClassMembership.findOrCreate({
          where: { classId: Number(classId), studentId: user.id },
          defaults: { classId: Number(classId), studentId: user.id, status: 'enrolled', enrolledBy: req.user.id },
          transaction: t
        });
      }

      imported.push({ id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}` });
    }

    await t.commit();

    await recordAudit({
      req,
      action: 'CSV_RECORDS_IMPORTED',
      category: 'academic',
      metadata: { count: imported.length, classId, defaultRole }
    });

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${imported.length} record(s).`,
      data: { importedCount: imported.length, records: imported }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

module.exports = {
  getInstitution,
  updateInstitution,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getPublicCatalog,
  listPrograms,
  createProgram,
  updateProgram,
  listAcademicYears,
  createAcademicYear,
  listSemesters,
  createSemester,
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  listCourseOfferings,
  createCourseOffering,
  updateCourseOffering,
  listClasses,
  getClassById,
  createClassSection,
  assignInstructorToClass,
  assignTaToClass,
  listEnrollments,
  enrollStudent,
  transferStudentSection,
  importRecordsCsv
};

