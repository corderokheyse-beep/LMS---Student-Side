# REST API Documentation (`/api/v1`)

All API endpoints return a standardized JSON envelope:
```json
{
  "success": true,
  "message": "Optional human-readable status",
  "data": { ... }
}
```
Errors return appropriate HTTP status codes (`400`, `401`, `403`, `404`, `409`, `422`, `423`, `500`) with:
```json
{
  "success": false,
  "message": "Validation or authorization error description",
  "errors": [ ... ]
}
```

---

## 1. Authentication & Profile (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Authenticate with `email` and `password`; establishes HTTP-only session cookie. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Destroy active session and clear cookie. |
| `GET` | `/api/v1/auth/me` | Authenticated | Return current authenticated user, assigned roles, and flattened permissions list. |
| `POST` | `/api/v1/auth/forgot-password` | Public | Generate a time-limited password reset token and dispatch email/log notification. |
| `POST` | `/api/v1/auth/reset-password` | Public | Reset password using valid token and Argon2id hash. |
| `POST` | `/api/v1/auth/change-password` | Authenticated | Verify `currentPassword` and update to `newPassword`. |
| `PATCH` | `/api/v1/auth/profile` | Authenticated | Update personal profile fields (`firstName`, `lastName`, `phone`, `bio`, `notificationPreferences`). |

---

## 2. Role-Specific Dashboards (`/api/v1/dashboards`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dashboards/super-admin` | `super_admin` | System metrics, user counts by role/status, security events, recent audit logs, DB health. |
| `GET` | `/api/v1/dashboards/academic-admin` | `academic_admin`, `super_admin` | Department/program counts, enrollment analytics, pending grade approvals, term summary. |
| `GET` | `/api/v1/dashboards/instructor` | `instructor` | Assigned classes, pending grading queue, flagged submissions, at-risk students, completion stats. |
| `GET` | `/api/v1/dashboards/ta` | `teaching_assistant` | Assigned classes, ungraded submissions, flagged items, discussion activity. |
| `GET` | `/api/v1/dashboards/student` | `student` | Enrolled classes, progress percentages, upcoming deadlines, recent grades, unread notifications, certificates. |

---

## 3. Identity, Access Management & System Governance (`/api/v1/iam`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/iam/users` | `super_admin`, `academic_admin` | Paginated user directory with search, role, and status filters. |
| `POST` | `/api/v1/iam/users` | `super_admin`, `academic_admin` | Create user account and assign primary role. |
| `PATCH` | `/api/v1/iam/users/:id` | `super_admin` | Update user account details, status (`active`, `suspended`, `deactivated`), or role assignments. |
| `GET` | `/api/v1/iam/roles` | `super_admin`, `academic_admin` | List all roles and their assigned permissions. |
| `PUT` | `/api/v1/iam/roles/:id/permissions` | `super_admin` | Update granular permissions assigned to a role. |
| `GET` | `/api/v1/iam/settings` | `super_admin`, `academic_admin` | Retrieve institution-wide system settings and grading templates. |
| `PUT` | `/api/v1/iam/settings` | `super_admin` | Update system settings and record audit entry. |
| `GET` | `/api/v1/iam/audit-logs` | `super_admin` | Filterable audit trail (`severity`, `action`, `search`). |
| `POST` | `/api/v1/iam/maintenance/backup` | `super_admin` | Trigger an audited system configuration & metadata snapshot. |

---

## 4. Academic Administration & Enrollment (`/api/v1/academic`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/academic/structure` | Authenticated | List institutions, departments, programs, academic years, and semesters. |
| `POST` | `/api/v1/academic/departments` | `academic_admin`, `super_admin` | Create a new academic department. |
| `POST` | `/api/v1/academic/programs` | `academic_admin`, `super_admin` | Create an academic degree/certification program. |
| `POST` | `/api/v1/academic/semesters` | `academic_admin`, `super_admin` | Configure an academic year and semester term. |
| `GET` | `/api/v1/academic/courses` | Authenticated | Browse course catalog with search, category, and level filters. |
| `POST` | `/api/v1/academic/courses` | `academic_admin`, `super_admin` | Create a master catalog course and default grade categories. |
| `GET` | `/api/v1/academic/classes` | Authenticated | List class sections (filtered by role scope or catalog availability). |
| `POST` | `/api/v1/academic/classes` | `academic_admin`, `super_admin` | Create a class section, assign instructor/TA, and initialize gradebook categories. |
| `GET` | `/api/v1/academic/classes/:classId` | Class Scope | Get full class details, roster, instructors, TAs, modules, and grade categories. |
| `POST` | `/api/v1/academic/classes/:classId/enroll` | `academic_admin`, `super_admin`, `student` | Enroll a student in a class section (enforces capacity & duplicate checks). |
| `POST` | `/api/v1/academic/classes/transfer` | `academic_admin`, `super_admin` | Transfer a student between two class sections with audit logging. |
| `POST` | `/api/v1/academic/import-csv` | `academic_admin`, `super_admin` | Bulk import student/instructor records and optional class enrollments from CSV rows. |

---

