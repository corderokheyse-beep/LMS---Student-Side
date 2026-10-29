const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Assignment = sequelize.define('Assignment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    classId: { type: DataTypes.INTEGER, allowNull: false, field: 'class_id' },
    courseId: { type: DataTypes.INTEGER, allowNull: false, field: 'course_id' },
    moduleId: { type: DataTypes.INTEGER, allowNull: true, field: 'module_id' },
    gradeCategoryId: { type: DataTypes.INTEGER, allowNull: true, field: 'grade_category_id' },
    title: { type: DataTypes.STRING(220), allowNull: false },
    instructions: { type: DataTypes.TEXT('long'), allowNull: false },
    assignmentType: {
      type: DataTypes.ENUM('standard', 'programming', 'laboratory', 'network_config', 'project_milestone'),
      defaultValue: 'standard',
      field: 'assignment_type'
    },
    openDate: { type: DataTypes.DATE, allowNull: true, field: 'open_date' },
    dueDate: { type: DataTypes.DATE, allowNull: false, field: 'due_date' },
    cutoffDate: { type: DataTypes.DATE, allowNull: true, field: 'cutoff_date' },
    maxScore: { type: DataTypes.DECIMAL(6, 2), defaultValue: 100.00, field: 'max_score' },
    allowTextResponse: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_text_response' },
    allowFileSubmission: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_file_submission' },
    allowedFileTypes: { type: DataTypes.JSON, defaultValue: ['.pdf', '.zip', '.py', '.js', '.sql', '.pkt', '.txt', '.md', '.docx'], field: 'allowed_file_types' },
    maxFileSizeBytes: { type: DataTypes.INTEGER, defaultValue: 26214400, field: 'max_file_size_bytes' },
    maxAttempts: { type: DataTypes.INTEGER, defaultValue: 3, field: 'max_attempts' },
    allowLateSubmissions: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_late_submissions' },
    latePenaltyPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 10.00, field: 'late_penalty_percent' },
    allowResubmission: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_resubmission' },
    starterCode: { type: DataTypes.TEXT, allowNull: true, field: 'starter_code' },
    labWorksheetChecklist: { type: DataTypes.JSON, defaultValue: [], field: 'lab_worksheet_checklist' },
    publicationStatus: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'published',
      field: 'publication_status'
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' }
  }, {
    tableName: 'assignments',
    indexes: [{ fields: ['class_id'] }, { fields: ['course_id'] }, { fields: ['due_date'] }]
  });

  const AssignmentAttachment = sequelize.define('AssignmentAttachment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    assignmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'assignment_id' },
    title: { type: DataTypes.STRING(220), allowNull: false },
    storedFilename: { type: DataTypes.STRING(255), allowNull: false, field: 'stored_filename' },
    originalFilename: { type: DataTypes.STRING(255), allowNull: false, field: 'original_filename' },
    mimeType: { type: DataTypes.STRING(120), allowNull: false, field: 'mime_type' },
    fileSizeBytes: { type: DataTypes.INTEGER, allowNull: false, field: 'file_size_bytes' }
  }, {
    tableName: 'assignment_attachments'
  });

  const GradingRubric = sequelize.define('GradingRubric', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    assignmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'assignment_id' },
    title: { type: DataTypes.STRING(200), allowNull: false },
    totalPoints: { type: DataTypes.DECIMAL(6, 2), defaultValue: 100.00, field: 'total_points' }
  }, {
    tableName: 'grading_rubrics'
  });

  const RubricCriterion = sequelize.define('RubricCriterion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    rubricId: { type: DataTypes.INTEGER, allowNull: false, field: 'rubric_id' },
    criterionName: { type: DataTypes.STRING(200), allowNull: false, field: 'criterion_name' },
    description: { type: DataTypes.TEXT, allowNull: true },
    maxPoints: { type: DataTypes.DECIMAL(6, 2), allowNull: false, field: 'max_points' },
    orderIndex: { type: DataTypes.INTEGER, defaultValue: 1, field: 'order_index' }
  }, {
    tableName: 'rubric_criteria'
  });

  const Submission = sequelize.define('Submission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    assignmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'assignment_id' },
    classId: { type: DataTypes.INTEGER, allowNull: false, field: 'class_id' },
    studentId: { type: DataTypes.INTEGER, allowNull: false, field: 'student_id' },
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'late', 'under_review', 'graded', 'returned_for_revision', 'missing'),
      defaultValue: 'draft'
    },
    attemptNumber: { type: DataTypes.INTEGER, defaultValue: 1, field: 'attempt_number' },
    textResponse: { type: DataTypes.TEXT('long'), allowNull: true, field: 'text_response' },
    codeSubmission: { type: DataTypes.TEXT('long'), allowNull: true, field: 'code_submission' },
    repositoryUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'repository_url' },
    storedFilename: { type: DataTypes.STRING(255), allowNull: true, field: 'stored_filename' },
    originalFilename: { type: DataTypes.STRING(255), allowNull: true, field: 'original_filename' },
    mimeType: { type: DataTypes.STRING(120), allowNull: true, field: 'mime_type' },
    fileSizeBytes: { type: DataTypes.INTEGER, allowNull: true, field: 'file_size_bytes' },
    submittedAt: { type: DataTypes.DATE, allowNull: true, field: 'submitted_at' },
    isLate: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_late' },
    flaggedForInstructorReview: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'flagged_for_instructor_review' },
    flagReason: { type: DataTypes.STRING(500), allowNull: true, field: 'flag_reason' },
    preliminaryFeedback: { type: DataTypes.TEXT, allowNull: true, field: 'preliminary_feedback' },
    rubricEvaluation: { type: DataTypes.JSON, allowNull: true, field: 'rubric_evaluation' },
    score: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    feedback: { type: DataTypes.TEXT, allowNull: true },
    gradedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'graded_by' },
    gradedAt: { type: DataTypes.DATE, allowNull: true, field: 'graded_at' },
    isGradePublished: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_grade_published' }
  }, {
    tableName: 'submissions',
    indexes: [
      { fields: ['assignment_id', 'student_id'], unique: true },
      { fields: ['class_id'] },
      { fields: ['status'] }
    ]
  });

  const SubmissionVersion = sequelize.define('SubmissionVersion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    submissionId: { type: DataTypes.INTEGER, allowNull: false, field: 'submission_id' },
    versionNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'version_number' },
    textResponse: { type: DataTypes.TEXT('long'), allowNull: true, field: 'text_response' },
    codeSubmission: { type: DataTypes.TEXT('long'), allowNull: true, field: 'code_submission' },
    storedFilename: { type: DataTypes.STRING(255), allowNull: true, field: 'stored_filename' },
    originalFilename: { type: DataTypes.STRING(255), allowNull: true, field: 'original_filename' },
    submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'submitted_at' }
  }, {
    tableName: 'submission_versions'
  });

  const QuestionBank = sequelize.define('QuestionBank', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    courseId: { type: DataTypes.INTEGER, allowNull: false, field: 'course_id' },
    title: { type: DataTypes.STRING(200), allowNull: false },
    topic: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    isArchived: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_archived' },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' }
  }, {
    tableName: 'question_banks',
    indexes: [{ fields: ['course_id'] }]
  });

  const Question = sequelize.define('Question', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    questionBankId: { type: DataTypes.INTEGER, allowNull: false, field: 'question_bank_id' },
    courseId: { type: DataTypes.INTEGER, allowNull: false, field: 'course_id' },
    topic: { type: DataTypes.STRING(150), defaultValue: 'General' },
    questionType: {
      type: DataTypes.ENUM(
        'multiple_choice',
        'multiple_select',
        'true_false',
        'identification',
        'short_answer',
        'essay',
        'matching',
        'fill_in_the_blank'
      ),
      allowNull: false,
      field: 'question_type'
    },
    difficulty: {
      type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
      defaultValue: 'Medium'
    },
    prompt: { type: DataTypes.TEXT, allowNull: false },
    codeSnippet: { type: DataTypes.TEXT, allowNull: true, field: 'code_snippet' },
    points: { type: DataTypes.DECIMAL(5, 2), defaultValue: 2.00 },
    correctAnswerText: { type: DataTypes.TEXT, allowNull: true, field: 'correct_answer_text' },
    matchingPairs: { type: DataTypes.JSON, allowNull: true, field: 'matching_pairs' },
    explanation: { type: DataTypes.TEXT, allowNull: true },
    isArchived: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_archived' }
  }, {
    tableName: 'questions',
    indexes: [{ fields: ['question_bank_id'] }, { fields: ['course_id'] }, { fields: ['question_type'] }]
  });

  const QuestionOption = sequelize.define('QuestionOption', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    questionId: { type: DataTypes.INTEGER, allowNull: false, field: 'question_id' },
    optionText: { type: DataTypes.TEXT, allowNull: false, field: 'option_text' },
    isCorrect: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_correct' },
    orderIndex: { type: DataTypes.INTEGER, defaultValue: 1, field: 'order_index' }
  }, {
    tableName: 'question_options',
    indexes: [{ fields: ['question_id'] }]
  });

  const Assessment = sequelize.define('Assessment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    classId: { type: DataTypes.INTEGER, allowNull: false, field: 'class_id' },
    courseId: { type: DataTypes.INTEGER, allowNull: false, field: 'course_id' },
    moduleId: { type: DataTypes.INTEGER, allowNull: true, field: 'module_id' },
    gradeCategoryId: { type: DataTypes.INTEGER, allowNull: true, field: 'grade_category_id' },
    title: { type: DataTypes.STRING(220), allowNull: false },
    assessmentType: {
      type: DataTypes.ENUM('quiz', 'checkpoint_exam', 'final_exam', 'practical_exam'),
      defaultValue: 'quiz',
      field: 'assessment_type'
    },
    instructions: { type: DataTypes.TEXT, allowNull: false },
    startDate: { type: DataTypes.DATE, allowNull: true, field: 'start_date' },
    closeDate: { type: DataTypes.DATE, allowNull: false, field: 'close_date' },
    timeLimitMinutes: { type: DataTypes.INTEGER, defaultValue: 45, field: 'time_limit_minutes' },
    maxScore: { type: DataTypes.DECIMAL(6, 2), defaultValue: 100.00, field: 'max_score' },
    passingScore: { type: DataTypes.DECIMAL(6, 2), defaultValue: 75.00, field: 'passing_score' },
    maxAttempts: { type: DataTypes.INTEGER, defaultValue: 2, field: 'max_attempts' },
    randomizeQuestions: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'randomize_questions' },
    randomizeOptions: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'randomize_options' },
    autoPublishResults: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'auto_publish_results' },
    allowReviewAfterSubmit: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_review_after_submit' },
    allowLateAttempts: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'allow_late_attempts' },
    publicationStatus: {
      type: DataTypes.ENUM('draft', 'published', 'closed'),
      defaultValue: 'published',
      field: 'publication_status'
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' }
  }, {
    tableName: 'assessments',
    indexes: [{ fields: ['class_id'] }, { fields: ['course_id'] }]
  });

  const AssessmentQuestion = sequelize.define('AssessmentQuestion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    assessmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'assessment_id' },
    questionId: { type: DataTypes.INTEGER, allowNull: false, field: 'question_id' },
    pointsOverride: { type: DataTypes.DECIMAL(5, 2), allowNull: true, field: 'points_override' },
    orderIndex: { type: DataTypes.INTEGER, defaultValue: 1, field: 'order_index' }
  }, {
    tableName: 'assessment_questions',
    indexes: [{ fields: ['assessment_id', 'question_id'], unique: true }]
  });

  const AssessmentAttempt = sequelize.define('AssessmentAttempt', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    assessmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'assessment_id' },
    classId: { type: DataTypes.INTEGER, allowNull: false, field: 'class_id' },
    studentId: { type: DataTypes.INTEGER, allowNull: false, field: 'student_id' },
    attemptNumber: { type: DataTypes.INTEGER, defaultValue: 1, field: 'attempt_number' },
    status: {
      type: DataTypes.ENUM('in_progress', 'submitted', 'graded', 'expired'),
      defaultValue: 'in_progress'
    },
    startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'started_at' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    submittedAt: { type: DataTypes.DATE, allowNull: true, field: 'submitted_at' },
    autoScore: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0.00, field: 'auto_score' },
    manualScore: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0.00, field: 'manual_score' },
    totalScore: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0.00, field: 'total_score' },
    RequiresManualGrading: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'requires_manual_grading' },
    isPublished: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_published' },
    instructorFeedback: { type: DataTypes.TEXT, allowNull: true, field: 'instructor_feedback' },
    gradedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'graded_by' },
    gradedAt: { type: DataTypes.DATE, allowNull: true, field: 'graded_at' }
  }, {
    tableName: 'assessment_attempts',
    indexes: [
      { fields: ['assessment_id', 'student_id'] },
      { fields: ['class_id'] }
    ]
  });

  const AssessmentAnswer = sequelize.define('AssessmentAnswer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    attemptId: { type: DataTypes.INTEGER, allowNull: false, field: 'attempt_id' },
    questionId: { type: DataTypes.INTEGER, allowNull: false, field: 'question_id' },
    selectedOptionIds: { type: DataTypes.JSON, allowNull: true, field: 'selected_option_ids' },
    textAnswer: { type: DataTypes.TEXT, allowNull: true, field: 'text_answer' },
    matchingResponse: { type: DataTypes.JSON, allowNull: true, field: 'matching_response' },
    isCorrect: { type: DataTypes.BOOLEAN, allowNull: true, field: 'is_correct' },
    pointsAwarded: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00, field: 'points_awarded' },
    feedback: { type: DataTypes.TEXT, allowNull: true },
    gradedManually: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'graded_manually' }
  }, {
    tableName: 'assessment_answers',
    indexes: [{ fields: ['attempt_id', 'question_id'], unique: true }]
  });

  return {
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
    AssessmentAnswer
  };
};

