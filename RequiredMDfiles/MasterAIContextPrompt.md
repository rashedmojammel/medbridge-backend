# RHCP — Master AI Context Prompt

How to use: copy everything inside the box below and paste it as your FIRST message in any AI chat (Claude, ChatGPT, Copilot Chat, etc.) before asking your actual question. Then add your member add-on (bottom of this file) and your task. Re-paste it whenever you start a new chat — the AI has no memory between chats.

---

## THE MASTER PROMPT (copy from here)

```
You are helping me build my university group project. Read this context carefully and follow ALL conventions exactly — do not substitute your own preferences.

# PROJECT
Rural Healthcare Consultation Platform (RHCP) — a web platform connecting rural patients in Bangladesh with doctors through CHAT-BASED remote consultations (NO video — deliberately cut for low-bandwidth reliability; never suggest adding video/WebRTC). Community Health Workers (CHWs) register patients, record vitals, and classify triage; doctors chat and issue digital prescriptions; pharmacists manage a medicine inventory with alternatives; follow-up appointments send reminders. Course: Advanced Programming in Web Technology (AIUB). 4-person team, ~6 week timeline. Grading favors: TypeORM relations, JWT auth + role guards, DTO validation, clean module structure, working demo.

# STACK (fixed — do not propose alternatives)
- Backend: NestJS 11, TypeScript, PostgreSQL, TypeORM (autoLoadEntities + synchronize:true in dev), JWT (@nestjs/jwt + passport-jwt), bcrypt (10 rounds), Socket.IO for chat (@nestjs/websockets), class-validator/class-transformer, @nestjs/config (.env), @nestjs/schedule (cron), Multer (photo upload to /uploads), Swagger.
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, axios (single client in lib/api.ts with Bearer interceptor), socket.io-client, TanStack Query, react-hook-form + zod.
- Ports: backend 3001, frontend 3000. Response envelope: { success, data, message? }.

# ROLES (enum UserRole)
ADMIN, DOCTOR, CHW, PATIENT, PHARMACIST, STAFF.
Authorization principle: role gates the endpoint (JwtGuard + RolesGuard + @Roles()), ownership gates the row (service checks e.g. patient can only read their own prescription). Admin does NOT prescribe (doctor-only) or update stock (pharmacist-only).

# BACKEND MODULES (9) — tutorial-style flat structure
Each module folder contains: <name>.module.ts, <name>.controller.ts, <name>.service.ts, entity files FLAT in the folder (e.g. patients.entity.ts — NOT in an entities/ subfolder), and a dtos/ subfolder. Auth machinery lives INSIDE auth/ (jwtStrategy.ts, jwtGuard.ts, roles.decorator.ts, roles/roles.guard.ts, user-role.enum.ts) — there is NO common/ folder.
Modules: auth, users (+doctors/health-workers/staff OneToOne profile entities + public directory), patients, triage (vital-signs, symptom-reports), consultations (+chat.gateway.ts, chat-messages), prescriptions (+items, treatment-plans), medicines (+inventory OneToOne, alternatives ManyToMany), appointments, notifications (shared service other modules inject: create(userId, type, title, body, refId?)).

# KEY DOMAIN RULES (must hold in any code you write)
1. MRN auto-generated as P-YYYY-NNNNNN, unique, in a transaction.
2. patients.user_id is NULLABLE (CHW-registered patients may have no login).
3. Triage: CHW manually picks CRITICAL/NON_CRITICAL; backend also computes a rule-based suggestion (SpO2<92, systolic>160 or <90, temp>39.5, pulse>120 → CRITICAL). CRITICAL saves + emergency notifications to assigned doctor and all admins in the SAME transaction.
4. Prescriptions are IMMUTABLE once issued — no update/delete endpoints; only cancel (with reason) + reissue. Created with items in one transaction, then notify patient.
5. Chat: Socket.IO namespace /chat; JWT verified from handshake.auth.token; joinRoom only for the consultation's doctor/patient/scheduling CHW; messages persisted BEFORE broadcast; sending rejected once consultation status = COMPLETED; transcript is the permanent clinical record.
6. Stock: actions ADD/REDUCE/SET with reason; never below 0; crossing below threshold notifies pharmacists+admins in the same transaction.
7. Public directory endpoints (/users/public/...) are unauthenticated and return ONLY whitelisted fields (never email/phone/password).
8. Notification types: EMERGENCY_ALERT, PRESCRIPTION_READY, APPOINTMENT_REMINDER, LOW_STOCK, ASSIGNMENT.

# NON-NEGOTIABLE CODE CONVENTIONS
- All secrets/config from .env via ConfigService — NEVER hardcode DB credentials or JWT secret.
- Login is by EMAIL (not userId). JWT payload: { sub, email, role, name }, expiry 1d.
- Password column has @Exclude(); global ClassSerializerInterceptor; hashes never appear in responses.
- Every POST/PATCH has a DTO with class-validator decorators; global ValidationPipe({ whitelist:true, forbidNonWhitelisted:true }).
- Controllers only route and delegate — ALL business logic in services. Cross-module calls go service→service via module imports; never touch another module's repository.
- Route paths: plain segments (@Patch('update/:id')), never a leading colon on a literal segment.
- Multi-write operations wrapped in TypeORM transactions.
- Entity class names plural (Users, Patients, Medicines), tutorial-style.
- IDs: auto-increment integers. Role: enum column on users (no roles table).
- In controllers declare static routes (search, low-stock, public/...) BEFORE ':id' routes.

# WHAT I WANT FROM YOU (the AI)
- Give complete, runnable code that compiles under this stack and these conventions.
- If my request conflicts with a rule above, tell me and follow the rule.
- Prefer the simplest solution that meets the requirement — this is a 6-week student MVP, not enterprise software. No microservices, no Redis, no Docker unless I ask.
- When you're unsure about something project-specific, ask me instead of inventing new structure.
```

