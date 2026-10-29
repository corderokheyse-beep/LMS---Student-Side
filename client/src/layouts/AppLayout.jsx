import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Settings,
  FileSpreadsheet,
  Building2,
  BookOpen,
  GraduationCap,
  Calendar,
  Layers,
  ClipboardCheck,
  Award,
  Megaphone,
  MessageSquare,
  Bell,
  LogOut,
  Menu,
  X,
  UserCircle,
  Terminal,
  HelpCircle,
  CheckCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  FileText,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { lmsApi } from '../services/api';

const NAVIGATION_BY_ROLE = {
  super_admin: [
    { to: '/admin/dashboard', label: 'System Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/roles', label: 'Roles & Permissions', icon: ShieldCheck },
    { to: '/admin/academic-config', label: 'Academic Configuration', icon: Building2 },
    { to: '/admin/settings', label: 'System & Integrations', icon: Settings },
    { to: '/admin/audit-logs', label: 'Security & Audit Logs', icon: Lock },
    { to: '/admin/reports', label: 'System Reports', icon: FileSpreadsheet }
  ],
  academic_admin: [
    { to: '/academic/dashboard', label: 'Academic Dashboard', icon: LayoutDashboard },
    { to: '/academic/structure', label: 'Departments & Programs', icon: Building2 },
    { to: '/academic/terms', label: 'Years & Semesters', icon: Calendar },
    { to: '/academic/courses', label: 'Courses & Offerings', icon: BookOpen },
    { to: '/academic/classes', label: 'Classes & Sections', icon: Layers },
    { to: '/academic/enrollments', label: 'Enrollment & CSV Import', icon: Users },
    { to: '/academic/grade-approvals', label: 'Grade Approvals', icon: ClipboardCheck },
    { to: '/academic/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/academic/reports', label: 'Academic Reports', icon: FileSpreadsheet }
  ],
  instructor: [
    { to: '/instructor/dashboard', label: 'Instructor Dashboard', icon: LayoutDashboard },
    { to: '/instructor/courses', label: 'My Courses & Content', icon: BookOpen },
    { to: '/instructor/classes', label: 'Class Management', icon: Layers },
    { to: '/instructor/assignments', label: 'Assignments & Labs', icon: Terminal },
    { to: '/instructor/submissions', label: 'Submission Review', icon: ClipboardCheck },
    { to: '/instructor/assessments', label: 'Quizzes & Question Bank', icon: HelpCircle },
    { to: '/instructor/gradebook', label: 'Class Gradebook', icon: Award },
    { to: '/instructor/discussions', label: 'Discussions & Support', icon: MessageSquare },
    { to: '/instructor/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/instructor/reports', label: 'Class Reports', icon: FileSpreadsheet }
  ],
  teaching_assistant: [
    { to: '/ta/dashboard', label: 'TA Dashboard', icon: LayoutDashboard },
    { to: '/ta/classes', label: 'Assigned Classes & Roster', icon: Users },
    { to: '/ta/submissions', label: 'Submission Review & Flags', icon: ClipboardCheck },
    { to: '/ta/resources', label: 'Learning Resources', icon: BookOpen },
    { to: '/ta/discussions', label: 'Discussions & Escalations', icon: MessageSquare },
    { to: '/messages', label: 'Messages', icon: Bell }
  ],
  student: [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'my-classes',
      label: 'My Classes',
      icon: Users,
      defaultOpen: true,
      children: [
        { to: '/student/classes/semester', label: 'Current Semester' },
        { to: '/student/classes/rosters', label: 'Class Rosters' },
        { to: '/student/classes/schedule', label: 'Schedule / Timetable' },
        { to: '/student/catalog', label: 'Course Catalog' }
      ]
    },
    { to: '/student/courses', label: 'Learning Materials', icon: BookOpen },
    { to: '/student/certificates', label: 'Completed Courses & Badges', icon: ShieldCheck },
    {
      id: 'gradebook',
      label: 'Gradebook',
      icon: Award,
      children: [
        { to: '/student/grades', label: 'My Grades & Standing' },
        { to: '/student/certificates', label: 'Earned Badges & Certificates' }
      ]
    },
    {
      id: 'assignments',
      label: 'Assignments',
      icon: FileText,
      children: [
        { to: '/student/assignments', label: 'All Assignments' },
        { to: '/student/assignments/create', label: 'Create Assignment' },
        { to: '/student/assignments/submissions', label: 'Submissions' },
        { to: '/student/assignments/rubrics', label: 'Rubrics' },
        { to: '/student/assignments/due-dates', label: 'Due Dates' }
      ]
    },
    { to: '/student/assessments', label: 'Quizzes & Exams', icon: ClipboardCheck },
    {
      id: 'reports-analytics',
      label: 'Reports & Analytics',
      icon: BarChart3,
      children: [
        { to: '/student/reports/performance', label: 'Student Performance' },
        { to: '/student/reports/statistics', label: 'Class Statistics' },
        { to: '/student/reports/distribution', label: 'Grade Distribution' },
        { to: '/student/reports/progress', label: 'Progress Tracking' },
        { to: '/student/reports/export', label: 'Export Grades' }
      ]
    },
    {
      id: 'students-group',
      label: 'Students',
      icon: UserCircle,
      children: [
        { to: '/student/students/profiles', label: 'Student Profiles' },
        { to: '/student/students/attendance', label: 'Attendance Records' },
        { to: '/student/students/progress', label: 'Individual Progress' },
        { to: '/student/students/communication-log', label: 'Communication Log' }
      ]
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: MessageSquare,
      children: [
        { to: '/messages', label: 'Messages' },
        { to: '/student/communication/guardian', label: 'Parent / Guardian Contact' },
        { to: '/student/announcements', label: 'Announcements' },
        { to: '/student/communication/feedback', label: 'Feedback Notes' },
        { to: '/student/discussions', label: 'Class Discussions' }
      ]
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      children: [
        { to: '/student/calendar/academic', label: 'Academic Calendar' },
        { to: '/student/calendar/deadlines', label: 'Deadlines' },
        { to: '/student/calendar/important-dates', label: 'Important Dates' }
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      children: [
        { to: '/student/settings/grading-scale', label: 'Grading Scale' },
        { to: '/student/settings/course-settings', label: 'Course Settings' },
        { to: '/student/settings/notifications', label: 'Notifications' },
        { to: '/profile', label: 'Profile Management' }
      ]
    },
    {
      id: 'help-support',
      label: 'Help & Support',
      icon: HelpCircle,
      children: [
        { to: '/student/help/user-guide', label: 'User Guide' },
        { to: '/student/help/faqs', label: 'FAQs' },
        { to: '/student/help/contact-support', label: 'Contact IT Support' }
      ]
    }
  ]
};

