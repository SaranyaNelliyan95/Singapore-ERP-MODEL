# HR enroll → OTP email → employee activate → login

## Flow

1. **HR** signs in → Employees → **Enroll & send OTP**
2. Backend creates employee + inactive `app_users` row + invitation OTP
3. Email is **logged** locally (`LoggingEmailSender`). Response may include `devOtpPreview`
4. **Employee** opens `http://localhost:4200/activate`, enters email + OTP, sets password
5. Account becomes active; JWT issued; employee lands on ESS dashboard
6. Employee can use leave / attendance (API mode) workflows

## APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/hr/enrollments` | HR/ADMIN | Enroll + send OTP |
| POST | `/api/v1/hr/enrollments/{employeeId}/resend-otp` | HR/ADMIN | Resend OTP |
| POST | `/api/v1/auth/activate/verify-otp` | Public | Check OTP |
| POST | `/api/v1/auth/activate/complete` | Public | Set password + login |
| POST | `/api/v1/auth/login` | Public | Normal login after activation |

### Enroll body example

```json
{
  "employeeCode": "EY-9001",
  "fullName": "Aisha Rahman",
  "workEmail": "aisha.rahman@example.com",
  "department": "Engineering",
  "designation": "Site Engineer",
  "employmentType": "FULL_TIME",
  "employmentStatus": "PROBATION",
  "workLocationMode": "SITE",
  "dateOfJoining": "2026-10-27",
  "mobile": "91234567"
}
```

### Activate complete example

```json
{
  "email": "aisha.rahman@example.com",
  "otp": "123456",
  "newPassword": "Welcome@123",
  "confirmPassword": "Welcome@123"
}
```

## Local config

- `eyota.enrollment.expose-otp-in-api: true` — OTP returned in enroll response (dev only)
- OTP also printed in Spring Boot console logs
- Set `ENROLLMENT_EXPOSE_OTP=false` when real SMTP is connected

## Restart required

Restart Spring Boot after pulling these changes so Flyway `V2__employee_invitations` runs and enrollment beans load.
