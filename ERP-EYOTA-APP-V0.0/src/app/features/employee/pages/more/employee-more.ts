import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTableColumn } from '../../../../core/models/common.model';
import {
  EmployeeAsset,
  EmployeeNotification,
  TrainingRecord,
} from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { DemoNoticeComponent } from '../../shared/demo-notice';
import { SgDatePipe } from '../../../../shared/pipes/sg-date.pipe';

@Component({
  selector: 'app-employee-more',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    DemoNoticeComponent,
    SgDatePipe,
  ],
  templateUrl: './employee-more.html',
  styleUrl: './employee-more.css',
})
export class EmployeeMorePage implements OnInit {
  private readonly employeeService = inject(EmployeeMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly openAssets = signal(true);
  readonly openTraining = signal(true);
  readonly openNotifications = signal(true);
  readonly openFaq = signal(true);
  readonly ws = this.employeeService.workspace;

  readonly faqForm = this.fb.nonNullable.group({
    question: ['', [Validators.required, Validators.minLength(10)]],
  });

  readonly assetColumns: DataTableColumn<EmployeeAsset>[] = [
    { key: 'assetId', label: 'Asset ID', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    {
      key: 'assignedDate',
      label: 'Assigned',
      format: (row) => formatSgDate(row.assignedDate),
    },
    {
      key: 'condition',
      label: 'Condition',
      badge: (row) => ({
        label: row.condition,
        tone: row.condition === 'Good' ? 'success' : row.condition === 'Fair' ? 'warning' : 'danger',
      }),
    },
    {
      key: 'returnStatus',
      label: 'Status',
      badge: (row) => ({
        label: row.returnStatus,
        tone: row.returnStatus === 'Assigned' ? 'info' : 'neutral',
      }),
    },
  ];

  readonly trainingColumns: DataTableColumn<TrainingRecord>[] = [
    { key: 'courseName', label: 'Course', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    {
      key: 'completedDate',
      label: 'Completed',
      format: (row) => formatSgDate(row.completedDate),
    },
    {
      key: 'expiryDate',
      label: 'Expiry',
      format: (row) => formatSgDate(row.expiryDate),
    },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Current'
            ? 'success'
            : row.status === 'Expiring' || row.status === 'Required'
              ? 'warning'
              : 'danger',
      }),
    },
  ];

  ngOnInit(): void {
    this.employeeService.getWorkspace().subscribe(() => this.loading.set(false));
  }

  toggle(section: 'assets' | 'training' | 'notifications' | 'faq'): void {
    switch (section) {
      case 'assets':
        this.openAssets.update((v) => !v);
        break;
      case 'training':
        this.openTraining.update((v) => !v);
        break;
      case 'notifications':
        this.openNotifications.update((v) => !v);
        break;
      case 'faq':
        this.openFaq.update((v) => !v);
        break;
    }
  }

  markRead(item: EmployeeNotification): void {
    this.employeeService.markNotificationRead(item.id);
    this.toast.success('Marked read', item.type + ' notification updated.');
  }

  submitFaq(): void {
    this.faqForm.markAllAsTouched();
    if (this.faqForm.invalid) {
      this.toast.warning('FAQ', 'Enter at least 10 characters.');
      return;
    }
    const question = this.faqForm.controls.question.value;
    this.employeeService.submitFaq(question);
    this.faqForm.reset({ question: '' });
    this.toast.success('FAQ submitted', 'Your question was logged to notifications (mock).');
  }

  faqInvalid(): boolean {
    const c = this.faqForm.controls.question;
    return c.invalid && c.touched;
  }
}
