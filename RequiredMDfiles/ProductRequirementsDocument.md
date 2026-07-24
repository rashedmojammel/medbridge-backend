# Product Requirements Document (PRD) — RHCP Backend

**Product:** Rural Healthcare Consultation Platform (RHCP) — Backend API
**Course:** Advanced Programming in Web Technology, Summer 25-26, Section A (AIUB)
**Team:** Tanvir Ahmed · Rashed Mojammel · Kallol Dey · Md. Abu Musfiq Rahat
**Version:** 1.0 (Chat-based MVP — video consultation removed from scope)
**Stack:** NestJS 11 · TypeScript · PostgreSQL · TypeORM · JWT · Socket.IO

---

## 1. Overview

### 1.1 Problem

Rural communities in Bangladesh lack local access to qualified doctors. Patient records are undocumented, follow-up care is inconsistent, and medicine availability is untracked. Patients travel long distances for basic consultations.

### 1.2 Solution

A REST + WebSocket backend that powers a web platform connecting rural patients — assisted by Community Health Workers (CHWs) — with doctors through **chat-based remote consultations**, supported by digital prescriptions, a medicine inventory with alternatives, structured triage with emergency alerts, and follow-up scheduling.

### 1.3 Why chat, not video (explicit decision)

Chat is reliable on low-bandwidth rural connections, produces a persistent clinical transcript, and removes WebRTC complexity from the MVP. Video is deferred to future work.

### 1.4 Backend goals

1. Expose a secure, role-scoped REST API covering the full clinical workflow: registration → triage → consultation → prescription → follow-up.
2. Deliver real-time chat between doctor and patient with a persisted transcript.
3. Enforce role-based access control on every protected resource.
4. Trigger automatic notifications for emergencies, prescriptions, reminders, and low stock.
5. Be demo-ready: seedable, documented (Swagger), runnable by any team member with one command.

### 1.5 Non-goals (out of scope for MVP)

Video/audio calls · SMS or email delivery · payments · AI diagnosis · Bangla localization · mobile app · offline mode · refresh tokens / token revocation · multi-clinic tenancy.

---

## 2. Users & Roles

| Role                          | Description            | Key backend permissions                                                                                                      |
| ----------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Admin                         | Platform operator      | Full user CRUD, medicine catalog, all data visibility, receives emergency + low-stock alerts                                 |
| Doctor                        | Provides consultations | Read assigned patients' full records, chat, save diagnosis, issue/cancel prescriptions, treatment plans, schedule follow-ups |
| CHW (Community Health Worker) | Field intake           | Register patients, record vitals & symptoms, classify triage, schedule consultations                                         |
| Patient                       | Care recipient         | Self-register, read OWN record/prescriptions/appointments, chat in own consultations                                         |
| Pharmacist                    | Inventory operator     | Medicine catalog CRUD, stock updates, low-stock view                                                                         |
| Public visitor                | Not logged in          | Read-only public directory of doctors/CHWs/staff                                                                             |

Authorization principle: **role gates the endpoint; ownership gates the row.** A Patient role may call `GET /prescriptions/:id` — but only for prescriptions where `patient.user_id = token.sub`.

---

## 3. Functional Requirements

Priority: **P0** = must ship (demo fails without it) · **P1** = should ship · **P2** = nice to have.
Each requirement lists acceptance criteria (AC) — the definition of "done."

### FR-1 Authentication (P0) — owner: Member 1

- FR-1.1 Patient self-registration at `POST /auth/register`: creates users row (role PATIENT) + patients row in one transaction.
  AC: duplicate email → 409; password stored as bcrypt hash (10 rounds); response contains no password field.
- FR-1.2 Login at `POST /auth/login` with **email + password**; returns `{ access_token, user }`.
  AC: wrong email or password → 401 with a generic message (no "user exists" leak); token payload = `{ sub, email, role, name }`; expiry 1 day.
- FR-1.3 `GET /auth/me` returns the current user from a valid token.
  AC: missing/expired/tampered token → 401.
- FR-1.4 Staff-type accounts (Doctor/CHW/Pharmacist/Staff/Admin) can NOT self-register.
  AC: only `POST /users` with ADMIN role creates them; first admin exists via seed.

### FR-2 Users & Public Directory (P0) — owner: Member 1

- FR-2.1 Admin CRUD on users with role filter, activate/deactivate, `is_public` toggle.
  AC: deactivated user's login → 401; all routes reject non-ADMIN → 403.