const ROLE_LABELS = {
  super_admin: 'Super Administrator',
  academic_admin: 'Academic Administrator',
  instructor: 'Instructor / Faculty',
  teaching_assistant: 'Teaching Assistant',
  student: 'Student / Learner'
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({ 'my-classes': true });

  const navItems = NAVIGATION_BY_ROLE[user?.primaryRole] || NAVIGATION_BY_ROLE.student;

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isGroupOpen = (item) => {
    if (openGroups[item.id] !== undefined) {
      return openGroups[item.id];
    }
    if (item.children?.some((c) => location.pathname === c.to || location.pathname.startsWith(`${c.to}/`))) {
      return true;
    }
    return Boolean(item.defaultOpen);
  };

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: lmsApi.listNotifications,
    enabled: Boolean(user)
  });

  const notifications = notifData?.data?.notifications || [];
  const unreadCount = notifData?.data?.unreadCount || 0;

  const markAllMutation = useMutation({
    mutationFn: () => lmsApi.markNotificationRead('all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pathSegments = location.pathname.split('/').filter(Boolean);

  const renderNavLinks = (isMobile = false) =>
    navItems.map((item) => {
      const Icon = item.icon;

      if (item.children) {
        const expanded = isGroupOpen(item);
        const hasActiveChild = item.children.some(
          (c) => location.pathname === c.to
        );

        return (
          <div key={item.id} className="space-y-1">
            <button
              type="button"
              onClick={() => toggleGroup(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                hasActiveChild
                  ? 'bg-slate-800 text-blue-400 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>

            {expanded && (
              <div className="pl-9 pr-2 space-y-0.5 py-0.5">
                {item.children.map((sub) => (
                  <NavLink
                    key={`${item.id}-${sub.to}-${sub.label}`}
                    to={sub.to}
                    end
                    onClick={() => {
                      if (isMobile) setMobileMenuOpen(false);
                    }}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30'
                          : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                      }`
                    }
                  >
                    {sub.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      }

      return (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => {
            if (isMobile) setMobileMenuOpen(false);
          }}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span>{item.label}</span>
        </NavLink>
      );
    });

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-slate-900 text-slate-100 border-r border-slate-800 z-30">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-inner">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block leading-none">
              Aetheria NetAcad
            </span>
            <span className="text-[11px] text-blue-400 font-medium">
              Institutional Learning Hub
            </span>
          </div>
        </div>

        {/* Role Indicator */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Active Role Scope
          </p>
          <p className="text-xs font-bold text-blue-400 mt-0.5">
            {ROLE_LABELS[user?.primaryRole] || 'Learner'}
          </p>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Main Sidebar Navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {renderNavLinks(false)}
        </nav>

        {/* Bottom Profile & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <UserCircle className="w-8 h-8 text-blue-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.fullName}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-red-600/20 border border-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-xs bg-slate-900 text-white flex flex-col h-full z-10">
            <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800">
              <span className="font-bold text-base">Aetheria NetAcad</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {renderNavLinks(true)}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="text-slate-900 font-semibold">Aetheria LMS</span>
              {pathSegments.map((seg, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="capitalize text-slate-700">{seg.replace(/-/g, ' ')}</span>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label="Notifications"
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Notifications ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllMutation.mutate()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-xs text-slate-500">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotifOpen(false);
                            if (n.destinationUrl) navigate(n.destinationUrl);
                          }}
                          className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                            !n.isRead ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                            {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />}
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/profile"
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              <UserCircle className="w-4 h-4 text-blue-600" />
              <span className="hidden md:inline">{user?.fullName}</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
