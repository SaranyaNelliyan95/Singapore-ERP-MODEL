import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataTableColumn } from '../../../../core/models/common.model';
import { AuditLogEntry } from '../../../../core/models/admin.model';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [
    FormsModule,
    DataTableComponent,
    LoadingSpinnerComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './admin-audit.html',
  styleUrl: './admin-audit.css',
})
export class AdminAuditPage implements OnInit {
  readonly admin = inject(AdminMockService);
  readonly toast = inject(ToastService);
  readonly loading = signal(true);
  readonly clearOpen = signal(false);
  readonly search = signal('');

  readonly columns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      label: 'When',
      sortable: true,
      format: (row) => formatSgDate(row.timestamp),
    },
    { key: 'actor', label: 'Who', sortable: true },
    { key: 'action', label: 'Action' },
    { key: 'entity', label: 'Module' },
    { key: 'beforeValue', label: 'Before' },
    { key: 'afterValue', label: 'After' },
    { key: 'ipAddress', label: 'IP' },
  ];

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => this.loading.set(false));
  }

  filtered(): AuditLogEntry[] {
    const term = this.search().trim().toLowerCase();
    const rows = this.admin.system().auditLogs;
    if (!term) {
      return rows;
    }
    return rows.filter((row) =>
      [row.actor, row.action, row.entity, row.beforeValue, row.afterValue, row.ipAddress]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }

  exportCsv(): void {
    const csv = this.admin.exportAuditCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'eyota-audit-demo.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    this.toast.success('CSV exported', 'Demo audit log downloaded locally.');
  }

  confirmClear(): void {
    this.clearOpen.set(false);
    this.admin.clearAuditWithConfirm();
    this.toast.warning('Audit cleared', 'Log reset to a single seed event (demo).');
  }
}
