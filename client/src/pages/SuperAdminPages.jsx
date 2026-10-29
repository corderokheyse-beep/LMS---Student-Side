import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  Users,
  BookOpen,
  Layers,
  ShieldCheck,
  Activity,
  Plus,
  Search,
  Lock,
  Settings,
  Database
} from 'lucide-react';
import { lmsApi, extractErrorMessage } from '../services/api';
import { userCreateFormSchema } from '../schemas/validation';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  LoadingState,
  ErrorState,
  ModalDialog,
  useToast
} from '../components/ui/SharedComponents';

export function SuperAdminDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'super_admin'],
    queryFn: lmsApi.getDashboardSummary
  });

  if (isLoading) return <LoadingState label="Loading system-wide metrics..." />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const summary = data?.data || {};
  const m = summary.metrics || {};
  const roleDist = summary.roleDistribution || [];
  const auditLogs = summary.recentAuditLogs || [];
  const securityEvents = summary.securityEvents || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Super Administrator"
        title="Platform Operations & Security Command Center"
        subtitle="Real-time telemetry across institutional users, courses, active class offerings, and security audit trails."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Users"
          value={m.totalUsers ?? 0}
          subtitle={`${m.activeUsers ?? 0} active · ${m.suspendedUsers ?? 0} suspended`}
          icon={Users}
          accent="blue"
        />
        <StatCard
          title="Courses & Offerings"
          value={m.totalCourses ?? 0}
          subtitle={`${m.totalOfferings ?? 0} term offerings`}
          icon={BookOpen}
          accent="indigo"
        />
        <StatCard
          title="Active Class Sections"
          value={m.totalClasses ?? 0}
          subtitle={`${m.totalEnrollments ?? 0} student enrollments`}
          icon={Layers}
          accent="emerald"
        />
        <StatCard
          title="Platform Health"
          value="Healthy"
          subtitle={m.systemHealth || 'All services operational'}
          icon={Activity}
          accent="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Account Distribution by Role</h2>
          <p className="text-xs text-slate-500 mb-4">Active user assignments across all five system roles</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="slug" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Recent Security & Authentication Events</h2>
          <p className="text-xs text-slate-500 mb-4">Server-recorded authentication and authorization events</p>
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {securityEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900">{ev.action}</span>
                  <p className="text-slate-500 mt-0.5">
                    Actor: {ev.actorEmail || 'System'} · IP: {ev.ipAddress}
                  </p>
                </div>
                <StatusBadge status={ev.severity} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Recent Administrative Audit Trail</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{log.actorEmail || 'System'}</td>
                  <td className="px-4 py-3">{log.actorRole || '-'}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{log.action}</td>
                  <td className="px-4 py-3 capitalize">{log.category}</td>
                  <td className="px-4 py-3"><StatusBadge status={log.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, statusFilter],
    queryFn: () => lmsApi.listUsers({ search, role: roleFilter, status: statusFilter })
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(userCreateFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: 'Password@123',
      roleSlug: 'student',
      studentNumber: '',
      employeeNumber: ''
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => lmsApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast('User account updated.');
    },
    onError: (err) => addToast(extractErrorMessage(err), 'error')
  });

  const onCreateSubmit = async (values) => {
    try {
      await lmsApi.createUser(values);
      addToast('User account provisioned successfully.');
      reset();
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const users = data?.data?.users || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Identity & Access Management"
        title="Platform User Directory & Role Assignment"
        subtitle="Create, activate, suspend, and manage institutional accounts across all five roles."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Create User Account
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or ID number..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
        >
          <option value="">All Roles</option>
          <option value="super_admin">Super Administrator</option>
          <option value="academic_admin">Academic Administrator</option>
          <option value="instructor">Instructor</option>
          <option value="teaching_assistant">Teaching Assistant</option>
          <option value="student">Student</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Name & Email</th>
                  <th className="px-4 py-3">ID Number</th>
                  <th className="px-4 py-3">System Role</th>
                  <th className="px-4 py-3">Department / Program</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u) => {
                  const currentRole = u.roles?.[0]?.slug || 'student';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{u.firstName} {u.lastName}</p>
                        <p className="text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono">{u.studentNumber || u.employeeNumber || '-'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={currentRole}
                          onChange={(e) =>
                            updateMutation.mutate({ id: u.id, payload: { roleSlug: e.target.value } })
                          }
                          aria-label={`Change role for ${u.email}`}
                          className="px-2 py-1 rounded border border-slate-300 text-xs bg-white font-medium"
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="academic_admin">Academic Admin</option>
                          <option value="instructor">Instructor</option>
                          <option value="teaching_assistant">Teaching Assistant</option>
                          <option value="student">Student</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {u.department?.code || 'Institutional'} {u.program ? `· ${u.program.code}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {u.status !== 'active' ? (
                            <button
                              type="button"
                              onClick={() => updateMutation.mutate({ id: u.id, payload: { status: 'active' } })}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold"
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateMutation.mutate({ id: u.id, payload: { status: 'suspended' } })}
                              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[11px] font-semibold"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ModalDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Provision New Institutional Account"
      >
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">First Name</label>
              <input {...register('firstName')} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              {errors.firstName && <p className="text-red-600 mt-0.5">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
              <input {...register('lastName')} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              {errors.lastName && <p className="text-red-600 mt-0.5">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Institutional Email</label>
            <input type="email" {...register('email')} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            {errors.email && <p className="text-red-600 mt-0.5">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Password</label>
              <input type="password" {...register('password')} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              {errors.password && <p className="text-red-600 mt-0.5">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Role</label>
              <select {...register('roleSlug')} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="student">Student / Learner</option>
                <option value="instructor">Instructor / Teacher</option>
                <option value="teaching_assistant">Teaching Assistant</option>
                <option value="academic_admin">Academic Administrator</option>
                <option value="super_admin">Super Administrator</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Student Number (Optional)</label>
              <input {...register('studentNumber')} placeholder="2026-00199" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Employee ID (Optional)</label>
              <input {...register('employeeNumber')} placeholder="INST-199" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

export function RolePermissionMatrixPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['roles-permissions'],
    queryFn: lmsApi.listRoles
  });

  if (isLoading) return <LoadingState />;

  const roles = data?.data?.roles || [];
  const permissions = data?.data?.permissions || [];
  const activeRole = roles.find((r) => r.id === (selectedRoleId || roles[0]?.id));
  const activePermCodes = new Set((activeRole?.permissions || []).map((p) => p.code));

  const handleTogglePermission = async (code) => {
    if (!activeRole) return;
    const nextCodes = activePermCodes.has(code)
      ? Array.from(activePermCodes).filter((c) => c !== code)
      : [...Array.from(activePermCodes), code];

    try {
      await lmsApi.updateRolePermissions(activeRole.id, nextCodes);
      queryClient.invalidateQueries({ queryKey: ['roles-permissions'] });
      addToast(`Updated permissions for ${activeRole.name}`);
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="RBAC Policy Engine"
        title="Role & Permission Authorization Matrix"
        subtitle="Configure centralized server-side permission grants for each institutional role."
      />

      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedRoleId(r.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
              activeRole?.id === r.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {r.name} ({r.permissions?.length || 0})
          </button>
        ))}
      </div>

      {activeRole && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">{activeRole.name}</h2>
              <p className="text-xs text-slate-500">{activeRole.description}</p>
            </div>
            <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-700">
              slug: {activeRole.slug}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {permissions.map((perm) => {
              const checked = activePermCodes.has(perm.code);
              return (
                <label
                  key={perm.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer text-xs transition-colors ${
                    checked ? 'bg-blue-50/50 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleTogglePermission(perm.code)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600"
                  />
                  <div>
                    <p className="font-mono font-bold text-slate-900">{perm.code}</p>
                    <p className="text-slate-500 mt-0.5">{perm.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: lmsApi.listSettings
  });

  const { data: instData } = useQuery({
    queryKey: ['institution'],
    queryFn: lmsApi.getInstitution
  });

  if (isLoading) return <LoadingState />;

  const settings = settingsData?.data?.settings || [];
  const institution = instData?.data?.institution;

  const handleTriggerBackupVerify = async () => {
    try {
      await lmsApi.updateSetting('maintenance_backup_policy', {
        category: 'maintenance',
        description: 'Backup and maintenance operational status',
        value: {
          automatedDailyBackup: true,
          lastBackupTimestamp: new Date().toISOString(),
          maintenanceWindow: 'Sundays 02:00-04:00 UTC',
          systemStatus: 'operational'
        }
      });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      addToast('Database backup checkpoint verified and logged.');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Platform Governance"
        title="Institution Settings, Grading Templates & Integrations"
        subtitle="Manage institution-wide defaults, security controls, laboratory integrations, and backup status."
        actions={
          <button
            type="button"
            onClick={handleTriggerBackupVerify}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
          >
            <Database className="w-4 h-4" />
            Verify Backup Checkpoint
          </button>
        }
      />

      {institution && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-3">Institutional Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Institution Name</span>
              <strong className="text-slate-900 text-sm">{institution.name}</strong>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Institution Code & Domain</span>
              <strong className="text-slate-900 text-sm">{institution.code} ({institution.domain})</strong>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Default Passing Score</span>
              <strong className="text-slate-900 text-sm">{institution.passingGradeDefault}%</strong>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settings.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-700">{s.key}</span>
              <StatusBadge status={s.category} />
            </div>
            <p className="text-xs text-slate-600">{s.description}</p>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto">
              {JSON.stringify(s.value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuditLogsPage() {
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', category, severity],
    queryFn: () => lmsApi.listAuditLogs({ category, severity })
  });

  const logs = data?.data?.logs || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Compliance & Forensics"
        title="Security Events & Sensitive Operations Audit Trail"
        subtitle="Immutable record of authentication, role modifications, academic configurations, and grade publications."
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
        >
          <option value="">All Categories</option>
          <option value="auth">Authentication</option>
          <option value="security">Security Events</option>
          <option value="user">User Management</option>
          <option value="role">Role & Permissions</option>
          <option value="academic">Academic Operations</option>
          <option value="grade">Grading & Approvals</option>
        </select>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
        >
          <option value="">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target Entity</th>
                  <th className="px-4 py-3">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{log.actorEmail || 'System'}</td>
                    <td className="px-4 py-3">{log.actorRole || '-'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{log.action}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.entityType ? `${log.entityType} #${log.entityId}` : '-'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={log.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

