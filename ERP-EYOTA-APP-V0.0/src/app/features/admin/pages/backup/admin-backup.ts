import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { SgDatePipe } from '../../../../shared/pipes/sg-date.pipe';

@Component({
  selector: 'app-admin-backup',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, StatusBadgeComponent, SgDatePipe],
  templateUrl: './admin-backup.html',
  styleUrl: './admin-backup.css',
})
export class AdminBackupPage implements OnInit {
  readonly admin = inject(AdminMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);
  readonly loading = signal(true);

  readonly form = this.fb.nonNullable.group({
    schedule: ['', Validators.required],
    region: ['Singapore (ap-southeast-1)', Validators.required],
  });

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => {
      const backup = this.admin.system().backup;
      this.form.patchValue({ schedule: backup.schedule, region: backup.region });
      this.loading.set(false);
    });
  }

  saveSchedule(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const values = this.form.getRawValue();
    this.admin.updateBackupSchedule(values.schedule, values.region);
    this.toast.success('Backup schedule saved', `${values.region} · ${values.schedule}`);
  }

  triggerSnapshot(): void {
    if (this.admin.system().backup.status === 'Running') {
      this.toast.warning('Backup running', 'Wait for the current snapshot to finish.');
      return;
    }
    this.admin.triggerManualSnapshot();
    this.toast.success('Manual snapshot started', 'Progress timeline updating (Singapore region demo).');
  }
}