- FR-2.2 Public directory: `GET /users/public/doctors|chws|staff` and doctor detail — **no authentication**.
  AC: returns only `is_public = true`; response fields whitelisted (name, photo, specialization, qualifications, experience, bio, area/department); NEVER email, phone, password, salary.
- FR-2.3 Profile photo upload via Multer into `/uploads`.
  AC: only image mime types; stored filename `${timestamp}_${original}`; path saved on user row.

### FR-3 Patient Management (P0) — owner: Member 2

- FR-3.1 CHW registers a patient with demographics, contacts, emergency contact, optional medical history.
  AC: MRN auto-generated as `P-YYYY-NNNNNN`, unique, created in a transaction; `registered_by` = CHW id.
- FR-3.2 Patient list/search by MRN, name, phone (CHW/Doctor/Admin).
  AC: PATIENT role calling list → 403.
- FR-3.3 Patient detail returns demographics + medical history summary.
  AC: a patient can fetch only their own record (ownership check); others → 403.
- FR-3.4 CHW/Admin can update patient demographics.
  AC: MRN immutable — update attempts on MRN are ignored/rejected.

### FR-4 Triage: Vitals & Symptoms (P0) — owner: Member 2

- FR-4.1 CHW records vitals: temperature, BP (systolic/diastolic), pulse, SpO2; optional respiratory rate, blood sugar.
  AC: values validated to sane ranges (e.g. SpO2 0–100); stored with recorder + timestamp.
- FR-4.2 CHW submits symptom report: primary complaint, symptom checklist, duration, severity, triage classification (CRITICAL / NON_CRITICAL), notes.
  AC: linked to the vitals record when provided.
- FR-4.3 **Rule-based triage suggestion** (P1): backend computes suggested classification from vitals (SpO2 < 92 · systolic > 160 or < 90 · temp > 39.5 °C · pulse > 120 → suggest CRITICAL) and returns it with the vitals response; CHW's manual choice is final; both stored.
- FR-4.4 CRITICAL classification triggers emergency notifications to the assigned doctor and all admins **in the same transaction** as the report save.
  AC: if notification insert fails, the report save rolls back (or vice versa) — never a silent lost alert.

### FR-5 Chat Consultations (P0) — owner: Member 3

- FR-5.1 CHW schedules a consultation (patient, doctor, datetime, reason); doctor and patient are notified (ASSIGNMENT).
- FR-5.2 REST: list own consultations (role-scoped), consultation detail including the **full ordered chat transcript**.
- FR-5.3 WebSocket gateway (Socket.IO, namespace `/chat`):
  - Connection authenticated via JWT in `handshake.auth.token`; invalid → disconnect.
  - `joinRoom { consultationId }` — allowed only for the consultation's doctor, patient, or scheduling CHW; joins room `consult:<id>`.
  - `sendMessage { consultationId, text }` — persists the message FIRST, then broadcasts `newMessage` to the room.
  - `typing` — broadcast only, not persisted.
    AC: a third user attempting joinRoom is rejected; messages ≤ 2000 chars (DTO-validated).
- FR-5.4 Doctor saves diagnosis + notes (`PATCH /consultations/:id/diagnosis`).
- FR-5.5 Doctor completes the consultation (`PATCH /consultations/:id/complete`): status → COMPLETED, `consultationEnded` emitted.
  AC: `sendMessage` on a COMPLETED consultation is rejected; transcript remains readable forever (clinical record).

### FR-6 Prescriptions & Treatment Plans (P0) — owner: Member 3

- FR-6.1 Doctor creates a prescription with 1..n line items (medicine, dosage, frequency, duration, route, instructions) + notes.
  AC: prescription + items saved in one transaction; patient notified (PRESCRIPTION_READY).
- FR-6.2 **Prescriptions are immutable once issued.** No update or delete endpoint exists.
  AC: only `PATCH /prescriptions/:id/cancel` (issuing doctor) with a reason; correction = cancel + new prescription.
- FR-6.3 Role-scoped listing: doctor sees issued, patient sees received; detail visible to issuer, patient, admin.
- FR-6.4 Treatment plans (P1): title, details, start/end dates, status; visible to doctor and patient.

### FR-7 Medicines, Inventory & Alternatives (P0) — owner: Member 4

