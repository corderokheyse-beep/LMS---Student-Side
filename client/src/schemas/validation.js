import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z.string().email('Please enter a valid institutional email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const forgotPasswordFormSchema = z.object({
  email: z.string().email('Please enter a valid institutional email address')
});

export const resetPasswordFormSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
});

export const userCreateFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleSlug: z.enum(['super_admin', 'academic_admin', 'instructor', 'teaching_assistant', 'student']),
  studentNumber: z.string().optional(),
  employeeNumber: z.string().optional()
});

export const courseCreateFormSchema = z.object({
  departmentId: z.coerce.number().int().positive('Department is required'),
  code: z.string().min(3, 'Course code is required (e.g., NET-301)'),
  title: z.string().min(4, 'Course title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(2, 'Category is required'),
  creditUnits: z.coerce.number().min(1).max(12),
  level: z.enum(['Introductory', 'Intermediate', 'Advanced', 'Professional']),
  deliveryMode: z.enum(['Instructor-Led', 'Self-Paced', 'Hybrid'])
});

