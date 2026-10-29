# Aetheria Institute & Networking Academy — Next-Generation Role-Based LMS

A complete, production-quality, full-stack Role-Based Learning Management System (LMS) inspired by the educational workflows and laboratory experience of Cisco Networking Academy (NetAcad).

---

## 1. Main Features & Five-Role Architecture

1. **Super Administrator (`super_admin`)**:
   - Live platform telemetry dashboard, user provisioning & status management (`active`, `inactive`, `suspended`), interactive role-permission matrix, academic structure oversight, system configuration, and tamper-evident security & audit logs.
2. **Academic Administrator (`academic_admin`)**:
   - Department & degree program management, academic year & semester configuration, master course catalog, class section provisioning, instructor & TA assignments, student enrollment & section transfers, CSV bulk import, and final grade approval/locking workflows.
3. **Instructor / Teacher (`instructor`)**:
   - Assigned class dashboard, Course Studio (ordered modules, XSS-sanitized lessons, guided networking/cybersecurity labs, downloadable resources), assignments & grading rubrics, reusable multi-type question banks, server-timed quizzes & exams, submission grading, weighted gradebook management, and CSV report exports.
4. **Teaching Assistant (`teaching_assistant`)**:
   - Assigned section roster and progress monitoring, student submission review queue, preliminary rubric scoring & feedback, submission flagging/escalation to the instructor, and class discussion moderation (with strict server-side blocks against publishing official grades or accessing unassigned sections).
5. **Student / Learner (`student`)**:
   - Personalized learning dashboard, course catalog & self-enrollment, interactive lesson viewer with real-time progress tracking, versioned assignment submissions (text, code, files), server-timed quiz & examination runner, personal gradebook with feedback, discussion forums, direct messaging, and verifiable completion certificates (`AIT-CERT-YYYY-XXXX`).

---

## 2. Technology Stack

- **Frontend (`client/`)**: React 18, Vite, JavaScript (JSX), Tailwind CSS, React Router v6, Axios, TanStack Query v5, React Hook Form, Zod, Recharts, Lucide React.
- **Backend (`server/`)**: Node.js, Express.js, Sequelize ORM v6, MySQL 8 (`mysql2` for production/Docker; automatic `sqlite3` support for zero-daemon local execution & testing), Argon2id password hashing, dual HTTP-only Session + HS256 JWT authentication, Zod server-side validation, Multer controlled file uploads, Pino structured logging.
- **Testing & DevOps**: Vitest + React Testing Library + In-Process Express Integration Harness, Docker Desktop & Docker Compose (`docker-compose.yml`).

---

## 3. Seeded Development Accounts (Local Development Only)

| Role | Email | Password | Assigned Scope / Persona |
| :--- | :--- | :--- | :--- |
| **Super Administrator** | `superadmin@academy.edu` | `Admin@12345` | Victor Aris — Platform CIO & Super Admin |
| **Academic Administrator** | `acadadmin@academy.edu` | `Acad@12345` | Clarissa Thorne — Institutional Registrar |
| **Instructor (Primary)** | `instructor@academy.edu` | `Inst@12345` | Prof. Elena Vance — Assigned to `NET-201`, `SEC-202`, ` PRG-101` |
| **Instructor (Secondary)** | `instructor2@academy.edu` | `Inst@12345` | Prof. Marcus Sterling — Assigned to `SEC-305` |
| **Teaching Assistant** | `ta@academy.edu` | `Ta@12345` | Liam Reyes — Assigned to `BSIT-3A-NET201` |
| **Student (Primary)** | `student@academy.edu` | `Stud@12345` | Maya Lin (`2026-00101`) — Enrolled in `NET-201` & `SEC-202` |
| **Student (Secondary)** | `student2@academy.edu` | `Stud@12345` | Carlos Rivera (`2026-00102`) — Enrolled in `NET-201` |

---

## 4. Installation, Database Setup & Startup Instructions

### Option A: Local Development (Node.js — No Docker Required)

1. **Install Dependencies**:
   ```powershell
   npm run install:all
   ```
2. **Configure Environment**:
   ```powershell
   cp .env.example .env
   ```
   *(By default, `.env` and `server/.env` use `DB_DIALECT=sqlite` so the application runs out-of-the-box without requiring a local MySQL daemon. To connect to a local MySQL 8 server, set `DB_DIALECT=mysql` and update `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.)*
3. **Run Migrations & Seed Deterministic Data**:
   ```powershell
   npm run db:migrate
   npm run db:seed
   ```
   *(To reset and re-seed the development database cleanly at any time, run `npm run db:reset`.)*
4. **Start Backend & Frontend Together**:
   ```powershell
   npm run dev
   ```
   - **Frontend Application**: `http://localhost:5173`
   - **Backend REST API**: `http://localhost:5000/api/v1` (and `http://localhost:5000/api`)

### Option B: Docker Compose (MySQL 8.0 + Express API + Nginx Frontend)

1. Ensure **Docker Desktop** is running (`Start-Process "C:\Users\Ryan\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe"` on Windows).
2. Build and start all services:
   ```powershell
   docker compose up --build
   ```
   - **Frontend Portal**: `http://localhost:8080`
   - **Backend API**: `http://localhost:5000/api/v1`
   - **MySQL 8.0**: Port `3306`
3. Stop containers (preserving persistent volumes):
   ```powershell
   docker compose down
   ```

---

## 5. Automated Testing & Build Verification Commands

```powershell
# Run all automated tests (22 Backend Integration Tests + 12 Frontend Component Tests)
npm test

# Run backend integration & security suite only
npm run test:server

# Run frontend unit & component suite only
npm run test:client

# Verify production frontend build
npm run build
```

---

## 6. Complete Documentation Suite

- [**User Manual (`docs/USER_MANUAL.md`)**](file:///c:/Users/Ryan/Desktop/LMS/docs/USER_MANUAL.md) — 12-chapter beginner-friendly manual for all five roles.
- [**API Documentation (`docs/API_DOCUMENTATION.md`)**](file:///c:/Users/Ryan/Desktop/LMS/docs/API_DOCUMENTATION.md) — Complete REST endpoint reference (`/api/v1` & `/api`), permissions, and response formats.
- [**Page-by-Page Test Matrix (`docs/PAGE_TEST_MATRIX.md`)**](file:///c:/Users/Ryan/Desktop/LMS/docs/PAGE_TEST_MATRIX.md) — Complete test inventory for all 45+ routes and views.
- [**Executed Test Report (`docs/TEST_REPORT.md`)**](file:///c:/Users/Ryan/Desktop/LMS/docs/TEST_REPORT.md) — Detailed results of all unit, integration, cross-role workflow, and authorization tests.
- [**Database Design (`docs/DATABASE_DESIGN.md`)**](file:///c:/Users/Ryan/Desktop/LMS/docs/DATABASE_DESIGN.md) — Normalized 45-table relational schema and ER diagram.
- [**System Architecture (`docs/SYSTEM_ARCHITECTURE.md`)**](file:///c:/Users/Ryan/Desktop/LMS/docs/SYSTEM_ARCHITECTURE.md) — Three-tier architecture, security controls, and permission matrix.
- [**OpenAPI 3.0 Spec (`docs/openapi.json`)**](file:///c:/Users/Ryan/Desktop/LMS/docs/openapi.json) — Machine-readable OpenAPI specification.