- FR-7.1 Search `GET /medicines/search?q=` matches brand OR generic name, case-insensitive; includes availability.
- FR-7.2 Catalog CRUD (Admin/Pharmacist): brand, generic, manufacturer, dosage form, strength, therapeutic class, availability flag.
- FR-7.3 Stock update (Pharmacist): action ADD / REDUCE / SET with quantity and reason.
  AC: stock can never go below 0 (REDUCE beyond stock → 400); every change records updater + timestamp.
- FR-7.4 Low-stock alerting: when an update moves `stock < threshold`, pharmacists + admins are notified (LOW_STOCK) — same transaction.
- FR-7.5 Alternatives: symmetric mapping between interchangeable medicines; `GET /medicines/:id/alternatives` returns them with availability.
  AC: adding A↔B once makes B list A automatically.

### FR-8 Appointments & Reminders (P1) — owner: Member 4

- FR-8.1 Doctor/CHW schedules a follow-up (patient, doctor, datetime); patient notified.
- FR-8.2 Reschedule/cancel with reason (doctor, CHW, or the patient — ownership checked).
- FR-8.3 Daily cron (08:00) creates APPOINTMENT_REMINDER notifications for appointments within the next 24h.
  AC: a given appointment is reminded at most once.

### FR-9 Notifications (P0 — shared infrastructure) — owner: Member 4, skeleton in week 1

- FR-9.1 Service API consumed by other modules: `create(userId, type, title, body, refId?)` and `createForRole(role, ...)`.
- FR-9.2 REST: list own notifications newest-first with `unreadCount`; mark one read; mark all read.
  AC: users can only read/modify their own notifications.
- FR-9.3 Types: EMERGENCY_ALERT · PRESCRIPTION_READY · APPOINTMENT_REMINDER · LOW_STOCK · ASSIGNMENT.

### FR-10 Seed & Demo Data (P0) — owner: Member 1

- FR-10.1 `npm run seed` produces: 1 admin, 5 doctors, 3 CHWs, 2 pharmacists, ~50 patients (realistic Bangladeshi names + MRNs), 30 medicines with inventory + alternatives, consultations with chat transcripts, prescriptions, upcoming appointments, and one pre-staged near-critical patient for a live emergency-alert demo.
  AC: idempotent enough to re-run after wipes; completes < 60s.

---

## 4. Non-Functional Requirements

| ID                   | Requirement                                                                                                                                                                                                                                                                                                                 | Target / AC                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| NFR-1 Security       | bcrypt(10) hashing; JWT expiry 1d; secrets only via .env; RBAC guard on every protected route; ownership checks in services; DTO validation with whitelist + forbidNonWhitelisted; password `@Exclude()`d from all responses; TypeORM parameterized queries (SQLi-safe); CORS restricted to frontend origin; helmet headers | Manual attack pass with Postman finds no unauthorized data access |
| NFR-2 Consistency    | Multi-write operations transactional: register(user+patient), triage(report+alert), prescription(+items+notify), stock(update+alert)                                                                                                                                                                                        | Kill mid-operation → no partial rows                              |
| NFR-3 API convention | Single response envelope `{ success, data, message? }`; consistent HTTP codes (400 validation, 401 auth, 403 role/ownership, 404 missing, 409 conflict)                                                                                                                                                                     | Verified via Swagger examples                                     |
| NFR-4 Performance    | Typical REST response < 300 ms locally with seed volume; chat delivery < 1 s perceived                                                                                                                                                                                                                                      | Informal timing during rehearsal                                  |
| NFR-5 Documentation  | Swagger at `/api/docs` covering all endpoints + DTOs (dev)                                                                                                                                                                                                                                                                  | Frontend team builds against it without asking                    |
| NFR-6 Testability    | Jest unit tests for: AuthService (hash/login), PatientsService (MRN), TriageService (suggestion rules + alert), MedicinesService (low-stock), ConsultationsService (reject message after complete)                                                                                                                          | `npm test` green in dev before milestone merges                   |
| NFR-7 Runability     | Fresh clone → `.env` from example → `npm i` → `npm run seed` → `npm run start:dev` works on all 4 machines                                                                                                                                                                                                                  | Verified week 1                                                   |

---

## 5. Data Requirements (summary)

