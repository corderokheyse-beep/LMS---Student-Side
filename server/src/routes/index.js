const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth.middleware');
const { uploadMiddleware } = require('../middleware/upload.middleware');

const authCtrl = require('../controllers/auth.controller');
const iamCtrl = require('../controllers/iam.controller');
const dashCtrl = require('../controllers/dashboards.controller');
const acadCtrl = require('../controllers/academic.controller');
const contentCtrl = require('../controllers/content.controller');
const assessCtrl = require('../controllers/assessment.controller');
const gradingCtrl = require('../controllers/grading.controller');
const commCtrl = require('../controllers/communication.controller');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many authentication requests from this IP. Please try again later.'
  }
});

// Health & Public Catalog
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'aetheria-academy-lms-api',
    timestamp: new Date().toISOString()
  });
});

router.get('/public/catalog', acadCtrl.getPublicCatalog);

// 1. /api/auth
router.post('/auth/login', authLimiter, authCtrl.login);
router.post('/auth/logout', authCtrl.logout);
router.post('/auth/forgot-password', authLimiter, authCtrl.forgotPassword);
router.post('/auth/reset-password', authLimiter, authCtrl.resetPassword);
router.get('/auth/me', requireAuth, authCtrl.getCurrentUser);
router.put('/auth/change-password', requireAuth, authCtrl.changePassword);
router.put('/auth/profile', requireAuth, authCtrl.updateProfile);

// 2. /api/dashboards
router.get('/dashboards/summary', requireAuth, dashCtrl.getDashboardSummary);

// 3. /api/users, /api/roles, /api/permissions, /api/settings, /api/audit-logs
router.get('/users', requireAuth, requirePermission('users:read'), iamCtrl.listUsers);
router.get('/users/:id', requireAuth, requirePermission('users:read'), iamCtrl.getUserById);
router.post('/users', requireAuth, requirePermission('users:write'), iamCtrl.createUser);
router.put('/users/:id', requireAuth, requirePermission('users:write'), iamCtrl.updateUser);

router.get('/roles', requireAuth, iamCtrl.listRolesAndPermissions);
router.put('/roles/:id/permissions', requireAuth, requirePermission('roles:manage'), iamCtrl.updateRolePermissions);
router.get('/permissions', requireAuth, iamCtrl.listRolesAndPermissions);

router.get('/settings', requireAuth, iamCtrl.listSystemSettings);
router.put('/settings/:key', requireAuth, requirePermission('settings:manage'), iamCtrl.updateSystemSetting);

router.get('/audit-logs', requireAuth, requirePermission('audit:read'), iamCtrl.listAuditLogs);

// 4. Academic Management (/api/institutions, /api/departments, /api/programs, /api/academic-years, /api/semesters)
router.get('/institutions', requireAuth, acadCtrl.getInstitution);
router.put('/institutions', requireAuth, requireRole('super_admin', 'academic_admin'), acadCtrl.updateInstitution);

router.get('/departments', requireAuth, acadCtrl.listDepartments);
router.post('/departments', requireAuth, requirePermission('departments:manage'), acadCtrl.createDepartment);
router.put('/departments/:id', requireAuth, requirePermission('departments:manage'), acadCtrl.updateDepartment);
router.delete('/departments/:id', requireAuth, requirePermission('departments:manage'), acadCtrl.deleteDepartment);

router.get('/programs', requireAuth, acadCtrl.listPrograms);
router.post('/programs', requireAuth, requirePermission('programs:manage'), acadCtrl.createProgram);
router.put('/programs/:id', requireAuth, requirePermission('programs:manage'), acadCtrl.updateProgram);

router.get('/academic-years', requireAuth, acadCtrl.listAcademicYears);
router.post('/academic-years', requireAuth, requirePermission('terms:manage'), acadCtrl.createAcademicYear);

router.get('/semesters', requireAuth, acadCtrl.listSemesters);
router.post('/semesters', requireAuth, requirePermission('terms:manage'), acadCtrl.createSemester);

// 5. Courses, Offerings, Classes, Enrollments
router.get('/courses', requireAuth, acadCtrl.listCourses);
router.get('/courses/:id', requireAuth, acadCtrl.getCourseById);
router.post('/courses', requireAuth, requireRole('super_admin', 'academic_admin', 'instructor'), acadCtrl.createCourse);
router.put('/courses/:id', requireAuth, requireRole('super_admin', 'academic_admin', 'instructor'), acadCtrl.updateCourse);

router.get('/course-offerings', requireAuth, acadCtrl.listCourseOfferings);
router.post('/course-offerings', requireAuth, requirePermission('courses:manage'), acadCtrl.createCourseOffering);
router.put('/course-offerings/:id', requireAuth, requirePermission('courses:manage'), acadCtrl.updateCourseOffering);

router.get('/classes', requireAuth, acadCtrl.listClasses);
router.get('/classes/:id', requireAuth, acadCtrl.getClassById);
router.post('/classes', requireAuth, requirePermission('classes:manage'), acadCtrl.createClassSection);
router.post('/classes/:id/instructors', requireAuth, requirePermission('classes:manage'), acadCtrl.assignInstructorToClass);
router.post('/classes/:id/teaching-assistants', requireAuth, requirePermission('classes:manage'), acadCtrl.assignTaToClass);

router.get('/enrollments', requireAuth, acadCtrl.listEnrollments);
router.post('/enrollments', requireAuth, acadCtrl.enrollStudent);
router.post('/enrollments/transfer', requireAuth, requirePermission('enrollments:manage'), acadCtrl.transferStudentSection);
router.post('/enrollments/import-csv', requireAuth, requirePermission('enrollments:manage'), acadCtrl.importRecordsCsv);

