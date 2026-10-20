import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/user.model';
import { AuthService } from '../services/auth.service';

export function roleGuard(allowed: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (auth.hasRole(allowed)) {
      return true;
    }

    const role = auth.role();
    if (role) {
      return router.createUrlTree([auth.landingRouteFor(role)]);
    }

    return router.createUrlTree(['/login']);
  };
}
