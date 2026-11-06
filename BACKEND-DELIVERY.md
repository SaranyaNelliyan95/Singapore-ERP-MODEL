# Backend Delivery Report — Eyota Workright HR ERP

**Date:** 23 October 2026  
**Frontend preserved at:** `ERP-EYOTA/ERP-EYOTA-APP-V0.0` (not moved/renamed)  
**Backend created at:** `ERP-EYOTA/backend`

---

## 1. Phase 0 GPS investigation (complete)

| Check | Result |
|-------|--------|
| Browser `navigator.geolocation` | **Was missing** — only simulated `gpsEnabled` flag |
| Lat/lng/accuracy capture | **Was missing** |
| Backend geofence | **Was missing** |
| Persistent attendance | **Was missing** (localStorage mock) |

**Implemented:** real GeolocationService + Spring Boot GPS attendance with Haversine geofencing and PostgreSQL persistence.

---

## 2. Versions

| Component | Version |
|-----------|---------|
| Spring Boot | **4.1.2** (stable; not 4.2.0-RC1) |
| Java | **21** LTS |
| Angular frontend | 22.2 (unchanged major) |
| Build | Maven Wrapper (`mvnw`) |

---

## 3. Backend location & structure

```text
ERP-EYOTA/
├── ERP-EYOTA-APP-V0.0/          # existing Angular (unchanged location)
├── backend/
│   ├── pom.xml
│   ├── README.md
│   ├── .env.example
│   ├── mvnw / mvnw.cmd
│   └── src/main/java/sg/eyota/workright/
│       ├── config/ security/ common/ auth/
│       ├── attendance/          # GPS + workplaces (Phase 1 priority)
│       ├── employee/ leave/ claims/ payroll/
│       ├── compliance/ project/ masterdata/
│       ├── documents/ workflow/ audit/
│       └── WorkrightHrApplication.java
│   └── src/main/resources/
│       ├── application.yml
│       ├── application-dev.yml
│       └── db/migration/V1__init_schema.sql
├── BACKEND-PHASE0-INVENTORY.md
└── BACKEND-DELIVERY.md
```

---

## 4. PostgreSQL setup

```sql
CREATE DATABASE eyota_hr;
CREATE USER eyota WITH ENCRYPTED PASSWORD 'change_me';
GRANT ALL PRIVILEGES ON DATABASE eyota_hr TO eyota;
-- On PG 15+: also grant schema privileges on public
```

Copy `backend/.env.example` → set `DB_*`, `JWT_SECRET` (32+ chars).

Flyway runs `V1__init_schema.sql` on startup. Hibernate `ddl-auto: validate` — **no drop/truncate**.

---

## 5. Start backend

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:JWT_SECRET = "local_dev_secret_key_at_least_32_chars"
cd backend
.\mvnw.cmd spring-boot:run
```

- API base: `http://localhost:8080/api/v1`  
- Health: `http://localhost:8080/actuator/health`  
- OpenAPI UI: **not enabled** in this build (document as optional follow-up)

### Dev seed users (`profile=dev` only)

| Email | Password | Role |
|-------|----------|------|
| employee@eyota.sg | Employee@123 | EMPLOYEE (EY-1042) |
| hr@eyota.sg | HrManager@123 | HR |
| admin@eyota.sg | Admin@123 | ADMIN |

Workplaces: HQ Science Park (1.2916, 103.7803, 200 m, GPS MANDATORY), Jurong (1.27, 103.72, 300 m).

---

## 6. GPS clock workflow

1. Employee authenticates (JWT).  
2. Presses Clock In/Out → frontend requests `navigator.geolocation.getCurrentPosition`.  
3. Permission denied / unavailable / timeout / inaccurate → **blocked** with actionable message (app cannot enable device GPS).  
4. Coordinates + accuracy + client timestamp + work mode posted to backend.  
5. Backend derives employee from JWT (not from body), validates accuracy, resolves workplace, Haversine vs radius.  
6. Outside mandatory geofence → reject + `attendance_reject_audit` row.  
7. Success → session saved; **server Instant** is authoritative.  
8. Duplicate OPEN clock-in / clock-out without OPEN session → conflict/error.  
9. WFH allowed only if workplace `wfh_allowed` — not an automatic bypass.

