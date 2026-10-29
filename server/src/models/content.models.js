const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Module = sequelize.define('Module', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    courseId: { type: DataTypes.INTEGER, allowNull: false, field: 'course_id' },
    title: { type: DataTypes.STRING(220), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    orderIndex: { type: DataTypes.INTEGER, defaultValue: 1, field: 'order_index' },
    prerequisiteModuleId: { type: DataTypes.INTEGER, allowNull: true, field: 'prerequisite_module_id' },
    publicationStatus: {
      type: DataTypes.ENUM('draft', 'published', 'scheduled'),
      defaultValue: 'published',
      field: 'publication_status'
    },
    publishAt: { type: DataTypes.DATE, allowNull: true, field: 'publish_at' },
    estimatedMinutes: { type: DataTypes.INTEGER, defaultValue: 60, field: 'estimated_minutes' }
  }, {
    tableName: 'modules',
    indexes: [{ fields: ['course_id', 'order_index'] }]
  });

  const Lesson = sequelize.define('Lesson', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    moduleId: { type: DataTypes.INTEGER, allowNull: false, field: 'module_id' },
    courseId: { type: DataTypes.INTEGER, allowNull: false, field: 'course_id' },
    title: { type: DataTypes.STRING(220), allowNull: false },
    slug: { type: DataTypes.STRING(220), allowNull: true },
    lessonType: {
      type: DataTypes.ENUM('reading', 'video', 'laboratory', 'coding_exercise', 'interactive'),
      defaultValue: 'reading',
      field: 'lesson_type'
    },
    orderIndex: { type: DataTypes.INTEGER, defaultValue: 1, field: 'order_index' },
    summary: { type: DataTypes.TEXT, allowNull: true },
    contentHtml: { type: DataTypes.TEXT('long'), allowNull: false, field: 'content_html' },
    codeSnippet: { type: DataTypes.TEXT, allowNull: true, field: 'code_snippet' },
    codeLanguage: { type: DataTypes.STRING(40), allowNull: true, field: 'code_language' },
    videoUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'video_url' },
    labTopologyData: { type: DataTypes.JSON, allowNull: true, field: 'lab_topology_data' },
    learningObjectives: { type: DataTypes.JSON, defaultValue: [], field: 'learning_objectives' },
    estimatedMinutes: { type: DataTypes.INTEGER, defaultValue: 30, field: 'estimated_minutes' },
    prerequisiteLessonId: { type: DataTypes.INTEGER, allowNull: true, field: 'prerequisite_lesson_id' },
    publicationStatus: {
      type: DataTypes.ENUM('draft', 'published', 'scheduled'),
      defaultValue: 'published',
      field: 'publication_status'
    },
    publishAt: { type: DataTypes.DATE, allowNull: true, field: 'publish_at' }
  }, {
    tableName: 'lessons',
    indexes: [
      { fields: ['module_id', 'order_index'] },
      { fields: ['course_id'] },
      { fields: ['publication_status'] }
    ]
  });

  const LearningResource = sequelize.define('LearningResource', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    courseId: { type: DataTypes.INTEGER, allowNull: false, field: 'course_id' },
    moduleId: { type: DataTypes.INTEGER, allowNull: true, field: 'module_id' },
    lessonId: { type: DataTypes.INTEGER, allowNull: true, field: 'lesson_id' },
    title: { type: DataTypes.STRING(220), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    resourceType: {
      type: DataTypes.ENUM('pdf', 'presentation', 'document', 'archive', 'packet_tracer', 'code', 'video', 'external_link', 'worksheet'),
      defaultValue: 'pdf',
      field: 'resource_type'
    },
    fileUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'file_url' },
    storedFilename: { type: DataTypes.STRING(255), allowNull: true, field: 'stored_filename' },
    originalFilename: { type: DataTypes.STRING(255), allowNull: true, field: 'original_filename' },
    mimeType: { type: DataTypes.STRING(120), allowNull: true, field: 'mime_type' },
    fileSizeBytes: { type: DataTypes.INTEGER, allowNull: true, field: 'file_size_bytes' },
    externalUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'external_url' },
    isDownloadable: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_downloadable' },
    uploadedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'uploaded_by' }
  }, {
    tableName: 'learning_resources',
    indexes: [{ fields: ['course_id'] }, { fields: ['lesson_id'] }]
  });

  const LessonProgress = sequelize.define('LessonProgress', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    classId: { type: DataTypes.INTEGER, allowNull: false, field: 'class_id' },
    courseId: { type: DataTypes.INTEGER, allowNull: false, field: 'course_id' },
    lessonId: { type: DataTypes.INTEGER, allowNull: false, field: 'lesson_id' },
    studentId: { type: DataTypes.INTEGER, allowNull: false, field: 'student_id' },
    status: {
      type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
      defaultValue: 'in_progress'
    },
    timeSpentSeconds: { type: DataTypes.INTEGER, defaultValue: 0, field: 'time_spent_seconds' },
    lastAccessedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'last_accessed_at' },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' }
  }, {
    tableName: 'lesson_progress',
    indexes: [
      { fields: ['class_id', 'lesson_id', 'student_id'], unique: true },
      { fields: ['student_id'] }
    ]
  });

  const CourseProgress = sequelize.define('CourseProgress', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    classId: { type: DataTypes.INTEGER, allowNull: false, field: 'class_id' },
    courseId: { type: DataTypes.INTEGER, allowNull: false, field: 'course_id' },
    studentId: { type: DataTypes.INTEGER, allowNull: false, field: 'student_id' },
    completedLessonsCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'completed_lessons_count' },
    totalLessonsCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_lessons_count' },
    completedAssignmentsCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'completed_assignments_count' },
    totalAssignmentsCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_assignments_count' },
    completedAssessmentsCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'completed_assessments_count' },
    totalAssessmentsCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_assessments_count' },
    progressPercentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00, field: 'progress_percentage' },
    lastLessonId: { type: DataTypes.INTEGER, allowNull: true, field: 'last_lesson_id' },
    lastAccessedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'last_accessed_at' },
    isCompleted: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_completed' },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
    certificateEligible: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'certificate_eligible' }
  }, {
    tableName: 'course_progress',
    indexes: [
      { fields: ['class_id', 'student_id'], unique: true },
      { fields: ['student_id'] }
    ]
  });

  return {
    Module,
    Lesson,
    LearningResource,
    LessonProgress,
    CourseProgress
  };
};

