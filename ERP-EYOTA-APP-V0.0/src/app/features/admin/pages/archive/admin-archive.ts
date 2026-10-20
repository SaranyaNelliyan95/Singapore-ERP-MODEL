import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExtendedRole } from '../../../../core/models/admin.model';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-archive',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-archive.html',
  styleUrl: './admin-archive.css',
})
export class AdminArchivePage implements OnInit {
  private readonly admin = inject(AdminMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);
  readonly loading = signal(true);
  readonly roles: ExtendedRole[] = ['admin', 'hr', 'payroll', 'manager', 'employee', 'auditor'];

  readonly form = this.fb.nonNullable.group({
    retentionYears: [7, [Validators.required, Validators.min(1), Validators.max(20)]],
    encryptAtRest: [true],
    workrightPackEnabled: [true],
    roleLocks: this.fb.nonNullable.control<ExtendedRole[]>(['admin', 'hr', 'auditor']),
  });

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => {
      const archive = this.admin.system().archive;
      this.form.patchValue(archive);
      this.loading.set(false);
    });
  }

  toggleRole(role: ExtendedRole, checked: boolean): void {
    const current = this.form.controls.roleLocks.value;
    this.form.controls.roleLocks.setValue(
      checked ? [...new Set([...current, role])] : current.filter((r) => r !== role),
    );
  }

  hasRole(role: ExtendedRole): boolean {
    return this.form.controls.roleLocks.value.includes(role);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.admin.updateArchive(this.form.getRawValue());
    this.toast.success('Archive policy saved', 'Retention & Workright pack rights updated (demo).');
  }

  generatePack(): void {
    if (!this.form.controls.workrightPackEnabled.value) {
      this.toast.warning('Pack disabled', 'Enable Workright pack generation first.');
      return;
    }
    this.toast.success(
      'Workright bundle queued',
      'Simulated inspection pack generated for authorized roles only.',
    );
  }
}
