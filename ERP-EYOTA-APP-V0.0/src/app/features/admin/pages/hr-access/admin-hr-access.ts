import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HrModuleVisibility } from '../../../../core/models/admin.model';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-hr-access',
  standalone: true,
  imports: [FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-hr-access.html',
  styleUrl: './admin-hr-access.css',
})
export class AdminHrAccessPage implements OnInit {
  readonly admin = inject(AdminMockService);
  readonly toast = inject(ToastService);
  readonly loading = signal(true);
  readonly draft = signal<HrModuleVisibility[]>([]);

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => {
      this.draft.set(this.admin.policies().hrModules.map((m) => ({ ...m })));
      this.loading.set(false);
    });
  }

  toggle(index: number, visible: boolean): void {
    this.draft.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, visible } : row)),
    );
  }

  save(): void {
    this.admin.updateHrModules(this.draft());
    this.toast.success(
      'HR module visibility saved',
      'HR sidebar hides modules marked invisible on next navigation.',
    );
  }
}
