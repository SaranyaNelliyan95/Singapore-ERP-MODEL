import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthUser, DemoAccount, LoginCredentials, UserRole } from '../models/user.model';
import { AdminMockService } from './admin-mock.service';
import { BackendHttpService } from './backend-http.service';
import { environment } from '../../../environments/environment';

const SESSION_KEY = 'eyota.hr.session';
const PROVISIONED_USERS_KEY = 'eyota.demo.provisionedUsers.v1';

interface BackendLoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInMinutes: number;
  user: {
    email: string;
    role: 'ADMIN' | 'HR' | 'EMPLOYEE';
    employeeId: string | null;
    employeeCode: string | null;
    displayName: string;
  };
}

type DemoLoginUser = AuthUser & { password: string };

const SEED_DEMO_USERS: DemoLoginUser[] = [
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
  private provisionedUsers: DemoLoginUser[] = this.readProvisionedUsers();

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

  /** HR-activated ESS login for a newly onboarded employee (demo only). */
  registerDemoEmployee(input: {
    email: string;
    password: string;
    displayName: string;
    employeeId: string;
  }): void {
    const email = input.email.trim().toLowerCase();
    const initials = input.displayName
      .split(/\s+/)
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const user: DemoLoginUser = {
      id: `u-emp-${input.employeeId}`,
      email,
      password: input.password,
      displayName: input.displayName,
      role: 'employee',
      employeeId: input.employeeId,
      avatarInitials: initials || 'NE',
    };
    this.provisionedUsers = [
      user,
      ...this.provisionedUsers.filter((row) => row.email.toLowerCase() !== email),
    ];
    this.persistProvisionedUsers();
  }

  clearProvisionedUsers(): void {
    this.provisionedUsers = [];
    localStorage.removeItem(PROVISIONED_USERS_KEY);
  }

  private allUsers(): DemoLoginUser[] {
    return [...SEED_DEMO_USERS, ...this.provisionedUsers];
  }

  /** Synchronous demo login (local mock users). Prefer loginAsync when backend is enabled. */
  login(credentials: LoginCredentials): { ok: boolean; error?: string } {
    if (environment.useBackendApi) {
      return {
        ok: false,
        error: 'Backend API mode is on — use the async login path (login form handles this).',
      };
    }
    return this.loginDemo(credentials);
  }

  async loginAsync(credentials: LoginCredentials): Promise<{ ok: boolean; error?: string }> {
    if (environment.useBackendApi) {
      try {
        const http = this.injector.get(BackendHttpService);
        const res = await firstValueFrom(
          http.post<BackendLoginResponse>('/auth/login', {
            email: credentials.email.trim(),
            password: credentials.password,
          }),
        );
        await this.applyBackendSession(res);
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed against backend API.';
        return { ok: false, error: message };
      }
    }
    return this.loginDemo(credentials);
  }

  /** Persist JWT session after login or OTP activation. */
  async applyBackendSession(res: BackendLoginResponse): Promise<void> {
    const http = this.injector.get(BackendHttpService);
    http.setAccessToken(res.accessToken);
    const role = this.mapBackendRole(res.user.role);
    const displayName = res.user.displayName || res.user.email;
    const sessionUser: AuthUser = {
      id: res.user.employeeId ?? res.user.email,
      email: res.user.email,
      displayName,
      role,
      employeeId: res.user.employeeCode ?? undefined,
      avatarInitials: displayName
        .split(/\s+/)
        .map((p) => p[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    };
    this.persist(sessionUser);
    this.currentUserSignal.set(sessionUser);
    void this.router.navigateByUrl(this.landingRouteFor(sessionUser.role));
  }

  private loginDemo(credentials: LoginCredentials): { ok: boolean; error?: string } {
    const match = this.allUsers().find(
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

    this.injector.get(BackendHttpService).setAccessToken(null);
    const { password: _password, ...sessionUser } = match;
    this.persist(sessionUser);
    this.currentUserSignal.set(sessionUser);
    void this.router.navigateByUrl(this.landingRouteFor(sessionUser.role));
    return { ok: true };
  }

  private mapBackendRole(role: 'ADMIN' | 'HR' | 'EMPLOYEE'): UserRole {
    switch (role) {
      case 'ADMIN':
        return 'admin';
      case 'HR':
        return 'hr';
      default:
        return 'employee';
    }
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.injector.get(BackendHttpService).setAccessToken(null);
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

  private readProvisionedUsers(): DemoLoginUser[] {
    try {
      const raw = localStorage.getItem(PROVISIONED_USERS_KEY);
      if (!raw) {
        return [];
      }
      return JSON.parse(raw) as DemoLoginUser[];
    } catch {
      return [];
    }
  }

  private persistProvisionedUsers(): void {
    try {
      localStorage.setItem(PROVISIONED_USERS_KEY, JSON.stringify(this.provisionedUsers));
    } catch {
      /* ignore */
    }
  }
}
