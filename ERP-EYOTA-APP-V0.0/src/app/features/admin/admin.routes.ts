import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

const MASTER_CHILDREN: Routes = [
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/admin-dashboard').then((m) => m.AdminDashboardPage) },
  { path: 'company', loadComponent: () => import('./pages/company/admin-company').then((m) => m.AdminCompanyPage) },
  { path: 'users', loadComponent: () => import('./pages/users/admin-users').then((m) => m.AdminUsersPage) },
  { path: 'master-data', loadComponent: () => import('./pages/master-data/admin-master-data').then((m) => m.AdminMasterDataPage) },
  { path: 'workflows', loadComponent: () => import('./pages/workflows/admin-workflows').then((m) => m.AdminWorkflowsPage) },
  { path: 'integrations', loadComponent: () => import('./pages/integrations/admin-integrations').then((m) => m.AdminIntegrationsPage) },
  { path: 'payroll-controls', loadComponent: () => import('./pages/payroll-controls/admin-payroll-controls').then((m) => m.AdminPayrollControlsPage) },
  { path: 'audit', loadComponent: () => import('./pages/audit/admin-audit').then((m) => m.AdminAuditPage) },
  { path: 'archive', loadComponent: () => import('./pages/archive/admin-archive').then((m) => m.AdminArchivePage) },
  { path: 'backup', loadComponent: () => import('./pages/backup/admin-backup').then((m) => m.AdminBackupPage) },
  { path: 'hr-access', loadComponent: () => import('./pages/hr-access/admin-hr-access').then((m) => m.AdminHrAccessPage) },
  { path: 'health', loadComponent: () => import('./pages/health/admin-health').then((m) => m.AdminHealthPage) },
];

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['admin'])],
    loadComponent: () => import('./admin-shell').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'master' },
      { path: 'master', pathMatch: 'full', redirectTo: 'master/dashboard' },
      ...MASTER_CHILDREN.map((route) => ({ ...route, path: `master/${route.path}` })),
      ...MASTER_CHILDREN.map((route) => ({
        path: route.path as string,
        redirectTo: `master/${route.path}`,
        pathMatch: 'full' as const,
      })),
    ],
  },
];
