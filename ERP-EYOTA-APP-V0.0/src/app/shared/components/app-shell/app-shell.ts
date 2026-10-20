import { Component, Input, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BreadcrumbItem, NavItem } from '../../../core/models/common.model';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal';
import { StatusBadgeComponent } from '../status-badge/status-badge';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ConfirmModalComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @Input({ required: true }) portalTitle = '';
  @Input({ required: true }) navItems: NavItem[] = [];
  @Input() breadcrumbs: BreadcrumbItem[] = [];

  readonly user = this.auth.currentUser;
  readonly sidebarOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly logoutConfirmOpen = signal(false);

  readonly roleBadge = computed(() => {
    const role = this.user()?.role;
    switch (role) {
      case 'employee':
        return { label: 'Employee', tone: 'info' as const };
      case 'hr':
        return { label: 'HR Manager', tone: 'success' as const };
      case 'admin':
        return { label: 'System Admin', tone: 'warning' as const };
      default:
        return { label: 'Guest', tone: 'neutral' as const };
    }
  });

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.sidebarOpen.set(false);
        this.profileOpen.set(false);
      });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  toggleProfile(): void {
    this.profileOpen.update((open) => !open);
  }

  requestLogout(): void {
    this.profileOpen.set(false);
    this.logoutConfirmOpen.set(true);
  }

  confirmLogout(): void {
    this.logoutConfirmOpen.set(false);
    this.auth.logout();
  }

  cancelLogout(): void {
    this.logoutConfirmOpen.set(false);
  }
}
