# Aetheria Institute & Networking Academy LMS — API Documentation

## 1. Overview & Base URLs

- **Versioned Base URL**: `http://localhost:5000/api/v1`
- **Alias Base URL**: `http://localhost:5000/api`
- **Content-Type**: `application/json` (or `multipart/form-data` for file uploads)

## 2. Authentication & Session / JWT Lifecycle

The API supports dual authentication:
1. **HTTP-Only Cookies (`lms.sid` session cookie + `lms.jwt` signed HS256 JWT cookie)**: Automatically sent by browser clients configured with `withCredentials: true`.
2. **Bearer Token Header (`Authorization: Bearer <accessToken>`)**: Returned in `POST /api/v1/auth/login` (`data.accessToken`) for API clients and automated tests.

On every authenticated request, `requireAuth` (`server/src/middleware/auth.middleware.js`) verifies the session or JWT signature/expiration **and** checks the database to confirm `user.status === 'active'`.

### Standard Response Envelope
- **Success (`200`, `201`)**:
  ```json
  {
    "success": true,
    "message": "Operation completed",
    "data": { ... }
  }
  ```
- **Error (`400`, `401`, `403`, `404`, `409`, `422`, `423`, `429`, `500`)**:
  ```json
  {
    "success": false,
    "code": "ERROR_CODE",
    "message": "Human-readable explanation",
    "errors": [ ... ]
  }
  ```

---

## 3. Endpoint Reference

### 3.1 Public & Health Endpoints
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | Returns service health and timestamp. |
| `GET` | `/api/v1/public/catalog` | Public | Lists published catalog courses with department and program metadata. |
| `GET` | `/api/v1/certificates/verify/:code` | Public | Verifies a completion certificate by verification code (`AIT-CERT-2026-8841`). |

### 3.2 Authentication (`/api/v1/auth`)
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public (Rate-Limited) | Validates `email` and `password`, enforces brute-force lockout (`423`), sets `lms.sid` & `lms.jwt` cookies, and returns `{ user, accessToken }`. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Destroys session and clears `lms.sid` and `lms.jwt` cookies. |
| `GET` | `/api/v1/auth/me` | Authenticated | Returns current authenticated user profile, roles, and permissions. |
| `POST` | `/api/v1/auth/forgot-password` | Public (Rate-Limited) | Generates a SHA-256 hashed password reset token valid for 30 minutes. |
| `POST` | `/api/v1/auth/reset-password` | Public (Rate-Limited) | Resets password using `token` and `newPassword` (Argon2id hashed). |
| `PUT` | `/api/v1/auth/change-password` | Authenticated | Verifies `currentPassword` and updates to `newPassword`. |
| `PUT` | `/api/v1/auth/profile` | Authenticated | Updates `firstName`, `lastName`, `bio`, `phone`, `timezone`, and `notificationPreferences`. |

### 3.3 Dashboards (`/api/v1/dashboards`)
| Method | Path | Permission / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dashboards/summary` | Authenticated | Returns live database metrics tailored to the caller's primary role (`super_admin`, `academic_admin`, `instructor`, `teaching_assistant`, or `student`). |

### 3.4 Identity, Users, Roles, Settings & Audit Logs
| Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users` | `users:read` | Paginated user list (`search`, `role`, `status`, `departmentId`, `page`, `limit`). |
| `GET` | `/api/v1/users/:id` | `users:read` | Detailed user record with roles, department, program, and enrollments. |
| `POST` | `/api/v1/users` | `users:write` | Creates a new user account with Argon2id password hash and assigned role. |
| `PUT` | `/api/v1/users/:id` | `users:write` | Updates user details, status (`active`, `inactive`, `suspended`), or role. Protects against self-deactivation and removing the final active Super Admin. |
| `GET` | `/api/v1/roles` | Authenticated | Lists all roles and permission catalog. |
| `PUT` | `/api/v1/roles/:id/permissions` | `roles:manage` | Updates permission codes assigned to a role and records audit log. |
| `GET` | `/api/v1/settings` | Authenticated | Lists system configuration settings. |
| `PUT` | `/api/v1/settings/:key` | `settings:manage` | Updates a system setting key and records audit log. |
| `GET` | `/api/v1/audit-logs` | `audit:read` | Paginated audit trail (`category`, `severity`, `search`, `page`, `limit`). |

