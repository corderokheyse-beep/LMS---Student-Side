import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Terminal,
  Lock,
  Mail,
  ShieldAlert,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  UserCheck,
  Award
} from 'lucide-react';
import { useAuth, ROLE_HOME_PATHS } from '../context/AuthContext';
import { lmsApi, extractErrorMessage } from '../services/api';
import {
  loginFormSchema,
  forgotPasswordFormSchema,
  resetPasswordFormSchema
} from '../schemas/validation';
import { PageHeader, useToast, StatusBadge } from '../components/ui/SharedComponents';

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'superadmin@academy.edu', pass: 'Admin@12345', badge: 'System & IAM' },
  { role: 'Academic Admin', email: 'acadadmin@academy.edu', pass: 'Acad@12345', badge: 'Registrar & Terms' },
  { role: 'Instructor', email: 'instructor@academy.edu', pass: 'Inst@12345', badge: 'Prof. Elena Vance' },
  { role: 'Teaching Assistant', email: 'ta@academy.edu', pass: 'Ta@12345', badge: 'Liam Reyes (BSIT 4-A)' },
  { role: 'Student', email: 'student@academy.edu', pass: 'Stud@12345', badge: 'Maya Lin (BSIT 4-A)' }
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const user = await login(values);
      addToast(`Welcome back, ${user.fullName}!`);
      const target = ROLE_HOME_PATHS[user.primaryRole] || '/student/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      setServerError(extractErrorMessage(err));
    }
  };

  const fillDemoCredentials = (acct) => {
    setValue('email', acct.email, { shouldValidate: true });
    setValue('password', acct.pass, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col lg:flex-row">
      {/* Left Institutional Branding Hero */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border-b lg:border-b-0 lg:border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block">
              Aetheria Institute & Networking Academy
            </span>
            <span className="text-xs text-blue-300">
              Next-Generation Role-Based Learning Management System
            </span>
          </div>
        </div>

        <div className="my-10 max-w-xl">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-4">
            Cisco NetAcad-Inspired Educational Workflows
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Enterprise Learning, Technical Laboratories & Automated Assessment.
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-4 leading-relaxed">
            Unified academic administration, modular curriculum authoring, RESTCONF & cybersecurity lab workflows, server-timed examinations, and auditable weighted gradebooks.
          </p>

          {/* Quick-fill seeded accounts for local development evaluation */}
          <div className="mt-8 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2.5 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              Seeded Local Development Accounts (Click to Autofill)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.email}
                  type="button"
                  onClick={() => fillDemoCredentials(acct)}
                  className="text-left p-2.5 rounded-lg bg-slate-900/90 hover:bg-blue-950/80 border border-slate-800 hover:border-blue-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{acct.role}</span>
                    <span className="text-[10px] text-blue-300 bg-blue-900/50 px-1.5 py-0.5 rounded">
                      {acct.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{acct.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <Link to="/landing" className="text-slate-300 hover:text-white">Home</Link>
            <Link to="/about" className="text-slate-300 hover:text-white">About</Link>
            <Link to="/catalog" className="text-slate-300 hover:text-white">Public Catalog</Link>
            <Link to="/privacy" className="text-slate-300 hover:text-white">Privacy</Link>
            <Link to="/terms" className="text-slate-300 hover:text-white">Terms</Link>
          </div>
          <Link to="/verify-certificate" className="text-blue-400 hover:underline font-medium">
            Verify a Completion Certificate →
          </Link>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Sign In to Portal</h2>
            <p className="text-sm text-slate-600 mt-1">
              Enter your institutional credentials to access your role-specific workspace.
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-800"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Institutional Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@academy.edu"
                  {...register('email')}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-hidden"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-hidden"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [resetToken, setResetToken] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(forgotPasswordFormSchema)
  });

  const onSubmit = async (values) => {
    try {
      const res = await lmsApi.forgotPassword(values);
      setSubmitted(true);
      if (res.data?.resetToken) {
        setResetToken(res.data.resetToken);
      }
      addToast('Password reset request processed.');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Account Password Recovery</h1>
        <p className="text-sm text-slate-600 mt-1">
          Enter your institutional email address to generate a time-limited reset token.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email
              </label>
              <input
                id="reset-email"
                type="email"
                {...register('email')}
                placeholder="student@academy.edu"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300"
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
            >
              {isSubmitting ? 'Generating...' : 'Send Recovery Instructions'}
            </button>
          </form>
        ) : (
          <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
            <p className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Recovery instructions generated!
            </p>
            {resetToken && (
              <div className="p-2.5 bg-white rounded border border-emerald-200 font-mono break-all">
                <span className="block text-[10px] uppercase text-slate-500 font-sans font-bold">
                  Local Dev Reset Token:
                </span>
                {resetToken}
              </div>
            )}
            <Link
              to={`/reset-password${resetToken ? `?token=${resetToken}` : ''}`}
              className="inline-block mt-2 font-bold text-blue-700 hover:underline"
            >
              Proceed to Reset Password Page →
            </Link>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link to="/login" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const initialToken = params.get('token') || '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { token: initialToken, newPassword: '' }
  });

  const onSubmit = async (values) => {
    try {
      await lmsApi.resetPassword(values);
      addToast('Password reset complete! Please sign in.');
      navigate('/login');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
        <h1 className="text-xl font-bold text-slate-900">Set New Password</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div>
            <label htmlFor="token" className="block text-xs font-semibold text-slate-700 mb-1">
              Reset Token
            </label>
            <input
              id="token"
              type="text"
              {...register('token')}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 font-mono"
            />
            {errors.token && <p className="text-xs text-red-600 mt-1">{errors.token.message}</p>}
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-xs font-semibold text-slate-700 mb-1">
              New Strong Password
            </label>
            <input
              id="newPassword"
              type="password"
              {...register('newPassword')}
              placeholder="At least 8 chars, 1 uppercase, 1 number"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300"
            />
            {errors.newPassword && (
              <p className="text-xs text-red-600 mt-1">{errors.newPassword.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
          >
            {isSubmitting ? 'Updating...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function CertificateVerifyPublicPage() {
  const [code, setCode] = useState('AIT-CERT-2026-8841');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    try {
      const res = await lmsApi.verifyCertificate(code);
      setResult(res.data.certificate);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Credential Verification Portal</h1>
            <p className="text-xs text-slate-500">Verify authentic Aetheria Academy completion certificates</p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="flex gap-2 mt-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter Certificate Code (e.g., AIT-CERT-2026-8841)"
            className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-300 font-mono"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
          >
            Verify
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-5 p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 text-sm">Verified Authentic Credential</span>
              <StatusBadge status={result.status} />
            </div>
            <p><strong>Recipient:</strong> {result.recipientName}</p>
            <p><strong>Course:</strong> {result.courseCode} — {result.courseTitle}</p>
            <p><strong>Final Score:</strong> {result.finalScore}%</p>
            <p><strong>Certificate ID:</strong> <code className="font-mono">{result.certificateCode}</code></p>
            <p className="text-[11px] text-slate-500 break-all">
              <strong>SHA-256 Hash:</strong> {result.verificationHash}
            </p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link to="/login" className="text-xs font-semibold text-blue-600 hover:underline">
            ← Return to Portal Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ProfileSettingsPage() {
  const { user, refreshAuth } = useAuth();
  const { addToast } = useToast();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [prefs, setPrefs] = useState(user?.notificationPreferences || {
    inApp: true,
    email: false,
    assignments: true,
    assessments: true,
    grades: true,
    announcements: true
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.updateProfile({
        firstName,
        lastName,
        bio,
        phone,
        notificationPreferences: prefs
      });
      await refreshAuth();
      addToast('Profile and notification preferences saved.');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      addToast('Password changed successfully.');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Account & Security"
        title="Profile & Notification Preferences"
        subtitle="Manage your personal academic profile, security credentials, and alert channels."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Notification Channels
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.keys(prefs).map((key) => (
                <label key={key} className="flex items-center gap-2 text-slate-700 capitalize">
                  <input
                    type="checkbox"
                    checked={Boolean(prefs[key])}
                    onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
          >
            Save Profile Changes
          </button>
        </form>

        <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Change Account Password</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password (min 8 chars, uppercase & number)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}

export function UnauthorizedPage() {
  const { homePath } = useAuth();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">403 — Unauthorized Access</h1>
      <p className="text-sm text-slate-600 max-w-md mt-2">
        Your current role does not have permission to access this resource. All authorization checks are enforced on the server.
      </p>
      <Link
        to={homePath}
        className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
      >
        Return to Role Dashboard
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  const { homePath } = useAuth();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-3xl font-extrabold text-slate-900">404 — Page Not Found</h1>
      <p className="text-sm text-slate-600 mt-2">
        The academic resource or page you requested could not be found.
      </p>
      <Link
        to={homePath}
        className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

function PublicNavbar() {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <Link to="/landing" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm block">Aetheria Institute & Networking Academy</span>
            <span className="text-[11px] text-blue-300">Role-Based Learning Management System</span>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <Link to="/landing" className="text-slate-300 hover:text-white">Home</Link>
          <Link to="/about" className="text-slate-300 hover:text-white">About LMS</Link>
          <Link to="/catalog" className="text-slate-300 hover:text-white">Course Catalog</Link>
          <Link to="/verify-certificate" className="text-slate-300 hover:text-white">Verify Certificate</Link>
          <Link to="/privacy" className="text-slate-300 hover:text-white">Privacy Notice</Link>
          <Link to="/terms" className="text-slate-300 hover:text-white">Terms of Use</Link>
          <Link to="/login" className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 space-y-12">
        <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-8 sm:p-12 text-white shadow-xl">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-4">
            Enterprise Higher Education & Technical Training Platform
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-3xl">
            Structured Curriculum Delivery, Technical Laboratories, Timed Examinations & Auditable Grading.
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-4 max-w-2xl leading-relaxed">
            Inspired by Cisco Networking Academy workflows, Aetheria Academy LMS unifies institutional governance, modular course authoring, guided networking & cybersecurity labs, and verifiable completion certificates across five distinct academic roles.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow"
            >
              Launch Portal Sign-In
            </Link>
            <Link
              to="/catalog"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700"
            >
              Browse Public Course Catalog
            </Link>
            <Link
              to="/verify-certificate"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-bold rounded-lg border border-slate-700"
            >
              Verify Completion Certificate
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900">Five Distinct Academic Roles</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Dedicated workspaces and server-enforced permissions for Super Administrators, Academic Administrators, Instructors, Teaching Assistants, and Students.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900">Guided Technical Laboratories</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Supports OSPF/RESTCONF network configuration labs, cybersecurity incident response scenarios, rubric-based grading, and versioned code/file submissions.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900">Auditable Gradebook & Certificates</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Weighted category gradebooks, TA preliminary review escalation, registrar grade approval locks, and cryptographically verifiable completion certificates.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-6">
        <PageHeader
          badge="Institutional Overview"
          title="About Aetheria Institute & Networking Academy LMS"
          subtitle="Architecture, role separation, and educational workflow principles."
        />
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Aetheria Institute & Networking Academy LMS is a full-stack Role-Based Learning Management System designed for higher education institutions, universities, and technical academies.
          </p>
          <h3 className="text-base font-bold text-slate-900 pt-2">Role Separation & Academic Governance</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li><strong>Super Administrator:</strong> Manages platform users, role-permission matrices, security policies, system health, and tamper-evident audit trails.</li>
            <li><strong>Academic Administrator:</strong> Manages departments, degree programs, academic years, semesters, course offerings, class sections, CSV bulk enrollments, and final grade approvals.</li>
            <li><strong>Instructor / Teacher:</strong> Authors modules, lessons, guided laboratories, assignments, rubrics, question banks, and examinations, and manages official class gradebooks.</li>
            <li><strong>Teaching Assistant:</strong> Supports assigned class sections by monitoring student progress, answering discussion questions, applying preliminary rubric scores, and flagging submissions for instructor review.</li>
            <li><strong>Student / Learner:</strong> Enrolls in courses, completes interactive lessons, submits lab deliverables, takes server-timed assessments, tracks weighted grade standings, and earns verifiable completion certificates.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export function PublicCatalogPage() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    lmsApi
      .getPublicCatalog()
      .then((res) => setCourses(res.data?.courses || []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.code?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-6">
        <PageHeader
          badge="Public Directory"
          title="Published Course Catalog"
          subtitle="Browse accredited networking, cybersecurity, and software engineering courses."
          actions={
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, title, or category..."
              className="px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white w-64"
            />
          }
        />
        {loading ? (
          <p className="text-sm text-slate-500">Loading published courses...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((course) => (
              <div key={course.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {course.code}
                    </span>
                    <StatusBadge status={course.level || 'Intermediate'} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{course.title}</h3>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-3">{course.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{course.creditUnits} Credit Units • {course.deliveryMode}</span>
                  <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                    Sign in to Enroll →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-6">
        <PageHeader
          badge="Data Governance"
          title="Institutional Privacy Notice"
          subtitle="How student academic records, submissions, and authentication data are protected."
        />
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            <strong>1. Academic Record Isolation:</strong> Student grades, assignment submissions, assessment attempts, and personal profile data are strictly isolated on the server. Students can only access their own records.
          </p>
          <p>
            <strong>2. Credential & Session Security:</strong> Passwords are hashed using Argon2id and are never stored or transmitted in plaintext. Sessions and JWT tokens are transmitted via HTTP-only cookies.
          </p>
          <p>
            <strong>3. Audit Trail Accountability:</strong> Sensitive administrative actions, role changes, and grade modifications are recorded in tamper-evident audit logs accessible only to authorized Super Administrators.
          </p>
        </div>
      </main>
    </div>
  );
}

export function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-6">
        <PageHeader
          badge="Academic Policy"
          title="Terms of Use & Academic Integrity Code"
          subtitle="Institutional rules governing platform usage, assessments, and laboratory submissions."
        />
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            <strong>1. Authorized Account Usage:</strong> Users must authenticate using only their assigned institutional credentials and must never share accounts or attempt to access unauthorized role routes.
          </p>
          <p>
            <strong>2. Assessment Integrity:</strong> Quizzes and examinations enforce server-side timers and attempt limits. All submitted laboratory configurations, code snippets, and written responses must be the learner's original work.
          </p>
          <p>
            <strong>3. Acceptable File Uploads:</strong> Only permitted educational document, archive, and source-code formats within the configured size limit may be uploaded. Executable binaries and scripts are strictly prohibited.
          </p>
        </div>
      </main>
    </div>
  );
}

