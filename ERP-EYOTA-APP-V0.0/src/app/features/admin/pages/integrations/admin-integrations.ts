import { Component, OnInit, inject, signal } from '@angular/core';
import { DataTableColumn } from '../../../../core/models/common.model';
import { IntegrationHealth } from '../../../../core/models/admin.model';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-integrations',
  standalone: true,
  imports: [DataTableComponent, LoadingSpinnerComponent],
  templateUrl: './admin-integrations.html',
  styleUrl: './admin-integrations.css',
})
export class AdminIntegrationsPage implements OnInit {
  readonly admin = inject(AdminMockService);
  readonly toast = inject(ToastService);
  readonly loading = signal(true);

  readonly columns: DataTableColumn<IntegrationHealth>[] = [
    { key: 'name', label: 'Integration', sortable: true },
    { key: 'provider', label: 'Provider', sortable: true },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Healthy'
            ? 'success'
            : row.status === 'Degraded'
              ? 'warning'
              : row.status === 'Down'
                ? 'danger'
                : 'info',
      }),
    },
    {
      key: 'lastSync',
      label: 'Last sync',
      format: (row) => formatSgDate(row.lastSync),
    },
    { key: 'apiKeyMasked', label: 'API key' },
    { key: 'message', label: 'Message' },
  ];

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => this.loading.set(false));
  }

  test(row: IntegrationHealth): void {
    const result = this.admin.testIntegration(row.id);
    if (!result) {
      return;
    }
    if (result.status === 'Healthy') {
      this.toast.success('Connection OK', `${result.name}: ${result.message}`);
    } else {
      this.toast.danger('Connection issue', `${result.name}: ${result.message}`);
    }
  }

  sync(row: IntegrationHealth): void {
    this.admin.forceSync(row.id);
    this.toast.success('Force sync started', `${row.name} syncing (demo timeline).`);
  }
}
