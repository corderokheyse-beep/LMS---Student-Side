const { sequelize, Sequelize } = require('../config/database');
const initIamModels = require('./iam.models');
const initAcademicModels = require('./academic.models');
const initContentModels = require('./content.models');
const initAssessmentModels = require('./assessment.models');
const initGradingModels = require('./grading.models');
const initCommunicationModels = require('./communication.models');

const iam = initIamModels(sequelize);
const academic = initAcademicModels(sequelize);
const content = initContentModels(sequelize);
const assessment = initAssessmentModels(sequelize);
const grading = initGradingModels(sequelize);
const communication = initCommunicationModels(sequelize);

const models = {
  ...iam,
  ...academic,
  ...content,
  ...assessment,
  ...grading,
  ...communication
};

const {
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  SystemSetting,
  AuditLog,
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
  Module,
  Lesson,
  LearningResource,
  LessonProgress,
  CourseProgress,
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
  GradeCategory,
  Grade,
  GradeHistory,
  Certificate,
  Announcement,
  DiscussionThread,
  DiscussionPost,
  Conversation,
  ConversationMember,
  Message,
  Notification
} = models;

// 1. IAM Associations
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'roleId', otherKey: 'permissionId', as: 'permissions' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permissionId', otherKey: 'roleId', as: 'roles' });

User.belongsToMany(Role, { through: UserRole, foreignKey: 'userId', otherKey: 'roleId', as: 'roles' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'roleId', otherKey: 'userId', as: 'users' });

User.hasMany(UserRole, { foreignKey: 'userId', as: 'userRoles' });
UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
UserRole.belongsTo(User, { foreignKey: 'userId', as: 'user' });

AuditLog.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

// 2. Academic Structure Associations
Institution.hasMany(Department, { foreignKey: 'institutionId', as: 'departments' });
Department.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });

Department.hasMany(Program, { foreignKey: 'departmentId', as: 'programs' });
Program.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
User.belongsTo(Program, { foreignKey: 'programId', as: 'program' });

Institution.hasMany(AcademicYear, { foreignKey: 'institutionId', as: 'academicYears' });
AcademicYear.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });

AcademicYear.hasMany(Semester, { foreignKey: 'academicYearId', as: 'semesters' });
Semester.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });

Department.hasMany(Course, { foreignKey: 'departmentId', as: 'courses' });
Course.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Program.hasMany(Course, { foreignKey: 'programId', as: 'courses' });
Course.belongsTo(Program, { foreignKey: 'programId', as: 'program' });

Course.hasMany(CourseOffering, { foreignKey: 'courseId', as: 'offerings' });
CourseOffering.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
CourseOffering.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });
CourseOffering.belongsTo(Semester, { foreignKey: 'semesterId', as: 'semester' });
Semester.hasMany(CourseOffering, { foreignKey: 'semesterId', as: 'courseOfferings' });

CourseOffering.hasMany(ClassSection, { foreignKey: 'courseOfferingId', as: 'classes' });
ClassSection.belongsTo(CourseOffering, { foreignKey: 'courseOfferingId', as: 'courseOffering' });

ClassSection.hasMany(InstructorAssignment, { foreignKey: 'classId', as: 'instructorAssignments' });
InstructorAssignment.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });
InstructorAssignment.belongsTo(User, { foreignKey: 'instructorId', as: 'instructor' });
User.hasMany(InstructorAssignment, { foreignKey: 'instructorId', as: 'instructorAssignments' });

ClassSection.hasMany(TeachingAssistantAssignment, { foreignKey: 'classId', as: 'taAssignments' });
TeachingAssistantAssignment.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });
TeachingAssistantAssignment.belongsTo(User, { foreignKey: 'taUserId', as: 'teachingAssistant' });
User.hasMany(TeachingAssistantAssignment, { foreignKey: 'taUserId', as: 'taAssignments' });

ClassSection.hasMany(ClassMembership, { foreignKey: 'classId', as: 'memberships' });
ClassMembership.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });
ClassMembership.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
User.hasMany(ClassMembership, { foreignKey: 'studentId', as: 'enrollments' });

// 3. Content & Progress Associations
Course.hasMany(Module, { foreignKey: 'courseId', as: 'modules' });
Module.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Module.hasMany(Lesson, { foreignKey: 'moduleId', as: 'lessons' });
Lesson.belongsTo(Module, { foreignKey: 'moduleId', as: 'module' });
Course.hasMany(Lesson, { foreignKey: 'courseId', as: 'lessons' });
Lesson.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Course.hasMany(LearningResource, { foreignKey: 'courseId', as: 'resources' });
LearningResource.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Module.hasMany(LearningResource, { foreignKey: 'moduleId', as: 'resources' });
LearningResource.belongsTo(Module, { foreignKey: 'moduleId', as: 'module' });
Lesson.hasMany(LearningResource, { foreignKey: 'lessonId', as: 'resources' });
LearningResource.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });

