# Eyota Workright HR Backend

Spring Boot **4.1.2** / **Java 21** REST API for the Eyota Workright ERP (Singapore HR, attendance GPS, leave, claims, payroll).

## Prerequisites

- JDK 21
- PostgreSQL 14+ (local or managed)
- Maven (or use `./mvnw`)

## Database setup

```sql
CREATE DATABASE eyota_hr;
CREATE USER eyota WITH ENCRYPTED PASSWORD 'eyota';
GRANT ALL PRIVILEGES ON DATABASE eyota_hr TO eyota;
```

Schema is applied by **Flyway** (`src/main/resources/db/migration/V1__init_schema.sql`). Hibernate `ddl-auto` is `validate` only — no drop/truncate on startup.

## Configuration

Copy `.env.example` and export variables, or set them in your shell:

| Variable | Description |
|----------|-------------|
| `DB_URL` | JDBC URL (default `jdbc:postgresql://localhost:5432/eyota_hr`) |
| `DB_USER` / `DB_PASSWORD` | PostgreSQL credentials |
| `JWT_SECRET` | HMAC secret, **32+ characters** |
| `JWT_EXPIRATION_MINUTES` | Access token TTL (default 60) |
| `CORS_ORIGINS` | Comma-separated origins (default `http://localhost:4200`) |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | One-time admin creation if no ADMIN exists |
| `GPS_MAX_ACCURACY_METRES` | Max allowed GPS accuracy for clock-in/out (default 50) |
| `SERVER_PORT` | HTTP port (default 8080) |

### Dev profile

```bash
set SPRING_PROFILES_ACTIVE=dev
./mvnw spring-boot:run
```

`DevDataSeeder` loads workplaces (HQ Science Park, Jurong), demo employees (`EY-1042`, `EY-0088`, `EY-1108`), and users **only when `profile=dev`**:

| Email | Password (dev only) | Role |
|-------|---------------------|------|
| `admin@eyota.sg` | `Admin@123` | ADMIN |
| `hr@eyota.sg` | `HrManager@123` | HR |
| `employee@eyota.sg` | `Employee@123` | EMPLOYEE |

Do not use these passwords in production.

## Run

```bash
cd backend
./mvnw spring-boot:run
```

Health: `GET http://localhost:8080/actuator/health`

## GPS / HTTPS

Browsers expose geolocation only on **secure contexts** (HTTPS or `localhost`). For mobile or LAN testing, serve the Angular app and API over HTTPS or use localhost.

## API overview

Base path: `/api/v1`

### Auth
- `POST /auth/login` — `{ email, password }` → JWT + user profile
- `POST /auth/logout` — 204 (client discards token)
- `GET /auth/me` — current user

### Attendance (employee)
- `POST /attendance/clock-in` / `clock-out` — body: `latitude`, `longitude`, `accuracyMetres`, `clientCapturedAt`, optional `workplaceId`, `workMode` (`OFFICE`/`SITE`/`WFH`)
- `GET /attendance/me`, `/me/today`, `/me/history`

### HR attendance
- `GET /hr/attendance?from=&to=`
- `POST /hr/attendance/{id}/correct`

### Admin workplaces
- CRUD `/admin/workplaces`

### Employees
- `GET /employees/me`
- HR/ADMIN CRUD `/employees`

### Leave, claims, payroll, compliance, projects, masterdata, documents, audit
- `/leave/*`, `/claims/*`, `/payroll/*`, `/compliance/*`, `/projects/*`, `/masterdata/*`, `/documents/*`, `/audit/events`

All protected routes expect `Authorization: Bearer <accessToken>` except login and actuator health.

## Tests

```bash
./mvnw test
```

Includes `GeoUtilsTest`, `AttendanceGeofencePolicyTest`, and Mockito-based `AttendanceServiceTest`.
