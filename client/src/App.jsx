import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import { LoadingState } from './components/ui/SharedComponents';

import {
  LoginPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  CertificateVerifyPublicPage,
  ProfileSettingsPage,
  UnauthorizedPage,
  NotFoundPage,
  LandingPage,
  AboutPage,
  PublicCatalogPage,
  PrivacyPolicyPage,
  TermsOfUsePage
} from './pages/PublicPages';

import {
  SuperAdminDashboardPage,
  UserManagementPage,
  RolePermissionMatrixPage,
  SystemSettingsPage,
  AuditLogsPage
} from './pages/SuperAdminPages';

import {
  AcademicDashboardPage,
  DepartmentsAndProgramsPage,
  TermsManagementPage,
  CoursesAndOfferingsPage,
  ClassesAndSectionsPage,
  EnrollmentManagementPage,
  GradeApprovalsPage
} from './pages/AcademicAdminPages';

import {
  InstructorDashboardPage,
  InstructorCourseStudioPage,
  InstructorAssignmentsPage,
  InstructorSubmissionsPage,
  InstructorAssessmentsPage,
  InstructorGradebookPage
} from './pages/InstructorPages';

import {
  StudentDashboardPage,
  StudentCatalogPage,
  StudentCourseLearningPage,
  StudentAssignmentsPage,
  StudentAssessmentsAndExamRunnerPage,
  StudentGradesAndProgressPage,
  StudentCertificatesPage,
  StudentClassesSubPage,
  StudentAnalyticsSubPage,
  StudentDirectorySubPage,
  StudentCommunicationSubPage,
  StudentCalendarSubPage,
  StudentSettingsSubPage,
  StudentHelpSupportSubPage
} from './pages/StudentPages';

import {
  TaDashboardPage,
  TaSubmissionsReviewPage,
  SharedAnnouncementsPage,
  SharedDiscussionsPage,
  SharedMessagesPage,
  SharedReportsPage
} from './pages/TaAndSharedPages';

function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState label="Verifying session & role permissions..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.some((r) => user.roles?.includes(r))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

function RootRedirect() {
  const { user, loading, homePath } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homePath} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/catalog" element={<PublicCatalogPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfUsePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-certificate" element={<CertificateVerifyPublicPage />} />

      {/* Protected Authenticated Application Shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/profile" element={<ProfileSettingsPage />} />
        <Route path="/messages" element={<SharedMessagesPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Super Administrator Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <RolePermissionMatrixPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/academic-config"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <DepartmentsAndProgramsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SystemSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SharedReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Academic Administrator Routes */}
        <Route
          path="/academic/dashboard"
          element={
            <ProtectedRoute allowedRoles={['academic_admin', 'super_admin']}>
              <AcademicDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academic/structure"
          element={
            <ProtectedRoute allowedRoles={['academic_admin', 'super_admin']}>
              <DepartmentsAndProgramsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academic/terms"
          element={
            <ProtectedRoute allowedRoles={['academic_admin', 'super_admin']}>
              <TermsManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academic/courses"
          element={
            <ProtectedRoute allowedRoles={['academic_admin', 'super_admin']}>
              <CoursesAndOfferingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academic/classes"
          element={
            <ProtectedRoute allowedRoles={['academic_admin', 'super_admin']}>
              <ClassesAndSectionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academic/enrollments"
          element={
            <ProtectedRoute allowedRoles={['academic_admin', 'super_admin']}>
              <EnrollmentManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academic/grade-approvals"
          element={
            <ProtectedRoute allowedRoles={['academic_admin', 'super_admin']}>
              <GradeApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academic/announcements"
          element={
            <ProtectedRoute allowedRoles={['academic_admin', 'super_admin']}>
              <SharedAnnouncementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academic/reports"
          element={
            <ProtectedRoute allowedRoles={['academic_admin', 'super_admin']}>
              <SharedReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Instructor Routes */}
        <Route
          path="/instructor/dashboard"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorCourseStudioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/classes"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <ClassesAndSectionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/assignments"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorAssignmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/submissions"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorSubmissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/assessments"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorAssessmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/gradebook"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorGradebookPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/discussions"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <SharedDiscussionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/announcements"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <SharedAnnouncementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/reports"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <SharedReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Teaching Assistant Routes */}
        <Route
          path="/ta/dashboard"
          element={
            <ProtectedRoute allowedRoles={['teaching_assistant']}>
              <TaDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ta/classes"
          element={
            <ProtectedRoute allowedRoles={['teaching_assistant']}>
              <TaDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ta/submissions"
          element={
            <ProtectedRoute allowedRoles={['teaching_assistant']}>
              <TaSubmissionsReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ta/resources"
          element={
            <ProtectedRoute allowedRoles={['teaching_assistant']}>
              <InstructorCourseStudioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ta/discussions"
          element={
            <ProtectedRoute allowedRoles={['teaching_assistant']}>
              <SharedDiscussionsPage />
            </ProtectedRoute>
          }
        />

        {/* Student Routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/catalog"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentCatalogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/courses"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentCourseLearningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/assignments"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAssignmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/assessments"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAssessmentsAndExamRunnerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/grades"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentGradesAndProgressPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/discussions"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <SharedDiscussionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/announcements"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <SharedAnnouncementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/certificates"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentCertificatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/completed-courses"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentCertificatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/classes/:subview"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentClassesSubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/assignments/:subview"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAssignmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/reports/:subview"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAnalyticsSubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/students/:subview"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDirectorySubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/communication/:subview"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentCommunicationSubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/calendar/:subview"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentCalendarSubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/settings/:subview"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentSettingsSubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/help/:subview"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentHelpSupportSubPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

