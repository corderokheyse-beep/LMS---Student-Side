import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
  Loader2,
  Inbox
} from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
              t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : t.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {t.type === 'error' ? (
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : t.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss notification"
              className="opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx || { addToast: () => {} };
}

export function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    enrolled: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    graded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    submitted: 'bg-blue-50 text-blue-700 border-blue-200',
    submitted_for_approval: 'bg-amber-50 text-amber-700 border-amber-200',
    under_review: 'bg-amber-50 text-amber-700 border-amber-200',
    in_progress: 'bg-sky-50 text-sky-700 border-sky-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    draft: 'bg-slate-100 text-slate-700 border-slate-300',
    late: 'bg-orange-50 text-orange-700 border-orange-200',
    returned_for_revision: 'bg-purple-50 text-purple-700 border-purple-200',
    suspended: 'bg-red-50 text-red-700 border-red-200',
    missing: 'bg-red-50 text-red-700 border-red-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200'
  };

  const badgeClass = styles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = String(status || 'unknown').replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${badgeClass}`}>
      {label}
    </span>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, accent = 'blue' }) {
  const accentMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1.5">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${accentMap[accent] || accentMap.blue}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ badge, title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 mb-6">
      <div>
        {badge && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md mb-2">
            {badge}
          </span>
        )}
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading academic data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({ title = 'No records found', description = 'Get started by creating a new item.', action }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        <Inbox className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Failed to load data.', onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
      <h3 className="text-base font-semibold text-red-900">Unable to Retrieve Data</h3>
      <p className="text-sm text-red-700 mt-1">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
        >
          Retry Request
        </button>
      )}
    </div>
  );
}

export function ModalDialog({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className={`bg-white rounded-xl border border-slate-200 shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 id="modal-title" className="text-base font-bold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

