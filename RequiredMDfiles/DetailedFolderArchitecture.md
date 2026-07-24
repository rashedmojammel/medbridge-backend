# RHCP Backend — Detailed Folder Architecture (Final)

Style: matches the course tutorial repo (`NestJs_Tutorial/auth-proj`) — flat entities inside each module, `dtos/` subfolder, auth machinery inside `auth/` — with correctness fixes applied (.env config, email login, role enum, password exclusion).

Stack: NestJS 11 · TypeORM · PostgreSQL · JWT + bcrypt · Socket.IO (chat only, no video)

---

## Full Tree

```
rhcp-backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   │
│   ├── auth/                                ← Member 1
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwtStrategy.ts
│   │   ├── jwtGuard.ts
│   │   ├── roles.decorator.ts
│   │   ├── roles/
│   │   │   └── roles.guard.ts
│   │   ├── user-role.enum.ts
│   │   └── dtos/
│   │       ├── login.dto.ts
│   │       └── register-patient.dto.ts
│   │
│   ├── users/                               ← Member 1
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.entity.ts
│   │   ├── doctors.entity.ts
│   │   ├── health-workers.entity.ts
│   │   ├── staff.entity.ts
│   │   └── dtos/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   │
│   ├── patients/                            ← Member 2
│   │   ├── patients.module.ts
│   │   ├── patients.controller.ts
│   │   ├── patients.service.ts
│   │   ├── patients.entity.ts
│   │   └── dtos/
│   │       ├── create-patient.dto.ts
│   │       └── update-patient.dto.ts
│   │
│   ├── triage/                              ← Member 2
│   │   ├── triage.module.ts
│   │   ├── triage.controller.ts
│   │   ├── triage.service.ts
│   │   ├── vital-signs.entity.ts
│   │   ├── symptom-reports.entity.ts
│   │   └── dtos/
│   │       ├── record-vitals.dto.ts
│   │       └── symptom-report.dto.ts
│   │
│   ├── consultations/                       ← Member 3
│   │   ├── consultations.module.ts
│   │   ├── consultations.controller.ts
│   │   ├── consultations.service.ts
│   │   ├── chat.gateway.ts
│   │   ├── consultations.entity.ts
│   │   ├── chat-messages.entity.ts
│   │   └── dtos/
│   │       ├── create-consultation.dto.ts
│   │       ├── save-diagnosis.dto.ts
│   │       └── send-message.dto.ts
│   │
│   ├── prescriptions/                       ← Member 3
│   │   ├── prescriptions.module.ts
│   │   ├── prescriptions.controller.ts
│   │   ├── prescriptions.service.ts
│   │   ├── prescriptions.entity.ts
│   │   ├── prescription-items.entity.ts
│   │   ├── treatment-plans.entity.ts
│   │   └── dtos/
│   │       ├── create-prescription.dto.ts
│   │       └── create-treatment-plan.dto.ts
│   │
│   ├── medicines/                           ← Member 4
│   │   ├── medicines.module.ts
│   │   ├── medicines.controller.ts
│   │   ├── medicines.service.ts
│   │   ├── medicines.entity.ts
│   │   ├── medicine-inventory.entity.ts
│   │   ├── medicine-alternatives.entity.ts
│   │   └── dtos/
│   │       ├── create-medicine.dto.ts
│   │       └── update-stock.dto.ts
│   │
│   ├── appointments/                        ← Member 4
│   │   ├── appointments.module.ts
│   │   ├── appointments.controller.ts
│   │   ├── appointments.service.ts
│   │   ├── appointments.entity.ts
│   │   └── dtos/
│   │       ├── create-appointment.dto.ts
│   │       └── update-appointment.dto.ts
│   │
│   ├── notifications/                       ← Member 4 (skeleton in week 1)
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── notifications.entity.ts
│   │   └── dtos/
│   │       └── create-notification.dto.ts
│   │
│   └── seeds/
│       └── seed.ts
│
├── uploads/                                 ← profile photos (Multer)
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── .env                                     ← NEVER commit
├── .env.example                             ← commit this template
├── .gitignore
├── .prettierrc
├── eslint.config.mjs
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```