// 6. Content (/api/modules, /api/lessons, /api/resources, /api/progress)
router.get('/modules', requireAuth, contentCtrl.listModules);
router.post('/modules', requireAuth, requirePermission('content:manage'), contentCtrl.createModule);
router.put('/modules/reorder', requireAuth, requirePermission('content:manage'), contentCtrl.reorderModules);
router.put('/modules/:id', requireAuth, requirePermission('content:manage'), contentCtrl.updateModule);

router.get('/lessons/:id', requireAuth, contentCtrl.getLessonById);
router.post('/lessons', requireAuth, requirePermission('content:manage'), contentCtrl.createLesson);
router.put('/lessons/:id', requireAuth, requirePermission('content:manage'), contentCtrl.updateLesson);

router.get('/resources', requireAuth, contentCtrl.listResources);
router.post('/resources', requireAuth, requireRole('super_admin', 'academic_admin', 'instructor', 'teaching_assistant'), uploadMiddleware.single('file'), contentCtrl.createResource);
router.get('/resources/:id/download', requireAuth, contentCtrl.downloadResourceFile);

router.post('/progress/lessons', requireAuth, contentCtrl.updateLessonProgress);
router.get('/progress', requireAuth, contentCtrl.getProgressAnalytics);

// 7. Assignments, Submissions, Question Banks, Questions, Assessments, Attempts
router.get('/assignments', requireAuth, assessCtrl.listAssignments);
router.get('/assignments/:id', requireAuth, assessCtrl.getAssignmentById);
router.post('/assignments', requireAuth, requirePermission('assignments:manage'), assessCtrl.createAssignment);

router.get('/submissions', requireAuth, assessCtrl.listSubmissions);
router.post('/submissions', requireAuth, uploadMiddleware.single('file'), assessCtrl.submitAssignmentWork);
router.post('/assignments/:assignmentId/submit', requireAuth, uploadMiddleware.single('file'), assessCtrl.submitAssignmentWork);
router.put('/submissions/:id/review', requireAuth, requirePermission('submissions:review'), assessCtrl.reviewOrGradeSubmission);

router.get('/question-banks', requireAuth, requireRole('super_admin', 'academic_admin', 'instructor', 'teaching_assistant'), assessCtrl.listQuestionBanks);
router.post('/question-banks', requireAuth, requirePermission('questions:manage'), assessCtrl.createQuestionBank);
router.post('/questions', requireAuth, requirePermission('questions:manage'), assessCtrl.createQuestion);

router.get('/assessments', requireAuth, assessCtrl.listAssessments);
router.post('/assessments', requireAuth, requirePermission('assessments:manage'), assessCtrl.createAssessment);
router.post('/assessments/:id/start', requireAuth, assessCtrl.startOrResumeAttempt);

router.put('/assessment-attempts/:attemptId/save', requireAuth, assessCtrl.saveAttemptAnswers);
router.post('/assessment-attempts/:attemptId/submit', requireAuth, assessCtrl.submitAttempt);
router.post('/assessment-attempts/:attemptId/grade', requireAuth, requirePermission('assessments:grade'), assessCtrl.manualGradeAttempt);

// 8. Gradebook, Certificates, Reports
router.get('/grades/personal', requireAuth, gradingCtrl.getStudentPersonalGrades);
router.get('/grades/class/:classId', requireAuth, gradingCtrl.getClassGradebookView);
router.put('/grades/class/:classId/categories', requireAuth, requirePermission('gradebook:manage'), gradingCtrl.updateClassGradeCategories);
router.post('/grades/class/:classId/manual', requireAuth, requirePermission('gradebook:manage'), gradingCtrl.recordOrUpdateManualGrade);
router.post('/grades/class/:classId/submit-final', requireAuth, requirePermission('gradebook:manage'), gradingCtrl.submitFinalGradesForApproval);
router.post('/grades/class/:classId/approve-final', requireAuth, requirePermission('grades:approve'), gradingCtrl.approveOrReturnFinalGrades);

router.get('/certificates', requireAuth, gradingCtrl.listCertificates);
router.get('/certificates/verify/:code', gradingCtrl.verifyCertificate);
router.post('/certificates/issue', requireAuth, requirePermission('certificates:issue'), gradingCtrl.issueCertificateManually);

router.get('/reports', requireAuth, requirePermission('reports:export'), gradingCtrl.generateReport);

// 9. Communication (/api/announcements, /api/discussions, /api/messages, /api/notifications)
router.get('/announcements', requireAuth, commCtrl.listAnnouncements);
router.post('/announcements', requireAuth, requirePermission('announcements:manage'), commCtrl.createAnnouncement);

router.get('/discussions', requireAuth, commCtrl.listDiscussions);
router.post('/discussions', requireAuth, commCtrl.createDiscussionThread);
router.post('/discussions/:threadId/replies', requireAuth, commCtrl.replyToDiscussionThread);
router.put('/discussions/:threadId/status', requireAuth, commCtrl.escalateOrResolveDiscussion);

router.get('/messages', requireAuth, commCtrl.listConversations);
router.post('/messages', requireAuth, commCtrl.startOrSendMessage);

router.get('/notifications', requireAuth, commCtrl.listNotifications);
router.put('/notifications/:id/read', requireAuth, commCtrl.markNotificationRead);

module.exports = router;

