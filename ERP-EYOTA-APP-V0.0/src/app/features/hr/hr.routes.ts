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
];

export const HR_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['hr'])],
    loadComponent: () => import('./hr-shell').then((m) => m.HrShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'master' },
      { path: 'master', pathMatch: 'full', redirectTo: 'master/dashboard' },
      ...MASTER_CHILDREN.map((route) => ({
        ...route,
        path: `master/${route.path}`,
      })),
      ...MASTER_CHILDREN.map((route) => ({
        path: route.path as string,
        redirectTo: `master/${route.path}`,
        pathMatch: 'full' as const,
      })),
    ],
  },
];
