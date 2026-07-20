# RHCP — Complete Backend Architecture

**Rural Healthcare Consultation Platform (Chat-Based MVP)**
Stack: NestJS · TypeScript · PostgreSQL · TypeORM · JWT · Socket.IO

---

## 1. Architecture Overview

The backend is a **modular monolith**: one deployable NestJS application, internally divided into nine feature modules. This is the right choice for a 4-person course project — one server to run and demo, but clean module boundaries so teammates work in parallel without conflicts.

**Consultation model:** chat-based only. Video consultation is deferred to future work — chat is more reliable on low-bandwidth rural connections and removes WebRTC complexity from the MVP.

```
Next.js Client
   │  REST (HTTPS)          │  WebSocket (Socket.IO)
   ▼                        ▼
┌─────────────────────────────────────────────┐
│           NestJS Application                │
│                                             │
│  Global layer: Guards → Pipes → Interceptors│
│                                             │
│  Feature modules:                           │
│   auth · users · patients · triage          │
│   consultations (+ chat gateway)            │
│   prescriptions · medicines                 │
│   appointments · notifications              │
│                                             │
│  Data access: TypeORM entities/repositories │
└─────────────────────┬───────────────────────┘
                      ▼
                 PostgreSQL
```

---

## 2. Layered Request Lifecycle

Every REST request passes through the same pipeline:

1. **JwtAuthGuard** — validates the Bearer token; attaches the decoded user to the request. Skipped on routes marked `@Public()` (login, register, public directory).
2. **RolesGuard** — reads `@Roles(...)` metadata on the endpoint and rejects users whose role doesn't match (403).
3. **ValidationPipe (global)** — validates the request body against the endpoint's DTO using class-validator; strips unknown fields (`whitelist: true`).
4. **Controller** — routing only; no business logic.
5. **Service** — all business logic (MRN generation, alert triggering, stock math). Services call other modules' services through dependency injection — never each other's repositories.
6. **Repository / TypeORM** — the only layer that touches PostgreSQL.
7. **TransformInterceptor** — wraps responses in a consistent envelope: `{ success, data, message }`.
8. **HttpExceptionFilter** — converts all thrown exceptions into consistent JSON errors.

---

## 3. Module-by-Module Specification

### 3.1 AuthModule
**Purpose:** login, patient self-registration, token issuing.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /auth/register | Public | Patient self-registration (creates user + patient row) |
| POST | /auth/login | Public | Returns `{ accessToken, user }` |
| GET | /auth/me | Any logged-in | Current user profile from token |

**Design:** passwords hashed with bcrypt (10 salt rounds). JWT payload: `{ sub: userId, role, name }`, expiry 1 day. Staff/Doctor/CHW/Pharmacist accounts are created only by Admin through UsersModule — they cannot self-register.

### 3.2 UsersModule
**Purpose:** user CRUD (admin), role-specific profiles, public directory.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /public/doctors | Public | Directory list (only `is_public = true`) |
| GET | /public/doctors/:id | Public | Doctor profile |
| GET | /public/chws, /public/staff | Public | CHW / staff directories |
| GET | /users | Admin | All users with filters (role, status) |
| POST | /users | Admin | Create Doctor/CHW/Pharmacist/Staff account |
| PATCH | /users/:id | Admin | Edit user, toggle `is_public`, activate/deactivate |

**Design:** public endpoints return a whitelisted DTO — never password hashes, emails, or salaries. `is_public` flag controls directory visibility per user.

