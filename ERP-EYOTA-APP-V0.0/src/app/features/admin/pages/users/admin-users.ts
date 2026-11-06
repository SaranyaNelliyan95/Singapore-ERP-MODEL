import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DataTableColumn } from '../../../../core/models/common.model';
import { ExtendedRole, PermissionCell, SystemUser } from '../../../../core/models/admin.model';
import { AdminApiService, AdminUserDto, RoleSummaryDto } from '../../../../core/services/admin-api.service';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    FormsModule,
    DataTableComponent,
    LoadingSpinnerComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
})
export class AdminUsersPage implements OnInit {
  readonly admin = inject(AdminMockService);
  private readonly adminApi = inject(AdminApiService);
  readonly toast = inject(ToastService);
  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly apiUsers = signal<SystemUser[]>([]);
  readonly roleSummary = signal<RoleSummaryDto[]>([]);
  readonly deactivateTarget = signal<SystemUser | null>(null);

  readonly roles: ExtendedRole[] = ['admin', 'hr', 'payroll', 'manager', 'employee', 'auditor'];
  readonly capabilities = computed(() => {
    const set = new Set(this.admin.system().permissions.map((p) => p.capability));
    return [...set];
  });

  readonly displayUsers = computed(() =>
    this.useBackend ? this.apiUsers() : this.admin.system().users,
  );

  readonly columns: DataTableColumn<SystemUser>[] = [
    { key: 'displayName', label: 'User', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'role',
      label: 'Role',
      badge: (row) => ({
        label: String(row.role),
        tone: row.role === 'admin' ? 'warning' : row.role === 'hr' ? 'success' : 'info',
      }),
    },
    {
      key: 'linkedEmployeeId',
      label: 'Employee',
      format: (row) => row.linkedEmployeeId ?? '—',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone: row.status === 'Active' ? 'success' : 'neutral',
      }),
      actions: (row) => [
        {
          id: 'toggle-status',
          label: row.status === 'Active' ? 'Set Inactive' : 'Set Active',
          tone: row.status === 'Active' ? 'danger' : 'primary',
          disabled: this.saving(),
        },
      ],
    },
  ];

  ngOnInit(): void {
    if (this.useBackend) {
      void this.reloadApi();
    } else {
      this.admin.bootstrap().subscribe(() => this.loading.set(false));
    }
  }

  private async reloadApi(): Promise<void> {
    this.loading.set(true);
    try {
      const [users, roles] = await Promise.all([
        firstValueFrom(this.adminApi.listUsers()),
        firstValueFrom(this.adminApi.listRoles()),
      ]);
      this.apiUsers.set(users.map((u) => this.mapUser(u)));
      this.roleSummary.set(roles);
    } catch (err) {
      this.toast.danger('Users API', err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      this.loading.set(false);
    }
  }

  private mapUser(u: AdminUserDto): SystemUser {
    return {
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      role: u.role.toLowerCase() as SystemUser['role'],
      linkedEmployeeId: u.employeeCode,
      mfaEnabled: false,
      status: u.active ? 'Active' : 'Inactive',
      lastLogin: '',
    };
  }

  onCellAction(event: { actionId: string; row: SystemUser }): void {
    if (event.actionId === 'toggle-status') {
      this.requestToggle(event.row);
    }
  }

  requestToggle(user: SystemUser): void {
    this.deactivateTarget.set(user);
  }

  confirmToggle(): void {
    const user = this.deactivateTarget();
    this.deactivateTarget.set(null);
    if (!user) {
      return;
    }
    if (this.useBackend) {
      void this.toggleApi(user);
      return;
    }
    const updated = this.admin.toggleUserActive(user.id);
    if (updated) {
      this.toast.success(
        'Account updated',
        `${updated.email} is now ${updated.status}. Login blocked when Inactive.`,
      );
    }
  }

  private async toggleApi(user: SystemUser): Promise<void> {
    this.saving.set(true);
    try {
      const nextActive = user.status !== 'Active';
      const updated = await firstValueFrom(this.adminApi.setUserStatus(user.id, nextActive));
      this.apiUsers.update((rows) =>
        rows.map((r) => (r.id === user.id ? this.mapUser(updated) : r)),
      );
      this.toast.success(
        'Account updated',
        `${updated.email} is now ${updated.status}. Login blocked when Inactive.`,
      );
      const roles = await firstValueFrom(this.adminApi.listRoles());
      this.roleSummary.set(roles);
    } catch (err) {
      this.toast.danger('Status update', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  toggleMfa(user: SystemUser): void {
    if (this.useBackend) {
      this.toast.warning('MFA', 'MFA enforcement is not wired to the API yet.');
      return;
    }
    this.admin.toggleMfa(user.id);
    this.toast.success('MFA updated', `${user.email} MFA toggle saved (demo).`);
  }

  permissionFor(role: ExtendedRole, capability: string): boolean {
    return !!this.admin
      .system()
      .permissions.find((p) => p.role === role && p.capability === capability)?.allowed;
  }

  setPermission(role: ExtendedRole, capability: string, allowed: boolean): void {
    this.admin.setPermission(role, capability, allowed);
  }

  cells(): PermissionCell[] {
    return this.admin.system().permissions;
  }

  roleLabel(role: string): string {
    return role.charAt(0) + role.slice(1).toLowerCase();
  }
}