Entities (16): roles*, users, doctors, health_workers, staff, patients, vital_signs, symptom_reports, consultations, chat_messages, prescriptions, prescription_items, treatment_plans, medicines, medicine_inventory, medicine_alternatives, appointments, notifications.
(*role may be an enum column on users instead of a table — team decision at the entity workshop; enum column recommended for simplicity.)

Key constraints: users.email unique · patients.mrn unique · patients.user_id nullable (CHW-registered patients without login) · prescriptions have no UPDATE path · chat_messages append-only · every table timestamped.

Full column-level detail: see `RHCP_Folder_Architecture.md` §File-by-File and Architecture doc §4.

---

## 6. API Surface (endpoint census)

| Module                 | Endpoints    | Protected | Public |
| ---------------------- | ------------ | --------- | ------ |
| auth                   | 3            | 1         | 2      |
| users (+directory)     | 9            | 5         | 4      |
| patients               | 4            | 4         | 0      |
| triage                 | 3            | 3         | 0      |
| consultations (REST)   | 5            | 5         | 0      |
| chat (WS events)       | 3 in / 4 out | all       | 0      |
| prescriptions (+plans) | 6            | 6         | 0      |
| medicines              | 6            | 6         | 0      |
| appointments           | 3            | 3         | 0      |
| notifications          | 3            | 3         | 0      |
| **Total REST**         | **42**       | **36**    | **6**  |

---

## 7. Milestones

| Milestone                        | Contents                                                                                                                         | Exit criteria                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| M1 — Foundation (wk 1)           | Scaffold, config/.env, entity workshop (ALL entities merged), auth module, guards, notifications skeleton, seed v0 (admin+roles) | Login works; guarded hello-route returns 403 for wrong role; all 4 machines run it |
| M2 — Intake flow (wk 2–3)        | users+directory, patients, triage (+rules), notifications real                                                                   | CHW registers patient → vitals → CRITICAL → admin sees alert (via API)             |
| M3 — Clinical core (wk 3–4)      | consultations + chat gateway, prescriptions                                                                                      | Two browsers chat live; doctor completes + prescribes; patient reads Rx            |
| M4 — Supply & follow-up (wk 4–5) | medicines, inventory, alternatives, appointments + cron                                                                          | Stock drop below threshold alerts pharmacist; reminder fires                       |
| M5 — Hardening (final wk)        | full seed, Swagger polish, unit tests, attack pass, demo rehearsal                                                               | End-to-end demo script runs clean twice on the presentation machine                |

---

## 8. Success Metrics (what "the backend is done" means)

1. The full demo narrative executes without manual DB edits: _CHW registers patient → triage flags critical → doctor alerted → chat consultation → prescription issued → patient sees it + alternatives → pharmacist stock drops → low-stock alert → follow-up scheduled → reminder generated._
2. All 42 REST endpoints respond per spec and appear in Swagger.
3. Zero P0 requirements unmet; unauthorized-access attack pass finds nothing.
4. Every member has commits across the history (instructor-visible contribution).

---

## 9. Risks & Mitigations

| Risk                                     | Likelihood | Impact | Mitigation                                                                                                              |
| ---------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Chat gateway complexity blocks Member 3  | Medium     | High   | Gateway is the ONLY novel tech — prototype it in M1 as a spike; REST chat-transcript endpoints work even if sockets lag |
| Schema disagreements mid-project         | High       | High   | Day-one entity workshop; entity-owner rule; changes via PR request to owner                                             |
| Shared-file merge conflicts (app.module) | High       | Low    | Daily dev pulls; announce-before-edit rule                                                                              |
| Member unavailability                    | Medium     | High   | Module ownership makes gaps visible in week-scale; P1s (plans, cron, rules) are the designated cut list                 |
| Demo-day environment failure             | Medium     | High   | Seed script + rehearsal on the actual presentation machine at M5                                                        |
| Scope creep                              | High       | Medium | §1.5 non-goals is a contract; new ideas → FUTURE.md                                                                     |

---

## 10. Open Questions (decide at kickoff)

1. Role as enum column vs roles table? (Recommendation: enum column.)
2. IDs: auto-increment int vs UUID? (Recommendation: int — simpler, matches tutorial.)
3. Does a CHW-registered patient without login get credentials later, and how? (Recommendation: admin/CHW can attach a user account to an existing patient row — P2.)
4. Notification delivery: REST polling only (MVP) vs also pushing over the existing socket? (Recommendation: polling for MVP; socket push is a cheap P2 upgrade since Socket.IO is already present.)
