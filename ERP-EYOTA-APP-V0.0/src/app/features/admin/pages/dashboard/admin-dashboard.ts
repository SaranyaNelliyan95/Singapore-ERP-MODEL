import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { SgDatePipe } from '../../../../shared/pipes/sg-date.pipe';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent, StatusBadgeComponent, SgDatePipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboardPage implements OnInit {
  readonly admin = inject(AdminMockService);
  readonly loading = signal(true);
  readonly stats = this.admin.stats;

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => this.loading.set(false));
  }
}
