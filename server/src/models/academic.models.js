const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Institution = sequelize.define('Institution', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    domain: { type: DataTypes.STRING(150), allowNull: true },
    address: { type: DataTypes.STRING(500), allowNull: true },
    contactEmail: { type: DataTypes.STRING(191), allowNull: true, field: 'contact_email' },
    passingGradeDefault: { type: DataTypes.DECIMAL(5, 2), defaultValue: 75.00, field: 'passing_grade_default' },
    gradingScale: { type: DataTypes.JSON, allowNull: true, field: 'grading_scale' },
    allowSelfEnrollment: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_self_enrollment' }
  }, {
    tableName: 'institutions'
  });

  const Department = sequelize.define('Department', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    institutionId: { type: DataTypes.INTEGER, allowNull: false, field: 'institution_id' },
    code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    headName: { type: DataTypes.STRING(150), allowNull: true, field: 'head_name' },
    status: { type: DataTypes.ENUM('active', 'archived'), defaultValue: 'active' }
  }, {
    tableName: 'departments',
    indexes: [{ fields: ['institution_id'] }, { fields: ['code'], unique: true }]
  });

  const Program = sequelize.define('Program', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    departmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'department_id' },
    code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    degreeType: { type: DataTypes.STRING(80), defaultValue: 'Bachelor', field: 'degree_type' },
    durationYears: { type: DataTypes.INTEGER, defaultValue: 4, field: 'duration_years' },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('active', 'archived'), defaultValue: 'active' }
  }, {
    tableName: 'programs',
    indexes: [{ fields: ['department_id'] }, { fields: ['code'], unique: true }]
  });

  const AcademicYear = sequelize.define('AcademicYear', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    institutionId: { type: DataTypes.INTEGER, allowNull: false, field: 'institution_id' },
    name: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
    isCurrent: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_current' },
    status: { type: DataTypes.ENUM('upcoming', 'active', 'completed', 'archived'), defaultValue: 'active' }
  }, {
    tableName: 'academic_years'
  });

  const Semester = sequelize.define('Semester', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    academicYearId: { type: DataTypes.INTEGER, allowNull: false, field: 'academic_year_id' },
    name: { type: DataTypes.STRING(80), allowNull: false },
    code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
    enrollmentStartDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'enrollment_start_date' },
    enrollmentEndDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'enrollment_end_date' },
    isCurrent: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_current' },
    status: { type: DataTypes.ENUM('upcoming', 'active', 'closed', 'archived'), defaultValue: 'active' }
  }, {
    tableName: 'semesters',
    indexes: [{ fields: ['academic_year_id'] }]
  });

  const Course = sequelize.define('Course', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    departmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'department_id' },
    programId: { type: DataTypes.INTEGER, allowNull: true, field: 'program_id' },
    code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(220), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    category: { type: DataTypes.STRING(100), defaultValue: 'Networking & Systems' },
    creditUnits: { type: DataTypes.INTEGER, defaultValue: 3, field: 'credit_units' },
    lectureHours: { type: DataTypes.INTEGER, defaultValue: 2, field: 'lecture_hours' },
    labHours: { type: DataTypes.INTEGER, defaultValue: 3, field: 'lab_hours' },
    level: { type: DataTypes.ENUM('Introductory', 'Intermediate', 'Advanced', 'Professional'), defaultValue: 'Intermediate' },
    deliveryMode: { type: DataTypes.ENUM('Instructor-Led', 'Self-Paced', 'Hybrid'), defaultValue: 'Instructor-Led', field: 'delivery_mode' },
    imageUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'image_url' },
    learningObjectives: { type: DataTypes.JSON, defaultValue: [], field: 'learning_objectives' },
    prerequisites: { type: DataTypes.JSON, defaultValue: [] },
    labSupportEnabled: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'lab_support_enabled' },
    publicationStatus: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'published',
      field: 'publication_status'
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' }
  }, {
    tableName: 'courses',
    indexes: [
      { fields: ['code'], unique: true },
      { fields: ['department_id'] },
      { fields: ['program_id'] },
      { fields: ['publication_status'] }
    ]
  });

  const CourseOffering = sequelize.define('CourseOffering', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    courseId: { type: DataTypes.INTEGER, allowNull: false, field: 'course_id' },
    academicYearId: { type: DataTypes.INTEGER, allowNull: false, field: 'academic_year_id' },
    semesterId: { type: DataTypes.INTEGER, allowNull: false, field: 'semester_id' },
    offeringCode: { type: DataTypes.STRING(80), allowNull: false, unique: true, field: 'offering_code' },
    titleOverride: { type: DataTypes.STRING(220), allowNull: true, field: 'title_override' },
    enrollmentPolicy: {
      type: DataTypes.ENUM('admin_only', 'instructor_approval', 'open_self_enroll'),
      defaultValue: 'open_self_enroll',
      field: 'enrollment_policy'
    },
    passingScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 75.00, field: 'passing_score' },
    certificateEnabled: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'certificate_enabled' },
    status: { type: DataTypes.ENUM('draft', 'published', 'completed', 'archived'), defaultValue: 'published' }
  }, {
    tableName: 'course_offerings',
    indexes: [
      { fields: ['course_id', 'semester_id'] },
      { fields: ['offering_code'], unique: true }
    ]
  });

  const ClassSection = sequelize.define('ClassSection', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    courseOfferingId: { type: DataTypes.INTEGER, allowNull: false, field: 'course_offering_id' },
    sectionCode: { type: DataTypes.STRING(60), allowNull: false, field: 'section_code' },
    name: { type: DataTypes.STRING(150), allowNull: false },
    room: { type: DataTypes.STRING(80), allowNull: true },
    schedule: { type: DataTypes.STRING(150), allowNull: true },
    capacity: { type: DataTypes.INTEGER, defaultValue: 40 },
    allowLateSubmissions: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_late_submissions' },
    latePenaltyPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 10.00, field: 'late_penalty_percent' },
    finalGradesStatus: {
      type: DataTypes.ENUM('in_progress', 'submitted_for_approval', 'approved', 'published', 'returned'),
      defaultValue: 'in_progress',
      field: 'final_grades_status'
    },
    finalGradesSubmittedAt: { type: DataTypes.DATE, allowNull: true, field: 'final_grades_submitted_at' },
    finalGradesApprovedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'final_grades_approved_by' },
    finalGradesApprovedAt: { type: DataTypes.DATE, allowNull: true, field: 'final_grades_approved_at' },
    status: { type: DataTypes.ENUM('active', 'closed', 'archived'), defaultValue: 'active' }
  }, {
    tableName: 'classes',
    indexes: [
      { fields: ['course_offering_id', 'section_code'], unique: true }
    ]
  });

  const InstructorAssignment = sequelize.define('InstructorAssignment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    classId: { type: DataTypes.INTEGER, allowNull: false, field: 'class_id' },
    instructorId: { type: DataTypes.INTEGER, allowNull: false, field: 'instructor_id' },
    isPrimary: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_primary' },
    assignedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'assigned_by' }
  }, {
    tableName: 'instructor_assignments',
    indexes: [{ fields: ['class_id', 'instructor_id'], unique: true }]
  });

  const TeachingAssistantAssignment = sequelize.define('TeachingAssistantAssignment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    classId: { type: DataTypes.INTEGER, allowNull: false, field: 'class_id' },
    taUserId: { type: DataTypes.INTEGER, allowNull: false, field: 'ta_user_id' },
    canViewRoster: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'can_view_roster' },
    canReviewSubmissions: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'can_review_submissions' },
    canApplyRubrics: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'can_apply_rubrics' },
    canManageDiscussions: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'can_manage_discussions' },
    canUploadResources: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'can_upload_resources' },
    assignedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'assigned_by' }
  }, {
    tableName: 'teaching_assistant_assignments',
    indexes: [{ fields: ['class_id', 'ta_user_id'], unique: true }]
  });

  const ClassMembership = sequelize.define('ClassMembership', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    classId: { type: DataTypes.INTEGER, allowNull: false, field: 'class_id' },
    studentId: { type: DataTypes.INTEGER, allowNull: false, field: 'student_id' },
    status: {
      type: DataTypes.ENUM('pending', 'enrolled', 'dropped', 'completed', 'transferred'),
      defaultValue: 'enrolled'
    },
    enrolledAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'enrolled_at' },
    enrolledBy: { type: DataTypes.INTEGER, allowNull: true, field: 'enrolled_by' },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
    finalNumericGrade: { type: DataTypes.DECIMAL(5, 2), allowNull: true, field: 'final_numeric_grade' },
    finalLetterGrade: { type: DataTypes.STRING(10), allowNull: true, field: 'final_letter_grade' },
    remarks: { type: DataTypes.STRING(255), allowNull: true }
  }, {
    tableName: 'class_memberships',
    indexes: [
      { fields: ['class_id', 'student_id'], unique: true },
      { fields: ['student_id'] },
      { fields: ['status'] }
    ]
  });

  return {
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
    ClassMembership
  };
};

