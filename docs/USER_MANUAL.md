# Aetheria Institute & Networking Academy LMS — Complete User Manual

Welcome to the official beginner-friendly User Manual for the **Aetheria Institute & Networking Academy Learning Management System (LMS)**. This guide is written for administrators, registrars, instructors, teaching assistants, and students with no prior programming experience required.

---

## Chapter 1: Introduction

### 1.1 What the LMS Is
The Aetheria Academy LMS is a centralized web platform inspired by the educational workflows of Cisco Networking Academy (NetAcad). It connects institutional administration, classroom teaching, technical laboratory exercises, automated and rubric-based assessments, weighted gradebooks, and verifiable completion certificates in one unified portal.

### 1.2 Who Uses It & Purpose of Each Role
The system enforces five distinct roles:
1. **Super Administrator (`super_admin`)**: Manages platform-wide user accounts, role permissions, security policies, system settings, health monitoring, and tamper-evident audit logs.
2. **Academic Administrator (`academic_admin`)**: Acts as the institutional registrar—managing academic departments, degree programs, academic years, semesters, courses, class sections, instructor/TA assignments, student enrollments, CSV bulk imports, and final grade approvals.
3. **Instructor / Teacher (`instructor`)**: Manages assigned class sections—authoring modules, lessons, downloadable resources, laboratory assignments, grading rubrics, question banks, and timed quizzes/exams, and computing official class grades.
4. **Teaching Assistant (`teaching_assistant`)**: Supports assigned class sections within delegated permissions—monitoring student progress, replying to class discussions, reviewing submitted assignments using rubrics, entering preliminary feedback/scores, and flagging submissions for the instructor.
5. **Student / Learner (`student`)**: Browses the course catalog, enrolls in eligible sections, studies lessons and lab guides, submits assignments, completes timed quizzes and examinations, monitors personal grades and progress, and downloads earned completion certificates.

### 1.3 Key Difference Between an Instructor and a Teaching Assistant
- **Instructor**: Holds full academic authority over assigned class sections. Can create/publish modules, assignments, and exams, assign official grades, override gradebook entries, and submit final term grades for approval.
- **Teaching Assistant (TA)**: Is **not** a second instructor. A TA can only access specifically assigned class sections, view rosters, assist students in discussions, record *preliminary* feedback/scores, and flag submissions for instructor review. By default, a TA **cannot** publish official grades, alter course structure, or submit final class grades.

---

## Chapter 2: Accessing the System

### 2.1 Opening the Application
1. Open a modern web browser (Chrome, Edge, Firefox, or Safari).
2. Navigate to **`http://localhost:5173`** (local development) or **`http://localhost:8080`** (Docker deployment).
3. To view public information before signing in, use the top navigation links for **Home (`/landing`)**, **About LMS (`/about`)**, **Course Catalog (`/catalog`)**, **Verify Certificate (`/verify-certificate`)**, **Privacy Notice (`/privacy`)**, and **Terms of Use (`/terms`)**.

### 2.2 Logging In (`/login`)
1. Open **`/login`**.
2. Enter your **Institutional Email Address** and **Password**.
   - *Local Evaluation Tip*: In local development, click any of the **Seeded Local Development Accounts** buttons on the left panel to autofill credentials for that role.
3. Click **Sign In to Workspace**.
4. Upon authentication, the server issues an HTTP-only session cookie (`lms.sid`) and signed JWT token (`lms.jwt`) and automatically redirects you to your role-specific dashboard:
   - Super Administrator → `/admin/dashboard`
   - Academic Administrator → `/academic/dashboard`
   - Instructor → `/instructor/dashboard`
   - Teaching Assistant → `/ta/dashboard`
   - Student → `/student/dashboard`

### 2.3 Navigating the Sidebar & Header
- **Left Sidebar**: Displays only the navigation links authorized for your active role.
- **Top Header**: Displays your current role badge, the **Notification Bell** (showing unread alerts), a shortcut to **Direct Messages (`/messages`)**, **Profile & Security (`/profile`)**, and the **Sign Out** button.

### 2.4 Logging Out Safely
Click the **Sign Out** button in the top-right header or bottom of the sidebar. This immediately destroys your server session, clears authentication cookies, and returns you to `/login`.

### 2.5 What to Do If Login Fails
- **"Invalid email or password"**: Check for typos and ensure Caps Lock is off.
- **"Account temporarily locked"**: After 5 consecutive failed password attempts, the account locks for 15 minutes to prevent brute-force attacks. Wait 15 minutes or contact a Super Administrator.
- **Forgot Password**: Click **Forgot password?** (`/forgot-password`), enter your institutional email, and follow the reset token link to `/reset-password`.

