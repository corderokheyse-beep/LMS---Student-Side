import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically retry once on transient proxy/connection errors (e.g., 502/503/504 during server boot)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const status = error?.response?.status;
    if (config && !config.__retried && (!error.response || status === 502 || status === 503 || status === 504)) {
      config.__retried = true;
      await new Promise((resolve) => setTimeout(resolve, 700));
      return apiClient(config);
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(err) {
  if (err?.response?.data?.message) {
    return err.response.data.message;
  }
  if (err?.message) {
    return err.message;
  }
  return 'An unexpected error occurred.';
}

export const lmsApi = {
  // Auth
  login: (data) => apiClient.post('/auth/login', data).then((r) => r.data),
  logout: () => apiClient.post('/auth/logout').then((r) => r.data),
  getMe: () => apiClient.get('/auth/me').then((r) => r.data),
  forgotPassword: (data) => apiClient.post('/auth/forgot-password', data).then((r) => r.data),
  resetPassword: (data) => apiClient.post('/auth/reset-password', data).then((r) => r.data),
  changePassword: (data) => apiClient.put('/auth/change-password', data).then((r) => r.data),
  updateProfile: (data) => apiClient.put('/auth/profile', data).then((r) => r.data),

  // Dashboard
  getDashboardSummary: () => apiClient.get('/dashboards/summary').then((r) => r.data),

  // IAM & System
  listUsers: (params) => apiClient.get('/users', { params }).then((r) => r.data),
  getUserById: (id) => apiClient.get(`/users/${id}`).then((r) => r.data),
  createUser: (data) => apiClient.post('/users', data).then((r) => r.data),
  updateUser: (id, data) => apiClient.put(`/users/${id}`, data).then((r) => r.data),
  listRoles: () => apiClient.get('/roles').then((r) => r.data),
  updateRolePermissions: (id, permissionCodes) =>
    apiClient.put(`/roles/${id}/permissions`, { permissionCodes }).then((r) => r.data),
  listSettings: () => apiClient.get('/settings').then((r) => r.data),
  updateSetting: (key, data) => apiClient.put(`/settings/${key}`, data).then((r) => r.data),
  listAuditLogs: (params) => apiClient.get('/audit-logs', { params }).then((r) => r.data),

  // Academic Management
  getPublicCatalog: () => apiClient.get('/public/catalog').then((r) => r.data),
  getInstitution: () => apiClient.get('/institutions').then((r) => r.data),
  updateInstitution: (data) => apiClient.put('/institutions', data).then((r) => r.data),
  listDepartments: () => apiClient.get('/departments').then((r) => r.data),
  createDepartment: (data) => apiClient.post('/departments', data).then((r) => r.data),
  deleteDepartment: (id) => apiClient.delete(`/departments/${id}`).then((r) => r.data),
  listPrograms: () => apiClient.get('/programs').then((r) => r.data),
  createProgram: (data) => apiClient.post('/programs', data).then((r) => r.data),
  listAcademicYears: () => apiClient.get('/academic-years').then((r) => r.data),
  createAcademicYear: (data) => apiClient.post('/academic-years', data).then((r) => r.data),
  listSemesters: () => apiClient.get('/semesters').then((r) => r.data),
  createSemester: (data) => apiClient.post('/semesters', data).then((r) => r.data),

  // Courses, Offerings, Classes, Enrollments
  listCourses: (params) => apiClient.get('/courses', { params }).then((r) => r.data),
  getCourseById: (id) => apiClient.get(`/courses/${id}`).then((r) => r.data),
  createCourse: (data) => apiClient.post('/courses', data).then((r) => r.data),
  updateCourse: (id, data) => apiClient.put(`/courses/${id}`, data).then((r) => r.data),
  listOfferings: () => apiClient.get('/course-offerings').then((r) => r.data),
  createOffering: (data) => apiClient.post('/course-offerings', data).then((r) => r.data),
  listClasses: () => apiClient.get('/classes').then((r) => r.data),
  getClassById: (id) => apiClient.get(`/classes/${id}`).then((r) => r.data),
  createClass: (data) => apiClient.post('/classes', data).then((r) => r.data),
  assignInstructor: (classId, data) => apiClient.post(`/classes/${classId}/instructors`, data).then((r) => r.data),
  assignTa: (classId, data) => apiClient.post(`/classes/${classId}/teaching-assistants`, data).then((r) => r.data),
  listEnrollments: (params) => apiClient.get('/enrollments', { params }).then((r) => r.data),
  enrollStudent: (data) => apiClient.post('/enrollments', data).then((r) => r.data),
  transferStudent: (data) => apiClient.post('/enrollments/transfer', data).then((r) => r.data),
  importCsv: (data) => apiClient.post('/enrollments/import-csv', data).then((r) => r.data),

  // Content & Progress
  listModules: (params) => apiClient.get('/modules', { params }).then((r) => r.data),
  createModule: (data) => apiClient.post('/modules', data).then((r) => r.data),
  getLessonById: (id) => apiClient.get(`/lessons/${id}`).then((r) => r.data),
  createLesson: (data) => apiClient.post('/lessons', data).then((r) => r.data),
  updateLesson: (id, data) => apiClient.put(`/lessons/${id}`, data).then((r) => r.data),
  listResources: (params) => apiClient.get('/resources', { params }).then((r) => r.data),
  createResource: (formData) =>
    apiClient.post('/resources', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  updateLessonProgress: (data) => apiClient.post('/progress/lessons', data).then((r) => r.data),
  getProgressAnalytics: (params) => apiClient.get('/progress', { params }).then((r) => r.data),

  // Assignments, Submissions, Question Banks, Assessments
  listAssignments: (params) => apiClient.get('/assignments', { params }).then((r) => r.data),
  getAssignmentById: (id) => apiClient.get(`/assignments/${id}`).then((r) => r.data),
  createAssignment: (data) => apiClient.post('/assignments', data).then((r) => r.data),
  listSubmissions: (params) => apiClient.get('/submissions', { params }).then((r) => r.data),
  submitAssignment: (assignmentId, data) =>
    apiClient.post(`/assignments/${assignmentId}/submit`, data).then((r) => r.data),
  reviewSubmission: (id, data) => apiClient.put(`/submissions/${id}/review`, data).then((r) => r.data),
  listQuestionBanks: (params) => apiClient.get('/question-banks', { params }).then((r) => r.data),
  createQuestionBank: (data) => apiClient.post('/question-banks', data).then((r) => r.data),
  createQuestion: (data) => apiClient.post('/questions', data).then((r) => r.data),
  listAssessments: (params) => apiClient.get('/assessments', { params }).then((r) => r.data),
  createAssessment: (data) => apiClient.post('/assessments', data).then((r) => r.data),
  startAttempt: (assessmentId) => apiClient.post(`/assessments/${assessmentId}/start`).then((r) => r.data),
  saveAttemptAnswers: (attemptId, answers) =>
    apiClient.put(`/assessment-attempts/${attemptId}/save`, { answers }).then((r) => r.data),
  submitAttempt: (attemptId, answers) =>
    apiClient.post(`/assessment-attempts/${attemptId}/submit`, { answers }).then((r) => r.data),
  gradeAttemptManual: (attemptId, data) =>
    apiClient.post(`/assessment-attempts/${attemptId}/grade`, data).then((r) => r.data),

  // Gradebook, Certificates, Reports
  getPersonalGrades: () => apiClient.get('/grades/personal').then((r) => r.data),
  getClassGradebook: (classId) => apiClient.get(`/grades/class/${classId}`).then((r) => r.data),
  updateGradeCategories: (classId, categories) =>
    apiClient.put(`/grades/class/${classId}/categories`, { categories }).then((r) => r.data),
  recordManualGrade: (classId, data) =>
    apiClient.post(`/grades/class/${classId}/manual`, data).then((r) => r.data),
  submitFinalGrades: (classId) =>
    apiClient.post(`/grades/class/${classId}/submit-final`).then((r) => r.data),
  approveFinalGrades: (classId, data) =>
    apiClient.post(`/grades/class/${classId}/approve-final`, data).then((r) => r.data),
  listCertificates: () => apiClient.get('/certificates').then((r) => r.data),
  verifyCertificate: (code) => apiClient.get(`/certificates/verify/${code}`).then((r) => r.data),
  issueCertificate: (data) => apiClient.post('/certificates/issue', data).then((r) => r.data),
  getReport: (params) => apiClient.get('/reports', { params }).then((r) => r.data),

  // Communication
  listAnnouncements: (params) => apiClient.get('/announcements', { params }).then((r) => r.data),
  createAnnouncement: (data) => apiClient.post('/announcements', data).then((r) => r.data),
  listDiscussions: (params) => apiClient.get('/discussions', { params }).then((r) => r.data),
  createDiscussion: (data) => apiClient.post('/discussions', data).then((r) => r.data),
  replyDiscussion: (threadId, data) => apiClient.post(`/discussions/${threadId}/replies`, data).then((r) => r.data),
  updateDiscussionStatus: (threadId, data) =>
    apiClient.put(`/discussions/${threadId}/status`, data).then((r) => r.data),
  listMessages: () => apiClient.get('/messages').then((r) => r.data),
  sendMessage: (data) => apiClient.post('/messages', data).then((r) => r.data),
  listNotifications: () => apiClient.get('/notifications').then((r) => r.data),
  markNotificationRead: (id) => apiClient.put(`/notifications/${id}/read`).then((r) => r.data)
};

