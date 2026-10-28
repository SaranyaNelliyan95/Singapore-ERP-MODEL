import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

const MASTER_CHILDREN: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/hr-dashboard').then((m) => m.HrDashboardPage),
  },
  {
    path: 'directory',
    loadComponent: () =>
      import('./pages/directory/hr-directory').then((m) => m.HrDirectoryPage),
  },
  {
    path: 'directory/:id',
    loadComponent: () =>
      import('./pages/employee-detail/hr-employee-detail').then((m) => m.HrEmployeeDetailPage),
  },
  {
    path: 'projects',
    loadComponent: () =>
      import('./pages/projects/hr-projects').then((m) => m.HrProjectsPage),
  },
  {
    path: 'compliance',
    loadComponent: () =>
      import('./pages/compliance/hr-compliance').then((m) => m.HrCompliancePage),
  },
  {
    path: 'leave',
    loadComponent: () => import('./pages/leave/hr-leave').then((m) => m.HrLeavePage),
  },
  {
    path: 'attendance',
    loadComponent: () =>
      import('./pages/attendance/hr-attendance').then((m) => m.HrAttendancePage),
  },
  {
    path: 'payroll',
    loadComponent: () =>
      import('./pages/payroll/hr-payroll').then((m) => m.HrPayrollPage),
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./pages/documents/hr-documents').then((m) => m.HrDocumentsPage),
  },
  {
    path: 'claims',
    loadComponent: () => import('./pages/claims/hr-claims').then((m) => m.HrClaimsPage),
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./pages/onboarding/hr-onboarding').then((m) => m.HrOnboardingPage),
  },
  {
    path: 'assets',
    loadComponent: () => import('./pages/assets/hr-assets').then((m) => m.HrAssetsPage),
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports/hr-reports').then((m) => m.HrReportsPage),
  },
];

const SIMPLE_PATHS = MASTER_CHILDREN.filter((r) => !String(r.path).includes(':'));

export const HR_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['hr', 'admin'])],
    loadComponent: () => import('./hr-shell').then((m) => m.HrShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'master' },
      { path: 'master', pathMatch: 'full', redirectTo: 'master/dashboard' },
      ...MASTER_CHILDREN.map((route) => ({
        ...route,
        path: `master/${route.path}`,
      })),
      ...SIMPLE_PATHS.map((route) => ({
        path: route.path as string,
        redirectTo: `master/${route.path}`,
        pathMatch: 'full' as const,
      })),
    ],
  },
];