**HTTPS note:** browsers require secure context (HTTPS or localhost) for geolocation.

**Spoofing honesty:** browser GPS alone is not tamper-proof; documented in UI toast.

---

## 7. Angular integration files changed

| File | Change |
|------|--------|
| `src/environments/environment.ts` | `useBackendApi` flag + GPS timeouts |
| `src/environments/environment.prod.ts` | production API flag |
| `proxy.conf.json` | `/api` → `localhost:8080` |
| `angular.json` | serve `proxyConfig` |
| `src/app/app.config.ts` | `provideHttpClient()` |
| `src/app/core/services/geolocation.service.ts` | **new** real GPS |
| `src/app/core/services/backend-http.service.ts` | **new** JWT HTTP |
| `src/app/core/services/attendance-api.service.ts` | **new** attendance API |
| `src/app/core/services/auth.service.ts` | `loginAsync` backend path |
| `src/app/features/auth/login/login.ts` | uses `loginAsync` |
| `src/app/features/employee/pages/attendance/*` | GPS + API clocking when enabled |

**Enable API mode:** set `useBackendApi: true` in `environment.ts`, run backend + `ng serve` (proxy).

Default remains `false` so the existing demo mock still runs without PostgreSQL.

---

## 8. API groups implemented

| Group | Paths |
|-------|--------|
| Auth | `/api/v1/auth/login`, `/logout`, `/me` |
| Attendance | `/attendance/clock-in`, `clock-out`, `/me`, `/me/today`, `/me/history` |
| HR attendance | `/hr/attendance`, `/hr/attendance/{id}/correct` |
| Workplaces | `/admin/workplaces` CRUD |
| Employees | `/employees`, `/employees/me` |
| Leave / claims / payroll / compliance / projects / masterdata / documents / audit | present under `/api/v1/...` (JPA-backed; deepen as needed) |

---

## 9. Test results

### Backend
```text
mvnw test → BUILD SUCCESS (previously 12 tests: GeoUtils, Geofence policy, AttendanceService mocks, context load)
```
Re-run after local changes with JDK 21. Integration against live PostgreSQL requires a running DB (not available in this environment — Docker/Postgres not installed).

### Frontend
```text
npm run build → SUCCESS (after GPS attendance wiring)
```

### GPS acceptance (manual / environment-limited)

| # | Scenario | Status |
|---|----------|--------|
| 1–7 | Permission, geofence, accuracy, duplicate in/out | Covered by service + geofence unit tests; full E2E needs browser + PG |
| 8 | Cannot submit another employee ID | Enforced via JWT identity |
| 9–11 | Persist + HR vs self scope | Implemented; verify with PG |
| 12–14 | Correction audit, refresh, idempotency | Correction API + unique session date; refresh-safe DB |

---

## 10. What is NOT production-ready yet

- No managed PostgreSQL / TLS / secrets vault in this workspace  
- Full Angular modules still largely on mock store until `useBackendApi` expanded module-by-module  
- No real MOM/ICA/CPF/bank integrations (by design)  
- OpenAPI UI not packaged  
- Browser GPS is not anti-spoof  
- Bootstrap admin only when env vars set; no public default admin in production config  

---

## 11. Run frontend + backend together

1. Start PostgreSQL + create `eyota_hr`  
2. Start backend with `SPRING_PROFILES_ACTIVE=dev`  
3. Set `useBackendApi: true` in `ERP-EYOTA-APP-V0.0/src/environments/environment.ts`  
4. `cd ERP-EYOTA-APP-V0.0 && npm start` (proxy forwards `/api`)  
5. Login as `employee@eyota.sg` / `Employee@123`  
6. Attendance → allow location → Clock in near HQ coords (or adjust workplace radius for your real position during local test)
