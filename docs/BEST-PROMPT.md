# Best ongoing prompt for this ERP

Copy/paste this when you continue in a new chat. It keeps the agent focused on **your** app and real APIs.

---

```text
Continue the Singapore Workright HR ERP in this repo (ERP-EYOTA).

Stack (do not change): Angular frontend in ERP-EYOTA-APP-V0.0, Spring Boot + PostgreSQL in backend/.

Rules:
1. Inspect existing code before editing. Preserve working features.
2. Never invent Figma/statutory rules. Prefer docs/PHASE1-FIGMA-MAPPING.md and docs/ENROLLMENT-OTP-WORKFLOW.md.
3. Prefer real API + PostgreSQL persistence over mock/localStorage when useBackendApi is true.
4. Implement end-to-end workflows (HR enroll → OTP activate → employee login → leave/claims/attendance), not disconnected pages.
5. Enforce roles on backend (@PreAuthorize) and frontend guards.
6. After changes: run Angular build and backend compile; report what works vs incomplete.
7. Explain simply; I am still learning backend.

Current priority this session:
<PASTE ONE PRIORITY — e.g. “Wire claims approval to /claims API” or “Add SMTP email for OTP”>

Do not rebuild the whole ERP. Finish the named vertical slice, then list next gaps.
```

---

## Tips

- One priority per message beats “complete everything”.
- Name the module: enroll, leave, claims, attendance GPS, payroll placeholders, compliance.
- Say “test with Postman” if you want request/response examples.
- Say “keep mock fallback” if Spring Boot is sometimes offline.