---

## Chapter 3: Super Administrator Guide

### 3.1 Managing User Accounts (`/admin/users`)
- **View & Filter Users**: Open **User Directory** (`/admin/users`). Use the search box (name, email, ID) or filter dropdowns (`Role`, `Status`) to locate accounts.
- **Create a User**:
  1. Click **+ Provision Account**.
  2. Enter **First Name**, **Last Name**, **Institutional Email**, **Initial Password**, and select the **Primary Role**.
  3. Click **Create Account**.
- **Activate, Suspend, or Deactivate an Account**:
  - In the User Directory table, use the **Status** action control to toggle an account between `active`, `inactive`, or `suspended`.
  - *Warning*: Deactivating or suspending a user immediately blocks them from signing in and invalidates any active session or JWT token they hold.
  - *Safety Rule*: You cannot deactivate your own account or deactivate the final active Super Administrator.

### 3.2 Managing Roles & Permissions (`/admin/roles`)
1. Open **Roles & Permissions** (`/admin/roles`).
2. Select a role tab (`super_admin`, `academic_admin`, `instructor`, `teaching_assistant`, `student`).
3. Toggle granular permissions on or off and click **Save Permission Policy**.
4. Every permission change is automatically recorded in the audit log.

### 3.3 Academic Structure & System Settings (`/admin/academic-config`, `/admin/settings`)
- Use **Academic Config** (`/admin/academic-config`) to oversee departments and degree programs.
- Use **System Settings** (`/admin/settings`) to update institution branding, security lockout thresholds, file upload limits, and grading scale templates.

### 3.4 Reviewing Audit Logs & System Health (`/admin/audit-logs`, `/admin/dashboard`)
- Open **Security & Audit Logs** (`/admin/audit-logs`) to filter events by category (`auth`, `security`, `user`, `course`, `grade`, `academic`) or severity (`info`, `warning`, `critical`).
- Check **System Overview** (`/admin/dashboard`) for live database connectivity status and security alerts.

---

## Chapter 4: Academic Administrator Guide

### 4.1 Setting Up Departments & Programs (`/academic/structure`)
1. Open **Departments & Programs** (`/academic/structure`).
2. To create a department, fill in **Department Code** (e.g., `DEPT-ITN`), **Department Name**, and **Department Head**, then click **Create Department**.
3. To create a degree program, select the parent **Department**, enter **Program Code** (e.g., `BSIT`), **Program Name**, and **Degree Type**, then click **Create Program**.
   - *Note*: Departments that are referenced by existing courses or programs cannot be deleted; archive or update them instead.

### 4.2 Configuring Academic Years & Semesters (`/academic/terms`)
1. Open **Academic Terms** (`/academic/terms`).
2. Create an **Academic Year** (e.g., `2026–2027`) with start and end dates.
3. Create a **Semester** (e.g., `First Semester, 2026–2027`) linked to that academic year, including enrollment start and end dates.

### 4.3 Creating Courses, Offerings & Class Sections (`/academic/courses`, `/academic/classes`)
1. Open **Courses & Offerings** (`/academic/courses`) to create a reusable **Course** (e.g., `NET-201`) and link it to a semester via a **Course Offering**.
2. Open **Classes & Sections** (`/academic/classes`) to create a specific **Class Section** (e.g., `BSIT-3A-NET201`), set maximum student capacity, and assign an **Instructor** and **Teaching Assistant**.

### 4.4 Enrolling Students, Transfers & CSV Import (`/academic/enrollments`)
1. Open **Enrollments & CSV** (`/academic/enrollments`).
2. **Individual Enrollment**: Select a student and target class section, then click **Enroll Student**. Duplicate enrollments and over-capacity sections are automatically blocked.
3. **Section Transfer**: Select an enrolled student, source section, and destination section to transfer their enrollment.
4. **CSV Bulk Import**: Paste CSV lines in the format `firstName,lastName,email,studentNumber`, select an optional target class section, and click **Run CSV Import**.

### 4.5 Reviewing & Approving Final Grades (`/academic/grade-approvals`)
1. Open **Grade Approvals** (`/academic/grade-approvals`).
2. Review class sections where the instructor has submitted final grades (`submitted_for_approval`).
3. Click **Approve & Lock Final Grades** to finalize official standings, or **Return for Revision** with remarks so the instructor can make corrections.

---

## Chapter 5: Instructor Guide

