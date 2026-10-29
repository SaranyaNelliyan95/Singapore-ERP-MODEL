# Phase 1 — Inspection findings & Figma-to-ERP page mapping

**Date:** 2026-10-27  
**Figma board URL:** https://www.figma.com/board/hoKSye4XKCS6mOsqOUFWoZ/Untitled?node-id=0-1  
**Figma live board:** Not accessible from this environment (fetch blocked / timed out).  
**Design source used instead:** user-provided PDF exports  
- `Downloads/Untitled (1).pdf` → copied as `figma-ref-1.pdf` (Employee Management + Singapore Payroll Operations)  
- `Downloads/Untitled (2).pdf` → copied as `figma-ref-2.pdf` (MOM & BCA Compliance Command + Project Manpower & Field Operations)  

PDFs are **image boards** (no extractable text). Screens were rendered to PNG under `docs/figma-extract/` and inspected visually. Anything not visible on those four screens is marked **unverified**.

---

## 1. Existing application snapshot

| Layer | Finding |
|-------|---------|
| Frontend | Angular 22.2 standalone app in `ERP-EYOTA-APP-V0.0` — Employee / HR / Admin shells, Tailwind + dusty-blue design tokens |
| Data mode | Default `environment.useBackendApi: false` — most HR/Employee pages use `EmployeeMockService` / `HrMockService` / `AdminMockService` + localStorage |
| API wiring today | Login + GPS attendance can call Spring Boot when `useBackendApi: true`; proxy `/api` → `localhost:8080` |
| Backend | Spring Boot 4.1.2 / Java 21 / JPA / Flyway / JWT in `backend/` — employees, attendance (GPS geofence), leave, claims, payroll, compliance, projects, masterdata, documents, audit |
| Auth roles | `employee`, `hr`, `admin` (frontend) ↔ `EMPLOYEE`, `HR`, `ADMIN` (backend) |

### Workspace routes present

- **Employee:** dashboard, profile, attendance, leave, payslips, documents, claims, more  
- **HR:** dashboard, directory (+ detail), projects, compliance, leave, attendance, payroll, documents, claims, onboarding, assets, reports  
- **Admin:** dashboard, company, users, master-data, workflows, integrations, payroll-controls, audit, archive, backup, hr-access, health (+ deep links into HR modules)

---

## 2. Verified Figma/PDF screens (only these four)

### Screen A — Employee Management (`pdf1` top)
- Sidebar sections: Overview · People · Compliance · Operations · Business  
- KPIs: Total Headcount (Local/Foreign), MOM Pass Renewals, BCA CoreTrade ratio, OT/EA overtime risk, DRC ratio  
- Actions: Bulk Actions, Export MOM Register, Import CSV/Excel, Add Employee  
- Directory table + right-side employee dossier (pass/FIN, certs, site assignment)  
- Bulk bar: Batch Assign Site, Batch Export Payslips, Bulk Verification  

### Screen B — Singapore Payroll Operations (`pdf1` bottom)
- Stepper: Draft & Timesheets → Statutory Validation → Executive Review → Director Approval → Bank GIRO Release  
- Tiles: Gross, CPF, Foreign Worker Levy, SDL, Net (values in mockups are **demo figures**, not statutory truth)  
- Register + itemised payslip preview; actions Export GIRO / Generate MOM CPF / Approve cycle  

### Screen C — MOM & BCA Compliance Command (`pdf2` top)
- KPIs: MOM Readiness, Quota Ceiling, Passes Expiring &lt;30D, BCA CoreTrade, WSH BizSafe  
- Work-pass expiry pipeline with day buckets  
- BCA multi-skilling matrix by project/site  
- Workright checklist + “Inspection Pack” download affordance (UI only until real pack generation exists)  

### Screen D — Project Manpower & Field Operations (`pdf2` bottom)
- KPIs: Total Deployed, Resource Gap, Overtime Hours, Site Incidents  
- Project cards with deployment ratios, CoreTrade/safety notes  
- Manpower mix / plant availability / site access panels  

### Figma nav items visible but **not** implemented as first-class pages yet

| Figma item | Decision |
|------------|----------|
| My Workspace, Notifications | Use Employee/HR dashboards + toast/activity; dedicated Notifications page **deferred** |
| Recruitment | Distinct from Onboarding in Figma — **needs confirmation** before building ATS |
| Performance, Learning & Dev | Visible in sidebar only — **deferred** (no workflow detail on PDFs) |
| Clients, Billing, Fleet, Procurement | Visible in sidebar only — **deferred** (out of HR vertical slice) |
| Timesheets | Map into Attendance + Project Manpower (no separate Figma screen detail) |
| Work Passes (nav) | Map as filter/tab on Compliance (same screen family) |
| Health & Safety | Partially covered by Assets & training + compliance WSH badge — **confirm** separate module later |

---

## 3. Page-mapping table

