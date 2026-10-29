# Angular Frontend Modules Report — Singapore Workright HR ERP

**Scope:** Angular frontend only (ERP-EYOTA-APP-V0.0). No Java / Spring Boot / PostgreSQL changes.  
**Build:** `npm run build` — **PASSED** (2026-10-23).  
**Persistence:** Shared `EmployeeMockService` workforce store + `localStorage` demo keys (not a live backend).

---

## 1. Pages & components created or updated

### Created
| Path | Purpose |
|------|---------|
| `features/hr/pages/employee-detail/*` | Employee 360° detail (overview, docs, history, on/offboarding, related leave/claims/payroll/compliance/projects) |
| `features/hr/pages/projects/*` | Project Manpower dashboard, requests, allocate/reassign, conflicts |

### Updated
| Path | Purpose |
|------|---------|
| `features/hr/pages/directory/*` | **Employee Management** KPI dashboard + filters (dept, designation, status, pass, location, branch, project) + add/edit |
| `features/hr/pages/payroll/*` | Payroll Control KPIs, workflow strip, exception queue, validate → review → authorize → finalize |
| `features/hr/pages/compliance/*` | MOM vs ICA agency filters, verify / needs-review, reminders |
| `features/hr/pages/dashboard/hr-dashboard.html` | Quick links to Employee Mgmt, Projects, Payroll Control, MOM/ICA |
| `features/hr/hr.routes.ts` / `hr-shell.ts` | Routes + nav for detail, projects; Admin may open HR modules |
| `features/admin/pages/master-data/*` | Org masters + catalogs (employee / payroll / compliance / project) |
| `features/admin/admin-shell.ts` | Nav links into HR Employee Mgmt, Projects, Compliance, Payroll |
| `features/employee/pages/dashboard/*` | Workflow deep-links + project assignments + compliance tasks |
| `core/models/hr.model.ts` | Lifecycle, projects, manpower, payroll exceptions, management stats |
| `core/models/admin.model.ts` | `MasterCatalogs` |
| `core/services/employee-mock.service.ts` | Seed + APIs for stats, projects, manpower, exceptions, compliance verify |
| `core/services/hr-mock.service.ts` | `managementStats` |
| `core/services/admin-mock.service.ts` | `updateMasterCatalogs`, `updateOrgMasters` |
| `core/services/system-policies.defaults.ts` | `projects` HR module + default catalogs |

---

## 2. Masters reused vs new

### Reused (existing Admin / policies)
- Departments, branches, cost centres, job grades  
- Leave policies, claim limits, holidays  
- Deduction codes, asset categories  
- Statutory payroll period open/close (Admin → Payroll Controls)  
- Single Employee Master (`directory` + `profiles`) — **no second master**

### New frontend catalogs (Admin → Master Data)
- Employment status / type, document types  
- Salary components  
- Compliance categories, work-pass categories  
- Project roles, skills, allocation types, project statuses/sites, required certifications  

---

## 3. Routes & navigation

### HR (`roleGuard(['hr','admin'])`)
- `/hr/master/directory` — Employee Management  
- `/hr/master/directory/:id` — Employee detail  
- `/hr/master/projects` — Project Manpower  
- `/hr/master/payroll` — Payroll Control  
- `/hr/master/compliance` — MOM / ICA Compliance  
- Existing: dashboard, leave, attendance, documents, claims, onboarding, assets, reports  

### Admin
- Existing hubs unchanged  
- Sidebar shortcuts to HR modules above  
- Master Data expanded catalogs  

### Employee ESS
- Dashboard links: leave, claims, profile, documents, attendance, payslips, notifications  
- Shows personal project allocations + compliance tasks from shared store  

---

## 4. API endpoints reused (frontend mock adapters)

All via `EmployeeMockService` / `HrMockService` / `AdminMockService` (no HTTP backend):

| Capability | Method(s) |
|------------|-----------|
| Employee CRUD / status | `createEmployee`, `updateEmployee`, `setEmployeeLifecycleStatus` |
| EM KPIs | `getEmployeeManagementStats` |
| Payroll lifecycle | `advancePayroll`, `refreshPayrollExceptions`, `resolvePayrollException` |
| Compliance | `sendRenewalReminder`, `verifyComplianceItem` |
| Projects | `upsertProject`, `createManpowerRequest`, `decideManpowerRequest`, `allocateEmployee`, `endAllocation` |
| Policies / catalogs | `patchPolicies`, `updateMasterCatalogs`, `updateOrgMasters` |
| Cross-role ESS | Existing leave/claims/docs/payslip/profile methods |

---

## 5. Missing API / backend dependencies

Documented for a future Spring Boot integration (UI does **not** invent successful remote responses):

1. Real REST Employee Master CRUD + document binary storage  
2. Payroll engine (CPF Board, SDL, GIRO) — currently simulated rates only  
3. MOM / ICA statutory submission & verification APIs  
4. Project ERP / timesheet conflict engine beyond demo allocation % rules  
5. Reminder escalation email/SMS gateway  
6. Role permissions from server (frontend guards are not authorization)  
7. Payslip PDF generation / authorized download ACLs  

---

## 6. Role-wise UI permissions

| Role | Access |
|------|--------|
| **Employee** | ESS only; own payslips, leave/claims status, docs upload, personal compliance tasks, assigned projects |
| **HR** | Full HR ops including Employee Management, Payroll Control, MOM/ICA, Project Manpower (module visibility also Admin-toggleable via `hrModules`) |
| **Admin** | Admin hubs + Master Data catalogs + Payroll Controls lock; may open HR modules (`roleGuard` allows admin on `/hr/*`) for oversight |

Unauthorized roles are redirected by `roleGuard` to their landing route.

---

## 7. Build & tests

- `npm run build` — **success**  
- Unit tests: scaffold present; run `npm test` for Vitest suite (demo app has limited component specs)

---

## 8. Remaining issues / manual steps

1. **Demo data refresh:** If KPIs look stale, use Admin → Master Data → **Full demo reset** (clears `localStorage` workforce seed).  
2. **Figma board** could not be fetched in-session; layout follows dusty-blue design system + prompt KPI cards.  
3. Theme options A/B/C were never confirmed — app remains on current `#5D93B5` / `#B2A3A3` tokens.  
4. Admin viewing `/hr/*` uses HR shell chrome (by design for shared components).  
5. No real backend — all persistence is browser demo storage only.

### Suggested manual smoke (after `ng serve`)
1. Login `hr@eyota.sg` → Employee Management → Add / Edit / open detail  
2. Login `admin@eyota.sg` → Master Data catalogs + open Employee Mgmt / Payroll via sidebar  
3. Payroll → Validate → exceptions → HR review → Authorize → Finalize  
4. Compliance → filter ICA → Verify / Remind  
5. Projects → request → approve → allocate (conflict if >100%)  
6. Login `employee@eyota.sg` → dashboard status / payslips / documents after HR actions  
