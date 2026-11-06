# Session progress — Figma/PDF alignment + API wiring

## Verified design sources

- Live Figma board: **not accessible** from this environment.
- Used user PDFs: `Untitled (1).pdf`, `Untitled (2).pdf` → four screens documented in `PHASE1-FIGMA-MAPPING.md`.

## Completed in this pass

1. Phase 1 mapping report: `docs/PHASE1-FIGMA-MAPPING.md`
2. HR nav restructured to Figma IA: Overview / People / Compliance / Operations / Reports
3. Employee Directory KPIs aligned to Screen A (headcount local/foreign, pass renewals, BCA demo %, OT flags)
4. Compliance page reshaped to Screen C (pass buckets, Workright checklist, BCA matrix)
5. Payroll stepper labels → Screen B; Project Manpower KPIs → Screen D
6. Angular API services: `employee-api`, `leave-api`, `claims-api`; `BackendHttpService` PUT/DELETE
7. Dual-mode: HR directory create (API), employee leave submit, HR leave approve/reject
8. Frontend `ng build`: **passed**

## Not finished (honest gaps)

| Item | Status |
|------|--------|
| Live Figma board contents beyond the 4 PDF screens | Unverified |
| Recruitment, Performance, L&D, Fleet, Billing, Procurement | Deferred (nav labels only in PDF) |
| Directory list merge from `GET /employees` | Pending |
| Work-pass / NRIC columns on `employees` table | Schema gap — UI pass type ≠ backend `employment_type` |
| Claims dual-mode UI | Service ready; pages still mock-first |
| Payroll CPF/FWL/SDL statutory rates | Placeholders only |
| MOM/CorpPass integrations | Stubs / disabled buttons |
| Inspection pack PDF/ZIP | Disabled until generator exists |
| `useBackendApi` default | Still `false` — set `true` when Spring Boot + Postgres are up |

## How to run (API mode)

1. PostgreSQL with credentials matching `backend/src/main/resources/application.yml` (or `DB_USER` / `DB_PASSWORD` / `DB_URL`).
2. Backend: `cd backend` → set Active profile `dev` → `.\mvnw.cmd spring-boot:run`
3. Frontend: set `useBackendApi: true` in `ERP-EYOTA-APP-V0.0/src/environments/environment.ts`
4. `npm start` in `ERP-EYOTA-APP-V0.0` (proxy `/api` → `:8080`)
5. Login: `employee@eyota.sg` / `Employee@123`, `hr@eyota.sg` / `HrManager@123`, `admin@eyota.sg` / `Admin@123`
