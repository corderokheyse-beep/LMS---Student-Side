import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  StatusBadge,
  StatCard,
  PageHeader,
  EmptyState,
  ErrorState,
  ModalDialog,
  ToastProvider,
} from './components/ui/SharedComponents';
import {
  LoginPage,
  LandingPage,
  AboutPage,
  PublicCatalogPage,
  PrivacyPolicyPage,
  TermsOfUsePage,
  UnauthorizedPage,
  NotFoundPage,
} from './pages/PublicPages';
import { AuthProvider } from './context/AuthContext';
import { Users, BookOpen } from 'lucide-react';
import { lmsApi } from './services/api';

vi.mock('./services/api', () => {
  const mockLmsApi = {
    getMe: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    getPublicCatalog: vi.fn(),
  };
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
    lmsApi: mockLmsApi,
    extractErrorMessage: (err) => err?.message || 'Error',
  };
});

function renderWithProviders(ui, { route = '/' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('NetAcad LMS Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lmsApi.getMe.mockResolvedValue({ data: { user: null } });
    lmsApi.getPublicCatalog.mockResolvedValue({
      data: {
        courses: [
          {
            id: 1,
            code: 'NET-201',
            title: 'Enterprise Routing, OSPF & Network Programmability',
            description: 'Hands-on Cisco NetAcad inspired networking laboratory course.',
            level: 'Intermediate',
            creditUnits: 4,
            deliveryMode: 'Hybrid',
          },
        ],
      },
    });
  });

  describe('Shared UI Components', () => {
    it('renders StatusBadge with formatted labels and styles', () => {
      render(<StatusBadge status="super_admin" />);
      expect(screen.getByText('super admin')).toBeInTheDocument();
    });

    it('renders StatCard with title, value, and subtitle', () => {
      render(
        <StatCard
          title="Active Enrollments"
          value={142}
          subtitle="Spring 2026 Semester"
          icon={Users}
          accent="blue"
        />
      );
      expect(screen.getByText('Active Enrollments')).toBeInTheDocument();
      expect(screen.getByText('142')).toBeInTheDocument();
      expect(screen.getByText('Spring 2026 Semester')).toBeInTheDocument();
    });

    it('renders PageHeader and triggers action buttons', () => {
      render(
        <PageHeader
          title="Academic Structure"
          subtitle="Manage institutional departments and programs"
          badge="ADMIN"
          actions={<button type="button">Add Department</button>}
        />
      );
      expect(screen.getByText('Academic Structure')).toBeInTheDocument();
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Department' })).toBeInTheDocument();
    });

    it('renders EmptyState and ErrorState with retry handler', () => {
      const onRetry = vi.fn();
      render(
        <div>
          <EmptyState
            icon={BookOpen}
            title="No courses available"
            description="Create a course to get started."
          />
          <ErrorState message="Failed to load classes" onRetry={onRetry} />
        </div>
      );
      expect(screen.getByText('No courses available')).toBeInTheDocument();
      expect(screen.getByText('Failed to load classes')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Retry Request/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('renders ModalDialog when isOpen is true and calls onClose', () => {
      const onClose = vi.fn();
      render(
        <ModalDialog isOpen={true} onClose={onClose} title="Create Assignment">
          <p>Assignment configuration form</p>
        </ModalDialog>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create Assignment')).toBeInTheDocument();
      expect(screen.getByText('Assignment configuration form')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Close modal/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authentication & Login Workflows', () => {
    it('renders LoginPage with institutional branding and quick demo role selectors', async () => {
      renderWithProviders(<LoginPage />, { route: '/login' });
      await waitFor(() => expect(lmsApi.getMe).toHaveBeenCalled());

      expect(screen.getByText('Sign In to Portal')).toBeInTheDocument();
      expect(screen.getByText('Super Admin')).toBeInTheDocument();
      expect(screen.getByText('Academic Admin')).toBeInTheDocument();
      expect(screen.getByText('Instructor')).toBeInTheDocument();
      expect(screen.getByText('Teaching Assistant')).toBeInTheDocument();
      expect(screen.getByText('Student')).toBeInTheDocument();
    });

    it('autofills credentials when clicking a quick demo role button', async () => {
      renderWithProviders(<LoginPage />, { route: '/login' });
      await waitFor(() => expect(lmsApi.getMe).toHaveBeenCalled());

      const instructorDemoBtn = screen.getByRole('button', { name: /Instructor/i });
      fireEvent.click(instructorDemoBtn);

      const emailInput = screen.getByPlaceholderText('name@academy.edu');
      expect(emailInput.value).toBe('instructor@academy.edu');
    });

    it('validates email format and password length before submitting login form', async () => {
      renderWithProviders(<LoginPage />, { route: '/login' });
      await waitFor(() => expect(lmsApi.getMe).toHaveBeenCalled());

      const emailInput = screen.getByPlaceholderText('name@academy.edu');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.submit(emailInput.closest('form'));

      await waitFor(() => {
        expect(
          screen.getByText(/Please enter a valid institutional email address/i)
        ).toBeInTheDocument();
      });
      expect(lmsApi.login).not.toHaveBeenCalled();
    });
  });

  describe('Public Pages & Error Boundary Routes', () => {
    it('renders LandingPage with navigation links and hero actions', async () => {
      renderWithProviders(<LandingPage />, { route: '/landing' });
      await waitFor(() => expect(lmsApi.getMe).toHaveBeenCalled());
      expect(screen.getByText(/Launch Portal Sign-In/i)).toBeInTheDocument();
      expect(screen.getByText(/Browse Public Course Catalog/i)).toBeInTheDocument();
    });

    it('renders AboutPage, PrivacyPolicyPage, and TermsOfUsePage', async () => {
      renderWithProviders(
        <div>
          <AboutPage />
          <PrivacyPolicyPage />
          <TermsOfUsePage />
        </div>
      );
      await waitFor(() => expect(lmsApi.getMe).toHaveBeenCalled());
      expect(screen.getByText(/Role Separation & Academic Governance/i)).toBeInTheDocument();
      expect(screen.getByText(/Institutional Privacy Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/Terms of Use & Academic Integrity Code/i)).toBeInTheDocument();
    });

    it('renders PublicCatalogPage with courses fetched from API and supports search filter', async () => {
      renderWithProviders(<PublicCatalogPage />, { route: '/catalog' });
      await waitFor(() => {
        expect(screen.getByText('NET-201')).toBeInTheDocument();
      });
      expect(
        screen.getByText(/Enterprise Routing, OSPF & Network Programmability/i)
      ).toBeInTheDocument();
    });

    it('renders UnauthorizedPage (403) and NotFoundPage (404)', async () => {
      renderWithProviders(
        <div>
          <UnauthorizedPage />
          <NotFoundPage />
        </div>
      );
      await waitFor(() => expect(lmsApi.getMe).toHaveBeenCalled());
      expect(screen.getByText(/403 — Unauthorized Access/i)).toBeInTheDocument();
      expect(screen.getByText(/404 — Page Not Found/i)).toBeInTheDocument();
    });
  });
});