### 3.3 PatientsModule
**Purpose:** patient records, MRN generation.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /patients | CHW | Register patient (auto-generates MRN) |
| GET | /patients | CHW, Doctor, Admin | List/search (CHW sees own area's patients) |
| GET | /patients/:id | CHW, Doctor, Admin, Owner | Full record incl. history |
| PATCH | /patients/:id | CHW, Admin | Update demographics |

**MRN format:** `P-YYYY-NNNNNN` (year + zero-padded sequence), generated in the service inside a transaction to prevent duplicates.

### 3.4 TriageModule
**Purpose:** vitals, symptom reports, criticality classification.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /triage/vitals | CHW | Record temperature, BP, pulse, SpO2, RR, blood sugar |
| POST | /triage/symptoms | CHW | Symptom checklist + severity + triage classification |
| GET | /triage/patient/:id | Doctor, CHW, Admin | Triage history for a patient |

**Critical-flag flow:** if classification = CRITICAL, the service calls `notificationsService.createEmergencyAlert()` which notifies the assigned doctor and all admins — in the same transaction as the triage save.

**Rule-based suggestion (recommended addition):** the service computes a suggested classification from vitals (e.g. SpO2 < 92, systolic > 160 or < 90, temp > 39.5, pulse > 120 → suggest CRITICAL) and returns it with the response. The CHW makes the final decision; the suggestion is stored alongside for audit.

### 3.5 ConsultationsModule (chat-based)
**Purpose:** consultation lifecycle + real-time chat.

REST endpoints:

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /consultations | CHW | Schedule consultation (patient, doctor, datetime, reason) |
| GET | /consultations | Doctor, CHW, Patient | Own consultations, filterable by status |
| GET | /consultations/:id | Participants + Admin | Details + full chat transcript |
| PATCH | /consultations/:id/diagnosis | Doctor | Save diagnosis + notes |
| PATCH | /consultations/:id/complete | Doctor | End consultation, lock the chat |

**Chat Gateway (Socket.IO, namespace `/chat`):**

| Event (client → server) | Payload | Behavior |
|---|---|---|
| joinRoom | { consultationId } | Verifies JWT + participant, joins room `consult:{id}` |
| sendMessage | { consultationId, text } | Persists ChatMessage, broadcasts `newMessage` to room |
| typing | { consultationId } | Broadcasts typing indicator (not persisted) |

| Event (server → client) | Purpose |
|---|---|
| newMessage | Deliver message to both participants |
| userJoined / userLeft | Presence indicator |
| consultationEnded | Doctor completed the session; client disables input |

**Design decisions:** the socket handshake carries the JWT (`auth: { token }`) and is verified in the gateway before any room join. Messages are persisted first, then broadcast — the transcript in PostgreSQL is the clinical record. Once a consultation is COMPLETED, `sendMessage` is rejected.

### 3.6 PrescriptionsModule
**Purpose:** digital prescriptions + treatment plans.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /prescriptions | Doctor | Create prescription with line items |
| GET | /prescriptions | Doctor, Patient | Own prescriptions |
| GET | /prescriptions/:id | Prescriber, Patient, Admin | Full detail |
| PATCH | /prescriptions/:id/cancel | Doctor (issuer) | Cancel (never edit/delete) |
| POST | /treatment-plans | Doctor | Plan with start/end dates |
| GET | /treatment-plans/patient/:id | Doctor, Patient | Active + past plans |

**Immutability rule:** a sent prescription is never edited or deleted — only cancelled and reissued. This gives the medical record a trustworthy audit trail. On create, the service notifies the patient via NotificationsModule.

### 3.7 MedicinesModule
**Purpose:** catalog, inventory, alternatives, search.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /medicines/search?q= | Any logged-in | Search brand OR generic name (ILIKE) |
| GET | /medicines/:id/alternatives | Any logged-in | Interchangeable medicines + availability |
| POST | /medicines | Admin, Pharmacist | Add to catalog |
| PATCH | /medicines/:id | Admin, Pharmacist | Edit / toggle availability |
| PATCH | /medicines/:id/stock | Pharmacist | Add / reduce / set stock with reason |
| GET | /medicines/low-stock | Pharmacist, Admin | Items below threshold |

**Low-stock flow:** every stock update compares quantity vs threshold; crossing below it triggers a notification to pharmacists and admins. Alternatives are stored as symmetric pairs in `medicine_alternatives`.

### 3.8 AppointmentsModule
**Purpose:** follow-up scheduling and reminders.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /appointments | Doctor, CHW | Schedule follow-up |
| GET | /appointments | Doctor, Patient, CHW | Own appointments (upcoming/past) |
| PATCH | /appointments/:id | Doctor, CHW, Patient | Reschedule / cancel with reason |

**Reminders:** a daily cron job (`@nestjs/schedule`) finds appointments in the next 24h and creates reminder notifications.

### 3.9 NotificationsModule
**Purpose:** shared alerting infrastructure — called by triage (critical alerts), prescriptions (Rx ready), medicines (low stock), appointments (reminders), consultations (assignment).

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /notifications | Any logged-in | Own notifications + unread count |
| PATCH | /notifications/:id/read | Owner | Mark read |
| PATCH | /notifications/read-all | Owner | Mark all read |

**Design:** exposes a simple `create(userId, type, title, body, refId)` service method; other modules inject NotificationsService and never write to the table directly. Types: EMERGENCY_ALERT, PRESCRIPTION_READY, APPOINTMENT_REMINDER, LOW_STOCK, ASSIGNMENT.

---

## 4. Data Model (Entities & Relationships)

Core principle: one `users` table for identity, role-specific extension tables holding a one-to-one FK back to users.

```
roles 1──* users
users 1──1 doctors | health_workers | staff | patients   (role extension tables)

patients 1──* vital_signs
patients 1──* symptom_reports        (symptom_report → vital_sign, optional 1─1)
patients 1──* consultations *──1 doctors
consultations 1──* chat_messages     (sender_id → users)
consultations 1──* prescriptions 1──* prescription_items *──1 medicines
patients 1──* treatment_plans *──1 doctors
medicines 1──1 medicine_inventory
medicines *──* medicines             (via medicine_alternatives)
patients 1──* appointments *──1 doctors
users 1──* notifications
```

Key columns worth noting:
- **users**: id, role_id (FK), full_name, email (unique), phone, password_hash, is_public, is_active, timestamps
- **patients**: id, user_id (FK, nullable for offline patients), mrn (unique), dob, gender, blood_group, address, emergency_contact_name/phone, allergies, chronic_conditions, registered_by_chw_id
- **consultations**: id, patient_id, doctor_id, scheduled_by_chw_id, scheduled_at, status (SCHEDULED / IN_PROGRESS / COMPLETED / CANCELLED), diagnosis, doctor_notes
- **chat_messages**: id, consultation_id, sender_id, message, sent_at
- **prescriptions**: id, consultation_id, patient_id, doctor_id, status (ACTIVE / COMPLETED / CANCELLED), issued_at — no update route
- **medicine_inventory**: medicine_id, stock_qty, threshold, updated_by, updated_at
- **notifications**: id, user_id, type, title, body, ref_id, is_read, created_at

All primary keys: auto-increment integers (or UUIDs — pick one convention team-wide on day one). All tables get `created_at` / `updated_at` via TypeORM decorators.

---

## 5. Authentication & Authorization Design

- **Password storage:** bcrypt, 10 rounds. Never returned in any response (entity uses `@Exclude()` + ClassSerializerInterceptor).
- **JWT:** signed with `JWT_SECRET` from env, 1-day expiry. Stateless — no refresh tokens in MVP (documented as future work).
- **RBAC:** `UserRole` enum (ADMIN, DOCTOR, CHW, PATIENT, PHARMACIST, STAFF). `@Roles()` decorator + RolesGuard enforce per-endpoint. Ownership checks (patient can only read own prescriptions) happen in services by comparing `request.user.sub` to the resource's owner.
- **Public routes:** marked with a custom `@Public()` decorator that the JwtAuthGuard respects.
- **WebSocket auth:** token verified in the gateway's connection handler; unauthorized sockets are disconnected immediately.

---

## 6. Folder Structure

```
src/
├── main.ts                  # bootstrap, global pipes/filters, CORS
├── app.module.ts            # imports Config, TypeORM, all 9 modules
├── config/database.config.ts
├── common/
│   ├── decorators/  (roles, public, current-user)
│   ├── guards/      (jwt-auth, roles)
│   ├── enums/       (user-role, triage-status, consultation-status, ...)
│   ├── interceptors/(transform)
│   └── filters/     (http-exception)
├── auth/            (module, controller, service, jwt.strategy, dto/)
├── users/           (…, entities: user, role, doctor, health-worker, staff)
├── patients/        (…, entities: patient)
├── triage/          (…, entities: vital-sign, symptom-report)
├── consultations/   (…, chat.gateway.ts, entities: consultation, chat-message)
├── prescriptions/   (…, entities: prescription, prescription-item, treatment-plan)
├── medicines/       (…, entities: medicine, medicine-inventory, medicine-alternative)
├── appointments/    (…, entities: appointment)
└── notifications/   (…, entities: notification)
```

Every module follows the identical internal pattern: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `entities/`, `dto/`.

---

## 7. Dependencies

```bash
# core (from nest new)
@nestjs/common @nestjs/core @nestjs/platform-express rxjs reflect-metadata

# database
@nestjs/typeorm typeorm pg

# auth
@nestjs/jwt @nestjs/passport passport passport-jwt bcrypt

# validation
class-validator class-transformer

# realtime chat
@nestjs/websockets @nestjs/platform-socket.io socket.io

# config & scheduling
@nestjs/config @nestjs/schedule

# recommended
@nestjs/swagger        # auto API docs at /api/docs
helmet                 # security headers
```

**Environment variables (.env — never committed; ship a .env.example):**

```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=rhcp
DATABASE_USER=postgres
DATABASE_PASSWORD=...
JWT_SECRET=long-random-string
JWT_EXPIRES_IN=1d
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

---

## 8. Cross-Cutting Conventions

- **Validation:** every POST/PATCH body has a DTO with class-validator decorators; global ValidationPipe with `whitelist: true, forbidNonWhitelisted: true`.
- **Response envelope:** `{ success: boolean, data: ..., message?: string }` via global interceptor.
- **Errors:** throw Nest's built-in exceptions (`NotFoundException`, `ForbiddenException`, `ConflictException`); the global filter formats them.
- **Transactions:** used wherever two writes must succeed together — patient + MRN creation, triage save + emergency alert, prescription + items, stock update + low-stock alert.
- **Timestamps:** `@CreateDateColumn()` / `@UpdateDateColumn()` on every entity.
- **API docs:** Swagger enabled in development — excellent for the demo and for the frontend team.

---

## 9. Security Considerations (for the report)

Implemented in MVP: bcrypt hashing, JWT with expiry, role-based access control on every protected endpoint, ownership checks in services, DTO validation and unknown-field stripping, parameterized queries via TypeORM (SQL-injection safe), sensitive fields excluded from all responses, CORS restricted to the frontend origin, helmet headers, immutable prescriptions (cancel-and-reissue only).

Deliberately deferred (documented as future work): refresh tokens and token revocation, rate limiting on /auth/login, full audit logging of record access, email verification, field-level encryption of medical data.

---

## 10. Testing & Seed Strategy

- **Unit tests (Jest, ships with NestJS):** minimum set — AuthService (hash + login), PatientsService (MRN format/uniqueness), TriageService (critical alert fires), MedicinesService (low-stock trigger), ConsultationsService (completed chat rejects messages).
- **Seed script** (`npm run seed`): 1 admin, 5 doctors, 3 CHWs, 2 pharmacists, ~50 patients with realistic Bangladeshi names, 30 medicines with alternatives mapped, a mix of consultations with chat transcripts, prescriptions, and a pre-staged critical patient so the emergency alert can be demonstrated live.

---

## 11. Team Ownership Map

| Member | Modules |
|---|---|
| 1 | auth, users, common/, config, seed script |
| 2 | patients, triage |
| 3 | consultations (incl. chat gateway), prescriptions |
| 4 | medicines, appointments, notifications |