Lesson.hasMany(LessonProgress, { foreignKey: 'lessonId', as: 'progressRecords' });
LessonProgress.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });
LessonProgress.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
LessonProgress.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });

CourseProgress.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });
CourseProgress.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
CourseProgress.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// 4. Assignments & Assessments Associations
ClassSection.hasMany(Assignment, { foreignKey: 'classId', as: 'assignments' });
Assignment.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });
Assignment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Assignment.belongsTo(Module, { foreignKey: 'moduleId', as: 'module' });
Assignment.belongsTo(GradeCategory, { foreignKey: 'gradeCategoryId', as: 'gradeCategory' });

Assignment.hasMany(AssignmentAttachment, { foreignKey: 'assignmentId', as: 'attachments' });
AssignmentAttachment.belongsTo(Assignment, { foreignKey: 'assignmentId', as: 'assignment' });

Assignment.hasOne(GradingRubric, { foreignKey: 'assignmentId', as: 'rubric' });
GradingRubric.belongsTo(Assignment, { foreignKey: 'assignmentId', as: 'assignment' });
GradingRubric.hasMany(RubricCriterion, { foreignKey: 'rubricId', as: 'criteria' });
RubricCriterion.belongsTo(GradingRubric, { foreignKey: 'rubricId', as: 'rubric' });

Assignment.hasMany(Submission, { foreignKey: 'assignmentId', as: 'submissions' });
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId', as: 'assignment' });
Submission.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });
Submission.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
Submission.belongsTo(User, { foreignKey: 'gradedBy', as: 'grader' });
Submission.hasMany(SubmissionVersion, { foreignKey: 'submissionId', as: 'versions' });
SubmissionVersion.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

Course.hasMany(QuestionBank, { foreignKey: 'courseId', as: 'questionBanks' });
QuestionBank.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
QuestionBank.hasMany(Question, { foreignKey: 'questionBankId', as: 'questions' });
Question.belongsTo(QuestionBank, { foreignKey: 'questionBankId', as: 'questionBank' });
Question.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Question.hasMany(QuestionOption, { foreignKey: 'questionId', as: 'options' });
QuestionOption.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });

ClassSection.hasMany(Assessment, { foreignKey: 'classId', as: 'assessments' });
Assessment.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });
Assessment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Assessment.belongsTo(Module, { foreignKey: 'moduleId', as: 'module' });
Assessment.belongsTo(GradeCategory, { foreignKey: 'gradeCategoryId', as: 'gradeCategory' });

Assessment.hasMany(AssessmentQuestion, { foreignKey: 'assessmentId', as: 'assessmentQuestions' });
AssessmentQuestion.belongsTo(Assessment, { foreignKey: 'assessmentId', as: 'assessment' });
AssessmentQuestion.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });

Assessment.hasMany(AssessmentAttempt, { foreignKey: 'assessmentId', as: 'attempts' });
AssessmentAttempt.belongsTo(Assessment, { foreignKey: 'assessmentId', as: 'assessment' });
AssessmentAttempt.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });
AssessmentAttempt.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
AssessmentAttempt.hasMany(AssessmentAnswer, { foreignKey: 'attemptId', as: 'answers' });
AssessmentAnswer.belongsTo(AssessmentAttempt, { foreignKey: 'attemptId', as: 'attempt' });
AssessmentAnswer.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });

// 5. Gradebook & Certificates Associations
ClassSection.hasMany(GradeCategory, { foreignKey: 'classId', as: 'gradeCategories' });
GradeCategory.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });

ClassSection.hasMany(Grade, { foreignKey: 'classId', as: 'grades' });
Grade.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });
Grade.belongsTo(GradeCategory, { foreignKey: 'gradeCategoryId', as: 'category' });
Grade.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
Grade.hasMany(GradeHistory, { foreignKey: 'gradeId', as: 'history' });
GradeHistory.belongsTo(Grade, { foreignKey: 'gradeId', as: 'grade' });
GradeHistory.belongsTo(User, { foreignKey: 'changedBy', as: 'editor' });

Certificate.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
Certificate.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Certificate.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });

// 6. Communication Associations
Announcement.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
Announcement.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });
Announcement.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Announcement.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

DiscussionThread.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
DiscussionThread.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });
DiscussionThread.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
DiscussionThread.hasMany(DiscussionPost, { foreignKey: 'threadId', as: 'posts' });
DiscussionPost.belongsTo(DiscussionThread, { foreignKey: 'threadId', as: 'thread' });
DiscussionPost.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

Conversation.belongsTo(ClassSection, { foreignKey: 'classId', as: 'classSection' });
Conversation.hasMany(ConversationMember, { foreignKey: 'conversationId', as: 'members' });
ConversationMember.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
ConversationMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  Sequelize,
  ...models
};