### 5.1 Organizing Modules, Lessons & Resources (`/instructor/courses`)
1. Open **Course Studio** (`/instructor/courses`) and select your assigned class section.
2. **Create a Module**: Enter the module title, description, and sequence order, then click **Add Module**.
3. **Create a Lesson**: Select a module, enter the lesson title, estimated duration, content HTML/Markdown, and guided lab instructions, and choose whether to publish immediately.
4. **Upload Learning Resources**: Attach downloadable files (`.pdf`, `.pka`, `.zip`, `.txt`, `.py`) or reference links to a module or lesson. Executable scripts/binaries (`.exe`, `.bat`, `.sh`) are automatically rejected for security.

### 5.2 Creating Assignments & Grading Submissions (`/instructor/assignments`, `/instructor/submissions`)
1. Open **Assignments & Labs** (`/instructor/assignments`).
2. Click **+ New Assignment**, configure the title, instructions, maximum points, due date, submission type (`file`, `text`, `code`, `mixed`), and late penalty percentage, then click **Create Assignment**.
3. Open **Submission Review** (`/instructor/submissions`) to inspect student submissions:
   - View any **TA Preliminary Feedback** or **Flagged** alerts.
   - Enter the official **Score** and **Instructor Feedback**, or click **Return for Revision**.
   - Saving an official score automatically updates the student's weighted class gradebook and records an audit entry.

### 5.3 Creating Question Banks, Quizzes & Examinations (`/instructor/assessments`)
1. Open **Quizzes & Question Banks** (`/instructor/assessments`).
2. Create a **Question Bank** and add questions (`multiple_choice`, `multiple_select`, `true_false`, `short_answer`, `essay`, `code_practical`).
3. Create an **Assessment** (Quiz, Module Exam, or Final Exam), set the time limit in minutes, maximum attempts, passing score percentage, and select questions from your bank.

### 5.4 Managing the Gradebook & Submitting Final Grades (`/instructor/gradebook`)
1. Open **Class Gradebook** (`/instructor/gradebook`).
2. View every enrolled student's score across assignments and exams, weighted category averages, overall percentage, and computed letter grade.
3. Click **Configure Category Weights** to adjust category weights (must total exactly `100%`).
4. When term grading is complete, click **Submit Final Grades for Approval** to forward the roster to the Academic Administrator.

---

## Chapter 6: Teaching Assistant Guide

### 6.1 Accessing Assigned Sections & Rosters (`/ta/dashboard`, `/ta/classes`)
- Open **TA Workspace** (`/ta/dashboard`) to see your assigned class sections, pending submissions awaiting preliminary review, flagged items, and unanswered student discussion threads.

### 6.2 Reviewing Submissions & Flagging for the Instructor (`/ta/submissions`)
1. Open **Submission Queue** (`/ta/submissions`).
2. Select a student submission to inspect their submitted text, code snippet, or uploaded file.
3. Enter **Preliminary Feedback** and (if delegated for your section) a **Preliminary Score**.
4. Check **Flag for Instructor Review** and enter a **Flag Reason** if the submission requires instructor verification or escalation.
5. Click **Save Preliminary Review**.

### 6.3 Actions Teaching Assistants Cannot Perform
By security policy, Teaching Assistants **cannot**:
- Publish or finalize official grades (`TA_PUBLISH_GRADE_FORBIDDEN`).
- Submit or approve final class grades.
- Access class sections to which they are not assigned (`CLASS_ACCESS_DENIED`).
- Modify system settings, user roles, or academic departments.

---

## Chapter 7: Student Guide

### 7.1 Browsing the Catalog & Enrolling (`/student/catalog`)
1. Open **Course Catalog** (`/student/catalog`).
2. Search by course code, title, or category.
3. Click **Enroll in Section** on an open class offering to join immediately.

### 7.2 Studying Lessons & Tracking Completion (`/student/courses`)
1. Open **My Learning Studio** (`/student/courses`) and select an enrolled class.
2. Browse published modules and click any lesson to read the material, view guided laboratory instructions, and download attached resources.
3. Click **Mark Lesson Complete** at the bottom of the lesson. Your course progress bar updates automatically in real time.

### 7.3 Submitting Assignments (`/student/assignments`)
1. Open **Assignments & Labs** (`/student/assignments`).
2. Select an assignment to view instructions, due date, maximum points, and rubric criteria.
3. Enter your **Text Response**, **Code Snippet**, and/or attach a permitted file, then click **Submit Assignment** (or **Save Draft**).
4. If allowed by the assignment's attempt limit, you may submit an updated version before the lock date; all versions are preserved.

