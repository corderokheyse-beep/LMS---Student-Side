'use strict';

const models = require('../models');

const MODEL_ORDER = [
  'Institution',
  'Department',
  'Program',
  'Role',
  'Permission',
  'RolePermission',
  'User',
  'UserRole',
  'SystemSetting',
  'AuditLog',
  'AcademicYear',
  'Semester',
  'Course',
  'CourseOffering',
  'ClassSection',
  'InstructorAssignment',
  'TeachingAssistantAssignment',
  'ClassMembership',
  'Module',
  'Lesson',
  'LearningResource',
  'LessonProgress',
  'CourseProgress',
  'GradeCategory',
  'Assignment',
  'AssignmentAttachment',
  'GradingRubric',
  'RubricCriterion',
  'Submission',
  'SubmissionVersion',
  'QuestionBank',
  'Question',
  'QuestionOption',
  'Assessment',
  'AssessmentQuestion',
  'AssessmentAttempt',
  'AssessmentAnswer',
  'Grade',
  'GradeHistory',
  'Certificate',
  'Announcement',
  'DiscussionThread',
  'DiscussionPost',
  'Conversation',
  'ConversationMember',
  'Message',
  'Notification'
];

module.exports = {
  async up(queryInterface) {
    for (const modelName of MODEL_ORDER) {
      const model = models[modelName];
      if (model) {
        await model.sync({ alter: false });
      }
    }
  },

  async down(queryInterface) {
    const reverseOrder = [...MODEL_ORDER].reverse();
    for (const modelName of reverseOrder) {
      const model = models[modelName];
      if (model) {
        await queryInterface.dropTable(model.getTableName(), { cascade: true }).catch(() => {});
      }
    }
  }
};

