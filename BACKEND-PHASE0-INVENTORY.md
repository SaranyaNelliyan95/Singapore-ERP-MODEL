# Phase 0 — Frontend Inventory & GPS Investigation

**Date:** 23 Oct 2026  
**Frontend root (unchanged):** `ERP-EYOTA/ERP-EYOTA-APP-V0.0`  
**Backend target:** `ERP-EYOTA/backend` (new, alongside frontend — frontend not moved)

## Stack
| Item | Value |
|------|-------|
| Angular | 22.2 |
| Node | 24.22.0 |
| UI | Tailwind 4, standalone components |
| Auth today | Demo `AuthService` + localStorage session (`eyota.hr.session`) |
| Data today | `EmployeeMockService` / Admin mock + localStorage |

## GPS investigation (mandatory)

| Capability | Present? |
|------------|----------|
| `navigator.geolocation.getCurrentPosition` | **No** |
| Permission prompt / denied handling | **No** |
| Capture lat/lng/accuracy | **No** |
| Send location to backend | **No** (no backend) |
| Server geofence validation | **No** |
| Persistent attendance | **No** (localStorage mock only) |

**Finding:** Attendance uses a **simulated** `gpsEnabled` boolean toggle (`toggleGps()`). Clock-in stores `gpsTracked: true/false` without coordinates. This must be replaced with real browser geolocation + backend geofencing.

## Frontend modules → backend needs

| Frontend | Backend module |
|----------|----------------|
| Login (employee/hr/admin) | Auth JWT + RBAC |
| ESS attendance clock | Attendance + Workplace GPS |
| Leave / claims | Leave, Claims, Workflow |
| Payslips / payroll UI | Payroll |
| Documents / compliance | Documents, Compliance |
| HR directory / employee detail | Employee Master |
| Project manpower | Project |
| Admin master data / workplaces | Master data, Workplace |
| Workright reports | Compliance export |

## Demo accounts (migration target)
- `employee@eyota.sg` → EMPLOYEE  
- `hr@eyota.sg` → HR  
- `admin@eyota.sg` → ADMIN  

Passwords must be hashed in DB; no public known default in production config.

## Spring Boot selection
Official docs (23 Oct 2026): **Spring Boot 4.1.2** stable. Avoid 4.2.0-RC1.  
Requires Java 17+ (prefer **Java 21 LTS**).
