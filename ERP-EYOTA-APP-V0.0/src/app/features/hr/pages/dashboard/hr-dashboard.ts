import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent, DemoNoticeComponent],
  templateUrl: './hr-dashboard.html',
  styleUrl: './hr-dashboard.css',
})
export class HrDashboardPage implements OnInit {
  private readonly hr = inject(HrMockService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly stats = this.hr.stats;

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
  }

  openHire(): void {
    void this.router.navigateByUrl('/hr/master/employees/new');
  }
}
