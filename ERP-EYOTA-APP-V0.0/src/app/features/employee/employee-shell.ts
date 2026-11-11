import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { BreadcrumbItem, NavItem } from '../../core/models/common.model';
import { EmployeeReadinessService } from '../../core/services/employee-readiness.service';
import { AppShellComponent } from '../../shared/components/app-shell/app-shell';

const TITLE_BY_SEGMENT: Record<string, string> = {
  dashboard: 'Dashboard Overview',
  profile: 'My Profile',
  attendance: 'Attendance & Clocking',
  leave: 'Leave Management',
  payslips: 'Payslips & Tax',
  documents: 'My Documents',
  onboarding: 'My Onboarding',
  claims: 'Claims Log',
  more: 'More',
};

const ALL_NAV: NavItem[] = [
  { label: 'Dashboard', route: '/employee/master/dashboard', icon: '⌂', section: 'Workspace' },
  { label: 'My Profile', route: '/employee/master/profile', icon: '◍' },
  { label: 'Onboarding', route: '/employee/master/onboarding', icon: '◫' },
  { label: 'Attendance', route: '/employee/master/attendance', icon: '◷' },
  { label: 'Leave', route: '/employee/master/leave', icon: '▦' },
  { label: 'Payslips', route: '/employee/master/payslips', icon: '▤', section: 'Pay & files' },
  { label: 'Documents', route: '/employee/master/documents', icon: '◉' },
  { label: 'Claims', route: '/employee/master/claims', icon: '◈' },
  { label: 'More', route: '/employee/master/more', icon: '◎', section: 'Extras' },
];

const GATED_ROUTES = new Set([
  '/employee/master/attendance',
  '/employee/master/leave',
  '/employee/master/payslips',
  '/employee/master/claims',
]);

@Component({
  selector: 'app-employee-shell',
  standalone: true,
  imports: [AppShellComponent],
  template: `
    <app-shell
      portalTitle="Employee Self-Service"
      [navItems]="navItems()"
      [breadcrumbs]="breadcrumbs()"
    />
  `,
})
export class EmployeeShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly readiness = inject(EmployeeReadinessService);

  readonly navItems = computed(() => {
    if (this.readiness.readyToWork()) {
      return ALL_NAV;
    }
    return ALL_NAV.filter((item) => !GATED_ROUTES.has(item.route));
  });

  readonly breadcrumbs = signal<BreadcrumbItem[]>([
    { label: 'Employee', route: '/employee/master/dashboard' },
    { label: 'Dashboard Overview' },
  ]);

  ngOnInit(): void {
    void this.readiness.refresh();
  }

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
    const url = this.router.url;
    const segment = url.split('/').pop()?.split('?')[0] ?? 'dashboard';
    const title = TITLE_BY_SEGMENT[segment] ?? 'Self-Service Master';
    this.breadcrumbs.set([
      { label: 'Employee', route: '/employee/master/dashboard' },
      { label: title },
    ]);
  }
}