---

## File-by-File Detail

### Root of src/

**main.ts** — bootstrap. Enables: global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, global `ClassSerializerInterceptor` (activates `@Exclude()` on passwords), CORS restricted to `process.env.CORS_ORIGIN`, static serving of `/uploads`, Swagger at `/api/docs` (dev), listen on `process.env.PORT` (3001).

**app.module.ts** — imports `ConfigModule.forRoot({ isGlobal: true })` first, then `TypeOrmModule.forRootAsync` reading DB values from env (`autoLoadEntities: true`, `synchronize: true` for dev), `ScheduleModule.forRoot()` for the reminder cron, then all nine feature modules. Unlike the tutorial, NO credentials are hardcoded here.

**app.controller.ts / app.service.ts** — default health-check route (`GET /` → "RHCP API running"). Keep as-is from scaffold.

### auth/ — login, registration, guards (Member 1)

**auth.module.ts** — imports `UsersModule` and `JwtModule.registerAsync` (secret + expiry from env). Provides `AuthService`, `JwtStrategy`. Exports nothing (guards are imported directly by path, tutorial-style).

**auth.controller.ts** — routes:

- `POST /auth/register` (public) → patient self-registration
- `POST /auth/login` (public) → `{ access_token, user }`
- `GET /auth/me` (JwtGuard) → decoded current user
  Note: staff/doctor accounts are NOT created here — that is admin-only in users module (fixes the tutorial's chicken-and-egg + backdoor).

**auth.service.ts** — `registerPatient()` (hash with bcrypt 10 rounds, create user with role PATIENT + patient row), `login()` (find by EMAIL — not userId like tutorial — compare hash, sign payload `{ sub, email, role, name }`).

**jwtStrategy.ts** — same shape as tutorial, but `secretOrKey: configService.get('JWT_SECRET')` injected via constructor. `validate()` returns `{ id, email, role, name }` which becomes `request.user`.

**jwtGuard.ts** — one-liner: `export class JwtGuard extends AuthGuard('jwt') {}` (identical to tutorial).

**roles.decorator.ts** — `export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);` — typed with the enum, correct spelling (tutorial file is `roles.decrator.ts` with string roles).

**roles/roles.guard.ts** — copy of the tutorial's RolesGuard (it is correct): `Reflector.getAllAndOverride<UserRole[]>('roles', ...)`, allow when no metadata, else check `requiredRoles.includes(user.role)`.

**user-role.enum.ts** — `enum UserRole { ADMIN='ADMIN', DOCTOR='DOCTOR', CHW='CHW', PATIENT='PATIENT', PHARMACIST='PHARMACIST', STAFF='STAFF' }`. Also holds small enums used across modules to avoid a common/ folder: `TriageStatus`, `ConsultationStatus`, `PrescriptionStatus`, `NotificationType` (or split into sibling files if preferred).

**dtos/login.dto.ts** — `@IsEmail() email; @IsString() @IsNotEmpty() password;`

**dtos/register-patient.dto.ts** — fullName, email, phone, dob, gender, bloodGroup?, address, emergencyContactName/Phone, password (+ MinLength(6)).

### users/ — accounts, role profiles, public directory (Member 1)

**users.entity.ts** — id, fullName, email (unique), phone, `@Exclude() password`, `role` (enum column), isPublic (bool, default false), isActive (bool, default true), profileImage (nullable), Create/UpdateDateColumn. Relations: `@OneToOne` to Doctors / HealthWorkers / Staff / Patients (inverse sides), `@OneToMany` to Notifications.

**doctors.entity.ts** — id, `@OneToOne(() => Users) @JoinColumn()` user, specialization, qualifications, experienceYears, licenseNumber, bio. (Same pattern as tutorial's passports.entity.)

**health-workers.entity.ts** — id, user (OneToOne + JoinColumn), assignedArea, activeSince.

**staff.entity.ts** — id, user (OneToOne + JoinColumn), department, designation.

**users.controller.ts** — routes:

- `GET /users/public/doctors`, `/public/doctors/:id`, `/public/chws`, `/public/staff` — no guard; service filters `isPublic: true` and returns whitelisted fields only
- `GET /users` (JwtGuard + Roles ADMIN) — list with role/status filters
- `POST /users` (ADMIN) — create Doctor/CHW/Pharmacist/Staff with role-specific profile row
- `PATCH /users/:id` (ADMIN) — edit, toggle isPublic/isActive
- `POST /users/:id/photo` (owner or ADMIN) — Multer FileInterceptor + diskStorage into /uploads (copied from tutorial users.controller)

**users.service.ts** — CRUD + `findByEmail()` (used by auth), directory queries, photo path save.

**dtos/** — create-user.dto (fullName, email, phone, role, password, + optional role-specific fields), update-user.dto (PartialType).

### patients/ (Member 2)

**patients.entity.ts** — id, `@OneToOne(() => Users, { nullable: true }) @JoinColumn()` user (nullable → allows CHW-registered patients without login), mrn (unique), dob, gender, bloodGroup, address, village/district, emergencyContactName/Relation/Phone, allergies, chronicConditions, currentMedications, `@ManyToOne(() => Users)` registeredBy (CHW), timestamps. Inverse `@OneToMany` to VitalSigns, SymptomReports, Consultations, Prescriptions, TreatmentPlans, Appointments.

**patients.service.ts** — `create()` generates MRN `P-YYYY-NNNNNN` inside a transaction (count-per-year + zero-pad); `findAll()` with search by mrn/name/phone; ownership check helper `assertCanView(user, patient)`.

**patients.controller.ts** — POST (CHW), GET list (CHW/DOCTOR/ADMIN), GET :id (participants + owner), PATCH :id (CHW/ADMIN). All behind JwtGuard + RolesGuard.

**dtos/** — create-patient.dto (all registration fields from wireframe 4.2), update-patient.dto (PartialType).

### triage/ (Member 2)

**vital-signs.entity.ts** — id, `@ManyToOne` patient, temperature (decimal), bpSystolic, bpDiastolic, pulse, spo2, respiratoryRate (nullable), bloodSugar (nullable), `@ManyToOne` recordedBy (CHW user), recordedAt.

**symptom-reports.entity.ts** — id, patient (ManyToOne), `@OneToOne` vitalSign (nullable), primaryComplaint, symptoms (simple-array), duration, severity, triageStatus (enum CRITICAL/NON_CRITICAL), suggestedStatus (enum — from rules), notes, recordedBy, recordedAt.

**triage.service.ts** —

- `recordVitals()` — save + return with computed warnings (e.g. temp > 37.5 flag)
- `suggestTriage(vitals)` — pure rule function: SpO2 < 92 OR systolic > 160 OR systolic < 90 OR temp > 39.5 OR pulse > 120 → CRITICAL
- `submitSymptomReport()` — in one transaction: save report; if triageStatus === CRITICAL → `notificationsService.create()` for assigned doctor + all admins (EMERGENCY_ALERT)

**triage.controller.ts** — POST /triage/vitals (CHW), POST /triage/symptoms (CHW), GET /triage/patient/:id (DOCTOR/CHW/ADMIN).

### consultations/ — chat-based (Member 3)

**consultations.entity.ts** — id, patient (ManyToOne), doctor (ManyToOne → Users), scheduledBy (CHW), scheduledAt, reason, status (enum SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED), diagnosis (nullable), doctorNotes (nullable), completedAt. `@OneToMany` chatMessages.

**chat-messages.entity.ts** — id, consultation (ManyToOne), sender (ManyToOne → Users), message (text), sentAt (CreateDateColumn).

**consultations.controller.ts** — POST / (CHW schedule → notifies doctor + patient), GET / (own list by role), GET /:id (participants/ADMIN — includes ordered transcript), PATCH /:id/diagnosis (DOCTOR), PATCH /:id/complete (DOCTOR → sets COMPLETED, emits consultationEnded).

**consultations.service.ts** — lifecycle logic + `assertParticipant(userId, consultationId)` used by both controller and gateway; rejects messages when status === COMPLETED.

**chat.gateway.ts** — `@WebSocketGateway({ namespace: '/chat', cors })`.

- `handleConnection(socket)` — verify JWT from `socket.handshake.auth.token`; disconnect if invalid
- `@SubscribeMessage('joinRoom')` — assertParticipant → `socket.join('consult:'+id)` → broadcast userJoined
- `@SubscribeMessage('sendMessage')` — validate via SendMessageDto → persist ChatMessage → `server.to(room).emit('newMessage', saved)`
- `@SubscribeMessage('typing')` — broadcast only, no persistence
- emits: newMessage, userJoined, userLeft, consultationEnded

**dtos/** — create-consultation.dto (patientId, doctorId, scheduledAt, reason), save-diagnosis.dto (diagnosis, notes?), send-message.dto (consultationId, message @MaxLength(2000)).

### prescriptions/ (Member 3)

**prescriptions.entity.ts** — id, consultation (ManyToOne, nullable), patient, doctor, status (enum, default ACTIVE), doctorNotes, issuedAt, cancelledAt/cancelReason (nullable). `@OneToMany` items. Immutability: no update endpoint exists — cancel + reissue only.

**prescription-items.entity.ts** — id, prescription (ManyToOne), medicine (ManyToOne), dosage, frequency, duration, route, instructions.

**treatment-plans.entity.ts** — id, patient, doctor, title, details (text), startDate, endDate, status (ACTIVE/COMPLETED).

**prescriptions.service.ts** — `create()` in a transaction (prescription + items) then notify patient (PRESCRIPTION_READY); `cancel()` sets status + reason; list scoped by role (doctor: own issued; patient: own received).

**prescriptions.controller.ts** — POST / (DOCTOR), GET / (DOCTOR/PATIENT), GET /:id (issuer/patient/ADMIN), PATCH /:id/cancel (issuing DOCTOR), POST /treatment-plans (DOCTOR), GET /treatment-plans/patient/:id (DOCTOR/PATIENT).

### medicines/ (Member 4)

**medicines.entity.ts** — id, brandName, genericName, manufacturer, dosageForm (Tablet/Syrup/Injection/Drops), strength, therapeuticClass, isAvailable (bool). `@OneToOne` inventory; `@ManyToMany` alternatives via medicine-alternatives.

**medicine-inventory.entity.ts** — id, medicine (OneToOne + JoinColumn), stockQty, threshold, `@ManyToOne` updatedBy, updatedAt.

**medicine-alternatives.entity.ts** — explicit join entity: id, medicine (ManyToOne), alternative (ManyToOne). Service writes both directions so the pair is symmetric.

**medicines.service.ts** — `search(q)` ILIKE on brandName OR genericName; `getAlternatives(id)` with availability join; `updateStock(action ADD/REDUCE/SET, qty, reason)` in a transaction — after write, if stockQty crossed below threshold → notify pharmacists + admins (LOW_STOCK); `lowStock()` query.

**medicines.controller.ts** — GET /medicines/search (any logged-in), GET /medicines/:id/alternatives (any logged-in), POST (ADMIN/PHARMACIST), PATCH /:id (ADMIN/PHARMACIST), PATCH /:id/stock (PHARMACIST), GET /medicines/low-stock (PHARMACIST/ADMIN).

**dtos/** — create-medicine.dto (catalog fields + initial stock + threshold + alternativeIds?), update-stock.dto (action enum, quantity @Min(1), reason).

### appointments/ (Member 4)

**appointments.entity.ts** — id, patient, doctor, scheduledAt, type (default 'FOLLOW_UP_CHAT'), status (SCHEDULED/COMPLETED/CANCELLED), cancelReason (nullable), createdBy.

**appointments.service.ts** — CRUD scoped by role; `@Cron(CronExpression.EVERY_DAY_AT_8AM)` reminder job: find appointments within next 24h not yet reminded → notify patient (APPOINTMENT_REMINDER).

**appointments.controller.ts** — POST (DOCTOR/CHW), GET (own, upcoming/past filter), PATCH /:id (reschedule/cancel — DOCTOR/CHW/PATIENT-owner).

### notifications/ (Member 4 — build skeleton FIRST, week 1)

**notifications.entity.ts** — id, `@ManyToOne` user (recipient), type (enum EMERGENCY_ALERT/PRESCRIPTION_READY/APPOINTMENT_REMINDER/LOW_STOCK/ASSIGNMENT), title, body, refId (nullable — links to consultation/prescription/medicine), isRead (default false), createdAt.

**notifications.service.ts** — the shared method every module calls: `create(userId, type, title, body, refId?)`; plus `createForRole(role, ...)` (e.g. all admins), `listFor(userId)` with unreadCount, `markRead`, `markAllRead`.

**notifications.module.ts** — MUST export NotificationsService; triage, prescriptions, medicines, appointments, consultations modules import NotificationsModule.

**notifications.controller.ts** — GET / (own + unreadCount), PATCH /:id/read, PATCH /read-all.

### seeds/seed.ts

Standalone script (`npm run seed` → `ts-node src/seeds/seed.ts`): creates 1 admin, 5 doctors, 3 CHWs, 2 pharmacists, ~50 patients (realistic Bangladeshi names, MRNs), 30 medicines + inventory + mapped alternatives, sample consultations WITH chat transcripts, prescriptions, upcoming appointments, and one pre-staged critical patient so the emergency alert can be fired live in the demo. Solves the tutorial's chicken-and-egg (first admin exists before the app ever runs).

---

## Root Files

| File                 | Content                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| .env                 | DATABASE_HOST/PORT/NAME/USER/PASSWORD, JWT_SECRET, JWT_EXPIRES_IN=1d, PORT=3001, CORS_ORIGIN=http://localhost:3000 |
| .env.example         | same keys, dummy values — committed so teammates know what to configure                                            |
| .gitignore           | node_modules/, dist/, .env, uploads/*                                                                              |
| uploads/             | Multer diskStorage target for profile photos; filename pattern `${Date.now()}_${original}` (as in tutorial)        |
| package.json scripts | start:dev, build, seed, test                                                                                       |

## Conventions (team agreement)

1. Entity classes plural, tutorial-style: `Users`, `Patients`, `Medicines`.
2. Every POST/PATCH has a DTO with class-validator decorators; no `any` bodies.
3. Guards applied as in tutorial: `@UseGuards(JwtGuard, RolesGuard)` + `@Roles(UserRole.X)` per route.
4. Cross-module calls go service→service via module import (never touch another module's repository).
5. Multi-write operations (patient+MRN, triage+alert, prescription+items, stock+alert) wrapped in transactions.
6. Route paths: plain segments + params — `@Patch('update/:id')`, never `@Patch(':update/:id')` (tutorial bug).
7. No hardcoded secrets anywhere — everything from ConfigService.

## Known deltas from the tutorial (intentional fixes)

| Tutorial                                     | RHCP                                                                 | Why                            |
| -------------------------------------------- | -------------------------------------------------------------------- | ------------------------------ |
| DB creds + 'meow-meow' secret in code        | ConfigModule + .env                                                  | security, gradeable            |
| Login by userId                              | Login by email                                                       | matches wireframe 2.1, sane UX |
| role: string default 'user'                  | UserRole enum                                                        | typo-proof authorization       |
| Entity returns password hash                 | @Exclude + ClassSerializerInterceptor                                | no credential leaks            |
| Guarded register + open create-user backdoor | public patient register, ADMIN-only staff create, seeded first admin | consistent access model        |
| roles.decrator.ts                            | roles.decorator.ts                                                   | spelling                       |
| Stray aws-sdk auto-imports                   | none                                                                 | dead code                      |