### 3.5 Academic Structure, Courses, Sections & Enrollments
| Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/institutions` | Authenticated | Retrieves institution configuration and grading scale. |
| `PUT` | `/api/v1/institutions` | `super_admin` / `academic_admin` | Updates institution settings. |
| `GET` | `/api/v1/departments` | Authenticated | Lists departments with associated programs and courses. |
| `POST` | `/api/v1/departments` | `departments:manage` | Creates a department. |
| `PUT` | `/api/v1/departments/:id` | `departments:manage` | Updates a department. |
| `DELETE` | `/api/v1/departments/:id` | `departments:manage` | Deletes an unreferenced department; returns `409 REFERENCED_RECORD_PROTECTED` if courses/programs exist. |
| `GET` | `/api/v1/programs` | Authenticated | Lists academic degree programs. |
| `POST` | `/api/v1/programs` | `programs:manage` | Creates an academic program. |
| `GET` | `/api/v1/academic-years` | Authenticated | Lists academic years and nested semesters. |
| `POST` | `/api/v1/academic-years` | `terms:manage` | Creates an academic year. |
| `GET` | `/api/v1/semesters` | Authenticated | Lists semesters. |
| `POST` | `/api/v1/semesters` | `terms:manage` | Creates a semester and enrollment window. |
| `GET` | `/api/v1/courses` | Authenticated | Lists courses (`departmentId`, `category`, `publicationStatus`). |
| `POST` | `/api/v1/courses` | `courses:manage` / `instructor` | Creates a course record. |
| `PUT` | `/api/v1/courses/:id` | `courses:manage` / `instructor` | Updates a course record. |
| `GET` | `/api/v1/course-offerings` | Authenticated | Lists term-specific course offerings. |
| `POST` | `/api/v1/course-offerings` | `courses:manage` | Creates a course offering. |
| `GET` | `/api/v1/classes` | Authenticated | Lists class sections scoped to the user's role and assignments. |
| `GET` | `/api/v1/classes/:id` | Class Scope | Retrieves class section details, roster, instructors, TAs, and modules. |
| `POST` | `/api/v1/classes` | `classes:manage` | Creates a class section and default weighted grade categories. |
| `POST` | `/api/v1/classes/:id/instructors` | `classes:manage` | Assigns an instructor to a class section. |
| `POST` | `/api/v1/classes/:id/teaching-assistants` | `classes:manage` | Assigns a Teaching Assistant with granular permission flags. |
| `GET` | `/api/v1/enrollments` | Authenticated | Lists enrollments scoped to the caller. |
| `POST` | `/api/v1/enrollments` | Authenticated | Enrolls a student in a class section (blocks duplicates with `409 DUPLICATE_ENROLLMENT` and full sections with `400`). |
| `POST` | `/api/v1/enrollments/transfer` | `enrollments:manage` | Transfers a student between class sections within a database transaction. |
| `POST` | `/api/v1/enrollments/import-csv` | `enrollments:manage` | Bulk imports users and enrollments from CSV text. |

### 3.6 Learning Content & Progress Tracking
| Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/modules` | Class Scope | Lists ordered modules, lessons (filtering unpublished lessons for students), and resources. |
| `POST` | `/api/v1/modules` | `content:manage` | Creates a module in an assigned class. |
| `PUT` | `/api/v1/modules/reorder` | `content:manage` | Reorders modules in a class. |
| `PUT` | `/api/v1/modules/:id` | `content:manage` | Updates module metadata or publication status. |
| `GET` | `/api/v1/lessons/:id` | Class Scope | Retrieves lesson content and resources (blocks students from unpublished lessons). |
| `POST` | `/api/v1/lessons` | `content:manage` | Creates a lesson (sanitizes HTML against stored XSS). |
| `PUT` | `/api/v1/lessons/:id` | `content:manage` | Updates a lesson. |
| `GET` | `/api/v1/resources` | Class Scope | Lists downloadable learning resources. |
| `POST` | `/api/v1/resources` | Staff (`multipart/form-data`) | Uploads a validated resource file (`file`) or external link. |
| `GET` | `/api/v1/resources/:id/download` | Class Scope | Downloads an authorized learning resource file. |
| `POST` | `/api/v1/progress/lessons` | `student` | Marks a lesson `in_progress` or `completed`, records time spent, and recalculates course completion percentage. |
| `GET` | `/api/v1/progress` | Authenticated | Retrieves student progress analytics for a class or learner. |