### 7.4 Taking Timed Quizzes & Examinations (`/student/assessments`)
1. Open **Quizzes & Exams** (`/student/assessments`).
2. Click **Start Assessment Attempt** on an available quiz or exam.
3. Answer each question before the server countdown timer expires. Answers can be saved in progress and resumed if your browser refreshes.
4. Click **Submit Final Attempt**. Objective questions are graded immediately, while essay questions are marked pending instructor review.

### 7.5 Viewing Personal Grades, Progress & Certificates (`/student/grades`, `/student/certificates`)
- Open **Grades & Progress** (`/student/grades`) to view your score breakdown, instructor feedback, and weighted standing.
- Open **My Certificates** (`/student/certificates`) to view and print/download your earned completion certificates (`AIT-CERT-YYYY-XXXX`), or verify any certificate publicly at `/verify-certificate`.

---

## Chapter 8: Notifications and Communication

- **In-App Notifications**: Triggered automatically when grades are released, announcements are published, or final grades are approved. Click the **Bell Icon** in the top header to view and mark notifications as read.
- **Announcements** (`/student/announcements`, `/instructor/announcements`, `/academic/announcements`): Display institutional and class-specific notices.
- **Discussion Forums** (`/student/discussions`, `/instructor/discussions`, `/ta/discussions`): Threaded Q&A forums per class section where students ask questions and instructors/TAs post replies and mark resolved answers.
- **Direct Messages** (`/messages`): Private academic conversations between students, TAs, and instructors.

---

## Chapter 9: Reports and Academic Records

- Authorized roles (`super_admin`, `academic_admin`, `instructor`) can open **Reports & Exports** (`/admin/reports`, `/academic/reports`, `/instructor/reports`).
- Supported report types:
  1. **Class Gradebook Report (`gradebook`)**
  2. **Enrollment & Completion Report (`enrollments`)**
  3. **Missing Submissions Report (`missing_submissions`)**
- Reports can be viewed in-app or exported as downloadable **CSV** files (`format=csv`). Students are blocked from exporting institutional or class-wide reports.

---

## Chapter 10: Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Cannot log in (`401`)** | Incorrect email or password | Verify credentials or use **Forgot password?** (`/forgot-password`). |
| **Account locked (`423`)** | 5 failed login attempts | Wait 15 minutes for automatic unlock or contact a Super Administrator. |
| **Account inactive (`403`)** | Account was deactivated or suspended | Contact your institution's Super Administrator. |
| **Course or lesson does not appear** | Content is still in `draft` (unpublished) state | Instructors must publish modules and lessons before students can view them. |
| **File upload fails (`400`)** | Unsupported file extension or file exceeds 50 MB | Upload only permitted formats (`.pdf`, `.doc`, `.docx`, `.txt`, `.zip`, `.pka`, `.py`, `.js`, `.json`, `.png`, `.jpg`). |
| **Quiz cannot be started (`403`/`400`)** | Maximum attempts reached or window closed | Contact your course instructor if an additional attempt is needed. |
| **Certificate not available yet** | Course completion is below 100% or grade is below passing threshold | Complete all required lessons and assessments with a passing score. |

---

## Chapter 11: Frequently Asked Questions (FAQ)

1. **Can a student see another student's grades or submissions?**
   No. All student queries are strictly isolated on the backend to the authenticated student's own user ID.
2. **Can a Teaching Assistant change my final grade?**
   No. Teaching Assistants can only provide preliminary feedback and preliminary rubric scores or flag work for the instructor. Only the assigned Instructor can publish official grades.
3. **What happens if I refresh the browser during a timed quiz?**
   Your active attempt and saved answers are stored on the server. Reopening the quiz resumes your active attempt with the authoritative server timer.
4. **How can an employer verify my completion certificate?**
   Anyone can visit `/verify-certificate` and enter the certificate verification code (e.g., `AIT-CERT-2026-8841`) to confirm its authenticity.

---

## Chapter 12: Security and Best Practices

1. **Protect Your Credentials**: Use a strong password (at least 8 characters with uppercase, lowercase, and numbers) and never share your login session.
2. **Sign Out on Shared Workstations**: Always click **Sign Out** when finished using a laboratory or library computer.
3. **Upload Only Safe Academic Files**: Never attempt to upload executable binaries or malicious scripts; all uploads are validated and logged.
4. **Respect Academic Integrity**: Do not attempt to access unauthorized URLs or manipulate API requests; all unauthorized access attempts are logged in the security audit trail.

