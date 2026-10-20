import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataTableColumn } from '../../../../core/models/common.model';
import { ExtendedRole, PermissionCell, SystemUser } from '../../../../core/models/admin.model';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
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
  readonly toast = inject(ToastService);
  readonly loading = signal(true);
  readonly deactivateTarget = signal<SystemUser | null>(null);

  readonly roles: ExtendedRole[] = ['admin', 'hr', 'payroll', 'manager', 'employee', 'auditor'];
  readonly capabilities = computed(() => {
    const set = new Set(this.admin.system().permissions.map((p) => p.capability));
    return [...set];
  });

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
      key: 'mfaEnabled',
      label: 'MFA',
      format: (row) => (row.mfaEnabled ? 'Enforced' : 'Off'),
    },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone: row.status === 'Active' ? 'success' : 'neutral',
      }),
    },
    {
      key: 'lastLogin',
      label: 'Last login',
      format: (row) => formatSgDate(row.lastLogin),
    },
  ];

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => this.loading.set(false));
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
    const updated = this.admin.toggleUserActive(user.id);
    if (updated) {
      this.toast.success(
        'Account updated',
        `${updated.email} is now ${updated.status}. Login blocked when Inactive.`,
      );
    }
  }

  toggleMfa(user: SystemUser): void {
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
}
