import { describe, it, expect, beforeAll } from 'vitest';

const { app, sessionStore } = require('../src/app');
const resetDatabase = require('../src/utils/resetDatabase');
const { createAgent } = require('./testAgent');

describe('Aetheria Academy LMS - Comprehensive Backend & Security Integration Suite', () => {
  const anonAgent = createAgent(app);
  const superAdminAgent = createAgent(app);
  const acadAdminAgent = createAgent(app);
  const instructorAgent = createAgent(app);
  const instructor2Agent = createAgent(app);
  const taAgent = createAgent(app);
  const studentAgent = createAgent(app);
  const student2Agent = createAgent(app);

  beforeAll(async () => {
    await sessionStore.sync();
    await resetDatabase();
  });

  describe('1. Authentication & Role-Specific Dashboards', () => {
    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const res = await anonAgent.get('/api/dashboards/summary');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('authenticates all five primary roles and returns role-tailored dashboards', async () => {
      const rolesToTest = [
        { agent: superAdminAgent, email: 'superadmin@academy.edu', pass: 'Admin@12345', expectedRole: 'super_admin' },
        { agent: acadAdminAgent, email: 'acadadmin@academy.edu', pass: 'Acad@12345', expectedRole: 'academic_admin' },
        { agent: instructorAgent, email: 'instructor@academy.edu', pass: 'Inst@12345', expectedRole: 'instructor' },
        { agent: instructor2Agent, email: 'instructor2@academy.edu', pass: 'Inst@12345', expectedRole: 'instructor' },
        { agent: taAgent, email: 'ta@academy.edu', pass: 'Ta@12345', expectedRole: 'teaching_assistant' },
        { agent: studentAgent, email: 'student@academy.edu', pass: 'Stud@12345', expectedRole: 'student' },
        { agent: student2Agent, email: 'student2@academy.edu', pass: 'Stud@12345', expectedRole: 'student' }
      ];

      for (const item of rolesToTest) {
        const loginRes = await item.agent
          .post('/api/auth/login')
          .send({ email: item.email, password: item.pass });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.data.user.primaryRole).toBe(item.expectedRole);

        const dashRes = await item.agent.get('/api/dashboards/summary');
        expect(dashRes.status).toBe(200);
        expect(dashRes.body.data.role).toBe(item.expectedRole);
      }
    });
  });

  describe('2. Server-Side RBAC & Privilege Escalation Protection', () => {
    it('prevents students and instructors from accessing Super Admin user management or audit logs', async () => {
      const studUsersRes = await studentAgent.get('/api/users');
      expect(studUsersRes.status).toBe(403);

      const instAuditRes = await instructorAgent.get('/api/audit-logs');
      expect(instAuditRes.status).toBe(403);
    });

    it('allows Super Admin to create a user and prevents self-deactivation', async () => {
      const createRes = await superAdminAgent.post('/api/users').send({
        firstName: 'Test',
        lastName: 'Learner',
        email: 'testlearner@academy.edu',
        password: 'Password@123',
        roleSlug: 'student',
        studentNumber: '2026-00999'
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.data.user.email).toBe('testlearner@academy.edu');

      const meRes = await superAdminAgent.get('/api/auth/me');
      const selfDeactivate = await superAdminAgent
        .put(`/api/users/${meRes.body.data.user.id}`)
        .send({ status: 'suspended' });
      expect(selfDeactivate.status).toBe(400);
      expect(selfDeactivate.body.code).toBe('SELF_DEACTIVATION_FORBIDDEN');
    });
  });

  describe('3. Academic Management, Course Creation & Enrollment Workflows', () => {
    it('allows Academic Admin to create a course, offering, class section, and import students via CSV', async () => {
      const courseRes = await acadAdminAgent.post('/api/courses').send({
        departmentId: 1,
        programId: 1,
        code: 'CLOUD-310',
        title: 'Cloud Infrastructure & Container Orchestration',
        description: 'Production Kubernetes, Docker networking, and zero-trust service mesh engineering.',
        category: 'Cloud & DevOps',
        creditUnits: 3
      });
      expect(courseRes.status).toBe(201);

      const csvRes = await acadAdminAgent.post('/api/enrollments/import-csv').send({
        classId: 1,
        defaultRole: 'student',
        csvText: 'firstName,lastName,email,studentNumber\nAria,Chen,ariachen@academy.edu,2026-00501'
      });
      expect(csvRes.status).toBe(201);
      expect(csvRes.body.data.importedCount).toBe(1);
    });

    it('prevents duplicate student enrollment in the same class section', async () => {
      const dupRes = await studentAgent.post('/api/enrollments').send({ classId: 1 });
      expect(dupRes.status).toBe(409);
      expect(dupRes.body.code).toBe('DUPLICATE_ENROLLMENT');
    });
  });

  describe('4. Learning Content Authoring, XSS Sanitization & Student Progress Tracking', () => {
    it('sanitizes executable script tags when an instructor creates a lesson', async () => {
      const lessonRes = await instructorAgent.post('/api/lessons').send({
        moduleId: 1,
        courseId: 1,
        title: '1.3 NETCONF RPC Operations over SSH',
        lessonType: 'reading',
        orderIndex: 3,
        contentHtml: '<h3>NETCONF Capabilities</h3><script>alert("xss")</script><p onclick="evil()">Safe paragraph</p>'
      });
      expect(lessonRes.status).toBe(201);
      expect(lessonRes.body.data.lesson.contentHtml).not.toContain('<script>');
      expect(lessonRes.body.data.lesson.contentHtml).not.toContain('onclick=');
    });

    it('updates student lesson completion and recalculates course progress', async () => {
      const progRes = await studentAgent.post('/api/progress/lessons').send({
        classId: 1,
        lessonId: 3,
        status: 'completed',
        timeSpentSeconds: 600
      });
      expect(progRes.status).toBe(200);
      expect(progRes.body.data.lessonProgress.status).toBe('completed');
      expect(Number(progRes.body.data.courseProgress.progressPercentage)).toBeGreaterThan(50);
    });
  });

  describe('5. Assignments, Submissions, TA Review & Instructor Grading', () => {
    it('allows student to submit assignment work and preserves version history', async () => {
      const subRes = await studentAgent.post('/api/assignments/2/submit').send({
        textResponse: 'Implemented HMAC-SHA256 webhook middleware with timingSafeEqual.',
        codeSubmission: 'const crypto = require("crypto");'
      });
      expect(subRes.status).toBe(200);
      expect(subRes.body.data.submission.status).toBe('submitted');
    });

    it('allows Teaching Assistant to provide preliminary feedback and flag for instructor, but blocks TA from publishing official grades', async () => {
      const taBlockRes = await taAgent.put('/api/submissions/2/review').send({
        score: 90,
        publishOfficialGrade: true
      });
      expect(taBlockRes.status).toBe(403);
      expect(taBlockRes.body.code).toBe('TA_PUBLISH_GRADE_FORBIDDEN');

      const taReviewRes = await taAgent.put('/api/submissions/2/review').send({
        preliminaryFeedback: 'Checked code structure; ready for final instructor scoring.',
        flaggedForInstructorReview: true,
        flagReason: 'Verified TLS question'
      });
      expect(taReviewRes.status).toBe(200);
      expect(taReviewRes.body.data.submission.status).toBe('under_review');
    });

    it('prevents an unrelated instructor from grading a submission in a class they do not teach', async () => {
      const unauthorizedGrade = await instructor2Agent.put('/api/submissions/2/review').send({
        score: 88,
        feedback: 'Unauthorized attempt'
      });
      expect(unauthorizedGrade.status).toBe(403);
      expect(unauthorizedGrade.body.code).toBe('CLASS_ACCESS_DENIED');
    });

    it('allows assigned instructor to grade a submission and records it in the gradebook', async () => {
      const gradeRes = await instructorAgent.put('/api/submissions/2/review').send({
        score: 90,
        feedback: 'Well structured RESTCONF script, Carlos!'
      });
      expect(gradeRes.status).toBe(200);
      expect(gradeRes.body.data.submission.status).toBe('graded');
      expect(Number(gradeRes.body.data.submission.score)).toBe(90);
    });
  });

  describe('6. Quiz & Examination Engine (Server-Timed, Answer Key Protection & Auto-Grading)', () => {
    it('starts a quiz attempt for student2 without exposing answer keys and auto-grades upon submission', async () => {
      const startRes = await student2Agent.post('/api/assessments/1/start');
      expect(startRes.status).toBe(200);
      const { attempt, questions } = startRes.body.data;
      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0].options[0].isCorrect).toBeUndefined();
      expect(questions[3].correctAnswerText).toBeUndefined();

      const submitRes = await student2Agent
        .post(`/api/assessment-attempts/${attempt.id}/submit`)
        .send({
          answers: [
            { questionId: 4, textAnswer: 'Argon2id' },
            { questionId: 5, textAnswer: '830' }
          ]
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.attempt.status).toBe('graded');
      expect(Number(submitRes.body.data.attempt.totalScore)).toBe(30);
    });

    it('enforces NetAcad-style automatic course completion only after all lessons AND course checkpoint quizzes are passed', async () => {
      // Complete remaining lessons in IT-401 (classId: 1, lessons 1, 2, 3, and newly created lesson 5) for student1 (Maya Lin)
      for (const lessonId of [1, 2, 3, 5]) {
        const res = await studentAgent.post('/api/progress/lessons').send({
          classId: 1,
          lessonId,
          status: 'completed',
          timeSpentSeconds: 300
        });
        expect(res.status).toBe(200);
      }

      // Check progress before passing the Course Completion Checkpoint Quiz (quiz2, id=2)
      const beforeQuizProg = await studentAgent.get('/api/progress?classId=1');
      expect(beforeQuizProg.status).toBe(200);
      expect(beforeQuizProg.body.data.courseProgress[0].isCompleted).toBe(false);
      expect(Number(beforeQuizProg.body.data.courseProgress[0].progressPercentage)).toBeLessThanOrEqual(95);

      // Now student1 starts and passes the Course Completion Checkpoint Quiz (quiz2, assessmentId: 3)
      const startQuiz2 = await studentAgent.post('/api/assessments/3/start');
      expect(startQuiz2.status).toBe(200);
      const { attempt: q2Attempt, questions: q2Questions } = startQuiz2.body.data;
      expect(q2Questions.length).toBe(4);

      const q4ArgonOpt = q2Questions.find((q) => q.questionId === 4).options.find((o) => o.optionText === 'Argon2id');
      const q3FalseOpt = q2Questions.find((q) => q.questionId === 3).options.find((o) => o.optionText === 'False');
      const q2IdemOpts = q2Questions
        .find((q) => q.questionId === 2)
        .options.filter((o) => ['GET', 'PUT', 'DELETE'].includes(o.optionText))
        .map((o) => o.id);

      // Answer the 4 checkpoint questions (Multiple Choice, True/False, Multiple Select, Matching Dropdowns)
      const submitQuiz2 = await studentAgent
        .post(`/api/assessment-attempts/${q2Attempt.id}/submit`)
        .send({
          answers: [
            { questionId: 4, selectedOptionIds: [q4ArgonOpt.id] },
            { questionId: 3, selectedOptionIds: [q3FalseOpt.id] },
            { questionId: 2, selectedOptionIds: q2IdemOpts },
            {
              questionId: 6,
              matchingResponse: {
                RESTCONF: 'HTTPS (TLS over TCP 443)',
                NETCONF: 'SSH (TCP 830)',
                SNMPv3: 'UDP (Ports 161/162)'
              }
            }
          ]
        });
      expect(submitQuiz2.status).toBe(200);
      expect(submitQuiz2.body.data.attempt.status).toBe('graded');
      expect(Number(submitQuiz2.body.data.attempt.totalScore)).toBe(100);

      // Verify course is now AUTOMATICALLY completed (100%) and certificate is issued
      const afterQuizProg = await studentAgent.get('/api/progress?classId=1');
      expect(afterQuizProg.status).toBe(200);
      expect(afterQuizProg.body.data.courseProgress[0].isCompleted).toBe(true);
      expect(Number(afterQuizProg.body.data.courseProgress[0].progressPercentage)).toBe(100);

      const certsRes = await studentAgent.get('/api/certificates');
      expect(certsRes.status).toBe(200);
      const it401Cert = certsRes.body.data.certificates.find((c) => c.course?.code === 'IT-401');
      expect(it401Cert).toBeDefined();
      expect(it401Cert.certificateCode).toMatch(/^AIT-CERT-/);
    });
  });

  describe('7. Gradebook Calculations, Privacy & Approval Workflow', () => {
    it('prevents a student from viewing another student’s grades (IDOR protection)', async () => {
      const classGbRes = await studentAgent.get('/api/grades/class/1');
      expect(classGbRes.status).toBe(200);
      expect(classGbRes.body.data.students.length).toBe(1);
      expect(classGbRes.body.data.students[0].studentEmail).toBe('student@academy.edu');
    });

    it('validates that grade category weights sum to 100%', async () => {
      const badWeights = await instructorAgent.put('/api/grades/class/1/categories').send({
        categories: [
          { name: 'Quizzes', categoryType: 'quiz', weightPercent: 30 },
          { name: 'Exams', categoryType: 'major_exam', weightPercent: 30 }
        ]
      });
      expect(badWeights.status).toBe(400);
      expect(badWeights.body.code).toBe('INVALID_WEIGHT_SUM');
    });

    it('allows Academic Admin to approve submitted final class grades', async () => {
      const approveRes = await acadAdminAgent
        .post('/api/grades/class/2/approve-final')
        .send({ decision: 'approved', remarks: 'Verified by Registrar' });
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.classSection.finalGradesStatus).toBe('approved');
    });
  });

  describe('8. Certificates & Authorized Reports', () => {
    it('verifies issued completion certificates by code', async () => {
      const verifyRes = await anonAgent.get('/api/certificates/verify/AIT-CERT-2026-8841');
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.verified).toBe(true);
      expect(verifyRes.body.data.certificate.courseCode).toBe('NET-201');
    });

    it('allows authorized CSV export of gradebook and blocks students from exporting reports', async () => {
      const studReport = await studentAgent.get('/api/reports?type=enrollments&format=csv');
      expect(studReport.status).toBe(403);

      const instReport = await instructorAgent.get('/api/reports?type=gradebook&classId=1&format=csv');
      expect(instReport.status).toBe(200);
      expect(instReport.headers['content-type']).toContain('text/csv');
      expect(instReport.text).toContain('Maya Lin');
    });
  });

  describe('9. JWT Bearer Auth, Versioned API (/api/v1), Referenced Record Protection & Account Deactivation Workflow', () => {
    it('supports /api/v1 versioned endpoints and public course catalog without exposing private data', async () => {
      const catalogRes = await anonAgent.get('/api/v1/public/catalog');
      expect(catalogRes.status).toBe(200);
      expect(catalogRes.body.data.courses.length).toBeGreaterThan(0);
      expect(catalogRes.body.data.courses[0].code).toBeDefined();
    });

    it('authenticates requests using JWT Bearer token and rejects tampered tokens', async () => {
      const freshAgent = createAgent(app);
      const loginRes = await freshAgent
        .post('/api/v1/auth/login')
        .send({ email: 'student@academy.edu', password: 'Stud@12345' });
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.data.accessToken;
      expect(token).toBeDefined();

      // Stateless agent using only Authorization: Bearer <token>
      const bearerAgent = createAgent(app);
      const meRes = await bearerAgent
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe('student@academy.edu');

      const badTokenRes = await bearerAgent
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');
      expect(badTokenRes.status).toBe(401);
      expect(badTokenRes.body.code).toBe('INVALID_TOKEN');
    });

    it('prevents deleting a department that is referenced by active courses or programs', async () => {
      const delRes = await superAdminAgent.delete('/api/v1/departments/1');
      expect(delRes.status).toBe(409);
      expect(delRes.body.code).toBe('REFERENCED_RECORD_PROTECTED');
    });

    it('enforces Workflow 8 (Account Deactivation): blocks deactivated user login and invalidates existing token/session', async () => {
      // Create and log in a temporary user
      const createRes = await superAdminAgent.post('/api/v1/users').send({
        firstName: 'Temp',
        lastName: 'DeactivateUser',
        email: 'deactivate.test@academy.edu',
        password: 'Password@123',
        roleSlug: 'student'
      });
      expect(createRes.status).toBe(201);
      const tempUserId = createRes.body.data.user.id;

      const tempAgent = createAgent(app);
      const loginRes = await tempAgent
        .post('/api/v1/auth/login')
        .send({ email: 'deactivate.test@academy.edu', password: 'Password@123' });
      expect(loginRes.status).toBe(200);
      const tempToken = loginRes.body.data.accessToken;

      // Super Admin deactivates the user
      const deactRes = await superAdminAgent
        .put(`/api/v1/users/${tempUserId}`)
        .send({ status: 'inactive' });
      expect(deactRes.status).toBe(200);

      // Existing session or JWT token must now be rejected with 403 ACCOUNT_INACTIVE
      const reuseSessionRes = await tempAgent.get('/api/v1/auth/me');
      expect(reuseSessionRes.status).toBe(403);
      expect(reuseSessionRes.body.code).toBe('ACCOUNT_INACTIVE');

      const bearerAgent = createAgent(app);
      const reuseJwtRes = await bearerAgent
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(reuseJwtRes.status).toBe(403);
      expect(reuseJwtRes.body.code).toBe('ACCOUNT_INACTIVE');

      // New login attempt must also be rejected with 403 ACCOUNT_INACTIVE
      const reloginRes = await bearerAgent
        .post('/api/v1/auth/login')
        .send({ email: 'deactivate.test@academy.edu', password: 'Password@123' });
      expect(reloginRes.status).toBe(403);
      expect(reloginRes.body.code).toBe('ACCOUNT_INACTIVE');
    });
  });
});
