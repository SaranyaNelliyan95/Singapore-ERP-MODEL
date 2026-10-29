import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { BreadcrumbItem, NavItem } from '../../core/models/common.model';
import { AdminMockService } from '../../core/services/admin-mock.service';
import { EmployeeMockService } from '../../core/services/employee-mock.service';
import { AppShellComponent } from '../../shared/components/app-shell/app-shell';

const TITLE_BY_SEGMENT: Record<string, string> = {
  dashboard: 'HR Management Dashboard',
  directory: 'Employee Management',
  projects: 'Project Manpower & Field Operations',
  compliance: 'MOM & BCA Compliance Command',
  leave: 'Leave Approvals',
  attendance: 'Time & Attendance',
  payroll: 'Singapore Payroll Operations',
  documents: 'Document & Bank Audit',
  claims: 'Claims Settlement',
  onboarding: 'Onboarding Pipeline',
  assets: 'Health, Safety & Training',
  reports: 'Reports / Workright',
};

@Component({
  selector: 'app-hr-shell',
  standalone: true,
  imports: [AppShellComponent],
  template: `
    <app-shell
      portalTitle="HR Operations"
      [navItems]="navItems()"
      [breadcrumbs]="breadcrumbs()"
    />
  `,
})
export class HrShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly workforce = inject(EmployeeMockService);
  private readonly admin = inject(AdminMockService);

  /** Section labels match verified Figma IA (People / Compliance / Operations). */
  private readonly allNav: NavItem[] = [
    { label: 'Dashboard', route: '/hr/master/dashboard', icon: '⌂', section: 'Overview' },
    { label: 'Employees', route: '/hr/master/directory', icon: '▤', section: 'People' },
    { label: 'Onboarding', route: '/hr/master/onboarding', icon: '◫' },
    { label: 'Attendance', route: '/hr/master/attendance', icon: '◷' },
    { label: 'Leave', route: '/hr/master/leave', icon: '▦' },
    { label: 'Payroll', route: '/hr/master/payroll', icon: '◈' },
    { label: 'Claims', route: '/hr/master/claims', icon: '◍' },
    { label: 'MOM / BCA Compliance', route: '/hr/master/compliance', icon: '◉', section: 'Compliance' },
    { label: 'Documents', route: '/hr/master/documents', icon: '◎' },
    { label: 'Health & Safety', route: '/hr/master/assets', icon: '◧' },
    { label: 'Project Manpower', route: '/hr/master/projects', icon: '▣', section: 'Operations' },
    { label: 'Reports / Workright', route: '/hr/master/reports', icon: '▣', section: 'Reports' },
  ];

  readonly navItems = computed(() => {
    const visibility = this.workforce.workforce().policies.hrModules;
    const canWorkright = this.admin.hasCapability('hr', 'reports.workright');
    return this.allNav.filter((item) => {
      const key = item.route.split('/').pop() ?? '';
      if (key === 'dashboard') {
        return true;
      }
      if (key === 'reports' && !canWorkright) {
        return false;
      }
      const mod = visibility.find((row) => row.moduleKey === key);
      return mod?.visible !== false;
    });
  });

  readonly breadcrumbs = signal<BreadcrumbItem[]>([
    { label: 'HR', route: '/hr/master/dashboard' },
    { label: 'HR Management Dashboard' },
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
    const parts = this.router.url.split('/').filter(Boolean);
    const masterIdx = parts.indexOf('master');
    const segment = parts[masterIdx + 1]?.split('?')[0] ?? 'dashboard';
    const title =
      TITLE_BY_SEGMENT[segment] ??
      (segment.startsWith('EY-') ? 'Employee detail' : 'HR Operations');
    this.breadcrumbs.set([
      { label: 'HR', route: '/hr/master/dashboard' },
      { label: title },
    ]);
  }
}
