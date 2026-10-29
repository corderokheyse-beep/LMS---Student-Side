const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Please enter a valid institutional email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid reset token'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[0-9]/, 'Password must include a number')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'New password must include an uppercase letter')
    .regex(/[0-9]/, 'New password must include a number')
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  bio: z.string().max(1500).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  timezone: z.string().max(80).optional(),
  notificationPreferences: z.record(z.boolean()).optional()
});

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleSlug: z.enum(['super_admin', 'academic_admin', 'instructor', 'teaching_assistant', 'student']),
  departmentId: z.coerce.number().int().positive().optional().nullable(),
  programId: z.coerce.number().int().positive().optional().nullable(),
  studentNumber: z.string().max(50).optional().nullable(),
  employeeNumber: z.string().max(50).optional().nullable(),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional().default('active')
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
  departmentId: z.coerce.number().int().positive().optional().nullable(),
  programId: z.coerce.number().int().positive().optional().nullable(),
  studentNumber: z.string().max(50).optional().nullable(),
  employeeNumber: z.string().max(50).optional().nullable(),
  roleSlug: z.enum(['super_admin', 'academic_admin', 'instructor', 'teaching_assistant', 'student']).optional()
});

const departmentSchema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(3).max(200),
  description: z.string().optional().nullable(),
  headName: z.string().max(150).optional().nullable(),
  status: z.enum(['active', 'archived']).optional().default('active')
});

const programSchema = z.object({
  departmentId: z.coerce.number().int().positive(),
  code: z.string().min(2).max(40),
  name: z.string().min(3).max(200),
  degreeType: z.string().max(80).optional().default('Bachelor'),
  durationYears: z.coerce.number().int().min(1).max(8).optional().default(4),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'archived']).optional().default('active')
});

const academicYearSchema = z.object({
  name: z.string().min(4).max(60),
  startDate: z.string().min(8),
  endDate: z.string().min(8),
  isCurrent: z.boolean().optional().default(false),
  status: z.enum(['upcoming', 'active', 'completed', 'archived']).optional().default('active')
});

const semesterSchema = z.object({
  academicYearId: z.coerce.number().int().positive(),
  name: z.string().min(3).max(80),
  code: z.string().min(3).max(40),
  startDate: z.string().min(8),
  endDate: z.string().min(8),
  enrollmentStartDate: z.string().optional().nullable(),
  enrollmentEndDate: z.string().optional().nullable(),
  isCurrent: z.boolean().optional().default(false),
  status: z.enum(['upcoming', 'active', 'closed', 'archived']).optional().default('active')
});

const courseSchema = z.object({
  departmentId: z.coerce.number().int().positive(),
  programId: z.coerce.number().int().positive().optional().nullable(),
  code: z.string().min(3).max(40),
  title: z.string().min(3).max(220),
  description: z.string().min(10),
  category: z.string().max(100).optional().default('Networking & Systems'),
  creditUnits: z.coerce.number().int().min(1).max(12).optional().default(3),
  lectureHours: z.coerce.number().int().min(0).max(20).optional().default(2),
  labHours: z.coerce.number().int().min(0).max(20).optional().default(3),
  level: z.enum(['Introductory', 'Intermediate', 'Advanced', 'Professional']).optional().default('Intermediate'),
  deliveryMode: z.enum(['Instructor-Led', 'Self-Paced', 'Hybrid']).optional().default('Instructor-Led'),
  learningObjectives: z.array(z.string()).optional().default([]),
  prerequisites: z.array(z.string()).optional().default([]),
  labSupportEnabled: z.boolean().optional().default(true),
  publicationStatus: z.enum(['draft', 'published', 'archived']).optional().default('published')
});

const courseOfferingSchema = z.object({
  courseId: z.coerce.number().int().positive(),
  academicYearId: z.coerce.number().int().positive(),
  semesterId: z.coerce.number().int().positive(),
  offeringCode: z.string().min(3).max(80),
  titleOverride: z.string().max(220).optional().nullable(),
  enrollmentPolicy: z.enum(['admin_only', 'instructor_approval', 'open_self_enroll']).optional().default('open_self_enroll'),
  passingScore: z.coerce.number().min(50).max(100).optional().default(75),
  certificateEnabled: z.boolean().optional().default(true),
  status: z.enum(['draft', 'published', 'completed', 'archived']).optional().default('published')
});

const classSectionSchema = z.object({
  courseOfferingId: z.coerce.number().int().positive(),
  sectionCode: z.string().min(2).max(60),
  name: z.string().min(3).max(150),
  room: z.string().max(80).optional().nullable(),
  schedule: z.string().max(150).optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(500).optional().default(40),
  allowLateSubmissions: z.boolean().optional().default(true),
  latePenaltyPercent: z.coerce.number().min(0).max(100).optional().default(10),
  instructorId: z.coerce.number().int().positive().optional().nullable()
});

const moduleSchema = z.object({
  courseId: z.coerce.number().int().positive(),
  title: z.string().min(2).max(220),
  description: z.string().optional().nullable(),
  orderIndex: z.coerce.number().int().min(1).optional().default(1),
  prerequisiteModuleId: z.coerce.number().int().positive().optional().nullable(),
  publicationStatus: z.enum(['draft', 'published', 'scheduled']).optional().default('published'),
  publishAt: z.string().optional().nullable(),
  estimatedMinutes: z.coerce.number().int().min(5).optional().default(60)
});

