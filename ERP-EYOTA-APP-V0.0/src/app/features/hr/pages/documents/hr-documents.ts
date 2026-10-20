import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DataTableColumn } from '../../../../core/models/common.model';
import { BankUpdateRequest, EmployeeDocument } from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate, maskBankAccount } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

interface DocView extends EmployeeDocument {
  employeeName: string;
}

@Component({
  selector: 'app-hr-documents',
  standalone: true,
  imports: [
    DataTableComponent,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    DemoNoticeComponent,
  ],
  templateUrl: './hr-documents.html',
  styleUrl: './hr-documents.css',
})
export class HrDocumentsPage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);

  readonly pendingDocs = computed(() =>
    this.docRows().filter((row) => row.status === 'Pending'),
  );

  readonly pendingBanks = computed(() =>
    this.hr.workforce().bankRequests.filter((row) => row.status === 'Pending HR'),
  );

  readonly columns: DataTableColumn<DocView>[] = [
    { key: 'employeeName', label: 'Employee', sortable: true },
    { key: 'name', label: 'Document', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'fileName', label: 'File' },
    {
      key: 'uploadedOn',
      label: 'Uploaded',
      format: (row) => formatSgDate(row.uploadedOn),
    },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Verified'
            ? 'success'
            : row.status === 'Pending'
              ? 'warning'
              : 'danger',
      }),
    },
  ];

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
  }

  docRows(): DocView[] {
    return this.hr.workforce().documents.map((doc) => ({
      ...doc,
      employeeName: this.hr.employeeName(doc.employeeId),
    }));
  }

  verify(doc: DocView, approve: boolean): void {
    const ok = this.workforce.verifyDocument(doc.id, approve);
    if (ok) {
      this.toast.success(
        approve ? 'Document verified' : 'Document rejected',
        `${doc.name} for ${doc.employeeName} updated in shared store.`,
      );
    }
  }

  decideBank(req: BankUpdateRequest, approve: boolean): void {
    const ok = this.workforce.decideBankRequest(req.id, approve);
    if (ok) {
      this.toast.success(
        approve ? 'Bank update approved' : 'Bank update rejected',
        approve
          ? `${this.hr.employeeName(req.employeeId)} profile bank details updated.`
          : `${req.id} rejected — profile unchanged.`,
      );
    }
  }

  masked(account: string): string {
    return maskBankAccount(account);
  }
}
