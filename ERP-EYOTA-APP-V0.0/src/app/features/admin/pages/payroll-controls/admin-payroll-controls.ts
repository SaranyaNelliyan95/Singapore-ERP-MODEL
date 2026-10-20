import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-payroll-controls',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, ConfirmModalComponent],
  templateUrl: './admin-payroll-controls.html',
  styleUrl: './admin-payroll-controls.css',
})
export class AdminPayrollControlsPage implements OnInit {
  private readonly admin = inject(AdminMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);
  readonly loading = signal(true);
  readonly closeConfirm = signal(false);
  readonly policies = this.admin.policies;

  readonly form = this.fb.nonNullable.group({
    payrollPeriodOpen: [true],
    activePayPeriod: ['', Validators.required],
    cpfEmployeeRatePct: [20, [Validators.required, Validators.min(0), Validators.max(40)]],
    cpfEmployerRatePct: [17, [Validators.required, Validators.min(0), Validators.max(40)]],
    sdlRatePct: [0.25, [Validators.required, Validators.min(0), Validators.max(5)]],
    payslipTemplate: ['MOM Itemised' as 'MOM Itemised' | 'Compact', Validators.required],
    bankGiroChannelMasked: [{ value: '', disabled: true }],
  });

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => {
      this.form.patchValue(this.policies().statutory);
      this.loading.set(false);
    });
  }

  requestSave(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const open = this.form.controls.payrollPeriodOpen.value;
    if (!open && this.policies().statutory.payrollPeriodOpen) {
      this.closeConfirm.set(true);
      return;
    }
    this.persist();
  }

  persist(): void {
    this.closeConfirm.set(false);
    const raw = this.form.getRawValue();
    this.admin.updateStatutory(raw);
    this.toast.success(
      'Statutory controls saved',
      `Period ${raw.payrollPeriodOpen ? 'OPEN' : 'CLOSED'} · CPF EE ${raw.cpfEmployeeRatePct}% (demo).`,
    );
  }
}