const lessonSchema = z.object({
  moduleId: z.coerce.number().int().positive(),
  courseId: z.coerce.number().int().positive(),
  title: z.string().min(2).max(220),
  lessonType: z.enum(['reading', 'video', 'laboratory', 'coding_exercise', 'interactive']).optional().default('reading'),
  orderIndex: z.coerce.number().int().min(1).optional().default(1),
  summary: z.string().optional().nullable(),
  contentHtml: z.string().min(1, 'Lesson content is required'),
  codeSnippet: z.string().optional().nullable(),
  codeLanguage: z.string().max(40).optional().nullable(),
  videoUrl: z.string().max(500).optional().nullable(),
  learningObjectives: z.array(z.string()).optional().default([]),
  estimatedMinutes: z.coerce.number().int().min(5).optional().default(30),
  prerequisiteLessonId: z.coerce.number().int().positive().optional().nullable(),
  publicationStatus: z.enum(['draft', 'published', 'scheduled']).optional().default('published')
});

const assignmentSchema = z.object({
  classId: z.coerce.number().int().positive(),
  courseId: z.coerce.number().int().positive(),
  moduleId: z.coerce.number().int().positive().optional().nullable(),
  gradeCategoryId: z.coerce.number().int().positive().optional().nullable(),
  title: z.string().min(3).max(220),
  instructions: z.string().min(5),
  assignmentType: z.enum(['standard', 'programming', 'laboratory', 'network_config', 'project_milestone']).optional().default('standard'),
  openDate: z.string().optional().nullable(),
  dueDate: z.string().min(8),
  maxScore: z.coerce.number().min(1).max(1000).optional().default(100),
  allowTextResponse: z.boolean().optional().default(true),
  allowFileSubmission: z.boolean().optional().default(true),
  maxAttempts: z.coerce.number().int().min(1).max(20).optional().default(3),
  allowLateSubmissions: z.boolean().optional().default(true),
  latePenaltyPercent: z.coerce.number().min(0).max(100).optional().default(10),
  allowResubmission: z.boolean().optional().default(true),
  starterCode: z.string().optional().nullable(),
  labWorksheetChecklist: z.array(z.string()).optional().default([]),
  publicationStatus: z.enum(['draft', 'published', 'archived']).optional().default('published'),
  rubricCriteria: z.array(z.object({
    criterionName: z.string().min(2),
    description: z.string().optional().nullable(),
    maxPoints: z.coerce.number().min(1)
  })).optional()
});

const questionSchema = z.object({
  questionBankId: z.coerce.number().int().positive(),
  courseId: z.coerce.number().int().positive(),
  topic: z.string().min(2).max(150).optional().default('General'),
  questionType: z.enum([
    'multiple_choice',
    'multiple_select',
    'true_false',
    'identification',
    'short_answer',
    'essay',
    'matching',
    'fill_in_the_blank'
  ]),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional().default('Medium'),
  prompt: z.string().min(3),
  codeSnippet: z.string().optional().nullable(),
  points: z.coerce.number().min(0.5).max(100).optional().default(5),
  correctAnswerText: z.string().optional().nullable(),
  matchingPairs: z.array(z.object({ left: z.string(), right: z.string() })).optional().nullable(),
  explanation: z.string().optional().nullable(),
  options: z.array(z.object({
    optionText: z.string().min(1),
    isCorrect: z.boolean()
  })).optional()
});

const assessmentSchema = z.object({
  classId: z.coerce.number().int().positive(),
  courseId: z.coerce.number().int().positive(),
  moduleId: z.coerce.number().int().positive().optional().nullable(),
  gradeCategoryId: z.coerce.number().int().positive().optional().nullable(),
  title: z.string().min(3).max(220),
  assessmentType: z.enum(['quiz', 'checkpoint_exam', 'final_exam', 'practical_exam']).optional().default('quiz'),
  instructions: z.string().min(5),
  startDate: z.string().optional().nullable(),
  closeDate: z.string().min(8),
  timeLimitMinutes: z.coerce.number().int().min(5).max(360).optional().default(45),
  maxScore: z.coerce.number().min(1).max(1000).optional().default(100),
  passingScore: z.coerce.number().min(1).max(1000).optional().default(75),
  maxAttempts: z.coerce.number().int().min(1).max(10).optional().default(2),
  randomizeQuestions: z.boolean().optional().default(false),
  randomizeOptions: z.boolean().optional().default(false),
  autoPublishResults: z.boolean().optional().default(true),
  allowReviewAfterSubmit: z.boolean().optional().default(true),
  publicationStatus: z.enum(['draft', 'published', 'closed']).optional().default('published'),
  questionIds: z.array(z.coerce.number().int().positive()).optional().default([])
});

const gradeCategoriesBulkSchema = z.object({
  categories: z.array(z.object({
    id: z.coerce.number().int().positive().optional(),
    name: z.string().min(2).max(100),
    categoryType: z.enum(['quiz', 'assignment', 'laboratory', 'major_exam', 'project', 'other']),
    weightPercent: z.coerce.number().min(0).max(100)
  })).min(1)
});

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  createUserSchema,
  updateUserSchema,
  departmentSchema,
  programSchema,
  academicYearSchema,
  semesterSchema,
  courseSchema,
  courseOfferingSchema,
  classSectionSchema,
  moduleSchema,
  lessonSchema,
  assignmentSchema,
  questionSchema,
  assessmentSchema,
  gradeCategoriesBulkSchema
};

