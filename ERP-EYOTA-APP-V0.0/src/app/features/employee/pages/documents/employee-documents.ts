import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTableColumn } from '../../../../core/models/common.model';
import { EmployeeDocument } from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../shared/demo-notice';

const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'];

@Component({
  selector: 'app-employee-documents',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    LoadingSpinnerComponent,
    DemoNoticeComponent,
  ],
  templateUrl: './employee-documents.html',
  styleUrl: './employee-documents.css',
})
export class EmployeeDocumentsPage implements OnInit {
  private readonly employeeService = inject(EmployeeMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly fileError = signal<string | null>(null);
  readonly selectedFileName = signal<string | null>(null);
  readonly ws = this.employeeService.workspace;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    category: ['Certification' as EmployeeDocument['category'], Validators.required],
  });

  readonly columns: DataTableColumn<EmployeeDocument>[] = [
    { key: 'name', label: 'Document', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'fileName', label: 'File' },
    {
      key: 'uploadedOn',
      label: 'Uploaded',
      format: (row) => formatSgDate(row.uploadedOn),
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
          row.status === 'Verified'
            ? 'success'
            : row.status === 'Pending'
              ? 'warning'
              : 'danger',
      }),
    },
    { key: 'sizeLabel', label: 'Size' },
  ];

  ngOnInit(): void {
    this.employeeService.getWorkspace().subscribe(() => this.loading.set(false));
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.fileError.set(null);
    this.selectedFileName.set(null);

    if (!file) {
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      this.fileError.set('Only PDF, PNG, or JPG files are accepted in this demo.');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.fileError.set('File must be 5 MB or smaller (demo limit).');
      input.value = '';
      return;
    }

    this.selectedFileName.set(file.name);
  }

  upload(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.warning('Document form', 'Provide a document name and category.');
      return;
    }
    if (!this.selectedFileName()) {
      this.fileError.set('Choose a file to upload.');
      this.toast.warning('File required', 'Select a PDF/PNG/JPG before uploading.');
      return;
    }
    if (this.fileError()) {
      return;
    }

    const values = this.form.getRawValue();
    const fileName = this.selectedFileName()!;
    this.employeeService.uploadDocument({
      name: values.name,
      category: values.category,
      fileName,
      sizeLabel: 'Demo upload',
    });

    this.form.reset({ name: '', category: 'Certification' });
    this.selectedFileName.set(null);
    this.fileError.set(null);
    this.toast.success('Upload queued', `${fileName} submitted for verification (mock).`);
  }

  download(doc: EmployeeDocument): void {
    this.toast.success(
      'Mock download',
      `Streaming ${doc.fileName} (${doc.sizeLabel}) — demo only.`,
    );
  }

  invalid(name: 'name' | 'category'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }
}
