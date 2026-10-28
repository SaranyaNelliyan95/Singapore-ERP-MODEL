import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { BreadcrumbItem, NavItem } from '../../core/models/common.model';
import { AppShellComponent } from '../../shared/components/app-shell/app-shell';

const TITLE_BY_SEGMENT: Record<string, string> = {
  dashboard: 'System Admin Dashboard',
  company: 'Company Setup',
  users: 'User & Role Management',
  'master-data': 'Master Data Settings',
  workflows: 'Workflow Automation',
  integrations: 'Integrations Gateway',
  'payroll-controls': 'Payroll & Statutory Controls',
  audit: 'Audit Trail & Security',
  archive: 'Document Archive Policy',
  backup: 'Backup & Disaster Recovery',
  'hr-access': 'HR Module Access',
  health: 'System Health Diagnostics',
};

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [AppShellComponent],
  template: `
    <app-shell
      portalTitle="System Administration"
      [navItems]="navItems"
      [breadcrumbs]="breadcrumbs()"
    />
  `,
})
export class AdminShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/admin/master/dashboard', icon: '⌂', section: 'Control' },
    { label: 'Company setup', route: '/admin/master/company', icon: '▣' },
    { label: 'Users & roles', route: '/admin/master/users', icon: '◍' },
    { label: 'Master data', route: '/admin/master/master-data', icon: '▤' },
    { label: 'Workflows', route: '/admin/master/workflows', icon: '◎', section: 'Automation' },
    { label: 'Integrations', route: '/admin/master/integrations', icon: '◈' },
    { label: 'Payroll controls', route: '/admin/master/payroll-controls', icon: '▦' },
    { label: 'Audit trail', route: '/admin/master/audit', icon: '◉', section: 'Security' },
    { label: 'Archive policy', route: '/admin/master/archive', icon: '▤' },
    { label: 'Backup & DR', route: '/admin/master/backup', icon: '◷' },
    { label: 'HR access', route: '/admin/master/hr-access', icon: '◎', section: 'Oversight' },
    { label: 'Employee Mgmt', route: '/hr/master/directory', icon: '▤' },
    { label: 'Project manpower', route: '/hr/master/projects', icon: '▣' },
    { label: 'MOM / ICA', route: '/hr/master/compliance', icon: '◉' },
    { label: 'Payroll Control', route: '/hr/master/payroll', icon: '◈' },
    { label: 'System health', route: '/admin/master/health', icon: '◍' },
  ];

  readonly breadcrumbs = signal<BreadcrumbItem[]>([
    { label: 'Admin', route: '/admin/master/dashboard' },
    { label: 'System Admin Dashboard' },
  ]);

  constructor() {
    this.syncBreadcrumbs();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.syncBreadcrumbs());
  }

  private syncBreadcrumbs(): void {
    const segment = this.router.url.split('/').pop()?.split('?')[0] ?? 'dashboard';
    this.breadcrumbs.set([
      { label: 'Admin', route: '/admin/master/dashboard' },
      { label: TITLE_BY_SEGMENT[segment] ?? 'System Administration' },
    ]);
  }
}
