import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ManpowerRequest,
  ProjectAllocation,
  ProjectRecord,
} from '../../../../core/models/hr.model';
import { DataTableColumn } from '../../../../core/models/common.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

@Component({
  selector: 'app-hr-projects',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DataTableComponent,
    LoadingSpinnerComponent,
    ConfirmModalComponent,
    DemoNoticeComponent,
  ],
  templateUrl: './hr-projects.html',
  styleUrl: './hr-projects.css',
})
export class HrProjectsPage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly selectedProjectId = signal('');
  readonly projectFormOpen = signal(false);
  readonly requestFormOpen = signal(false);
  readonly allocateFormOpen = signal(false);
  readonly pendingRejectId = signal<string | null>(null);

  readonly selectedProject = computed(
    () =>
      this.hr.workforce().projects.find((p) => p.id === this.selectedProjectId()) ?? null,
  );

  readonly kpis = computed(() => {
    const state = this.hr.workforce();
    const active = state.projects.filter((p) => p.status === 'Active');
    const allocated = state.allocations.filter((a) => a.status === 'Active');
    const planned = active.reduce((sum, p) => sum + p.plannedHeadcount, 0);
    const openReq = state.manpowerRequests.filter((r) => r.status === 'Open').length;
    const filled = allocated.length;
    const unfilled = Math.max(0, planned - filled);
    const conflicts = allocated.filter((a) => {
      const others = allocated.filter(
        (o) => o.employeeId === a.employeeId && o.id !== a.id && o.allocationPct + a.allocationPct > 100,
      );
      return others.length > 0;
    }).length;
    const endingSoon = allocated.filter((a) => {
      if (!a.endDate) {
        return false;
      }
      const days = Math.ceil(
        (new Date(a.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      return days >= 0 && days <= 30;
    }).length;
    const certAlerts = active.reduce((n, p) => n + p.requiredCerts.length, 0);
    const available = state.directory.filter(
      (d) =>
        d.status !== 'Resigned' &&
        !allocated.some((a) => a.employeeId === d.employeeId && a.allocationPct >= 100),
    ).length;
    return {
      activeProjects: active.length,
      planned,
      allocated: filled,
      available,
      openRequests: openReq,
      unfilled,
      conflicts,
      endingSoon,
      certAlerts,
    };
  });

  readonly projectAllocations = computed(() => {
    const id = this.selectedProjectId();
    return this.hr.workforce().allocations.filter((a) => a.projectId === id);
  });

  readonly projectRequests = computed(() => {
    const id = this.selectedProjectId();
    return this.hr.workforce().manpowerRequests.filter((r) => r.projectId === id);
  });

  readonly projectForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    site: ['', Validators.required],
    status: ['Active' as ProjectRecord['status'], Validators.required],
    plannedHeadcount: [10, [Validators.required, Validators.min(1)]],
    startDate: ['', Validators.required],
    endDate: [''],
    requiredCerts: [''],
  });

  readonly requestForm = this.fb.nonNullable.group({
    role: ['', Validators.required],
    skill: ['', Validators.required],
    headcount: [1, [Validators.required, Validators.min(1)]],
    notes: [''],
  });

  readonly allocateForm = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
    role: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: [''],
    allocationPct: [100, [Validators.required, Validators.min(10), Validators.max(100)]],
  });

  readonly projectColumns: DataTableColumn<ProjectRecord>[] = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Project', sortable: true },
    { key: 'site', label: 'Site', sortable: true },
    { key: 'plannedHeadcount', label: 'Planned HC', align: 'center', sortable: true },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone: row.status === 'Active' ? 'success' : row.status === 'On Hold' ? 'warning' : 'neutral',
      }),
    },
  ];

  readonly requestColumns: DataTableColumn<ManpowerRequest>[] = [
    { key: 'role', label: 'Role', sortable: true },
    { key: 'skill', label: 'Skill' },
    { key: 'headcount', label: 'HC', align: 'center' },
    { key: 'requestedOn', label: 'Requested' },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Approved' || row.status === 'Filled'
            ? 'success'
            : row.status === 'Rejected'
              ? 'danger'
              : 'warning',
      }),
    },
  ];

  readonly allocationColumns: DataTableColumn<ProjectAllocation>[] = [
    { key: 'employeeId', label: 'Employee', sortable: true },
    { key: 'role', label: 'Role' },
    { key: 'startDate', label: 'Start' },
    {
      key: 'endDate',
      label: 'End',
      format: (row) => row.endDate ?? '—',
    },
    { key: 'allocationPct', label: '%', align: 'center' },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone: row.status === 'Active' ? 'success' : 'neutral',
      }),
    },
  ];

  readonly catalogs = computed(() => this.hr.workforce().policies.catalogs);

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => {
      const first = this.hr.workforce().projects[0];
      this.selectedProjectId.set(first?.id ?? '');
      this.loading.set(false);
    });
  }

  selectProject(id: string): void {
    this.selectedProjectId.set(id);
  }

  employeeName(id: string): string {
    return this.hr.employeeName(id);
  }

  openCreateProject(): void {
    const sites = this.catalogs()?.projectSites ?? [];
    this.projectForm.reset({
      name: '',
      code: 'PRJ-',
      site: sites[0] ?? '',
      status: 'Active',
      plannedHeadcount: 10,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      requiredCerts: '',
    });
    this.projectFormOpen.set(true);
  }

  saveProject(): void {
    this.projectForm.markAllAsTouched();
    if (this.projectForm.invalid) {
      this.toast.warning('Project', 'Complete required project fields.');
      return;
    }
    const v = this.projectForm.getRawValue();
    const project = this.workforce.upsertProject({
      name: v.name,
      code: v.code,
      site: v.site,
      status: v.status,
      plannedHeadcount: v.plannedHeadcount,
      startDate: v.startDate,
      endDate: v.endDate || null,
      requiredCerts: v.requiredCerts
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    this.selectedProjectId.set(project.id);
    this.projectFormOpen.set(false);
    this.toast.success('Project saved', `${project.code} · ${project.name}`);
  }

  openRequest(): void {
    if (!this.selectedProject()) {
      this.toast.warning('Manpower', 'Select a project first.');
      return;
    }
    const roles = this.catalogs()?.projectRoles ?? [];
    const skills = this.catalogs()?.skills ?? [];
    this.requestForm.reset({
      role: roles[0] ?? '',
      skill: skills[0] ?? '',
      headcount: 1,
      notes: '',
    });
    this.requestFormOpen.set(true);
  }

  saveRequest(): void {
    this.requestForm.markAllAsTouched();
    if (this.requestForm.invalid || !this.selectedProjectId()) {
      this.toast.warning('Request', 'Complete manpower request fields.');
      return;
    }
    const v = this.requestForm.getRawValue();
    const result = this.workforce.createManpowerRequest({
      projectId: this.selectedProjectId(),
      role: v.role,
      skill: v.skill,
      headcount: v.headcount,
      notes: v.notes,
    });
    if ('error' in result) {
      this.toast.danger('Request blocked', result.error);
      return;
    }
    this.requestFormOpen.set(false);
    this.toast.success('Manpower request', `${result.id} opened for approval.`);
  }

  approveRequest(id: string): void {
    if (this.workforce.decideManpowerRequest(id, true)) {
      this.toast.success('Approved', `Request ${id} approved — allocate staff next.`);
    } else {
      this.toast.danger('Approve failed', 'Request is not Open.');
    }
  }

  rejectRequest(id: string): void {
    this.pendingRejectId.set(id);
  }

  confirmReject(): void {
    const id = this.pendingRejectId();
    this.pendingRejectId.set(null);
    if (!id) {
      return;
    }
    if (this.workforce.decideManpowerRequest(id, false)) {
      this.toast.success('Rejected', `Request ${id} rejected.`);
    } else {
      this.toast.danger('Reject failed', 'Request is not Open.');
    }
  }

  openAllocate(): void {
    if (!this.selectedProject()) {
      return;
    }
    const staff = this.hr.workforce().directory.find((d) => d.status !== 'Resigned');
    const roles = this.catalogs()?.projectRoles ?? [];
    this.allocateForm.reset({
      employeeId: staff?.employeeId ?? '',
      role: roles[0] ?? '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      allocationPct: 100,
    });
    this.allocateFormOpen.set(true);
  }

  saveAllocate(): void {
    this.allocateForm.markAllAsTouched();
    if (this.allocateForm.invalid || !this.selectedProjectId()) {
      this.toast.warning('Allocation', 'Complete allocation fields.');
      return;
    }
    const v = this.allocateForm.getRawValue();
    const result = this.workforce.allocateEmployee({
      projectId: this.selectedProjectId(),
      employeeId: v.employeeId,
      role: v.role,
      startDate: v.startDate,
      endDate: v.endDate || null,
      allocationPct: v.allocationPct,
    });
    if ('error' in result) {
      this.toast.danger('Allocation conflict', result.error);
      return;
    }
    this.allocateFormOpen.set(false);
    this.toast.success('Allocated', `${result.employeeId} assigned at ${result.allocationPct}%.`);
  }

  endAllocation(id: string): void {
    if (this.workforce.endAllocation(id)) {
      this.toast.success('Allocation ended', id);
    } else {
      this.toast.danger('End failed', 'Allocation not active.');
    }
  }
}
