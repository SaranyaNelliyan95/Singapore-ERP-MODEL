import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthUser, DemoAccount, LoginCredentials, UserRole } from '../models/user.model';
import { AdminMockService } from './admin-mock.service';

const SESSION_KEY = 'eyota.hr.session';

const DEMO_USERS: (AuthUser & { password: string })[] = [
  {
    id: 'u-emp-001',
    email: 'employee@eyota.sg',
    password: 'Employee@123',
    displayName: 'Priya Tan',
    role: 'employee',
    employeeId: 'EY-1042',
    avatarInitials: 'PT',
  },
  {
    id: 'u-hr-001',
    email: 'hr@eyota.sg',
    password: 'HrManager@123',
    displayName: 'Wei Ming Lim',
    role: 'hr',
    employeeId: 'EY-0088',
    avatarInitials: 'WL',
  },
  {
    id: 'u-adm-001',
    email: 'admin@eyota.sg',
    password: 'Admin@123',
    displayName: 'Aisha Rahman',
    role: 'admin',
    avatarInitials: 'AR',
  },
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly injector = inject(Injector);
  private readonly currentUserSignal = signal<AuthUser | null>(this.readSession());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly role = computed(() => this.currentUserSignal()?.role ?? null);

  readonly demoAccounts: DemoAccount[] = [
    {
      label: 'Employee',
      email: 'employee@eyota.sg',
      password: 'Employee@123',
      role: 'employee',
      description: 'Self-service profile, leave, claims & payslips',
    },
    {
      label: 'HR Manager',
      email: 'hr@eyota.sg',
      password: 'HrManager@123',
      role: 'hr',
      description: 'Directory, expiries, attendance & onboarding',
    },
    {
      label: 'System Admin',
      email: 'admin@eyota.sg',
      password: 'Admin@123',
      role: 'admin',
      description: 'Users, audit, integrations & backup control',
    },
  ];

  constructor(private readonly router: Router) {}

  login(credentials: LoginCredentials): { ok: boolean; error?: string } {
    const match = DEMO_USERS.find(
      (user) =>
        user.email.toLowerCase() === credentials.email.trim().toLowerCase() &&
        user.password === credentials.password,
    );

    if (!match) {
      return { ok: false, error: 'Invalid email or password. Try a demo account below.' };
    }

    const admin = this.injector.get(AdminMockService);
    if (!admin.isUserActive(match.email)) {
      return {
        ok: false,
        error: 'This account is deactivated by System Admin. Contact IT (demo).',
      };
    }

    const { password: _password, ...sessionUser } = match;
    this.persist(sessionUser);
    this.currentUserSignal.set(sessionUser);
    void this.router.navigateByUrl(this.landingRouteFor(sessionUser.role));
    return { ok: true };
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.currentUserSignal.set(null);
    void this.router.navigateByUrl('/login');
  }

  landingRouteFor(role: UserRole): string {
    switch (role) {
      case 'employee':
        return '/employee/master';
      case 'hr':
        return '/hr/master';
      case 'admin':
        return '/admin/master';
    }
  }

  hasRole(roles: UserRole[]): boolean {
    const role = this.currentUserSignal()?.role;
    return role !== undefined && role !== null && roles.includes(role);
  }

  private persist(user: AuthUser): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  private readSession(): AuthUser | null {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }
}
