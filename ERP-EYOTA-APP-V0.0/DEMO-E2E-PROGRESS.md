# Singapore HR ERP — E2E frontend completion progress

**Last updated:** 2026-10-20  
**App path:** `ERP-EYOTA-APP-V0.0`  
**Persistence:** Demo-only `localStorage` keys `eyota.demo.workforce.v1`, `eyota.demo.admin.v1`, `eyota.demo.provisionedUsers.v1` (not production storage).

## Completed

- Shared `WorkforceState` as single source of truth for employees, leave, claims, attendance, documents, bank/profile requests, payroll, assets, training, notifications, policies.
- Employee workflows: leave (balance on approve), claims (+ receipt policy), clock, documents, profile/bank requests, notifications, payslips after payroll finalize.
- HR workflows: directory create/edit, leave/claims/docs/bank/profile decisions, attendance OT, payroll Draft→Under Review→Approved→Finalized + payslip generation, onboarding activate + ESS login, assets/training, Workright CSV reports.
- Admin: policy sync to ESS/HR, user deactivate blocks login, HR module visibility, permission cell for Workright nav, audit log, full demo reset.
- Production build: **passing**.

## Remaining / out of scope for this frontend phase

- Real backend, JWT/OIDC, PostgreSQL, AWS.
- Dedicated Recruitment ATS, Performance appraisals, Project timesheets, H&S incident module (beyond training categories).
- Multi-step Manager→HR approval chain (workflow builder is config-only).
- Permission matrix does not yet gate every route (HR module visibility + Workright capability wired).
- Unit/e2e automation suite not expanded (Vitest scaffold present; no comprehensive E2E tests yet).

## Next implementation step (if continuing)

1. Add Vitest coverage for `EmployeeMockService` leave/claim/payroll transitions.
2. Optionally gate ESS nav items from Admin permission matrix.
3. Optional Manager portal only if product requires a fourth login role.
