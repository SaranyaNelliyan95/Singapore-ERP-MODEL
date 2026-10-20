export type UserRole = 'employee' | 'hr' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  employeeId?: string;
  avatarInitials: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface DemoAccount {
  label: string;
  email: string;
  password: string;
  role: UserRole;
  description: string;
}
