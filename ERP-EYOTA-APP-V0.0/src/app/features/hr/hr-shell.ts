import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { BreadcrumbItem, NavItem } from '../../core/models/common.model';
import { EmployeeMockService } from '../../core/services/employee-mock.service';
import { AppShellComponent } from '../../shared/components/app-shell/app-shell';

const TITLE_BY_SEGMENT: Record<string, string> = {
  dashboard: 'HR Management Dashboard',
  directory: 'Employee Directory',
  compliance: 'Work Pass & Compliance',
  leave: 'Leave Approval Engine',
  attendance: 'Time & Attendance',
  payroll: 'Payroll & CPF / SDL',
  documents: 'Document & Bank Audit',
  claims: 'Claims Settlement',
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

  private readonly allNav: NavItem[] = [
    { label: 'Dashboard', route: '/hr/master/dashboard', icon: '⌂', section: 'Operations' },
    { label: 'Directory', route: '/hr/master/directory', icon: '▤' },
    { label: 'Compliance', route: '/hr/master/compliance', icon: '◉' },
    { label: 'Leave approvals', route: '/hr/master/leave', icon: '▦' },
    { label: 'Attendance', route: '/hr/master/attendance', icon: '◷', section: 'Pay & files' },
    { label: 'Payroll', route: '/hr/master/payroll', icon: '◈' },
    { label: 'Documents', route: '/hr/master/documents', icon: '◎' },
    { label: 'Claims', route: '/hr/master/claims', icon: '◍' },
  ];

  readonly navItems = computed(() => {
    const visibility = this.workforce.workforce().policies.hrModules;
    return this.allNav.filter((item) => {
      const key = item.route.split('/').pop() ?? '';
      if (key === 'dashboard') {
        return true;
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
    const segment = this.router.url.split('/').pop()?.split('?')[0] ?? 'dashboard';
    this.breadcrumbs.set([
      { label: 'HR', route: '/hr/master/dashboard' },
      { label: TITLE_BY_SEGMENT[segment] ?? 'Employee Directory Master' },
    ]);
  }
}
