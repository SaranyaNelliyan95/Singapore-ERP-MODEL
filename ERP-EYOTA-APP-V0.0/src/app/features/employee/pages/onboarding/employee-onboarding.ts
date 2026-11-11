import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  OnboardingApiService,
  OnboardingDetailDto,
} from '../../../../core/services/onboarding-api.service';
import { EmployeeReadinessService } from '../../../../core/services/employee-readiness.service';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-employee-onboarding',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent, StatusBadgeComponent],
  templateUrl: './employee-onboarding.html',
  styleUrl: './employee-onboarding.css',
})
export class EmployeeOnboardingPage implements OnInit, OnDestroy {
  private readonly api = inject(OnboardingApiService);
  private readonly readiness = inject(EmployeeReadinessService);
  private readonly toast = inject(ToastService);

  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly detail = signal<OnboardingDetailDto | null>(null);
  readonly missing = signal(false);
  readonly ppeFile = signal<File | null>(null);
  readonly ppePreviewUrl = signal<string | null>(null);
  readonly ppeStoredUrl = signal<string | null>(null);
  private previewObjectUrl: string | null = null;
  private storedObjectUrl: string | null = null;

  ngOnInit(): void {
    if (!this.useBackend) {
      this.loading.set(false);
      return;
    }
    void this.reload().finally(() => this.loading.set(false));
  }

  ngOnDestroy(): void {
    this.clearPreview();
    this.clearStored();
  }

  async confirmArrival(): Promise<void> {
    this.saving.set(true);
    try {
      this.detail.set(await firstValueFrom(this.api.confirmArrival()));
      this.toast.success('Arrival', 'Arrival confirmed. Thank you.');
    } catch (err) {
      this.toast.danger('Arrival', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  contractAcked(d: OnboardingDetailDto): boolean {
    return (
      d.acknowledgements?.some((a) => a.ackType?.toUpperCase() === 'CONTRACT' && a.acknowledged) ||
      d.tasks.some(
        (t) =>
          t.taskCode === 'CONTRACT_ACK' &&
          (t.status === 'COMPLETED' || t.status === 'NOT_APPLICABLE'),
      )
    );
  }

  arrivalDone(d: OnboardingDetailDto): boolean {
    return d.tasks.some(
      (t) =>
        (t.taskCode === 'ARRIVAL' || t.title?.toLowerCase().includes('arrival')) &&
        t.status === 'COMPLETED',
    );
  }

  async ackContract(): Promise<void> {
    if (this.detail() && this.contractAcked(this.detail()!)) {
      this.toast.success('Contract', 'Already acknowledged.');
      return;
    }
    this.saving.set(true);
    try {
      this.detail.set(await firstValueFrom(this.api.ackContract()));
      await this.readiness.refresh();
      this.toast.success('Contract', 'Employment contract acknowledged. HR can now clear this gate.');
    } catch (err) {
      this.toast.danger('Contract', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  onPpePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.ppeFile.set(file);
    this.clearPreview();
    if (file) {
      this.previewObjectUrl = URL.createObjectURL(file);
      this.ppePreviewUrl.set(this.previewObjectUrl);
    }
  }

  async confirmPpeWithPhoto(): Promise<void> {
    const file = this.ppeFile();
    if (!file) {
      this.toast.warning('PPE', 'Please take or upload a photo first.');
      return;
    }
    this.saving.set(true);
    try {
      this.detail.set(await firstValueFrom(this.api.confirmPpePhoto(file)));
      this.toast.success('PPE', 'PPE photo confirmation saved. HR will verify it.');
      this.ppeFile.set(null);
      this.clearPreview();
      await this.loadStoredPpePhoto();
    } catch (err) {
      this.toast.danger('PPE', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  async download(docId: string, fileName: string): Promise<void> {
    try {
      const blob = await firstValueFrom(this.api.downloadMyDocument(docId));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.toast.danger('Download', err instanceof Error ? err.message : 'Failed');
    }
  }

  private async reload(): Promise<void> {
    try {
      this.detail.set(await firstValueFrom(this.api.myOnboarding()));
      this.missing.set(false);
      await this.loadStoredPpePhoto();
      await this.readiness.refresh();
    } catch {
      this.missing.set(true);
      this.detail.set(null);
      await this.readiness.refresh();
    }
  }

  private async loadStoredPpePhoto(): Promise<void> {
    const photo = this.detail()?.ppePhoto;
    this.clearStored();
    if (!photo) return;
    try {
      const blob = await firstValueFrom(this.api.downloadMyDocument(photo.documentId));
      this.storedObjectUrl = URL.createObjectURL(blob);
      this.ppeStoredUrl.set(this.storedObjectUrl);
    } catch {
      // listed in detail even if download fails
    }
  }

  private clearPreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.ppePreviewUrl.set(null);
  }

  private clearStored(): void {
    if (this.storedObjectUrl) {
      URL.revokeObjectURL(this.storedObjectUrl);
      this.storedObjectUrl = null;
    }
    this.ppeStoredUrl.set(null);
  }

  friendlyStatus(pipeline: string | null | undefined): string {
    switch ((pipeline || '').toUpperCase()) {
      case 'DRAFT':
        return 'Draft';
      case 'DOCUMENTS_PENDING':
        return 'Documents Pending';
      case 'APPLICATION_SUBMITTED':
        return 'Application Submitted';
      case 'IPA_APPROVED':
        return 'IPA Approved';
      case 'PRE_ARRIVAL_PENDING':
        return 'Pre-Arrival';
      case 'READY_FOR_TRAVEL':
        return 'Ready for Travel';
      case 'ARRIVED_IN_SINGAPORE':
        return 'Arrived';
      case 'POST_ARRIVAL_PENDING':
        return 'Post-Arrival';
      case 'WORK_PERMIT_ISSUED':
        return 'Work Permit Issued';
      case 'ONBOARDING_IN_PROGRESS':
        return 'Onboarding In Progress';
      case 'READY_TO_WORK':
        return 'Ready to Work';
      case 'CANCELLED':
        return 'Cancelled';
      case 'ON_HOLD':
        return 'On Hold';
      default:
        return pipeline || 'Draft';
    }
  }
}
