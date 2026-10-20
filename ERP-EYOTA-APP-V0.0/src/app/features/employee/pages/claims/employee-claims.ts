import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClaimType, DataTableColumn } from '../../../../core/models/common.model';
import { ClaimRecord } from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate, formatSgd } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../shared/demo-notice';

@Component({
  selector: 'app-employee-claims',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    LoadingSpinnerComponent,
    DemoNoticeComponent,
  ],
  templateUrl: './employee-claims.html',
  styleUrl: './employee-claims.css',
})
export class EmployeeClaimsPage implements OnInit {
  private readonly employeeService = inject(EmployeeMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly ws = this.employeeService.workspace;

  readonly claimTypes: ClaimType[] = [
    'Transport',
    'Medical',
    'Meals',
    'Accommodation',
    'Mobile',
    'Other',
  ];

  readonly form = this.fb.nonNullable.group({
    type: ['Transport' as ClaimType, Validators.required],
    date: ['', Validators.required],
    amountSgd: [0, [Validators.required, Validators.min(0.01)]],
    costCentre: ['', Validators.required],
    remarks: ['', [Validators.required, Validators.minLength(4)]],
    hasReceipt: [true, Validators.required],
  });

  readonly columns: DataTableColumn<ClaimRecord>[] = [
    { key: 'id', label: 'Claim', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    {
      key: 'date',
      label: 'Date',
      format: (row) => formatSgDate(row.date),
    },
    {
      key: 'amountSgd',
      label: 'Amount',
      align: 'right',
      sortable: true,
      format: (row) => formatSgd(row.amountSgd),
    },
    { key: 'costCentre', label: 'Cost centre', sortable: true },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Approved'
            ? 'success'
            : row.status === 'Pending'
              ? 'warning'
              : row.status === 'Rejected'
                ? 'danger'
                : 'neutral',
      }),
    },
    { key: 'remarks', label: 'Remarks' },
  ];

  ngOnInit(): void {
    this.employeeService.getWorkspace().subscribe((data) => {
      this.form.patchValue({
        costCentre: data.costCentres[0] ?? '',
        date: new Date().toISOString().slice(0, 10),
      });
      this.loading.set(false);
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.warning(
        'Claim validation',
        'Amount must be positive; date, cost centre, and remarks are required.',
      );
      return;
    }

    const values = this.form.getRawValue();
    const max = this.employeeService.getClaimLimit(values.type);
    if (values.amountSgd > max) {
      this.toast.danger(
        'Over policy limit',
        `${values.type} max is ${formatSgd(max)} (Admin Master Data · demo).`,
      );
      return;
    }
    const claim = this.employeeService.submitClaim(values);
    if ('error' in claim) {
      this.toast.danger('Claim blocked', claim.error);
      return;
    }
    this.toast.success(
      'Claim submitted',
      `${claim.id} · ${formatSgd(claim.amountSgd)} pending approval (mock).`,
    );
    this.form.patchValue({
      type: 'Transport',
      amountSgd: 0,
      remarks: '',
      hasReceipt: true,
      date: new Date().toISOString().slice(0, 10),
    });
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }
}
