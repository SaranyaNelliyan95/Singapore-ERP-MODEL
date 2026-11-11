import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EmployeeReadinessService } from '../services/employee-readiness.service';

/** Blocks attendance / leave / payslips / claims until Ready to Work. */
export const employeeReadyGuard: CanActivateFn = async (route) => {
  const readiness = inject(EmployeeReadinessService);
  const router = inject(Router);

  await readiness.ensureLoaded();

  if (readiness.readyToWork()) {
    return true;
  }

  const segment = String(route.routeConfig?.path ?? '')
    .split('/')
    .pop();
  if (segment && readiness.isGatedSegment(segment)) {
    return router.createUrlTree(['/employee/master/onboarding']);
  }
  return true;
};