### 3.7 Assignments, Submissions, Quizzes & Examinations
| Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/assignments` | Class Scope | Lists assignments and rubrics for a class. |
| `POST` | `/api/v1/assignments` | `assignments:manage` | Creates an assignment and optional grading rubric criteria. |
| `GET` | `/api/v1/submissions` | Class Scope | Lists submissions (students see only their own; staff see class submissions). |
| `POST` | `/api/v1/assignments/:assignmentId/submit` | `assignments:submit` | Submits student assignment work (`submissionText`, `codeSubmission`, or `file`), enforces deadlines/late policy, and stores version snapshot. |
| `PUT` | `/api/v1/submissions/:id/review` | `submissions:review` | Reviews or grades a submission. TAs can record `preliminaryScore`, `preliminaryFeedback`, and `flaggedForInstructorReview` but are blocked from publishing official grades (`403 TA_PUBLISH_GRADE_FORBIDDEN`). Assigned instructors publish official grades. |
| `GET` | `/api/v1/question-banks` | Staff | Lists question banks and questions. |
| `POST` | `/api/v1/question-banks` | `questions:manage` | Creates a question bank. |
| `POST` | `/api/v1/questions` | `questions:manage` | Creates a question with options/answer keys. |
| `GET` | `/api/v1/assessments` | Class Scope | Lists quizzes and examinations. |
| `POST` | `/api/v1/assessments` | `assessments:manage` | Creates a quiz or examination. |
| `POST` | `/api/v1/assessments/:id/start` | `assessments:take` | Starts or resumes a server-timed attempt (`expiresAt`). Strips `isCorrect` and `correctAnswerText` from student response. |
| `PUT` | `/api/v1/assessment-attempts/:attemptId/save` | `assessments:take` | Saves in-progress answers during an active attempt. |
| `POST` | `/api/v1/assessment-attempts/:attemptId/submit` | `assessments:take` | Submits attempt, auto-grades objective questions, and updates gradebook. |
| `POST` | `/api/v1/assessment-attempts/:attemptId/grade` | `assessments:grade` | Manually grades essay/practical questions and recalculates total score. |

### 3.8 Gradebook, Certificates & Reports
| Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/grades/personal` | `gradebook:view_own` | Returns the authenticated student's personal grades and course standings. |
| `GET` | `/api/v1/grades/class/:classId` | Class Scope | Returns class gradebook matrix (isolated to single student row if called by a student). |
| `PUT` | `/api/v1/grades/class/:classId/categories` | `gradebook:manage` | Updates grade category weights (validates sum equals `100%`, else returns `400 INVALID_WEIGHT_SUM`). |
| `POST` | `/api/v1/grades/class/:classId/manual` | `gradebook:manage` | Records or overrides a grade entry and appends an immutable `grade_history` audit record. |
| `POST` | `/api/v1/grades/class/:classId/submit-final` | `gradebook:manage` | Submits class final grades for Academic Administrator approval. |
| `POST` | `/api/v1/grades/class/:classId/approve-final` | `grades:approve` | Approves & locks final class grades (`approved`) or returns them for revision (`returned`). |
| `GET` | `/api/v1/certificates` | `certificates:view` | Lists earned completion certificates. |
| `POST` | `/api/v1/certificates/issue` | `certificates:issue` | Issues a completion certificate when eligibility criteria are met. |
| `GET` | `/api/v1/reports` | `reports:export` | Generates JSON or downloadable CSV reports (`type=gradebook\|enrollments\|missing_submissions`, `format=csv`). |

### 3.9 Communication & Notifications
| Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/announcements` | Authenticated | Lists announcements visible to the user. |
| `POST` | `/api/v1/announcements` | `announcements:manage` | Publishes an announcement and dispatches notifications. |
| `GET` | `/api/v1/discussions` | Class Scope | Lists discussion threads and replies for a class. |
| `POST` | `/api/v1/discussions` | `discussions:participate` | Creates a discussion thread. |
| `POST` | `/api/v1/discussions/:threadId/replies` | `discussions:participate` | Posts a reply to a discussion thread. |
| `PUT` | `/api/v1/discussions/:threadId/status` | Class Scope | Pins, resolves, or escalates a discussion thread. |
| `GET` | `/api/v1/messages` | `messages:use` | Lists direct message conversations for the authenticated user. |
| `POST` | `/api/v1/messages` | `messages:use` | Starts a conversation or sends a direct message. |
| `GET` | `/api/v1/notifications` | Authenticated | Lists in-app notifications for the current user. |
| `PUT` | `/api/v1/notifications/:id/read` | Authenticated | Marks a notification (or `all`) as read. |

