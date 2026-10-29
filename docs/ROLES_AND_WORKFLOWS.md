# User Roles, Permissions Matrix & End-to-End Workflows

## 1. Centralized RBAC Permission Matrix

All permissions are stored in the `permissions` and `role_permissions` tables and enforced server-side by `server/src/middleware/auth.middleware.js`.

| Capability / Domain Action | Super Admin | Academic Admin | Instructor | Teaching Assistant | Student |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **System Health, Backups & Maintenance** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Users, Roles & Role Permissions** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View System Audit & Security Logs** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Departments, Programs & Terms** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage Courses, Offerings & Class Sections** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Assign Instructors & Teaching Assistants** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Bulk CSV User Import & Section Transfers** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Approve & Lock Final Class Grades** | ❌ *(Audited)* | ✅ | ❌ | ❌ | ❌ |
| **Create Modules, Lessons & Lab Resources** | ❌ | ❌ | ✅ *(Assigned)* | ❌ | ❌ |
| **Create Assignments, Rubrics & Exams** | ❌ | ❌ | ✅ *(Assigned)* | ❌ | ❌ |
| **Publish / Override Grades & Submit Finals** | ❌ | ❌ | ✅ *(Assigned)* | ❌ | ❌ |
| **Record Preliminary Rubric Scores & Flag** | ❌ | ❌ | ✅ *(Assigned)* | ✅ *(Assigned)* | ❌ |
| **Enroll, View Lessons & Track Progress** | ❌ | ❌ | ❌ | ❌ | ✅ *(Enrolled)* |
| **Submit Assignments & Take Timed Exams** | ❌ | ❌ | ❌ | ❌ | ✅ *(Enrolled)* |
| **View Personal Gradebook & Certificates** | ❌ | ❌ | ❌ | ❌ | ✅ *(Own Only)* |
| **Participate in Discussions & Messaging** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 2. End-to-End Educational Workflows

### Workflow A: Academic Structure & Class Provisioning (`Academic Administrator`)
1. The Academic Administrator configures the **Academic Year** (`2026-2027`) and **Semester** (`First Semester AY 2026-2027`) with enrollment windows.
2. They create **Departments** (e.g., *Department of Network Engineering & Cybersecurity*) and **Programs** (e.g., *BS in Information Technology*).
3. They author master **Courses** (`NET-201`, `SEC-301`) and provision **Class Sections** (`NET201-A`), assigning primary **Instructors** and **Teaching Assistants**.
4. Students are enrolled individually, via **CSV Bulk Import**, or through the **Course Catalog** self-enrollment request workflow.

### Workflow B: Curriculum Authoring & Technical Laboratories (`Instructor`)
1. The Instructor opens an assigned class section (`NET201-A`) and organizes sequential **Modules** with optional unlock dates and completion rules.
2. Inside each module, the Instructor creates **Lessons** containing Markdown guides, network topology diagrams, embedded videos, and interactive CLI/code practice blocks, plus downloadable **Learning Resources** (`.pka` topologies, RFC PDFs).
3. The Instructor creates **Assignments** with **Grading Rubrics**, configuring deadline rules, late submission penalty percentages, maximum attempts, and programming starter templates.

### Workflow C: Student Learning, Lab Submission & Timed Examinations (`Student`)
1. The Student accesses the **Course Player**, reads lessons, executes code/CLI syntax checks in the interactive workspace, and clicks **Mark Lesson Complete**, which triggers `recalculateStudentClassProgress` on the backend.
2. In the **Assignments Workspace**, the Student saves drafts or submits technical deliverables (code snippets, lab reports, or file attachments). Resubmissions create versioned snapshots in `submission_versions`.
3. In the **Assessment Center**, starting a quiz or examination creates a server-timed `assessment_attempts` record with an authoritative `expires_at` timestamp. Upon submission, objective questions (`multiple_choice`, `multiple_select`, `true_false`, `short_answer`, `matching`, `fill_blank`, `code_practical`) are automatically graded and recorded in the gradebook.

### Workflow D: TA Preliminary Review & Instructor Final Grading (`TA` → `Instructor` → `Academic Admin`)
1. The **Teaching Assistant** reviews submitted student work in the **TA Submission Queue**, applies rubric criteria to compute a **Preliminary Score** and preliminary feedback, or **Flags** a submission (e.g., for topology verification or academic integrity review) to escalate it to the Instructor.
2. The **Instructor** reviews the submission (including any TA preliminary evaluation), assigns the authoritative score, applies or waives late penalties, and publishes the grade.
3. Publishing a grade triggers `recordGradeAndRecalculate` (`server/src/services/gradebook.service.js`), which writes an immutable `grade_history` audit record and recalculates the student's weighted class standing across all `grade_categories`.
4. At the end of the term, the Instructor submits the class final grades (`final_grades_status = 'submitted_for_approval'`).
5. The **Academic Administrator** reviews the submitted roster grades and **Approves & Locks** them (`final_grades_status = 'approved'`), locking individual grade entries against unauthorized post-term tampering.

