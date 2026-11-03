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

### Enroll body example (full new hire)

Employee ID is **not** sent by the client. Backend returns `EYB01`, `EYB02`, …

```json
{
  "fullName": "Aisha Rahman",
  "email": "aisha.rahman@example.com",
  "mobile": "91234567",
  "designation": "Site Engineer",
  "employmentType": "FULL_TIME",
  "dateOfJoining": "2026-10-27",
  "dateOfBirth": "1995-03-12",
  "gender": "FEMALE",
  "nationality": "Singaporean",
  "residentialAddress": "12 Example Road Singapore 123456",
  "finNumber": "S1234567A",
  "paymentMode": "BANKING",
  "bankName": "DBS",
  "bankAccountNumber": "1234567890",
  "basicPay": 4500,
  "salaryPeriod": "MONTHLY"
}
```

UI routes: `/hr/master/employees/new` (dashboard + directory) and `/hr/master/employees/:id/edit`.

### Activate complete example

```json
{
  "activationToken": "<from verify-otp>",
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