## 5. Curriculum Content & Progress (`/api/v1/content`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/content/classes/:classId/modules` | Class Scope | Retrieve ordered modules, lessons, learning resources, and student completion state. |
| `POST` | `/api/v1/content/classes/:classId/modules` | `instructor`, `super_admin` | Create a new module in a class. |
| `PATCH` | `/api/v1/content/modules/:moduleId` | `instructor`, `super_admin` | Update module title, sequence, or publication state. |
| `POST` | `/api/v1/content/modules/:moduleId/lessons` | `instructor`, `super_admin` | Create a lesson (`markdown`, `video`, `lab_simulation`, `code_exercise`). |
| `POST` | `/api/v1/content/lessons/:lessonId/resources` | `instructor`, `super_admin` | Attach a file upload or external technical resource to a lesson. |
| `POST` | `/api/v1/content/lessons/:lessonId/complete` | `student` | Mark lesson completed, log time spent, and recalculate overall course progress. |

---

## 6. Assignments, Submissions & Examinations (`/api/v1/assessments`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/assessments/classes/:classId/assignments` | Class Scope | List assignments, rubrics, and student submission statuses for a class. |
| `POST` | `/api/v1/assessments/classes/:classId/assignments` | `instructor`, `super_admin` | Create an assignment with optional grading rubric criteria. |
| `POST` | `/api/v1/assessments/assignments/:assignmentId/submit` | `student` | Submit assignment work (text, code snippet, and/or Multer file upload). |
| `GET` | `/api/v1/assessments/assignments/:assignmentId/submissions` | `instructor`, `teaching_assistant`, `super_admin` | List all student submissions and version histories for an assignment. |
| `POST` | `/api/v1/assessments/submissions/:submissionId/grade` | `instructor`, `teaching_assistant` | Grade submission (TAs record preliminary score/flag; Instructors publish official grade). |
| `GET` | `/api/v1/assessments/question-banks` | `instructor`, `super_admin` | List reusable question banks and questions. |
| `POST` | `/api/v1/assessments/question-banks` | `instructor`, `super_admin` | Create a question bank with multi-type questions and answer options. |
| `GET` | `/api/v1/assessments/classes/:classId/exams` | Class Scope | List quizzes and examinations for a class. |
| `POST` | `/api/v1/assessments/classes/:classId/exams` | `instructor`, `super_admin` | Create a quiz or examination linked to question bank items. |
| `POST` | `/api/v1/assessments/exams/:assessmentId/start` | `student` | Start or resume a server-timed exam attempt (sanitizes answer keys from response). |
| `POST` | `/api/v1/assessments/attempts/:attemptId/submit` | `student` | Submit exam answers, run automated grading engine, and update gradebook. |

---

## 7. Gradebook, Approval Workflows & Certificates (`/api/v1/grading`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/grading/classes/:classId/gradebook` | Class Scope | Retrieve class gradebook matrix (students see only their own row; staff see full roster). |
| `PUT` | `/api/v1/grading/classes/:classId/categories` | `instructor`, `super_admin` | Configure weighted gradebook categories (must sum to 100%). |
| `PATCH` | `/api/v1/grading/grades/:gradeId/override` | `instructor`, `academic_admin` | Override a student grade with mandatory reason (blocked if locked; writes `grade_history`). |
| `POST` | `/api/v1/grading/classes/:classId/submit-final` | `instructor` | Submit class final grades to Academic Administration for approval. |
| `POST` | `/api/v1/grading/classes/:classId/approve-final` | `academic_admin`, `super_admin` | Approve or return final class grades; locks gradebook entries upon approval. |
| `GET` | `/api/v1/grading/classes/:classId/export-csv` | `instructor`, `academic_admin`, `super_admin` | Download class gradebook and standing report as CSV. |
| `GET` | `/api/v1/grading/certificates/my` | `student` | List earned course completion certificates. |
| `GET` | `/api/v1/grading/certificates/verify/:code` | Public | Verify authenticity of a certificate by `verificationCode` or `certificateNumber`. |

---

## 8. Communication, Discussions & Notifications (`/api/v1/communication`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/communication/announcements` | Authenticated | List institutional and class announcements. |
| `POST` | `/api/v1/communication/announcements` | `super_admin`, `academic_admin`, `instructor` | Publish a new announcement and notify target users. |
| `GET` | `/api/v1/communication/classes/:classId/discussions` | Class Scope | List discussion threads and nested replies for a class. |
| `POST` | `/api/v1/communication/classes/:classId/discussions` | Class Scope | Create a new discussion topic in a class. |
| `POST` | `/api/v1/communication/discussions/:discussionId/posts` | Class Scope | Post a reply to a discussion thread. |
| `GET` | `/api/v1/communication/conversations` | Authenticated | List direct message conversations and messages for current user. |
| `POST` | `/api/v1/communication/conversations` | Authenticated | Start a conversation or send a direct message to an instructor/TA/student. |
| `GET` | `/api/v1/communication/notifications` | Authenticated | Retrieve in-app notifications for the authenticated user. |
| `PATCH` | `/api/v1/communication/notifications/:id/read` | Authenticated | Mark a single notification or all notifications (`id = 'all'`) as read. |

