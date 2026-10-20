import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { BreadcrumbItem, NavItem } from '../../core/models/common.model';
import { AppShellComponent } from '../../shared/components/app-shell/app-shell';

const TITLE_BY_SEGMENT: Record<string, string> = {
  dashboard: 'Dashboard Overview',
  profile: 'My Profile',
  attendance: 'Attendance & Clocking',
  leave: 'Leave Management',
  payslips: 'Payslips & Tax',
  documents: 'My Documents',
  claims: 'Claims Log',
  more: 'More',
};

@Component({
  selector: 'app-employee-shell',
  standalone: true,
  imports: [AppShellComponent],
  template: `
    <app-shell
      portalTitle="Employee Self-Service"
      [navItems]="navItems"
      [breadcrumbs]="breadcrumbs()"
    />
  `,
})
export class EmployeeShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/employee/master/dashboard', icon: '⌂', section: 'Workspace' },
    { label: 'My Profile', route: '/employee/master/profile', icon: '◍' },
    { label: 'Attendance', route: '/employee/master/attendance', icon: '◷' },
    { label: 'Leave', route: '/employee/master/leave', icon: '▦' },
    { label: 'Payslips', route: '/employee/master/payslips', icon: '▤', section: 'Pay & files' },
    { label: 'Documents', route: '/employee/master/documents', icon: '◉' },
    { label: 'Claims', route: '/employee/master/claims', icon: '◈' },
    { label: 'More', route: '/employee/master/more', icon: '◎', section: 'Extras' },
  ];

  readonly breadcrumbs = signal<BreadcrumbItem[]>([
    { label: 'Employee', route: '/employee/master/dashboard' },
    { label: 'Dashboard Overview' },
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
    const url = this.router.url;
    const segment = url.split('/').pop()?.split('?')[0] ?? 'dashboard';
    const title = TITLE_BY_SEGMENT[segment] ?? 'Self-Service Master';
    this.breadcrumbs.set([
      { label: 'Employee', route: '/employee/master/dashboard' },
      { label: title },
    ]);
  }
}
