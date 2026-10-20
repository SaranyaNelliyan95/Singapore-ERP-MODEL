import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AssetType, DataTableColumn } from '../../../../core/models/common.model';
import { EmployeeAsset, TrainingRecord } from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

type AssignableAssetType = Extract<
  AssetType,
  'Laptop' | 'Mobile' | 'Access Card' | 'Helmet' | 'Vehicle' | 'Tools'
>;

@Component({
  selector: 'app-hr-assets',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, LoadingSpinnerComponent, DemoNoticeComponent],
  templateUrl: './hr-assets.html',
  styleUrl: './hr-assets.css',
})
export class HrAssetsPage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);

  readonly assignedAssets = computed(() =>
    (this.hr.workforce().assets ?? []).filter((row) => row.returnStatus === 'Assigned'),
  );

  readonly assetColumns: DataTableColumn<EmployeeAsset>[] = [
    {
      key: 'employeeId',
      label: 'Employee',
      sortable: true,
      format: (row) => this.hr.employeeName(row.employeeId),
    },
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
    {
      key: 'employeeId',
      label: 'Employee',
      sortable: true,
      format: (row) => this.hr.employeeName(row.employeeId),
    },
    { key: 'courseName', label: 'Course', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Current'
            ? 'success'
            : row.status === 'Required'
              ? 'warning'
              : row.status === 'Expiring'
                ? 'warning'
                : 'danger',
      }),
    },
  ];

  readonly employeeOptions = computed(() =>
    this.hr
      .workforce()
      .directory.filter((row) => row.status !== 'Resigned')
      .map((row) => ({ id: row.employeeId, label: `${row.employeeId} · ${row.fullName}` })),
  );

  readonly assetTypeOptions: { value: AssignableAssetType; label: string }[] = [
    { value: 'Laptop', label: 'Laptop' },
    { value: 'Mobile', label: 'Phone' },
    { value: 'Access Card', label: 'Access Card' },
    { value: 'Helmet', label: 'Helmet' },
    { value: 'Vehicle', label: 'Vehicle' },
    { value: 'Tools', label: 'Other' },
  ];

  readonly trainingCategories: TrainingRecord['category'][] = [
    'Safety',
    'BCA',
    'Soft Skill',
    'Compliance',
  ];

  readonly assignAssetForm = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
    assetId: ['', [Validators.required, Validators.minLength(2)]],
    type: ['Laptop' as AssignableAssetType, Validators.required],
    condition: ['Good' as EmployeeAsset['condition'], Validators.required],
  });

  readonly assignTrainingForm = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
    courseName: ['', [Validators.required, Validators.minLength(3)]],
    category: ['Safety' as TrainingRecord['category'], Validators.required],
  });

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
  }

  submitAssignAsset(): void {
    this.assignAssetForm.markAllAsTouched();
    if (this.assignAssetForm.invalid) {
      this.toast.warning('Assign asset', 'Complete employee, asset ID, type, and condition.');
      return;
    }
    const values = this.assignAssetForm.getRawValue();
    const asset = this.workforce.assignAsset(values);
    this.assignAssetForm.patchValue({ assetId: '' });
    this.toast.success('Asset assigned', `${asset.assetId} linked to ${this.hr.employeeName(asset.employeeId)}.`);
  }

  returnAsset(row: EmployeeAsset): void {
    const ok = this.workforce.returnAsset(row.id);
    if (ok) {
      this.toast.success('Asset returned', `${row.assetId} marked returned in register.`);
    } else {
      this.toast.warning('Return failed', 'Asset may already be returned.');
    }
  }

  submitAssignTraining(): void {
    this.assignTrainingForm.markAllAsTouched();
    if (this.assignTrainingForm.invalid) {
      this.toast.warning('Assign training', 'Complete employee, course name, and category.');
      return;
    }
    const values = this.assignTrainingForm.getRawValue();
    const record = this.workforce.assignTraining(values);
    this.assignTrainingForm.patchValue({ courseName: '' });
    this.toast.success(
      'Training assigned',
      `${record.courseName} queued for ${this.hr.employeeName(record.employeeId)}.`,
    );
  }
}
