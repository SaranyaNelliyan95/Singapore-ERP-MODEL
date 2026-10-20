import { Component, OnInit, inject, signal } from '@angular/core';
import { DataTableColumn } from '../../../../core/models/common.model';
import { PayslipRecord } from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate, formatSgd } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { DemoNoticeComponent } from '../../shared/demo-notice';
import { SgDatePipe } from '../../../../shared/pipes/sg-date.pipe';
import { SgdCurrencyPipe } from '../../../../shared/pipes/sgd-currency.pipe';

@Component({
  selector: 'app-employee-payslips',
  standalone: true,
  imports: [
    DataTableComponent,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    DemoNoticeComponent,
    SgDatePipe,
    SgdCurrencyPipe,
  ],
  templateUrl: './employee-payslips.html',
  styleUrl: './employee-payslips.css',
})
export class EmployeePayslipsPage implements OnInit {
  private readonly employeeService = inject(EmployeeMockService);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly selected = signal<PayslipRecord | null>(null);
  readonly ws = this.employeeService.workspace;

  readonly columns: DataTableColumn<PayslipRecord>[] = [
    { key: 'payPeriod', label: 'Pay period', sortable: true },
    {
      key: 'basic',
      label: 'Basic',
      align: 'right',
      format: (row) => formatSgd(row.basic),
    },
    {
      key: 'netPay',
      label: 'Net pay',
      align: 'right',
      sortable: true,
      format: (row) => formatSgd(row.netPay),
    },
    {
      key: 'bankCreditedDate',
      label: 'Credited',
      format: (row) => formatSgDate(row.bankCreditedDate),
    },
    {
      key: 'demoDocument',
      label: 'Label',
      badge: () => ({ label: 'DEMO DOCUMENT', tone: 'warning' }),
    },
  ];

  ngOnInit(): void {
    this.employeeService.getWorkspace().subscribe((data) => {
      this.selected.set(data.payslips[0] ?? null);
      this.loading.set(false);
    });
  }

  downloadDemo(): void {
    const slip = this.selected();
    if (!slip) {
      return;
    }
    this.toast.success(
      'Demo download',
      `${slip.payPeriod} itemised payslip stream simulated — DEMO DOCUMENT only.`,
    );
  }

  selectById(id: string): void {
    const found = this.ws().payslips.find((p) => p.id === id) ?? null;
    this.selected.set(found);
  }
}
