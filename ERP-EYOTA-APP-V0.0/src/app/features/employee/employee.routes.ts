import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

const MASTER_CHILDREN: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/employee-dashboard').then((m) => m.EmployeeDashboardPage),
    data: { title: 'Dashboard Overview' },
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/employee-profile').then((m) => m.EmployeeProfilePage),
    data: { title: 'My Profile' },
  },
  {
    path: 'attendance',
    loadComponent: () =>
      import('./pages/attendance/employee-attendance').then((m) => m.EmployeeAttendancePage),
    data: { title: 'Attendance & Clocking' },
  },
  {
    path: 'leave',
    loadComponent: () =>
      import('./pages/leave/employee-leave').then((m) => m.EmployeeLeavePage),
    data: { title: 'Leave Management' },
  },
  {
    path: 'payslips',
    loadComponent: () =>
      import('./pages/payslips/employee-payslips').then((m) => m.EmployeePayslipsPage),
    data: { title: 'Payslips & Tax' },
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./pages/documents/employee-documents').then((m) => m.EmployeeDocumentsPage),
    data: { title: 'My Documents' },
  },
  {
    path: 'claims',
    loadComponent: () =>
      import('./pages/claims/employee-claims').then((m) => m.EmployeeClaimsPage),
    data: { title: 'Claims Log' },
  },
  {
    path: 'more',
    loadComponent: () =>
      import('./pages/more/employee-more').then((m) => m.EmployeeMorePage),
    data: { title: 'More' },
  },
];

export const EMPLOYEE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['employee'])],
    loadComponent: () =>
      import('./employee-shell').then((m) => m.EmployeeShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'master' },
      { path: 'master', pathMatch: 'full', redirectTo: 'master/dashboard' },
      ...MASTER_CHILDREN.map((route) => ({
        ...route,
        path: `master/${route.path}`,
      })),
      // Friendly deep-links under /employee/*
      ...MASTER_CHILDREN.map((route) => ({
        path: route.path as string,
        redirectTo: `master/${route.path}`,
        pathMatch: 'full' as const,
      })),
    ],
  },
];
