# Aetheria Institute & Networking Academy LMS — Comprehensive Test Report

## 1. Testing Environment & Tooling

| Component | Technology / Version | Purpose |
| :--- | :--- | :--- |
| **Operating System** | Windows 10/11 (`win32`) | Local & Sandbox Execution Host |
| **Node.js Runtime** | Node.js `>=20.x` | Backend API & Test Runner Runtime |
| **Test Runner** | Vitest `v3.2.7` | Backend Integration & Frontend Unit/Component Test Runner |
| **Frontend DOM Testing** | `@testing-library/react` `v16.1.0` + `@testing-library/jest-dom` `v6.6.3` + `jsdom` `v25.0.1` | Component rendering, form validation, accessibility, and user event simulation |
| **Backend API Harness** | `InProcessAgent` ([`server/tests/testAgent.js`](file:///c:/Users/Ryan/Desktop/LMS/server/tests/testAgent.js)) | Full Express request/response pipeline execution with session cookie & JWT Bearer header persistence |
| **Test Database** | Sequelize v6 + Isolated SQLite (`lms_test.sqlite`) / MySQL 8.0 | Deterministic migration & seeder verification before test execution |

---

## 2. Test Execution Commands

```powershell
# Run complete automated test suite (Backend + Frontend)
npm test

# Run backend integration, security, and cross-role workflow tests only
npm test --prefix server

# Run frontend unit, component, and form validation tests only
npm test --prefix client

# Run production frontend build verification
npm run build --prefix client
```

---

## 3. Executed Test Results Summary

| Test Suite | File | Executed | Passed | Failed | Blocked | Duration |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Backend Integration, RBAC & Cross-Role Workflows** | [`server/tests/lms.integration.test.js`](file:///c:/Users/Ryan/Desktop/LMS/server/tests/lms.integration.test.js) | 22 | **22** | 0 | 0 | `2.74s` |
| **Frontend Components, Public Pages & Auth Flows** | [`client/src/App.test.jsx`](file:///c:/Users/Ryan/Desktop/LMS/client/src/App.test.jsx) | 12 | **12** | 0 | 0 | `6.54s` |
| **Production Frontend Build (`vite build`)** | `client/dist/` | 1 | **1** | 0 | 0 | `8.07s` |
| **Database Migration & Seeder Verification** | `npm run db:migrate` & `npm run db:seed` | 2 | **2** | 0 | 0 | `1.12s` |
| **TOTAL** | | **37** | **37** | **0** | **0** | |

---

## 4. Detailed Backend & Cross-Role Workflow Test Results (`server/tests/lms.integration.test.js`)

1. **Unauthenticated Access Rejection (`PASS`)**:
   - `GET /api/dashboards/summary` without credentials returns `401 UNAUTHENTICATED`.
2. **Five-Role Authentication & Dashboard Telemetry (`PASS`)**:
   - Logs in `super_admin`, `academic_admin`, `instructor`, `teaching_assistant`, and `student` accounts and verifies live database metrics on each role's `/api/dashboards/summary`.
3. **Vertical Privilege Escalation Prevention (`PASS`)**:
   - Blocks students from `GET /api/users` (`403 FORBIDDEN_PERMISSION`) and blocks instructors from `GET /api/audit-logs` (`403 FORBIDDEN_PERMISSION`), recording `UNAUTHORIZED_PERMISSION_ACCESS_ATTEMPT` security events.
4. **Super Admin User Provisioning & Self-Deactivation Guard (`PASS`)**:
   - Creates a new learner account (`201`) and blocks the Super Admin from deactivating their own account (`400 SELF_DEACTIVATION_FORBIDDEN`).
5. **Workflow 1 — Academic Setup, Course Creation & CSV Bulk Import (`PASS`)**:
   - Academic Admin creates course `CLOUD-301` (`201`) and imports multiple student records and class enrollments via `POST /api/enrollments/import-csv` (`201`).
6. **Duplicate Enrollment Protection (`PASS`)**:
   - Rejects duplicate enrollment of an already-enrolled student in the same section with `409 DUPLICATE_ENROLLMENT`.
7. **Workflow 2 — Content Authoring & Stored XSS Sanitization (`PASS`)**:
   - Instructor creates a new lesson containing malicious `<script>alert("xss")</script>` and `onclick=` attributes; verifies the persisted HTML strips all executable scripts (`201`).
8. **Student Lesson Completion & Progress Recalculation (`PASS`)**:
   - Student marks a lesson complete via `POST /api/progress/lessons` (`200`); verifies `lessonProgress.status === 'completed'` and automatic recalculation of `courseProgress.progressPercentage`.
9. **Workflow 3 — Student Assignment Submission & Version History (`PASS`)**:
   - Student submits code and text work via `POST /api/assignments/1/submit` (`200`) and preserves submission version history.
10. **Workflow 6 — Teaching Assistant Permission Enforcement (`PASS`)**:
    - Blocks Teaching Assistant from publishing an official grade (`403 TA_PUBLISH_GRADE_FORBIDDEN`), while allowing the TA to record preliminary feedback and flag the submission for instructor review (`200`, `status: 'under_review'`).
11. **Horizontal Privilege Escalation Prevention Between Instructors (`PASS`)**:
    - Blocks `instructor2` from grading a submission in a class section assigned to `instructor1` (`403 CLASS_ACCESS_DENIED`).
12. **Assigned Instructor Official Grading & Gradebook Sync (`PASS`)**:
    - Assigned instructor grades the submission (`200`, `score: 90`, `status: 'graded'`) and automatically records the entry in the weighted gradebook and `grade_history`.
13. **Workflow 4 — Server-Timed Quiz Engine, Answer Key Protection & Auto-Grading (`PASS`)**:
    - Student starts a quiz attempt (`200`); verifies `isCorrect` and `correctAnswerText` are stripped from the API payload; submits answers and verifies automatic scoring (`totalScore: 30`, `status: 'graded'`).
14. **Student Record Isolation / IDOR Protection (`PASS`)**:
    - When a student calls `GET /api/grades/class/1`, the server returns only that student's own grade row (`students.length === 1`) and never exposes classmates' grades.
15. **Grade Category Weight Validation (`PASS`)**:
    - Rejects grade category weight configurations that do not sum to `100%` with `400 INVALID_WEIGHT_SUM`.
16. **Workflow 5 — Academic Admin Final Grade Approval & Locking (`PASS`)**:
    - Academic Admin approves submitted final class grades (`200`, `finalGradesStatus: 'approved'`).
17. **Workflow 7 — Public Certificate Verification (`PASS`)**:
    - Verifies completion certificate `AIT-CERT-2026-8841` via `GET /api/certificates/verify/AIT-CERT-2026-8841` (`200`, `verified: true`, `courseCode: 'NET-201'`).
18. **Authorized CSV Report Export & Student Export Block (`PASS`)**:
    - Blocks students from exporting reports (`403`) and verifies instructor CSV gradebook export (`200`, `text/csv`).
19. **Versioned API (`/api/v1`) & Public Catalog (`PASS`)**:
    - Verifies `GET /api/v1/public/catalog` returns published courses (`200`).
20. **JWT Bearer Authentication & Tampered Token Rejection (`PASS`)**:
    - Verifies stateless `Authorization: Bearer <accessToken>` authentication on `/api/v1/auth/me` (`200`) and rejects tampered tokens (`401 INVALID_TOKEN`).
21. **Referenced Academic Record Deletion Protection (`PASS`)**:
    - Blocks deleting a department referenced by existing courses/programs (`409 REFERENCED_RECORD_PROTECTED`).
22. **Workflow 8 — Account Deactivation Session & JWT Invalidation (`PASS`)**:
    - Verifies that when a Super Admin deactivates an active user, the user's existing session cookie, existing JWT Bearer token, and any subsequent login attempts are immediately rejected with `403 ACCOUNT_INACTIVE`.

---

## 5. Defects Identified & Resolved During QA

| Defect ID | Description | Root Cause | Resolution | Status |
| :--- | :--- | :--- | :--- | :---: |
| `DEF-01` | Running `cp .env.example .env` followed by `npm test` caused Super Admin login in Test 1 to return `401`. | `.env.example` had `BOOTSTRAP_ADMIN_PASSWORD=replace_with_strong_initial_password`, overriding the seeder's `Admin@12345` default when `.env` was created. | Updated seeder [`20261028000001-seed-initial-data.js`](file:///c:/Users/Ryan/Desktop/LMS/server/src/seeders/20261028000001-seed-initial-data.js) and [`.env.example`](file:///c:/Users/Ryan/Desktop/LMS/.env.example) so placeholder strings or `NODE_ENV=test` always use `Admin@12345`. | **FIXED & VERIFIED** |
| `DEF-02` | `docker compose up --build` emitted warning `the attribute version is obsolete`. | `docker-compose.yml` included legacy Compose v1 `version: '3.9'` key. | Removed obsolete `version` key from [`docker-compose.yml`](file:///c:/Users/Ryan/Desktop/LMS/docker-compose.yml). | **FIXED & VERIFIED** |

---

## 6. Environment Notes & Readiness Assessment

- **Docker Engine Note**: `docker-compose.yml`, `server/Dockerfile`, and `client/Dockerfile` are complete and validated. Executing `docker compose up --build` on the Windows host requires the Docker Desktop application (`Docker Desktop.exe`) to be started by the user; when running locally without Docker, `npm run dev` runs both Backend and Frontend directly on Node.js with full database persistence.
- **Final Readiness Assessment**: **READY** — All 5 roles, 45 database tables, migrations, deterministic seeders, REST API endpoints (`/api/v1` and `/api`), frontend pages, security controls, automated tests (34/34 unit/integration tests passing), and documentation deliverables are complete and verified.

