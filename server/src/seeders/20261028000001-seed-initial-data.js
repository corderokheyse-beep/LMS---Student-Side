'use strict';

const argon2 = require('argon2');
const crypto = require('crypto');
const models = require('../models');

const PERMISSIONS_CATALOG = [
  // System & IAM
  { code: 'system:dashboard:view', module: 'system', description: 'View system-wide administrative dashboard and health metrics' },
  { code: 'users:read', module: 'iam', description: 'View user accounts and profiles' },
  { code: 'users:write', module: 'iam', description: 'Create, update, activate, deactivate, and suspend user accounts' },
  { code: 'roles:manage', module: 'iam', description: 'Manage roles, role assignments, and role-permission mappings' },
  { code: 'settings:manage', module: 'system', description: 'Manage institution-wide settings, integrations, and grading templates' },
  { code: 'audit:read', module: 'system', description: 'View system audit logs and security events' },

  // Academic Management
  { code: 'academic:dashboard:view', module: 'academic', description: 'View academic administration dashboard and institutional metrics' },
  { code: 'departments:manage', module: 'academic', description: 'Create and edit academic departments' },
  { code: 'programs:manage', module: 'academic', description: 'Create and edit academic degree programs' },
  { code: 'terms:manage', module: 'academic', description: 'Configure academic years and semesters' },
  { code: 'courses:manage', module: 'academic', description: 'Create, edit, publish, and archive courses and offerings' },
  { code: 'classes:manage', module: 'academic', description: 'Create class sections and assign instructors or teaching assistants' },
  { code: 'enrollments:manage', module: 'academic', description: 'Enroll, transfer, import CSV, and manage student enrollments' },
  { code: 'grades:approve', module: 'academic', description: 'Review and approve submitted final class grades' },

  // Instruction & Content
  { code: 'instructor:dashboard:view', module: 'instruction', description: 'View instructor teaching dashboard' },
  { code: 'content:manage', module: 'content', description: 'Create, edit, reorder, and publish modules, lessons, and resources' },
  { code: 'content:read', module: 'content', description: 'Access published learning modules, lessons, and resources' },
  { code: 'assignments:manage', module: 'assessments', description: 'Create and configure assignments and grading rubrics' },
  { code: 'assignments:submit', module: 'assessments', description: 'Submit and manage own assignment work' },
  { code: 'submissions:review', module: 'assessments', description: 'Review student assignment submissions and provide feedback' },
  { code: 'submissions:grade', module: 'assessments', description: 'Assign official scores and publish assignment grades' },
  { code: 'questions:manage', module: 'assessments', description: 'Create and manage question banks and questions' },
  { code: 'assessments:manage', module: 'assessments', description: 'Create and configure quizzes and examinations' },
  { code: 'assessments:take', module: 'assessments', description: 'Start and submit quiz and examination attempts' },
  { code: 'assessments:grade', module: 'assessments', description: 'Grade manual assessment responses and publish results' },
  { code: 'gradebook:manage', module: 'grading', description: 'Configure grade categories, weights, and manage class gradebook' },
  { code: 'gradebook:view_own', module: 'grading', description: 'View personal student gradebook and feedback' },

  // Teaching Assistant
  { code: 'ta:dashboard:view', module: 'ta', description: 'View teaching assistant dashboard and assigned classes' },
  { code: 'ta:support', module: 'ta', description: 'Assist students, flag submissions, and apply authorized rubrics' },

  // Student
  { code: 'student:dashboard:view', module: 'student', description: 'View personalized student learning dashboard' },
  { code: 'certificates:view', module: 'certificates', description: 'View, verify, and download course completion certificates' },
  { code: 'certificates:issue', module: 'certificates', description: 'Issue or revoke completion certificates' },

  // Communication & Reports
  { code: 'announcements:manage', module: 'communication', description: 'Publish institutional, department, course, or class announcements' },
  { code: 'discussions:participate', module: 'communication', description: 'Create and reply to course discussion threads' },
  { code: 'messages:use', module: 'communication', description: 'Send and receive authorized direct messages' },
  { code: 'reports:export', module: 'reports', description: 'Generate and export authorized academic and class reports' }
];

const ROLE_PERMISSION_MAP = {
  super_admin: PERMISSIONS_CATALOG.map((p) => p.code).filter((c) => c !== 'grades:approve'), // Super Admin does not unrestrictedly alter/approve grades without academic workflow, or has system permissions
  academic_admin: [
    'academic:dashboard:view',
    'users:read',
    'departments:manage',
    'programs:manage',
    'terms:manage',
    'courses:manage',
    'classes:manage',
    'enrollments:manage',
    'grades:approve',
    'content:read',
    'announcements:manage',
    'messages:use',
    'certificates:view',
    'certificates:issue',
    'reports:export'
  ],
  instructor: [
    'instructor:dashboard:view',
    'content:manage',
    'content:read',
    'assignments:manage',
    'submissions:review',
    'submissions:grade',
    'questions:manage',
    'assessments:manage',
    'assessments:grade',
    'gradebook:manage',
    'announcements:manage',
    'discussions:participate',
    'messages:use',
    'certificates:view',
    'certificates:issue',
    'reports:export'
  ],
  teaching_assistant: [
    'ta:dashboard:view',
    'ta:support',
    'content:read',
    'submissions:review',
    'discussions:participate',
    'messages:use'
  ],
  student: [
    'student:dashboard:view',
    'content:read',
    'assignments:submit',
    'assessments:take',
    'gradebook:view_own',
    'discussions:participate',
    'messages:use',
    'certificates:view'
  ]
};

