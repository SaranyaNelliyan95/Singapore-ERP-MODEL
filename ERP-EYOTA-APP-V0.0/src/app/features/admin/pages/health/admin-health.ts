import { Component, OnInit, inject, signal } from '@angular/core';
import { DataTableColumn } from '../../../../core/models/common.model';
import { SystemHealthMetric } from '../../../../core/models/admin.model';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-health',
  standalone: true,
  imports: [DataTableComponent, LoadingSpinnerComponent],
  templateUrl: './admin-health.html',
  styleUrl: './admin-health.css',
})
export class AdminHealthPage implements OnInit {
  readonly admin = inject(AdminMockService);
  private readonly workforce = inject(EmployeeMockService);
  readonly loading = signal(true);

  readonly columns: DataTableColumn<SystemHealthMetric>[] = [
    { key: 'name', label: 'Metric', sortable: true },
    { key: 'value', label: 'Value' },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone: row.status === 'Ok' ? 'success' : row.status === 'Warn' ? 'warning' : 'danger',
      }),
    },
  ];

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => this.loading.set(false));
  }

  cacheSizeLabel(): string {
    const state = this.workforce.workforce();
    const approx =
      state.directory.length +
      state.leaveRequests.length +
      state.claims.length +
      state.attendance.length +
      state.documents.length;
    return `${approx} micro-records · ~${(approx * 0.8).toFixed(1)} KB mock`;
  }
}