---

## MEMBER ADD-ONS (paste your one AFTER the master prompt)

**Member 1 (Auth, Users, foundation):**
```
I am Member 1. I own: auth/ and users/ modules, app.module.ts wiring, .env config, seed script, and on the frontend: public pages, login/register, admin user management, and lib/api.ts (shared axios client). My routes: /auth/*, /users/*, /users/public/*.
```

**Member 2 (Patients, Triage — CHW flow):**
```
I am Member 2. I own: patients/ and triage/ modules, and on the frontend: all CHW pages (dashboard, register patient, patient list, vitals & triage form). My routes: /patients/*, /triage/*. I depend on Member 1's guards and Member 4's NotificationsService (I inject it for CRITICAL alerts).
```

**Member 3 (Consultations + Chat, Prescriptions — Doctor flow):**
```
I am Member 3. I own: consultations/ (including chat.gateway.ts — Socket.IO) and prescriptions/ modules, and on the frontend: doctor pages (dashboard, patient record view, chat consultation UI with diagnosis panel, write prescription, treatment plan). My routes: /consultations/*, /prescriptions/*, /treatment-plans/*, WS namespace /chat. I inject NotificationsService for ASSIGNMENT and PRESCRIPTION_READY.
```

**Member 4 (Medicines, Appointments, Notifications — Pharmacist flow):**
```
I am Member 4. I own: medicines/, appointments/, notifications/ modules, and on the frontend: pharmacist pages (dashboard, inventory, add medicine), patient medicine search & alternatives, appointments pages, and the shared notification panel. My routes: /medicines/*, /appointments/*, /notifications/*. My NotificationsService is injected by Members 2 and 3, so its create() signature must stay stable: create(userId, type, title, body, refId?).
```

---

## GOOD TASK PROMPTS (examples — paste after context + add-on)

- "Write the complete triage.service.ts implementing vitals recording with the rule-based suggestion and the CRITICAL alert transaction, per the domain rules."
- "Here is my chat.gateway.ts and the error I get: [paste code + error]. Fix it without changing the event names or auth approach."
- "Write the CHW vitals & triage form page in Next.js using react-hook-form + zod, calling POST /triage/vitals then POST /triage/symptoms via lib/api.ts."
- "Review this PR diff for violations of our conventions (secrets, missing DTO validation, logic in controller, missing guards): [paste diff]."
- "Write Jest unit tests for MedicinesService.updateStock covering: normal reduce, reduce below zero rejected, threshold-crossing triggers notification."

## PROMPTING TIPS (read once)

1. New chat = paste the master prompt again. AI chats don't remember your project.
2. Paste REAL code and REAL error messages — "my gateway doesn't work" gets guesses; the actual stack trace gets fixes.
3. Ask for one thing per message. "Write the whole backend" produces mush; "write patients.service.ts" produces working code.
4. You are the reviewer. AI output is a draft — read it, run it, and check it against the conventions before committing. You must be able to explain every line in the viva/demo, because instructors ask "why did you write this?"
5. When AI suggests changing the stack or structure ("consider using Prisma / microservices / MongoDB") — say no and point it back to the context. Consistency across 4 members matters more than any single suggestion.
6. Commit messages, PR descriptions, and report sections are also fair game — paste the context and ask.
```