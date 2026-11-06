# Master enrollment implementation — acceptance summary

## Implemented functionality

- HR enrolls employees via Angular → `POST /api/v1/hr/employees` (PostgreSQL).
- Backend generates concurrency-safe **EYB1, EYB2, …** employee IDs (`employee_code_sequence`).
- Employment status starts as **PENDING**; account status **INVITATION_PENDING** until OTP + password.
- Invitation email via SMTP when `MAIL_ENABLED=true`; otherwise email is logged and OTP is written to logs (dev). With `SPRING_PROFILES_ACTIVE=dev`, OTP may also appear in the enroll API as `debugOtpPreview`.
- OTP: hashed (BCrypt), 10-minute TTL, single-use, max 5 attempts, resend revokes previous.
- After OTP verify → short-lived **activation token** → `POST /auth/complete-registration` sets password and activates login (employment stays PENDING).
- Employee **My Profile** loads/saves via `/employees/me` and `/employees/me/profile`.
- Admin **Master Data** leave defaults (Annual 7 / Sick 7 / Hospitalisation 60) via `/admin/master-data/leave-configurations` (Sick flagged for statutory review).
- **Payroll readiness** via `GET /hr/employees/{id}/payroll-readiness` (basic pay, salary period, payment mode, banking rules).
- Forgot / reset password OTP flow (`/auth/forgot-password`, `/auth/reset-password`).

## Migrations

| Version | File | Purpose |
|--------|------|---------|
| V3 | `V3__enrollment_profile_leave_payroll.sql` | EYB sequence, employee profile/payroll columns, activation tokens, leave_configurations seed |
| V4 | `V4__password_reset_tokens.sql` | Password reset OTP storage |

Do not edit V1/V2 if already applied.

## Environment variables

See `backend/.env.example`. Critical:

```
DB_URL / DB_USER / DB_PASSWORD
SERVER_PORT=8080
JWT_SECRET
MAIL_ENABLED / SMTP_* / MAIL_FROM
ACTIVATE_BASE_URL=http://localhost:4200/activate
ENROLLMENT_OTP_TTL_MINUTES=10
ENROLLMENT_EXPOSE_OTP=true   # local only
SPRING_PROFILES_ACTIVE=dev
```

## Start commands

```powershell
# Backend (8080 was in use on this machine — default proxy targets 8081)
cd backend
$env:SPRING_PROFILES_ACTIVE="dev"
$env:SERVER_PORT="8081"
.\mvnw.cmd spring-boot:run

# Frontend (proxy → :8081 via proxy.conf.json)
cd ERP-EYOTA-APP-V0.0
npm start
```

## Smoke test (verified locally)

Against `http://localhost:8081` with `dev` profile:

- Enroll → **EYB2**, invitation SENT, OTP in `debugOtpPreview`
- Verify OTP → activation token → complete registration → login JWT as EMPLOYEE
- Profile PUT persisted (`mobile`, `nationality`); employment status remained **PENDING**
- Payroll readiness returned `ready=false` with 4 missing fields
- Admin leave configs: ANNUAL=7, SICK=7, HOSPITALISATION=60
- Flyway at **v4**

## Postman

Import `postman/Workright-Enrollment.postman_collection.json`.

## Tests run

| Suite | Result |
|-------|--------|
| `PayrollReadinessServiceTest` | Pass |
| `AttendanceGeofencePolicyTest`, `GeoUtilsTest`, `AttendanceServiceTest` | Pass |
| `ng build` (development) | Pass |
| Full SMTP E2E / live DB migrate in this session | Depends on local Postgres + SMTP; start backend with `dev` profile to apply V3/V4 |

## Remaining / production notes

- Configure real SMTP before production; set `ENROLLMENT_EXPOSE_OTP=false` and `MAIL_ENABLED=true`.
- Review **7-day sick leave** default against Singapore EA before go-live.
- Do not invent CPF/tax rates — payroll readiness blocks incomplete data; statutory calculation packs are separate.
- Forgot/reset password UI screens are API-ready; wire Angular pages if not already present.
- Payslip *generation* still requires configured statutory rules; readiness validation is implemented.