module.exports = {
  async up() {
    const existingRolesCount = await models.Role.count();
    if (existingRolesCount > 0) {
      return;
    }

    // 1. Seed Roles & Permissions
    const roleDefinitions = [
      { name: 'Super Administrator', slug: 'super_admin', description: 'Manages technical, security, and platform-wide administration', isSystemRole: true },
      { name: 'Academic Administrator', slug: 'academic_admin', description: 'Manages departments, programs, terms, offerings, enrollments, and grade approvals', isSystemRole: true },
      { name: 'Instructor', slug: 'instructor', description: 'Manages assigned classes, authoring content, assessments, and grading', isSystemRole: true },
      { name: 'Teaching Assistant', slug: 'teaching_assistant', description: 'Supports instructors within assigned classes with configurable permissions', isSystemRole: true },
      { name: 'Student', slug: 'student', description: 'Enrolls in classes, completes lessons, submits assignments, and takes assessments', isSystemRole: true }
    ];

    const createdRoles = {};
    for (const r of roleDefinitions) {
      createdRoles[r.slug] = await models.Role.create(r);
    }

    const createdPermissions = {};
    for (const p of PERMISSIONS_CATALOG) {
      createdPermissions[p.code] = await models.Permission.create(p);
    }

    // Super admin gets system & administrative permissions
    const superAdminPerms = [
      'system:dashboard:view',
      'users:read',
      'users:write',
      'roles:manage',
      'settings:manage',
      'audit:read',
      'academic:dashboard:view',
      'departments:manage',
      'programs:manage',
      'terms:manage',
      'courses:manage',
      'classes:manage',
      'enrollments:manage',
      'content:read',
      'announcements:manage',
      'discussions:participate',
      'messages:use',
      'certificates:view',
      'reports:export'
    ];
    ROLE_PERMISSION_MAP.super_admin = superAdminPerms;

    for (const [roleSlug, permCodes] of Object.entries(ROLE_PERMISSION_MAP)) {
      const role = createdRoles[roleSlug];
      for (const code of permCodes) {
        if (createdPermissions[code]) {
          await models.RolePermission.create({
            roleId: role.id,
            permissionId: createdPermissions[code].id
          });
        }
      }
    }

    // 2. Seed Institution, Departments, Programs, Academic Years, Semesters
    const institution = await models.Institution.create({
      name: 'Aetheria Institute of Technology & Networking Academy',
      code: 'AIT-NETACAD',
      domain: 'academy.edu',
      address: '100 Innovation Parkway, Academic District',
      contactEmail: 'registrar@academy.edu',
      passingGradeDefault: 75.00,
      allowSelfEnrollment: true,
      gradingScale: [
        { min: 96, max: 100, letter: '1.00', code: 'A+', description: 'Excellent' },
        { min: 91, max: 95.99, letter: '1.25', code: 'A', description: 'Very Good' },
        { min: 86, max: 90.99, letter: '1.50', code: 'B+', description: 'Good' },
        { min: 80, max: 85.99, letter: '2.00', code: 'B', description: 'Satisfactory' },
        { min: 75, max: 79.99, letter: '3.00', code: 'C', description: 'Passing' },
        { min: 0, max: 74.99, letter: '5.00', code: 'F', description: 'Needs Improvement / Failed' }
      ]
    });

    const deptIT = await models.Department.create({
      institutionId: institution.id,
      code: 'DEPT-ITN',
      name: 'Department of Information Technology & Network Engineering',
      description: 'Specializes in enterprise networking, integrative programming, cloud infrastructure, and systems administration.',
      headName: 'Dr. Helena Vance',
      status: 'active'
    });

    const deptCS = await models.Department.create({
      institutionId: institution.id,
      code: 'DEPT-CSSE',
      name: 'Department of Computer Science & Software Engineering',
      description: 'Focuses on algorithms, distributed systems, full-stack web engineering, and database architecture.',
      headName: 'Dr. Arthur Pendelton',
      status: 'active'
    });

    const deptSec = await models.Department.create({
      institutionId: institution.id,
      code: 'DEPT-CYBER',
      name: 'Department of Cybersecurity & Infrastructure Defense',
      description: 'Focuses on SOC operations, network defense, cryptography, and incident response.',
      headName: 'Prof. Marcus Sterling',
      status: 'active'
    });

    const progBSIT = await models.Program.create({
      departmentId: deptIT.id,
      code: 'BSIT',
      name: 'Bachelor of Science in Information Technology',
      degreeType: 'Bachelor',
      durationYears: 4,
      description: 'Four-year degree program aligned with Cisco Networking Academy & enterprise systems tracks.'
    });

    const progBSCS = await models.Program.create({
      departmentId: deptCS.id,
      code: 'BSCS',
      name: 'Bachelor of Science in Computer Science',
      degreeType: 'Bachelor',
      durationYears: 4,
      description: 'Rigorous software engineering, systems programming, and database architecture curriculum.'
    });

    const progBSCY = await models.Program.create({
      departmentId: deptSec.id,
      code: 'BSCY',
      name: 'Bachelor of Science in Cybersecurity',
      degreeType: 'Bachelor',
      durationYears: 4,
      description: 'Hands-on security operations, ethical hacking, and infrastructure hardening program.'
    });

    const ayPrev = await models.AcademicYear.create({
      institutionId: institution.id,
      name: '2025–2026',
      startDate: '2025-08-15',
      endDate: '2026-05-30',
      isCurrent: false,
      status: 'completed'
    });

    const ayCurrent = await models.AcademicYear.create({
      institutionId: institution.id,
      name: '2026–2027',
      startDate: '2026-08-10',
      endDate: '2027-05-28',
      isCurrent: true,
      status: 'active'
    });

    await models.Semester.create({
      academicYearId: ayPrev.id,
      name: 'Second Semester, 2025–2026',
      code: '2025-2026-S2',
      startDate: '2026-01-12',
      endDate: '2026-05-30',
      enrollmentStartDate: '2025-12-15',
      enrollmentEndDate: '2026-01-20',
      isCurrent: false,
      status: 'closed'
    });

    const semCurrent = await models.Semester.create({
      academicYearId: ayCurrent.id,
      name: 'First Semester, 2026–2027',
      code: '2026-2027-S1',
      startDate: '2026-08-10',
      endDate: '2026-12-18',
      enrollmentStartDate: '2026-07-15',
      enrollmentEndDate: '2026-11-30',
      isCurrent: true,
      status: 'active'
    });

    const semNext = await models.Semester.create({
      academicYearId: ayCurrent.id,
      name: 'Second Semester, 2026–2027',
      code: '2026-2027-S2',
      startDate: '2027-01-11',
      endDate: '2027-05-28',
      enrollmentStartDate: '2026-12-01',
      enrollmentEndDate: '2027-01-18',
      isCurrent: false,
      status: 'upcoming'
    });

    // 3. Seed Users with Argon2id hashes
    const hashOpts = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
    const rawBootstrapPass = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    const superAdminPassword =
      !rawBootstrapPass ||
      rawBootstrapPass === 'replace_with_strong_initial_password' ||
      process.env.NODE_ENV === 'test'
        ? 'Admin@12345'
        : rawBootstrapPass;

    const [
      superAdminHash,
      acadAdminHash,
      instHash,
      taHash,
      studHash
    ] = await Promise.all([
      argon2.hash(superAdminPassword, hashOpts),
      argon2.hash('Acad@12345', hashOpts),
      argon2.hash('Inst@12345', hashOpts),
      argon2.hash('Ta@12345', hashOpts),
      argon2.hash('Stud@12345', hashOpts)
    ]);

    const superAdmin = await models.User.create({
      institutionId: institution.id,
      employeeNumber: 'EMP-0001',
      firstName: 'Victor',
      lastName: 'Aris',
      email: process.env.BOOTSTRAP_ADMIN_EMAIL || 'superadmin@academy.edu',
      passwordHash: superAdminHash,
      status: 'active',
      bio: 'Platform Chief Information Officer & Super Administrator'
    });
    await models.UserRole.create({ userId: superAdmin.id, roleId: createdRoles.super_admin.id });

    const acadAdmin = await models.User.create({
      institutionId: institution.id,
      departmentId: deptIT.id,
      employeeNumber: 'EMP-0010',
      firstName: 'Clarissa',
      lastName: 'Thorne',
      email: 'acadadmin@academy.edu',
      passwordHash: acadAdminHash,
      status: 'active',
      bio: 'Dean of Academic Operations & Institutional Registrar'
    });
    await models.UserRole.create({ userId: acadAdmin.id, roleId: createdRoles.academic_admin.id, assignedBy: superAdmin.id });

    const instructor1 = await models.User.create({
      institutionId: institution.id,
      departmentId: deptIT.id,
      employeeNumber: 'INST-101',
      firstName: 'Elena',
      lastName: 'Vance',
      email: 'instructor@academy.edu',
      passwordHash: instHash,
      status: 'active',
      bio: 'Senior Cisco Certified Academy Instructor (CCAI) & Enterprise Systems Architect'
    });
    await models.UserRole.create({ userId: instructor1.id, roleId: createdRoles.instructor.id, assignedBy: acadAdmin.id });

    const instructor2 = await models.User.create({
      institutionId: institution.id,
      departmentId: deptSec.id,
      employeeNumber: 'INST-102',
      firstName: 'Marcus',
      lastName: 'Sterling',
      email: 'instructor2@academy.edu',
      passwordHash: instHash,
      status: 'active',
      bio: 'Lead Instructor for Cybersecurity Operations & Relational Database Systems'
    });
    await models.UserRole.create({ userId: instructor2.id, roleId: createdRoles.instructor.id, assignedBy: acadAdmin.id });

    const taUser = await models.User.create({
      institutionId: institution.id,
      departmentId: deptIT.id,
      programId: progBSIT.id,
      employeeNumber: 'TA-201',
      firstName: 'Liam',
      lastName: 'Reyes',
      email: 'ta@academy.edu',
      passwordHash: taHash,
      status: 'active',
      bio: 'Graduate Teaching Assistant for Integrative Programming & Network Laboratories'
    });
    await models.UserRole.create({ userId: taUser.id, roleId: createdRoles.teaching_assistant.id, assignedBy: acadAdmin.id });

    const student1 = await models.User.create({
      institutionId: institution.id,
      departmentId: deptIT.id,
      programId: progBSIT.id,
      studentNumber: '2026-00101',
      firstName: 'Maya',
      lastName: 'Lin',
      email: 'student@academy.edu',
      passwordHash: studHash,
      status: 'active',
      bio: '4th Year BSIT Scholar specializing in Network Automation & Full-Stack Systems'
    });
    await models.UserRole.create({ userId: student1.id, roleId: createdRoles.student.id, assignedBy: acadAdmin.id });

    const student2 = await models.User.create({
      institutionId: institution.id,
      departmentId: deptIT.id,
      programId: progBSIT.id,
      studentNumber: '2026-00102',
      firstName: 'Carlos',
      lastName: 'Mendoza',
      email: 'student2@academy.edu',
      passwordHash: studHash,
      status: 'active',
      bio: 'BSIT Senior Student focused on Cloud Infrastructure & APIs'
    });
    await models.UserRole.create({ userId: student2.id, roleId: createdRoles.student.id, assignedBy: acadAdmin.id });

    const student3 = await models.User.create({
      institutionId: institution.id,
      departmentId: deptIT.id,
      programId: progBSIT.id,
      studentNumber: '2026-00103',
      firstName: 'Sophia',
      lastName: 'Patel',
      email: 'student3@academy.edu',
      passwordHash: studHash,
      status: 'active',
      bio: 'BSIT Student & Networking Club President'
    });
    await models.UserRole.create({ userId: student3.id, roleId: createdRoles.student.id, assignedBy: acadAdmin.id });

    const student4 = await models.User.create({
      institutionId: institution.id,
      departmentId: deptCS.id,
      programId: progBSCS.id,
      studentNumber: '2026-00201',
      firstName: 'Noah',
      lastName: 'Kim',
      email: 'student4@academy.edu',
      passwordHash: studHash,
      status: 'active',
      bio: 'BSCS Junior Student exploring Distributed Databases & Security'
    });
    await models.UserRole.create({ userId: student4.id, roleId: createdRoles.student.id, assignedBy: acadAdmin.id });

    // 4. Seed System Settings
    await models.SystemSetting.bulkCreate([
      {
        key: 'grading_default_template',
        category: 'grading',
        value: [
          { name: 'Quizzes', categoryType: 'quiz', weightPercent: 20 },
          { name: 'Assignments', categoryType: 'assignment', weightPercent: 25 },
          { name: 'Laboratory Activities', categoryType: 'laboratory', weightPercent: 25 },
          { name: 'Major Examination', categoryType: 'major_exam', weightPercent: 30 }
        ],
        description: 'Institutional default weighted grading template (Total = 100%)',
        updatedBy: superAdmin.id
      },
      {
        key: 'security_policy',
        category: 'security',
        value: {
          maxFailedLoginAttempts: 5,
          lockoutDurationMinutes: 15,
          sessionTimeoutMinutes: 480,
          requireStrongPasswords: true,
          auditRetentionDays: 365
        },
        description: 'Platform authentication and session security controls',
        updatedBy: superAdmin.id
      },
      {
        key: 'integrations_config',
        category: 'integrations',
        value: {
          packetTracerLabSupport: { enabled: true, mode: 'file_and_topology_viewer' },
          codeSandboxService: { enabled: false, status: 'external_isolated_runner_not_connected', note: 'Static syntax inspection and instructor test rubric enabled' },
          smtpEmailNotifications: { enabled: false, status: 'in_app_primary' }
        },
        description: 'External laboratory and notification service integrations',
        updatedBy: superAdmin.id
      },
      {
        key: 'maintenance_backup_policy',
        category: 'maintenance',
        value: {
          automatedDailyBackup: true,
          lastBackupTimestamp: '2026-10-28T04:00:00Z',
          maintenanceWindow: 'Sundays 02:00-04:00 UTC',
          systemStatus: 'operational'
        },
        description: 'Backup and maintenance operational status',
        updatedBy: superAdmin.id
      }
    ]);

    // 5. Seed Courses (Reusable Subjects)
    const courseIP = await models.Course.create({
      departmentId: deptIT.id,
      programId: progBSIT.id,
      code: 'IT-401',
      title: 'Integrative Programming and Technologies',
      description: 'Comprehensive study of distributed enterprise integration, RESTful APIs, message queues, secure authentication protocols, and automated network programmability.',
      category: 'Integrative Programming',
      creditUnits: 3,
      lectureHours: 2,
      labHours: 3,
      level: 'Advanced',
      deliveryMode: 'Instructor-Led',
      learningObjectives: [
        'Design and secure RESTful microservices using Node.js, Express, and token/session middleware.',
        'Integrate heterogeneous systems using JSON schemas, webhooks, and message brokers.',
        'Automate network device configuration using Python/JavaScript RESTCONF & NETCONF APIs.',
        'Implement defensive input validation, RBAC authorization, and structured audit logging.'
      ],
      prerequisites: ['IT-202 Object-Oriented Programming', 'NET-101 Networking Fundamentals'],
      labSupportEnabled: true,
      publicationStatus: 'published',
      createdBy: instructor1.id
    });

    const courseNet = await models.Course.create({
      departmentId: deptIT.id,
      programId: progBSIT.id,
      code: 'NET-201',
      title: 'Enterprise Networking, Security, and Automation (ENSA)',
      description: 'Inspired by Cisco NetAcad CCNA v7 ENSA curriculum: OSPF multi-area routing, ACL network security, NAT, WAN architectures, QoS, and SDN network automation.',
      category: 'Networking',
      creditUnits: 4,
      lectureHours: 3,
      labHours: 3,
      level: 'Intermediate',
      deliveryMode: 'Instructor-Led',
      learningObjectives: [
        'Configure single-area and multi-area OSPFv2 in routed IPv4 and IPv6 enterprise networks.',
        'Implement Standard and Extended IPv4 Access Control Lists (ACLs) to filter traffic and mitigate threats.',
        'Configure Static and Dynamic NAT/PAT for scalable enterprise internet edge connectivity.',
        'Compare traditional campus management with controller-based SDN and Cisco DNA Center APIs.'
      ],
      prerequisites: ['NET-102 Switching, Routing, and Wireless Essentials'],
      labSupportEnabled: true,
      publicationStatus: 'published',
      createdBy: instructor1.id
    });

    const courseSec = await models.Course.create({
      departmentId: deptSec.id,
      programId: progBSCY.id,
      code: 'SEC-305',
      title: 'Cybersecurity Operations & Network Defense',
      description: 'Hands-on Security Operations Center (SOC) workflows, intrusion detection, SIEM log analysis, cryptographic protocols, and incident response playbooks.',
      category: 'Cybersecurity',
      creditUnits: 3,
      lectureHours: 2,
      labHours: 3,
      level: 'Intermediate',
      deliveryMode: 'Hybrid',
      learningObjectives: [
        'Analyze packet captures and SIEM telemetry to detect lateral movement and exfiltration.',
        'Harden Linux and Windows server endpoints against privilege escalation.',
        'Execute structured incident triage using the NIST 800-61 incident response lifecycle.'
      ],
      prerequisites: ['NET-201 Enterprise Networking'],
      labSupportEnabled: true,
      publicationStatus: 'published',
      createdBy: instructor2.id
    });

    const courseDB = await models.Course.create({
      departmentId: deptCS.id,
      programId: progBSCS.id,
      code: 'DB-204',
      title: 'Relational Database Architecture & Administration',
      description: 'Normalized relational schema design (3NF/BCNF), ACID transaction isolation, B-Tree indexing, query optimization, and MySQL 8 security administration.',
      category: 'Database Management',
      creditUnits: 3,
      lectureHours: 2,
      labHours: 3,
      level: 'Intermediate',
      deliveryMode: 'Self-Paced',
      learningObjectives: [
        'Design normalized relational schemas with referential integrity and composite indexes.',
        'Write complex analytical SQL queries using CTEs, window functions, and ACID transactions.',
        'Optimize slow queries using EXPLAIN plans and index selectivity analysis.'
      ],
      prerequisites: ['CS-101 Fundamentals of Programming'],
      labSupportEnabled: true,
      publicationStatus: 'published',
      createdBy: instructor2.id
    });

    // 6. Seed Course Offerings (Subject delivered during First Semester, 2026-2027)
    const offeringIP = await models.CourseOffering.create({
      courseId: courseIP.id,
      academicYearId: ayCurrent.id,
      semesterId: semCurrent.id,
      offeringCode: 'IT-401-2026S1',
      titleOverride: 'Integrative Programming — First Semester, 2026–2027',
      enrollmentPolicy: 'open_self_enroll',
      passingScore: 75.00,
      certificateEnabled: true,
      status: 'published'
    });

    const offeringNet = await models.CourseOffering.create({
      courseId: courseNet.id,
      academicYearId: ayCurrent.id,
      semesterId: semCurrent.id,
      offeringCode: 'NET-201-2026S1',
      titleOverride: 'Enterprise Networking (ENSA) — First Semester, 2026–2027',
      enrollmentPolicy: 'open_self_enroll',
      passingScore: 75.00,
      certificateEnabled: true,
      status: 'published'
    });

    const offeringSec = await models.CourseOffering.create({
      courseId: courseSec.id,
      academicYearId: ayCurrent.id,
      semesterId: semCurrent.id,
      offeringCode: 'SEC-305-2026S1',
      titleOverride: 'Cybersecurity Operations — First Semester, 2026–2027',
      enrollmentPolicy: 'open_self_enroll',
      passingScore: 75.00,
      certificateEnabled: true,
      status: 'published'
    });

    const offeringDB = await models.CourseOffering.create({
      courseId: courseDB.id,
      academicYearId: ayCurrent.id,
      semesterId: semCurrent.id,
      offeringCode: 'DB-204-2026S1',
      titleOverride: 'Relational Database Architecture — First Semester, 2026–2027',
      enrollmentPolicy: 'open_self_enroll',
      passingScore: 75.00,
      certificateEnabled: true,
      status: 'published'
    });

    // 7. Seed Class Sections (Specific Learner Groups within Offerings)
    const classBSIT4A = await models.ClassSection.create({
      courseOfferingId: offeringIP.id,
      sectionCode: 'BSIT 4-A',
      name: 'BSIT 4-A — Integrative Programming',
      room: 'NetAcad Lab 301',
      schedule: 'Mon/Wed 09:00 - 11:30',
      capacity: 40,
      allowLateSubmissions: true,
      latePenaltyPercent: 10.00,
      finalGradesStatus: 'in_progress',
      status: 'active'
    });

    const classBSIT4B = await models.ClassSection.create({
      courseOfferingId: offeringIP.id,
      sectionCode: 'BSIT 4-B',
      name: 'BSIT 4-B — Integrative Programming',
      room: 'NetAcad Lab 302',
      schedule: 'Tue/Thu 13:00 - 15:30',
      capacity: 40,
      allowLateSubmissions: true,
      latePenaltyPercent: 10.00,
      finalGradesStatus: 'submitted_for_approval',
      finalGradesSubmittedAt: new Date('2026-10-27T16:00:00Z'),
      status: 'active'
    });

    const classENSA4A = await models.ClassSection.create({
      courseOfferingId: offeringNet.id,
      sectionCode: 'BSIT 4-A (ENSA)',
      name: 'BSIT 4-A — Enterprise Networking (ENSA)',
      room: 'Cisco Routing Lab 201',
      schedule: 'Tue/Thu 09:00 - 12:00',
      capacity: 35,
      allowLateSubmissions: true,
      latePenaltyPercent: 10.00,
      finalGradesStatus: 'in_progress',
      status: 'active'
    });

    const classCyber3A = await models.ClassSection.create({
      courseOfferingId: offeringSec.id,
      sectionCode: 'BSCY 3-A',
      name: 'BSCY 3-A — Cybersecurity Operations',
      room: 'SOC Simulation Center 405',
      schedule: 'Fri 09:00 - 14:00',
      capacity: 30,
      allowLateSubmissions: false,
      latePenaltyPercent: 0.00,
      finalGradesStatus: 'in_progress',
      status: 'active'
    });

    const classDB3B = await models.ClassSection.create({
      courseOfferingId: offeringDB.id,
      sectionCode: 'BSCS 3-B',
      name: 'BSCS 3-B — Database Architecture',
      room: 'Data Engineering Lab 104',
      schedule: 'Mon/Wed 14:00 - 16:30',
      capacity: 40,
      allowLateSubmissions: true,
      latePenaltyPercent: 5.00,
      finalGradesStatus: 'in_progress',
      status: 'active'
    });

    // 8. Assign Instructors & Teaching Assistants
    await models.InstructorAssignment.bulkCreate([
      { classId: classBSIT4A.id, instructorId: instructor1.id, isPrimary: true, assignedBy: acadAdmin.id },
      { classId: classBSIT4B.id, instructorId: instructor1.id, isPrimary: true, assignedBy: acadAdmin.id },
      { classId: classENSA4A.id, instructorId: instructor1.id, isPrimary: true, assignedBy: acadAdmin.id },
      { classId: classCyber3A.id, instructorId: instructor2.id, isPrimary: true, assignedBy: acadAdmin.id },
      { classId: classDB3B.id, instructorId: instructor2.id, isPrimary: true, assignedBy: acadAdmin.id }
    ]);

    await models.TeachingAssistantAssignment.bulkCreate([
      {
        classId: classBSIT4A.id,
        taUserId: taUser.id,
        canViewRoster: true,
        canReviewSubmissions: true,
        canApplyRubrics: true,
        canManageDiscussions: true,
        canUploadResources: true,
        assignedBy: acadAdmin.id
      },
      {
        classId: classENSA4A.id,
        taUserId: taUser.id,
        canViewRoster: true,
        canReviewSubmissions: true,
        canApplyRubrics: false,
        canManageDiscussions: true,
        canUploadResources: false,
        assignedBy: acadAdmin.id
      }
    ]);

    // 9. Enroll Students
    await models.ClassMembership.bulkCreate([
      { classId: classBSIT4A.id, studentId: student1.id, status: 'enrolled', enrolledBy: acadAdmin.id },
      { classId: classBSIT4A.id, studentId: student2.id, status: 'enrolled', enrolledBy: acadAdmin.id },
      { classId: classBSIT4A.id, studentId: student3.id, status: 'enrolled', enrolledBy: acadAdmin.id },
      { classId: classENSA4A.id, studentId: student1.id, status: 'enrolled', enrolledBy: acadAdmin.id },
      { classId: classENSA4A.id, studentId: student2.id, status: 'enrolled', enrolledBy: acadAdmin.id },
      { classId: classBSIT4B.id, studentId: student4.id, status: 'enrolled', enrolledBy: acadAdmin.id, finalNumericGrade: 91.50, finalLetterGrade: '1.25' },
      { classId: classDB3B.id, studentId: student4.id, status: 'enrolled', enrolledBy: acadAdmin.id }
    ]);

    // 10. Seed Modules, Lessons, and Learning Resources for IT-401 & NET-201
    const mod1 = await models.Module.create({
      courseId: courseIP.id,
      title: 'Module 1: Enterprise API Architecture & RESTCONF Programmability',
      description: 'Foundations of distributed system integration, HTTP/2 semantics, JSON data modeling, and automated network APIs.',
      orderIndex: 1,
      publicationStatus: 'published',
      estimatedMinutes: 90
    });

    const mod2 = await models.Module.create({
      courseId: courseIP.id,
      title: 'Module 2: Authentication, RBAC Security & Webhook Orchestration',
      description: 'Securing distributed services with Argon2id, HTTP-only session cookies, HMAC webhook verification, and rate limiting.',
      orderIndex: 2,
      prerequisiteModuleId: mod1.id,
      publicationStatus: 'published',
      estimatedMinutes: 120
    });

    const mod3 = await models.Module.create({
      courseId: courseIP.id,
      title: 'Module 3: Asynchronous Message Brokers & Fault-Tolerant Integration',
      description: 'Event-driven microservices, idempotency keys, dead-letter queues, and circuit breakers.',
      orderIndex: 3,
      prerequisiteModuleId: mod2.id,
      publicationStatus: 'published',
      estimatedMinutes: 110
    });

    const lesson1_1 = await models.Lesson.create({
      moduleId: mod1.id,
      courseId: courseIP.id,
      title: '1.1 Designing Idempotent RESTful APIs & Resource Contracts',
      slug: 'designing-idempotent-restful-apis',
      lessonType: 'reading',
      orderIndex: 1,
      summary: 'Learn how architectural constraints, status codes, and schema validation govern enterprise service contracts.',
      contentHtml: `
        <h2>Architectural Principles of Enterprise Integration</h2>
        <p>Modern institutional and network systems rely on strict contract-first APIs to exchange telemetry, identity, and operational state reliably.</p>
        <h3>Key HTTP Method Semantics</h3>
        <ul>
          <li><strong>GET</strong>: Safe and idempotent retrieval of resource representations with pagination and filtering.</li>
          <li><strong>POST</strong>: Non-idempotent creation of subordinate resources or state transitions.</li>
          <li><strong>PUT / PATCH</strong>: Idempotent full replacement or partial update of target resources.</li>
          <li><strong>DELETE</strong>: Idempotent removal or archival of a resource identifier.</li>
        </ul>
        <h3>Structured Response Envelope</h3>
        <p>Every endpoint should return a predictable JSON envelope containing status metadata, validated payload data, and actionable error diagnostics.</p>
      `,
      codeSnippet: `// Express + Zod Contract Validation Example
const { z } = require('zod');

const DeviceInterfaceSchema = z.object({
  interfaceName: z.string().min(3),
  ipv4Address: z.string().ip({ version: 'v4' }),
  subnetMask: z.string(),
  enabled: z.boolean().default(true)
});

async function configureInterface(req, res, next) {
  try {
    const payload = DeviceInterfaceSchema.parse(req.body);
    res.status(200).json({ status: 'configured', interface: payload });
  } catch (err) {
    next(err);
  }
}`,
      codeLanguage: 'javascript',
      learningObjectives: [
        'Distinguish safe, idempotent, and non-idempotent HTTP methods.',
        'Validate incoming JSON payloads using strict server-side Zod schemas.'
      ],
      estimatedMinutes: 30,
      publicationStatus: 'published'
    });

    const lesson1_2 = await models.Lesson.create({
      moduleId: mod1.id,
      courseId: courseIP.id,
      title: '1.2 Automating Router Interfaces with YANG & RESTCONF Lab',
      slug: 'automating-router-interfaces-yang-restconf',
      lessonType: 'laboratory',
      orderIndex: 2,
      prerequisiteLessonId: lesson1_1.id,
      summary: 'Hands-on laboratory interacting with simulated Cisco IOS XE YANG data models over HTTPS RESTCONF.',
      contentHtml: `
        <h2>Laboratory Overview: RESTCONF Interface Telemetry</h2>
        <p>In this laboratory activity, you will query and configure a GigabitEthernet interface using standard <code>application/yang-data+json</code> headers.</p>
        <h3>Lab Topology Specification</h3>
        <p>Review the interactive lab topology parameters below and verify that the management loopback address responds before executing your script.</p>
      `,
      codeSnippet: `// Node.js RESTCONF Client Request
const response = await fetch('https://10.10.20.48/restconf/data/ietf-interfaces:interfaces', {
  method: 'GET',
  headers: {
    'Accept': 'application/yang-data+json',
    'Authorization': 'Basic ' + Buffer.from('developer:C1sco12345').toString('base64')
  }
});
const interfaces = await response.json();
console.log('Active YANG Interfaces:', interfaces);`,
      codeLanguage: 'javascript',
      labTopologyData: {
        devices: [
          { name: 'CSR1000v-Core-01', role: 'Core Router', ip: '10.10.20.48', protocol: 'RESTCONF / HTTPS 443' },
          { name: 'Cat9300-Dist-01', role: 'Distribution Switch', ip: '10.10.20.49', protocol: 'NETCONF / SSH 830' },
          { name: 'Automation-Host', role: 'Dev Workstation', ip: '10.10.20.10', protocol: 'Node.js 22 / Python 3.12' }
        ]
      },
      learningObjectives: [
        'Construct valid YANG JSON headers for RESTCONF requests.',
        'Parse interface operational state from IOS XE responses.'
      ],
      estimatedMinutes: 45,
      publicationStatus: 'published'
    });

    const lesson2_1 = await models.Lesson.create({
      moduleId: mod2.id,
      courseId: courseIP.id,
      title: '2.1 Defense-in-Depth: Argon2id, Sessions & RBAC Middleware',
      slug: 'defense-in-depth-argon2id-rbac',
      lessonType: 'coding_exercise',
      orderIndex: 1,
      prerequisiteLessonId: lesson1_2.id,
      summary: 'Implementing centralized permission enforcement and preventing horizontal privilege escalation (IDOR).',
      contentHtml: `
        <h2>Server-Side Permission Enforcement</h2>
        <p>Hiding buttons in a React frontend is a usability enhancement, never a security control. Every backend route must verify both the user's role permissions and resource ownership.</p>
        <h3>Preventing Insecure Direct Object References (IDOR)</h3>
        <p>Always scope database queries to the authenticated user's authorized class memberships or ownership identifiers.</p>
      `,
      codeSnippet: `function requirePermission(permissionCode) {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions.includes(permissionCode)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Missing required permission ' + permissionCode
      });
    }
    next();
  };
}`,
      codeLanguage: 'javascript',
      learningObjectives: [
        'Hash passwords using Argon2id with memory-hard parameters.',
        'Enforce resource-scoped authorization to prevent IDOR vulnerabilities.'
      ],
      estimatedMinutes: 40,
      publicationStatus: 'published'
    });

    // Seed Modules & Lessons for NET-201 (ENSA)
    const netMod1 = await models.Module.create({
      courseId: courseNet.id,
      title: 'Module 1: Single-Area OSPFv2 Concepts & Configuration',
      description: 'Link-state routing operations, OSPF packet types, Router ID election, DR/BDR election, and cost metric calculation.',
      orderIndex: 1,
      publicationStatus: 'published',
      estimatedMinutes: 100
    });

    await models.Lesson.create({
      moduleId: netMod1.id,
      courseId: courseNet.id,
      title: '1.1 OSPF Neighbor Adjacencies & Link-State Advertisements',
      slug: 'ospf-neighbor-adjacencies-lsa',
      lessonType: 'reading',
      orderIndex: 1,
      summary: 'Understand how OSPF routers exchange Hello packets, transition from Init to Full state, and synchronize the LSDB.',
      contentHtml: `
        <h2>OSPFv2 Link-State Operation</h2>
        <p>Open Shortest Path First (OSPF) is a link-state routing protocol that uses Dijkstra's Shortest Path First (SPF) algorithm to compute loop-free topologies.</p>
        <h3>OSPF Operational States</h3>
        <ol>
          <li><strong>Down -> Init -> Two-Way</strong>: Neighbor discovery and DR/BDR election on multi-access segments.</li>
          <li><strong>ExStart -> Exchange -> Loading -> Full</strong>: Database Description (DBD) and LSA synchronization.</li>
        </ol>
      `,
      codeSnippet: `Router(config)# router ospf 10
Router(config-router)# router-id 1.1.1.1
Router(config-router)# network 192.168.10.0 0.0.0.255 area 0
Router(config-router)# passive-interface GigabitEthernet0/0/1
Router(config-router)# auto-cost reference-bandwidth 10000`,
      codeLanguage: 'cisco-ios',
      learningObjectives: [
        'Configure OSPFv2 process ID, fixed router-id, and wildcard network statements.',
        'Adjust reference bandwidth to accurately reflect 10GbE link metrics.'
      ],
      estimatedMinutes: 40,
      publicationStatus: 'published'
    });

    // Learning Resources
    await models.LearningResource.bulkCreate([
      {
        courseId: courseIP.id,
        moduleId: mod1.id,
        lessonId: lesson1_1.id,
        title: 'RESTCONF & YANG Enterprise Integration Reference Guide (PDF)',
        description: 'Complete RFC 8040 cheat sheet and HTTP status code matrix for network automation.',
        resourceType: 'pdf',
        externalUrl: 'https://datatracker.ietf.org/doc/html/rfc8040',
        isDownloadable: true,
        uploadedBy: instructor1.id
      },
      {
        courseId: courseIP.id,
        moduleId: mod1.id,
        lessonId: lesson1_2.id,
        title: 'Lab 1.2 Topology & Starter Script Package (.pkt / .js)',
        description: 'Worksheet checklist and starter Node.js telemetry client for Lab 1.2.',
        resourceType: 'worksheet',
        externalUrl: 'https://developer.cisco.com/docs/ios-xe/',
        isDownloadable: true,
        uploadedBy: instructor1.id
      },
      {
        courseId: courseNet.id,
        moduleId: netMod1.id,
        title: 'OSPFv2 Multi-Access DR/BDR Election Packet Tracer Guide',
        description: 'Step-by-step verification commands: show ip ospf neighbor, show ip ospf interface.',
        resourceType: 'packet_tracer',
        externalUrl: 'https://www.netacad.com/',
        isDownloadable: true,
        uploadedBy: instructor1.id
      }
    ]);

    // 11. Seed Lesson Progress & Course Progress for Maya Lin (student1) and Carlos Mendoza (student2)
    await models.LessonProgress.bulkCreate([
      { classId: classBSIT4A.id, courseId: courseIP.id, lessonId: lesson1_1.id, studentId: student1.id, status: 'completed', timeSpentSeconds: 1850, completedAt: new Date('2026-10-15T10:30:00Z') },
      { classId: classBSIT4A.id, courseId: courseIP.id, lessonId: lesson1_2.id, studentId: student1.id, status: 'completed', timeSpentSeconds: 2740, completedAt: new Date('2026-10-18T14:20:00Z') },
      { classId: classBSIT4A.id, courseId: courseIP.id, lessonId: lesson2_1.id, studentId: student1.id, status: 'in_progress', timeSpentSeconds: 920 },
      { classId: classBSIT4A.id, courseId: courseIP.id, lessonId: lesson1_1.id, studentId: student2.id, status: 'completed', timeSpentSeconds: 1600, completedAt: new Date('2026-10-16T11:00:00Z') }
    ]);

    await models.CourseProgress.bulkCreate([
      {
        classId: classBSIT4A.id,
        courseId: courseIP.id,
        studentId: student1.id,
        completedLessonsCount: 2,
        totalLessonsCount: 3,
        completedAssignmentsCount: 1,
        totalAssignmentsCount: 2,
        completedAssessmentsCount: 1,
        totalAssessmentsCount: 2,
        progressPercentage: 66.67,
        lastLessonId: lesson2_1.id,
        isCompleted: false,
        certificateEligible: false
      },
      {
        classId: classBSIT4A.id,
        courseId: courseIP.id,
        studentId: student2.id,
        completedLessonsCount: 1,
        totalLessonsCount: 3,
        completedAssignmentsCount: 1,
        totalAssignmentsCount: 2,
        completedAssessmentsCount: 1,
        totalAssessmentsCount: 2,
        progressPercentage: 42.86,
        lastLessonId: lesson1_1.id,
        isCompleted: false,
        certificateEligible: false
      },
      {
        classId: classBSIT4A.id,
        courseId: courseIP.id,
        studentId: student3.id,
        completedLessonsCount: 0,
        totalLessonsCount: 3,
        completedAssignmentsCount: 0,
        totalAssignmentsCount: 2,
        completedAssessmentsCount: 0,
        totalAssessmentsCount: 2,
        progressPercentage: 0.00,
        isCompleted: false,
        certificateEligible: false
      }
    ]);

    // 12. Seed Grade Categories for BSIT 4-A (Matches Section 9 Example: 20%, 25%, 25%, 30%)
    const catQuiz = await models.GradeCategory.create({
      classId: classBSIT4A.id,
      name: 'Quizzes',
      categoryType: 'quiz',
      weightPercent: 20.00,
      orderIndex: 1
    });
    const catAssign = await models.GradeCategory.create({
      classId: classBSIT4A.id,
      name: 'Assignments',
      categoryType: 'assignment',
      weightPercent: 25.00,
      orderIndex: 2
    });
    const catLab = await models.GradeCategory.create({
      classId: classBSIT4A.id,
      name: 'Laboratory Activities',
      categoryType: 'laboratory',
      weightPercent: 25.00,
      orderIndex: 3
    });
    const catExam = await models.GradeCategory.create({
      classId: classBSIT4A.id,
      name: 'Major Examination',
      categoryType: 'major_exam',
      weightPercent: 30.00,
      orderIndex: 4
    });

    // Also create categories for BSIT 4-B and ENSA
    await models.GradeCategory.bulkCreate([
      { classId: classBSIT4B.id, name: 'Quizzes', categoryType: 'quiz', weightPercent: 20.00, orderIndex: 1 },
      { classId: classBSIT4B.id, name: 'Assignments', categoryType: 'assignment', weightPercent: 25.00, orderIndex: 2 },
      { classId: classBSIT4B.id, name: 'Laboratory Activities', categoryType: 'laboratory', weightPercent: 25.00, orderIndex: 3 },
      { classId: classBSIT4B.id, name: 'Major Examination', categoryType: 'major_exam', weightPercent: 30.00, orderIndex: 4 },
      { classId: classENSA4A.id, name: 'Quizzes', categoryType: 'quiz', weightPercent: 20.00, orderIndex: 1 },
      { classId: classENSA4A.id, name: 'Laboratory Activities', categoryType: 'laboratory', weightPercent: 40.00, orderIndex: 2 },
      { classId: classENSA4A.id, name: 'Major Examination', categoryType: 'major_exam', weightPercent: 40.00, orderIndex: 3 }
    ]);

    // 13. Seed Assignments, Rubrics, and Submissions
    const assign1 = await models.Assignment.create({
      classId: classBSIT4A.id,
      courseId: courseIP.id,
      moduleId: mod1.id,
      gradeCategoryId: catLab.id,
      title: 'Lab 1: RESTCONF Network Telemetry & Interface Provisioning Service',
      instructions: `Build a Node.js module that connects to the simulated IOS XE RESTCONF endpoint, retrieves all operational interfaces in YANG JSON format, validates the schema with Zod, and outputs a health summary table.\n\nDeliverables:\n1. Source code file (.js or .zip)\n2. Execution output log & README documentation\n3. Completed Lab Worksheet Checklist`,
      assignmentType: 'laboratory',
      openDate: new Date('2026-10-01T00:00:00Z'),
      dueDate: new Date('2026-11-15T23:59:00Z'),
      maxScore: 100.00,
      allowTextResponse: true,
      allowFileSubmission: true,
      allowedFileTypes: ['.js', '.py', '.zip', '.pdf', '.md', '.txt', '.pkt'],
      maxAttempts: 3,
      allowLateSubmissions: true,
      latePenaltyPercent: 10.00,
      allowResubmission: true,
      starterCode: `// Starter template for Lab 1 RESTCONF Client\nasync function fetchRouterTelemetry(host, token) {\n  // TODO: Implement RFC 8040 GET request with yang-data+json header\n}\nmodule.exports = { fetchRouterTelemetry };`,
      labWorksheetChecklist: [
        'Verified HTTPS 443 reachability to CSR1000v management IP',
        'Configured Accept: application/yang-data+json header',
        'Handled HTTP 401/403 authentication errors gracefully',
        'Validated response payload against Zod schema'
      ],
      publicationStatus: 'published',
      createdBy: instructor1.id
    });

    const rubric1 = await models.GradingRubric.create({
      assignmentId: assign1.id,
      title: 'RESTCONF Laboratory Evaluation Rubric',
      totalPoints: 100.00
    });

    await models.RubricCriterion.bulkCreate([
      { rubricId: rubric1.id, criterionName: 'RESTCONF Protocol Compliance & Headers', description: 'Proper use of RFC 8040 URI paths and application/yang-data+json content negotiation.', maxPoints: 35.00, orderIndex: 1 },
      { rubricId: rubric1.id, criterionName: 'Schema Validation & Error Handling', description: 'Validates responses and handles network timeouts or 4xx/5xx statuses safely.', maxPoints: 35.00, orderIndex: 2 },
      { rubricId: rubric1.id, criterionName: 'Code Modularity & Lab Documentation', description: 'Clean code structure and accurate topology verification notes.', maxPoints: 30.00, orderIndex: 3 }
    ]);

    const assign2 = await models.Assignment.create({
      classId: classBSIT4A.id,
      courseId: courseIP.id,
      moduleId: mod2.id,
      gradeCategoryId: catAssign.id,
      title: 'Assignment 2: Role-Based Access Control & HMAC Webhook Gateway',
      instructions: `Implement an Express middleware chain that verifies HMAC-SHA256 webhook signatures from an upstream identity provider and enforces role-based permissions before dispatching events.`,
      assignmentType: 'programming',
      openDate: new Date('2026-10-15T00:00:00Z'),
      dueDate: new Date('2026-11-25T23:59:00Z'),
      maxScore: 100.00,
      allowTextResponse: true,
      allowFileSubmission: true,
      maxAttempts: 3,
      allowLateSubmissions: true,
      latePenaltyPercent: 10.00,
      allowResubmission: true,
      publicationStatus: 'published',
      createdBy: instructor1.id
    });

    // Submissions for Assignment 1
    const sub1 = await models.Submission.create({
      assignmentId: assign1.id,
      classId: classBSIT4A.id,
      studentId: student1.id,
      status: 'graded',
      attemptNumber: 1,
      textResponse: 'Completed RESTCONF telemetry client with full Zod validation and tested against CSR1000v-Core-01.',
      codeSubmission: `const axios = require('axios');\nasync function fetchRouterTelemetry(host, token) {\n  const res = await axios.get(\`https://\${host}/restconf/data/ietf-interfaces:interfaces\`, {\n    headers: { Accept: 'application/yang-data+json', Authorization: \`Bearer \${token}\` }\n  });\n  return res.data;\n}\nmodule.exports = { fetchRouterTelemetry };`,
      submittedAt: new Date('2026-10-20T15:30:00Z'),
      isLate: false,
      score: 95.00,
      feedback: 'Outstanding implementation, Maya! Clean error handling and strict RFC 8040 header compliance.',
      gradedBy: instructor1.id,
      gradedAt: new Date('2026-10-21T10:15:00Z'),
      isGradePublished: true
    });

    await models.SubmissionVersion.create({
      submissionId: sub1.id,
      versionNumber: 1,
      textResponse: sub1.textResponse,
      codeSubmission: sub1.codeSubmission,
      submittedAt: sub1.submittedAt
    });

    const sub2 = await models.Submission.create({
      assignmentId: assign1.id,
      classId: classBSIT4A.id,
      studentId: student2.id,
      status: 'under_review',
      attemptNumber: 1,
      textResponse: 'Submitted initial RESTCONF script. Had a question about self-signed TLS certificates on the lab router.',
      codeSubmission: `// Carlos Mendoza Lab 1 submission\nfetch('https://10.10.20.48/restconf/data/ietf-interfaces:interfaces');`,
      submittedAt: new Date('2026-10-26T18:45:00Z'),
      isLate: false,
      flaggedForInstructorReview: true,
      flagReason: 'Student used default Accept header instead of application/yang-data+json; preliminary rubric applied by TA.',
      preliminaryFeedback: 'Preliminary TA Review: Good structure, but remember to include the YANG JSON Accept header.'
    });

    await models.SubmissionVersion.create({
      submissionId: sub2.id,
      versionNumber: 1,
      textResponse: sub2.textResponse,
      codeSubmission: sub2.codeSubmission,
      submittedAt: sub2.submittedAt
    });

    // 14. Seed Question Bank, All 8 Question Types, Assessments & Attempts
    const qBank = await models.QuestionBank.create({
      courseId: courseIP.id,
      title: 'IT-401 Enterprise APIs, RESTCONF & Security Question Bank',
      topic: 'Enterprise Integration & Programmability',
      description: 'Reusable question bank covering HTTP semantics, YANG/RESTCONF, Argon2id, and RBAC security.',
      createdBy: instructor1.id
    });

    const q1 = await models.Question.create({
      questionBankId: qBank.id,
      courseId: courseIP.id,
      topic: 'RESTCONF & YANG',
      questionType: 'multiple_choice',
      difficulty: 'Medium',
      prompt: 'Which HTTP Content-Type and Accept media type is standardized by RFC 8040 for JSON-encoded YANG data in RESTCONF?',
      points: 20.00,
      explanation: 'RFC 8040 standardizes application/yang-data+json and application/yang-data+xml for RESTCONF payloads.'
    });
    const q1Opt1 = await models.QuestionOption.create({ questionId: q1.id, optionText: 'application/yang-data+json', isCorrect: true, orderIndex: 1 });
    await models.QuestionOption.create({ questionId: q1.id, optionText: 'text/plain+yang', isCorrect: false, orderIndex: 2 });
    await models.QuestionOption.create({ questionId: q1.id, optionText: 'application/snmp+json', isCorrect: false, orderIndex: 3 });
    await models.QuestionOption.create({ questionId: q1.id, optionText: 'multipart/form-data', isCorrect: false, orderIndex: 4 });

    const q2 = await models.Question.create({
      questionBankId: qBank.id,
      courseId: courseIP.id,
      topic: 'HTTP Semantics',
      questionType: 'multiple_select',
      difficulty: 'Medium',
      prompt: 'Select ALL HTTP methods that are guaranteed to be idempotent according to RFC 9110:',
      points: 20.00,
      explanation: 'GET, PUT, and DELETE are idempotent; POST is not idempotent.'
    });
    const q2Opt1 = await models.QuestionOption.create({ questionId: q2.id, optionText: 'GET', isCorrect: true, orderIndex: 1 });
    const q2Opt2 = await models.QuestionOption.create({ questionId: q2.id, optionText: 'PUT', isCorrect: true, orderIndex: 2 });
    const q2Opt3 = await models.QuestionOption.create({ questionId: q2.id, optionText: 'DELETE', isCorrect: true, orderIndex: 3 });
    await models.QuestionOption.create({ questionId: q2.id, optionText: 'POST', isCorrect: false, orderIndex: 4 });

    const q3 = await models.Question.create({
      questionBankId: qBank.id,
      courseId: courseIP.id,
      topic: 'Application Security',
      questionType: 'true_false',
      difficulty: 'Easy',
      prompt: 'True or False: Hiding navigation links in the React frontend is sufficient to prevent unauthorized users from invoking privileged API endpoints.',
      points: 15.00,
      explanation: 'False. Authorization must always be enforced on the server for every protected API endpoint.'
    });
    await models.QuestionOption.create({ questionId: q3.id, optionText: 'True', isCorrect: false, orderIndex: 1 });
    const q3OptFalse = await models.QuestionOption.create({ questionId: q3.id, optionText: 'False', isCorrect: true, orderIndex: 2 });

    const q4 = await models.Question.create({
      questionBankId: qBank.id,
      courseId: courseIP.id,
      topic: 'Authentication',
      questionType: 'multiple_choice',
      difficulty: 'Medium',
      prompt: 'Which memory-hard password hashing algorithm won the 2015 Password Hashing Competition and resists both GPU and side-channel attacks?',
      points: 15.00,
      correctAnswerText: 'Argon2id',
      explanation: 'Argon2id combines Argon2i (side-channel resistance) and Argon2d (GPU cracking resistance).'
    });
    const q4Opt1 = await models.QuestionOption.create({ questionId: q4.id, optionText: 'Argon2id', isCorrect: true, orderIndex: 1 });
    await models.QuestionOption.create({ questionId: q4.id, optionText: 'PBKDF2-HMAC-SHA1', isCorrect: false, orderIndex: 2 });
    await models.QuestionOption.create({ questionId: q4.id, optionText: 'MD5-Crypt', isCorrect: false, orderIndex: 3 });
    await models.QuestionOption.create({ questionId: q4.id, optionText: 'Plaintext SHA-256', isCorrect: false, orderIndex: 4 });

    const q5 = await models.Question.create({
      questionBankId: qBank.id,
      courseId: courseIP.id,
      topic: 'Network Protocols',
      questionType: 'multiple_choice',
      difficulty: 'Easy',
      prompt: 'In Cisco IOS XE, which default TCP port does the NETCONF protocol use over SSH?',
      points: 15.00,
      correctAnswerText: '830',
      explanation: 'RFC 6242 specifies TCP port 830 for NETCONF over SSH.'
    });
    const q5Opt1 = await models.QuestionOption.create({ questionId: q5.id, optionText: '830 (NETCONF over SSH)', isCorrect: true, orderIndex: 1 });
    await models.QuestionOption.create({ questionId: q5.id, optionText: '443 (RESTCONF over HTTPS)', isCorrect: false, orderIndex: 2 });
    await models.QuestionOption.create({ questionId: q5.id, optionText: '161 (SNMP Agent UDP)', isCorrect: false, orderIndex: 3 });
    await models.QuestionOption.create({ questionId: q5.id, optionText: '22 (Standard SSH CLI)', isCorrect: false, orderIndex: 4 });

    const q6 = await models.Question.create({
      questionBankId: qBank.id,
      courseId: courseIP.id,
      topic: 'Protocol Comparison',
      questionType: 'matching',
      difficulty: 'Medium',
      prompt: 'Match each network management or integration protocol with its primary transport mechanism:',
      points: 15.00,
      matchingPairs: [
        { left: 'RESTCONF', right: 'HTTPS (TLS over TCP 443)' },
        { left: 'NETCONF', right: 'SSH (TCP 830)' },
        { left: 'SNMPv3', right: 'UDP (Ports 161/162)' }
      ],
      explanation: 'RESTCONF uses HTTPS, NETCONF uses SSH port 830, and SNMP uses UDP 161/162.'
    });

    const q7 = await models.Question.create({
      questionBankId: qBank.id,
      courseId: courseIP.id,
      topic: 'Concurrency & ACID Transactions',
      questionType: 'multiple_choice',
      difficulty: 'Hard',
      prompt: 'Which database and API mechanism combination prevents duplicate academic enrollment records during high-concurrency requests?',
      points: 25.00,
      explanation: 'ACID database transactions combined with unique composite constraints and idempotency keys prevent duplicate enrollment records.'
    });
    await models.QuestionOption.create({
      questionId: q7.id,
      optionText: 'ACID database transactions with unique composite constraints and idempotency keys',
      isCorrect: true,
      orderIndex: 1
    });
    await models.QuestionOption.create({
      questionId: q7.id,
      optionText: 'Client-side button disabling without server-side validation',
      isCorrect: false,
      orderIndex: 2
    });
    await models.QuestionOption.create({
      questionId: q7.id,
      optionText: 'Unindexed flat-file append logs without locking',
      isCorrect: false,
      orderIndex: 3
    });

    // Create Quiz 1 (Objective auto-graded questions, 100 points total)
    const quiz1 = await models.Assessment.create({
      classId: classBSIT4A.id,
      courseId: courseIP.id,
      moduleId: mod1.id,
      gradeCategoryId: catQuiz.id,
      title: 'Module 1 Checkpoint Quiz: RESTCONF, YANG & API Security',
      assessmentType: 'quiz',
      instructions: 'Complete all 6 objective questions within the 30-minute time limit. Your progress is automatically saved as you navigate.',
      startDate: new Date('2026-10-05T00:00:00Z'),
      closeDate: new Date('2026-12-10T23:59:00Z'),
      timeLimitMinutes: 30,
      maxScore: 100.00,
      passingScore: 75.00,
      maxAttempts: 2,
      randomizeQuestions: false,
      randomizeOptions: false,
      autoPublishResults: true,
      allowReviewAfterSubmit: true,
      publicationStatus: 'published',
      createdBy: instructor1.id
    });

    await models.AssessmentQuestion.bulkCreate([
      { assessmentId: quiz1.id, questionId: q1.id, orderIndex: 1 },
      { assessmentId: quiz1.id, questionId: q2.id, orderIndex: 2 },
      { assessmentId: quiz1.id, questionId: q3.id, orderIndex: 3 },
      { assessmentId: quiz1.id, questionId: q4.id, orderIndex: 4 },
      { assessmentId: quiz1.id, questionId: q5.id, orderIndex: 5 },
      { assessmentId: quiz1.id, questionId: q6.id, orderIndex: 6 }
    ]);

    // Create Major Midterm Exam (Includes Essay Question for manual grading demonstration)
    const exam1 = await models.Assessment.create({
      classId: classBSIT4A.id,
      courseId: courseIP.id,
      moduleId: mod2.id,
      gradeCategoryId: catExam.id,
      title: 'Midterm Examination: Enterprise Integration & Security Architecture',
      assessmentType: 'final_exam',
      instructions: 'Formal examination covering Modules 1 and 2. Includes both objective questions and an architectural essay.',
      startDate: new Date('2026-10-20T00:00:00Z'),
      closeDate: new Date('2026-12-15T23:59:00Z'),
      timeLimitMinutes: 60,
      maxScore: 100.00,
      passingScore: 75.00,
      maxAttempts: 1,
      randomizeQuestions: false,
      randomizeOptions: false,
      autoPublishResults: false,
      allowReviewAfterSubmit: true,
      publicationStatus: 'published',
      createdBy: instructor1.id
    });

    await models.AssessmentQuestion.bulkCreate([
      { assessmentId: exam1.id, questionId: q1.id, pointsOverride: 25.00, orderIndex: 1 },
      { assessmentId: exam1.id, questionId: q2.id, pointsOverride: 25.00, orderIndex: 2 },
      { assessmentId: exam1.id, questionId: q4.id, pointsOverride: 25.00, orderIndex: 3 },
      { assessmentId: exam1.id, questionId: q7.id, pointsOverride: 25.00, orderIndex: 4 }
    ]);

    // Create Module 2 & Final Course Completion Checkpoint Quiz for BSIT 4-A
    const quiz2 = await models.Assessment.create({
      classId: classBSIT4A.id,
      courseId: courseIP.id,
      moduleId: mod2.id,
      gradeCategoryId: catQuiz.id,
      title: 'Course Completion Checkpoint Quiz: Argon2id, RBAC & IDOR Defense',
      assessmentType: 'quiz',
      instructions: 'Complete this NetAcad-style course completion quiz to verify what you learned in Module 2 and automatically complete the course.',
      startDate: new Date('2026-10-05T00:00:00Z'),
      closeDate: new Date('2026-12-20T23:59:00Z'),
      timeLimitMinutes: 20,
      maxScore: 100.00,
      passingScore: 75.00,
      maxAttempts: 3,
      randomizeQuestions: false,
      randomizeOptions: false,
      autoPublishResults: true,
      allowReviewAfterSubmit: true,
      publicationStatus: 'published',
      createdBy: instructor1.id
    });

    await models.AssessmentQuestion.bulkCreate([
      { assessmentId: quiz2.id, questionId: q4.id, pointsOverride: 25.00, orderIndex: 1 },
      { assessmentId: quiz2.id, questionId: q3.id, pointsOverride: 25.00, orderIndex: 2 },
      { assessmentId: quiz2.id, questionId: q2.id, pointsOverride: 25.00, orderIndex: 3 },
      { assessmentId: quiz2.id, questionId: q6.id, pointsOverride: 25.00, orderIndex: 4 }
    ]);

    // Create NET-201 Course Completion Checkpoint Quiz for classENSA4A
    const netQBank = await models.QuestionBank.create({
      courseId: courseNet.id,
      title: 'NET-201 OSPFv2 & Link-State Routing Question Bank',
      topic: 'Single-Area OSPFv2',
      description: 'Checkpoint questions verifying student mastery of OSPF neighbor states and metrics.',
      createdBy: instructor1.id
    });

    const netQ1 = await models.Question.create({
      questionBankId: netQBank.id,
      courseId: courseNet.id,
      topic: 'OSPF Algorithm',
      questionType: 'multiple_choice',
      difficulty: 'Easy',
      prompt: 'Which algorithm does OSPFv2 use to calculate the shortest loop-free path to every destination network in the Link-State Database (LSDB)?',
      points: 25.00,
      explanation: 'OSPF uses Dijkstra Shortest Path First (SPF) algorithm.'
    });
    await models.QuestionOption.create({ questionId: netQ1.id, optionText: 'Dijkstra Shortest Path First (SPF)', isCorrect: true, orderIndex: 1 });
    await models.QuestionOption.create({ questionId: netQ1.id, optionText: 'Bellman-Ford Distance Vector', isCorrect: false, orderIndex: 2 });
    await models.QuestionOption.create({ questionId: netQ1.id, optionText: 'Spanning Tree Protocol (STP)', isCorrect: false, orderIndex: 3 });

    const netQ2 = await models.Question.create({
      questionBankId: netQBank.id,
      courseId: courseNet.id,
      topic: 'OSPF States',
      questionType: 'true_false',
      difficulty: 'Easy',
      prompt: 'True or False: When two OSPF neighbor routers have fully synchronized their Link-State Databases (LSDBs), they reach the Full state.',
      points: 25.00,
      explanation: 'True. The Full state indicates complete LSDB synchronization.'
    });
    await models.QuestionOption.create({ questionId: netQ2.id, optionText: 'True', isCorrect: true, orderIndex: 1 });
    await models.QuestionOption.create({ questionId: netQ2.id, optionText: 'False', isCorrect: false, orderIndex: 2 });

    const netQ3 = await models.Question.create({
      questionBankId: netQBank.id,
      courseId: courseNet.id,
      topic: 'OSPF Packet Types',
      questionType: 'multiple_select',
      difficulty: 'Medium',
      prompt: 'Select ALL valid OSPFv2 packet types used to discover neighbors and synchronize the Link-State Database:',
      points: 25.00,
      explanation: 'Hello (Type 1), Database Description / DBD (Type 2), and Link-State Update / LSU (Type 4) are valid OSPF packet types.'
    });
    await models.QuestionOption.create({ questionId: netQ3.id, optionText: 'Hello Packet (Type 1)', isCorrect: true, orderIndex: 1 });
    await models.QuestionOption.create({ questionId: netQ3.id, optionText: 'Database Description / DBD (Type 2)', isCorrect: true, orderIndex: 2 });
    await models.QuestionOption.create({ questionId: netQ3.id, optionText: 'Link-State Update / LSU (Type 4)', isCorrect: true, orderIndex: 3 });
    await models.QuestionOption.create({ questionId: netQ3.id, optionText: 'BGP Keepalive Message', isCorrect: false, orderIndex: 4 });

    const netQ4 = await models.Question.create({
      questionBankId: netQBank.id,
      courseId: courseNet.id,
      topic: 'OSPF Parameters',
      questionType: 'matching',
      difficulty: 'Medium',
      prompt: 'Match each OSPFv2 operational parameter with its standard Cisco IOS default value:',
      points: 25.00,
      matchingPairs: [
        { left: 'OSPF Administrative Distance', right: '110' },
        { left: 'Broadcast Hello Interval', right: '10 seconds' },
        { left: 'All-OSPF-Routers Multicast Address', right: '224.0.0.5' }
      ],
      explanation: 'OSPF has AD 110, 10s Hello timer on broadcast links, and uses multicast 224.0.0.5.'
    });

    const netQuiz1 = await models.Assessment.create({
      classId: classENSA4A.id,
      courseId: courseNet.id,
      moduleId: netMod1.id,
      title: 'NET-201 Course Completion Quiz: OSPFv2 Operations & Adjacencies',
      assessmentType: 'quiz',
      instructions: 'Answer these checkpoint questions on OSPFv2 to verify what you learned and automatically complete NET-201.',
      startDate: new Date('2026-10-01T00:00:00Z'),
      closeDate: new Date('2026-12-20T23:59:00Z'),
      timeLimitMinutes: 20,
      maxScore: 100.00,
      passingScore: 75.00,
      maxAttempts: 3,
      randomizeQuestions: false,
      randomizeOptions: false,
      autoPublishResults: true,
      allowReviewAfterSubmit: true,
      publicationStatus: 'published',
      createdBy: instructor1.id
    });

    await models.AssessmentQuestion.bulkCreate([
      { assessmentId: netQuiz1.id, questionId: netQ1.id, pointsOverride: 25.00, orderIndex: 1 },
      { assessmentId: netQuiz1.id, questionId: netQ2.id, pointsOverride: 25.00, orderIndex: 2 },
      { assessmentId: netQuiz1.id, questionId: netQ3.id, pointsOverride: 25.00, orderIndex: 3 },
      { assessmentId: netQuiz1.id, questionId: netQ4.id, pointsOverride: 25.00, orderIndex: 4 }
    ]);

    // Seed a completed attempt on Quiz 1 by Maya Lin (student1)
    const attempt1 = await models.AssessmentAttempt.create({
      assessmentId: quiz1.id,
      classId: classBSIT4A.id,
      studentId: student1.id,
      attemptNumber: 1,
      status: 'graded',
      startedAt: new Date('2026-10-19T10:00:00Z'),
      expiresAt: new Date('2026-10-19T10:30:00Z'),
      submittedAt: new Date('2026-10-19T10:18:00Z'),
      autoScore: 100.00,
      manualScore: 0.00,
      totalScore: 100.00,
      RequiresManualGrading: false,
      isPublished: true,
      gradedAt: new Date('2026-10-19T10:18:00Z')
    });

    await models.AssessmentAnswer.bulkCreate([
      { attemptId: attempt1.id, questionId: q1.id, selectedOptionIds: [q1Opt1.id], isCorrect: true, pointsAwarded: 20.00 },
      { attemptId: attempt1.id, questionId: q2.id, selectedOptionIds: [q2Opt1.id, q2Opt2.id, q2Opt3.id], isCorrect: true, pointsAwarded: 20.00 },
      { attemptId: attempt1.id, questionId: q3.id, selectedOptionIds: [q3OptFalse.id], isCorrect: true, pointsAwarded: 15.00 },
      { attemptId: attempt1.id, questionId: q4.id, selectedOptionIds: [q4Opt1.id], isCorrect: true, pointsAwarded: 15.00 },
      { attemptId: attempt1.id, questionId: q5.id, selectedOptionIds: [q5Opt1.id], isCorrect: true, pointsAwarded: 15.00 },
      {
        attemptId: attempt1.id,
        questionId: q6.id,
        matchingResponse: {
          RESTCONF: 'HTTPS (TLS over TCP 443)',
          NETCONF: 'SSH (TCP 830)',
          SNMPv3: 'UDP (Ports 161/162)'
        },
        isCorrect: true,
        pointsAwarded: 15.00
      }
    ]);

    // 15. Seed Grades & GradeHistory
    const grade1 = await models.Grade.create({
      classId: classBSIT4A.id,
      gradeCategoryId: catLab.id,
      studentId: student1.id,
      sourceType: 'assignment',
      sourceId: assign1.id,
      itemTitle: assign1.title,
      score: 95.00,
      maxScore: 100.00,
      feedback: 'Outstanding implementation, Maya!',
      status: 'published',
      gradedBy: instructor1.id,
      publishedAt: new Date('2026-10-21T10:15:00Z')
    });

    await models.GradeHistory.create({
      gradeId: grade1.id,
      classId: classBSIT4A.id,
      studentId: student1.id,
      previousScore: null,
      newScore: 95.00,
      previousStatus: 'draft',
      newStatus: 'published',
      reason: 'Initial grading of Lab 1 submission against RESTCONF rubric',
      changedBy: instructor1.id
    });

    await models.Grade.create({
      classId: classBSIT4A.id,
      gradeCategoryId: catQuiz.id,
      studentId: student1.id,
      sourceType: 'assessment',
      sourceId: quiz1.id,
      itemTitle: quiz1.title,
      score: 100.00,
      maxScore: 100.00,
      feedback: 'Auto-graded checkpoint quiz',
      status: 'published',
      publishedAt: new Date('2026-10-19T10:18:00Z')
    });

    await models.Grade.create({
      classId: classBSIT4A.id,
      gradeCategoryId: catQuiz.id,
      studentId: student2.id,
      sourceType: 'assessment',
      sourceId: quiz1.id,
      itemTitle: quiz1.title,
      score: 85.00,
      maxScore: 100.00,
      feedback: 'Good work on Module 1 quiz.',
      status: 'published',
      publishedAt: new Date('2026-10-20T14:00:00Z')
    });

    // 16. Seed Certificate for Maya Lin (demonstrating verifiable completion record from prior module/course)
    const certCode = 'AIT-CERT-2026-8841';
    const verifyHash = crypto.createHash('sha256').update(`${certCode}:${student1.email}`).digest('hex');
    await models.Certificate.create({
      certificateCode: certCode,
      verificationHash: verifyHash,
      studentId: student1.id,
      courseId: courseNet.id,
      classId: classENSA4A.id,
      recipientName: `${student1.firstName} ${student1.lastName}`,
      courseTitle: 'Enterprise Networking, Security, and Automation (ENSA)',
      courseCode: 'NET-201',
      finalScore: 96.50,
      issuedAt: new Date('2026-10-22T09:00:00Z'),
      issuedBy: instructor1.id,
      status: 'active'
    });

    // 17. Seed Announcements, Discussions, Messages, Notifications, and Audit Logs
    await models.Announcement.bulkCreate([
      {
        scope: 'institution',
        title: 'Welcome to First Semester 2026–2027 & NetAcad Lab Environment Upgrade',
        content: 'All routing, switching, and integrative programming virtual pods have been upgraded to IOS XE 17.12 and Node.js 22 LTS. Please review your class schedules and laboratory safety guidelines.',
        priority: 'important',
        isPinned: true,
        authorId: acadAdmin.id
      },
      {
        scope: 'class',
        classId: classBSIT4A.id,
        courseId: courseIP.id,
        title: 'Lab 1 RESTCONF Sandboxes Available 24/7 & Midterm Prep',
        content: 'The CSR1000v simulation endpoints for BSIT 4-A are active. Remember to include the application/yang-data+json header in your Lab 1 submissions.',
        priority: 'normal',
        isPinned: true,
        authorId: instructor1.id
      }
    ]);

    const thread1 = await models.DiscussionThread.create({
      classId: classBSIT4A.id,
      courseId: courseIP.id,
      lessonId: lesson1_2.id,
      authorId: student2.id,
      title: 'Handling Self-Signed TLS Certificates in Node.js RESTCONF Client',
      body: 'When querying the lab router IP over HTTPS in Lab 1.2, Node fetch throws DEPTH_ZERO_SELF_SIGNED_CERT. What is the recommended way to configure the laboratory TLS agent without disabling security in production?',
      category: 'laboratory_help',
      isPinned: true,
      isResolved: true
    });

    await models.DiscussionPost.bulkCreate([
      {
        threadId: thread1.id,
        authorId: taUser.id,
        body: 'Great question Carlos! In the laboratory environment, load the NetAcad Lab Root CA certificate into an https.Agent({ ca: labCaCert }) rather than setting rejectUnauthorized: false globally.',
        isInstructorEndorsed: true
      },
      {
        threadId: thread1.id,
        authorId: instructor1.id,
        body: 'Endorsed Liam’s answer. Pinning the lab CA certificate in your custom HTTPS agent is best practice and mirrors enterprise mTLS workflows.',
        isInstructorEndorsed: true
      }
    ]);

    const conv1 = await models.Conversation.create({
      subject: 'Question regarding Midterm Architecture Essay Scope',
      classId: classBSIT4A.id,
      createdBy: student1.id,
      lastMessageAt: new Date()
    });

    await models.ConversationMember.bulkCreate([
      { conversationId: conv1.id, userId: student1.id, lastReadAt: new Date() },
      { conversationId: conv1.id, userId: instructor1.id, lastReadAt: new Date() }
    ]);

    await models.Message.bulkCreate([
      {
        conversationId: conv1.id,
        senderId: student1.id,
        body: 'Good day Prof. Vance! For the Midterm Examination essay on idempotency, should we include database isolation levels (e.g., SERIALIZABLE vs READ COMMITTED)?'
      },
      {
        conversationId: conv1.id,
        senderId: instructor1.id,
        body: 'Hello Maya! Yes, discussing how unique constraints pair with transaction isolation levels will earn full rubric credit.'
      }
    ]);

    await models.Notification.bulkCreate([
      {
        userId: student1.id,
        type: 'grade',
        title: 'Grade Published: Lab 1 RESTCONF Network Telemetry',
        message: 'Prof. Elena Vance published your grade (95 / 100) and feedback for Lab 1.',
        destinationUrl: '/student/grades',
        isRead: false
      },
      {
        userId: student1.id,
        type: 'assessment',
        title: 'Upcoming Assessment: Midterm Examination',
        message: 'Midterm Examination: Enterprise Integration & Security Architecture is open for attempts.',
        destinationUrl: '/student/assessments',
        isRead: false
      },
      {
        userId: instructor1.id,
        type: 'assignment',
        title: 'Submission Flagged by TA: Carlos Mendoza (Lab 1)',
        message: 'TA Liam Reyes flagged Carlos Mendoza’s Lab 1 submission for instructor review.',
        destinationUrl: '/instructor/submissions',
        isRead: false
      },
      {
        userId: acadAdmin.id,
        type: 'grade',
        title: 'Final Grades Pending Approval: BSIT 4-B',
        message: 'Prof. Elena Vance submitted final grades for BSIT 4-B — Integrative Programming for institutional approval.',
        destinationUrl: '/academic/grade-approvals',
        isRead: false
      }
    ]);

    await models.AuditLog.bulkCreate([
      {
        actorId: superAdmin.id,
        actorEmail: superAdmin.email,
        actorRole: 'super_admin',
        action: 'SYSTEM_BOOTSTRAP_INITIALIZED',
        category: 'system',
        severity: 'info',
        entityType: 'Institution',
        entityId: String(institution.id),
        ipAddress: '127.0.0.1',
        metadata: { institutionCode: institution.code, rolesInitialized: 5 }
      },
      {
        actorId: acadAdmin.id,
        actorEmail: acadAdmin.email,
        actorRole: 'academic_admin',
        action: 'SEMESTER_ACTIVATED',
        category: 'academic',
        severity: 'info',
        entityType: 'Semester',
        entityId: String(semCurrent.id),
        ipAddress: '127.0.0.1',
        metadata: { semesterCode: semCurrent.code }
      },
      {
        actorId: instructor1.id,
        actorEmail: instructor1.email,
        actorRole: 'instructor',
        action: 'GRADE_PUBLISHED',
        category: 'grade',
        severity: 'info',
        entityType: 'Grade',
        entityId: String(grade1.id),
        ipAddress: '127.0.0.1',
        metadata: { studentId: student1.id, score: 95, maxScore: 100 }
      }
    ]);
  }
};