| Figma page / workflow | Existing Angular page/component | Proposed ERP location | User role | Dependencies | Missing functionality | Implementation action |
|----------------------|----------------------------------|------------------------|-----------|--------------|----------------------|----------------------|
| Employee Management | `hr/pages/directory` + `employee-detail` | HR → People → Employees | HR, Admin | Master data, projects, compliance | Figma KPIs (local/foreign, pass renewals, CoreTrade placeholder), dossier panel polish, bulk actions, API persistence | Enhance UI + wire `/employees` API |
| MOM & BCA Compliance Command | `hr/pages/compliance` | HR → Compliance | HR, Admin | Documents, work-pass fields, projects | Day-bucket tabs, BCA matrix, Workright checklist panel, inspection pack (placeholder) | Reshape page to match Screen C; no fake “compliant” without evidence |
| Project Manpower & Field Ops | `hr/pages/projects` | HR → Operations → Project Manpower | HR, Admin | Employees, attendance, allocations | Deployment KPIs, resource gap, card layout | Enhance toward Screen D; wire `/projects` when API mode on |
| Singapore Payroll Operations | `hr/pages/payroll` | HR → People → Payroll | HR, Admin | Attendance, leave, claims, configurable statutory rules | Stepper UX, CPF/FWL/SDL as **configurable placeholders**, GIRO export stub | Enhance UI; keep rates configurable; never invent statutory rates as law |
| Employee self-service (implied) | `employee/*` | Employee workspace | Employee | Auth, own records | Full API mode for leave/claims/payslips | Wire leave/claims APIs; keep ESS simple |
| Onboarding | `hr/pages/onboarding` | HR → People → Onboarding | HR | Employee create, documents, login provision | Backend user provision after create | Keep mock path; API create employee + document later |
| Attendance / GPS | `employee/attendance`, `hr/attendance` | People → Attendance | Emp / HR | Workplaces, geofence | HR review of backend sessions | Already partially wired; finish HR list against API |
| Leave | `employee/leave`, `hr/leave` | People → Leave | Emp / HR | Balances, approvals | Dual-mode API | Wire `/leave/*` |
| Claims | `employee/claims`, `hr/claims` | People → Claims | Emp / HR | Approvals | Dual-mode API | Wire `/claims/*` |
| Documents | `employee/documents`, `hr/documents` | Compliance → Documents | Emp / HR | Expiry | Real file storage | Backend entities exist; Blobs/files later |
| Admin master / users / audit | `admin/*` | Admin workspace | Admin | All modules | Some pages still mock-only | Wire masterdata + audit APIs incrementally |
| Recruitment | — | People → Recruitment | HR | — | No screen detail beyond nav label | **Confirm** before build |
| Performance / L&D / Fleet / Billing / Procurement | — | — | — | — | Sidebar labels only | **Deferred** — do not invent |

---

## 4. Role–permission matrix (target)

| Capability | Employee | HR | Admin |
|------------|----------|----|-------|
| Own profile, attendance, leave, claims, payslips, docs | Yes | — | — |
| Employee CRUD / onboarding | — | Yes | Yes |
| Leave/claims approve | — | Yes | Yes |
| Payroll prepare/approve | — | Yes | Yes (controls) |
| Compliance review | — | Yes | Yes |
| Project allocate | — | Yes | Yes |
| Users / roles / master data / audit / workflows | — | Limited (hr-access) | Yes |
| Backend enforcement | JWT + `@PreAuthorize` | Same | Same |

---

## 5. Workflow gap summary (vs master prompt)

| Workflow | Frontend today | Backend today | Gap |
|----------|----------------|---------------|-----|
| A Onboarding | Mock create + optional demo login | Employee CRUD exists; no full provision API UX | Connect create → persist → list; secure login provision |
| B Leave | Mock submit/approve | Full leave API | Wire Angular dual-mode |
| C Attendance GPS | Dual-mode employee clock | Geofence + persistence | HR API review UI; workplaces admin UX |
| D Claims | Mock | Full claims API | Wire Angular dual-mode |
| E Payroll | Mock runs | Periods/runs/payslips + **placeholder** calc | Configurable rules UI; mark CPF/FWL/SDL non-authoritative |
| F Compliance expiry | Mock verify/remind | Compliance items API | Align UI to Screen C; evidence-based status |
| G Project manpower | Mock allocate | Projects/allocations API | Align UI to Screen D; API mode |
| H Admin master | Mock localStorage | Departments/designations API | Wire admin master-data page |

---

## 6. Confirmation needed (do not invent)

1. **Recruitment** — ATS vs simple vacancy list?  
2. **Statutory CPF / FWL / SDL / DRC / CoreTrade minimums** — supply authoritative configurable tables; PDFs show demo percentages only.  
3. **MOM API / CorpPass / Singpass** — Figma shows “MOM API Connected”; treat as integration stubs until credentials exist.  
4. **Performance, Learning, Fleet, Billing, Procurement** — build only if business confirms scope.  
5. **Inspection Pack PDF/ZIP** — real generator vs download of stored dossier?

---

## 7. Implementation order (this session onward)

1. Publish this mapping (done).  
2. Restructure HR nav sections to match verified Figma IA (without adding deferred modules).  
3. Align Directory + Compliance + Projects + Payroll page chrome/KPIs to Screens A–D.  
4. Add Angular API services for employees, leave, claims; dual-mode on critical pages.  
5. Extend HTTP client (PUT); keep mock path when API off.  
6. Build/test; document remaining gaps honestly.
