import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkflowStage } from '../../../../core/models/admin.model';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-workflows',
  standalone: true,
  imports: [FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-workflows.html',
  styleUrl: './admin-workflows.css',
})
export class AdminWorkflowsPage implements OnInit {
  readonly admin = inject(AdminMockService);
  readonly toast = inject(ToastService);
  readonly loading = signal(true);
  readonly draft = signal<WorkflowStage[]>([]);

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => {
      this.draft.set(this.admin.system().workflows.map((w) => ({ ...w })));
      this.loading.set(false);
    });
  }

  update(index: number, patch: Partial<WorkflowStage>): void {
    this.draft.update((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  save(): void {
    this.admin.updateWorkflows(this.draft());
    this.toast.success('Workflows saved', 'Leave/Claims/Payroll approval hierarchies updated (demo).');
  }
}
