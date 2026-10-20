import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataTableColumn } from '../../../../core/models/common.model';
import { ClaimRecord } from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate, formatSgd } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

interface ClaimView extends ClaimRecord {
  employeeName: string;
  selected: boolean;
}

@Component({
  selector: 'app-hr-claims',
  standalone: true,
  imports: [FormsModule, DataTableComponent, LoadingSpinnerComponent, DemoNoticeComponent],
  templateUrl: './hr-claims.html',
  styleUrl: './hr-claims.css',
})
export class HrClaimsPage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly flagComment = signal('Flagged for policy review');

  readonly pending = computed(() =>
    this.hr.workforce().claims.filter((row) => row.status === 'Pending'),
  );

  readonly columns: DataTableColumn<ClaimRecord>[] = [
    { key: 'id', label: 'Claim', sortable: true },
    {
      key: 'employeeId',
      label: 'Employee',
      format: (row) => this.hr.employeeName(row.employeeId),
      sortable: true,
    },
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
    { key: 'costCentre', label: 'Cost centre' },
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
              : 'danger',
      }),
    },
    { key: 'remarks', label: 'Remarks' },
  ];

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggle(id: string, checked: boolean): void {
    const next = new Set(this.selectedIds());
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selectedIds.set(next);
  }

  selectAllPending(checked: boolean): void {
    if (!checked) {
      this.selectedIds.set(new Set());
      return;
    }
    this.selectedIds.set(new Set(this.pending().map((row) => row.id)));
  }

  massApprove(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) {
      this.toast.warning('Selection required', 'Select one or more pending claims.');
      return;
    }
    const invalid = this.pending().filter((row) => ids.includes(row.id) && row.amountSgd <= 0);
    if (invalid.length) {
      this.toast.danger('Currency check', 'Claims must have a positive SGD amount.');
      return;
    }
    const count = this.workforce.approveClaims(ids);
    this.selectedIds.set(new Set());
    this.toast.success('Claims approved', `${count} claim(s) settled in the shared store.`);
  }

  massFlag(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) {
      this.toast.warning('Selection required', 'Select claims to flag.');
      return;
    }
    const comment = this.flagComment().trim();
    if (comment.length < 4) {
      this.toast.warning('Comment required', 'Provide a short flag reason.');
      return;
    }
    const count = this.workforce.flagClaims(ids, comment);
    this.selectedIds.set(new Set());
    this.toast.success('Claims flagged', `${count} claim(s) flagged for review.`);
  }

  formatAmount(amount: number): string {
    return formatSgd(amount);
  }
}
