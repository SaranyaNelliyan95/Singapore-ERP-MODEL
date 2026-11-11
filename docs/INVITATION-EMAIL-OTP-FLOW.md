# Employee invitation → OTP → password → login

## Root cause of “no email received”

`eyota.mail.enabled` / `MAIL_ENABLED` defaults to **false**.  
`ConfigurableEmailSender` then **only logs** the message and never calls SMTP.  
The employee record is still saved; Invitation status is marked **Failed** until SMTP is configured and HR uses **Send / Resend invitation**.

## Flow

1. HR saves employee → PostgreSQL + inactive login + invitation **token** (hashed)
2. Congratulation HTML email with **Verify** button → `/activate-account?token=…`
3. Employee opens link → **Send OTP** or **Cancel** (OTP is not auto-sent)
4. OTP emailed (2 minutes, single-use, hashed) — employee copies/pastes the code
5. Verify OTP → short-lived activation authorization
6. Create password + confirm → account active (employment status unchanged)
7. **Login** → existing JWT login screen

## HR directory

For **Pending** employment rows that are not yet activated, the **Invitation** column shows **Send invitation** / **Resend invitation**.

## Config (IntelliJ Run Configuration or shell)

See `backend/.env.example`:

- `MAIL_ENABLED=true`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` (e.g. Gmail + App Password)
- `MAIL_FROM`, `MAIL_FROM_NAME`
- `ACTIVATE_BASE_URL=http://localhost:4200/activate-account`
- `ENROLLMENT_OTP_TTL_SECONDS=120`
