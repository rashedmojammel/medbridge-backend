# RHCP Backend — Complete API Endpoint Reference

Base URL (dev): `http://localhost:3001`
All protected routes require header: `Authorization: Bearer <access_token>`
All responses use the envelope: `{ "success": true, "data": ..., "message": "..." }`
Errors: 400 validation · 401 not logged in / bad token · 403 wrong role or not owner · 404 not found · 409 conflict

Total: **42 REST endpoints** (6 public, 36 protected) + **1 WebSocket namespace** (3 client events, 4 server events)

---

## 1. Auth — `/auth` (Member 1)

| #   | Method | Endpoint         | Access        | Description                                                                                   |
| --- | ------ | ---------------- | ------------- | --------------------------------------------------------------------------------------------- |
| 1   | POST   | `/auth/register` | Public        | Patient self-registration. Creates user (role PATIENT) + patient row + MRN in one transaction |
| 2   | POST   | `/auth/login`    | Public        | Login with **email + password** → `{ access_token, user }`                                    |
| 3   | GET    | `/auth/me`       | Any logged-in | Current user decoded from token                                                               |

**Request bodies**

`POST /auth/register`

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+8801712345678",
  "dob": "1985-03-15",
  "gender": "MALE",
  "bloodGroup": "B+",
  "address": "Village Rampur, Lakshmipur",
  "emergencyContactName": "Jane Doe",
  "emergencyContactPhone": "+8801811111111",
  "password": "secret123"
}
```

`POST /auth/login`

```json
{ "email": "john@example.com", "password": "secret123" }
```

Response: `{ "access_token": "eyJ...", "user": { "id": 7, "fullName": "John Doe", "role": "PATIENT" } }`

---

## 2. Users & Public Directory — `/users` (Member 1)

| #   | Method | Endpoint                    | Access         | Description                                                                     |
| --- | ------ | --------------------------- | -------------- | ------------------------------------------------------------------------------- |
| 4   | GET    | `/users/public/doctors`     | Public         | Directory list (only `is_public=true`). Query: `?search=&specialization=&page=` |
| 5   | GET    | `/users/public/doctors/:id` | Public         | Doctor public profile (bio, qualifications, specializations)                    |
| 6   | GET    | `/users/public/chws`        | Public         | CHW directory. Query: `?search=&area=`                                          |
| 7   | GET    | `/users/public/staff`       | Public         | Staff & pharmacist directory. Query: `?department=`                             |
| 8   | GET    | `/users`                    | ADMIN          | All users. Query: `?role=&status=&isPublic=&search=&page=`                      |
| 9   | GET    | `/users/:id`                | ADMIN          | Single user full detail (incl. role-specific profile)                           |
| 10  | POST   | `/users`                    | ADMIN          | Create Doctor/CHW/Pharmacist/Staff/Admin account + role profile row             |
| 11  | PATCH  | `/users/:id`                | ADMIN          | Edit fields, toggle `isPublic`, activate/deactivate                             |
| 12  | POST   | `/users/:id/photo`          | Owner or ADMIN | Profile photo upload (multipart, field `file`, images only → `/uploads`)        |

**`POST /users` body (doctor example)**

```json
{
  "fullName": "Dr. Sarah Miller",
  "email": "sarah@rhcp.com",
  "phone": "+8801912345678",
  "role": "DOCTOR",
  "password": "TempPass1",
  "isPublic": true,
  "specialization": "Cardiology",
  "qualifications": "MBBS, MD (Cardiology)",
  "experienceYears": 15,
  "licenseNumber": "BMDC-12345",
  "bio": "Senior cardiologist..."
}
```

Public responses NEVER include: email, phone, password, isActive internals.

---

## 3. Patients — `/patients` (Member 2)

| #   | Method | Endpoint        | Access                                      | Description                                                                      |
| --- | ------ | --------------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| 13  | POST   | `/patients`     | CHW                                         | Register patient (no login account). MRN auto: `P-YYYY-NNNNNN`                   |
| 14  | GET    | `/patients`     | CHW, DOCTOR, ADMIN                          | List/search. Query: `?search=<mrn                                                | name | phone>&page=` |
| 15  | GET    | `/patients/:id` | CHW, DOCTOR, ADMIN, or the patient themself | Full record: demographics, allergies, chronic conditions + latest vitals summary |
| 16  | PATCH  | `/patients/:id` | CHW, ADMIN                                  | Update demographics/contacts. MRN immutable                                      |

**`POST /patients` body**

```json
{
  "fullName": "Ramesh Kumar",
  "dob": "1998-01-20",
  "gender": "MALE",
  "bloodGroup": "O+",
  "phone": "+8801700000001",
  "altPhone": null,
  "address": "House 12, Block A",
  "village": "Rampur",
  "district": "Lakshmipur",
  "emergencyContactName": "Sita Kumar",
  "emergencyContactRelation": "SPOUSE",
  "emergencyContactPhone": "+8801700000002",
  "allergies": "Penicillin",
  "chronicConditions": "Type 2 Diabetes",
  "currentMedications": "Metformin 500mg"
}
```

---

## 4. Triage — `/triage` (Member 2)

| #   | Method | Endpoint                     | Access             | Description                                                                                                    |
| --- | ------ | ---------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| 17  | POST   | `/triage/vitals`             | CHW                | Record vitals. Response includes warnings + `suggestedTriage` (rule-based)                                     |
| 18  | POST   | `/triage/symptoms`           | CHW                | Symptom report + final triage classification. CRITICAL → emergency alert to doctor + admins (same transaction) |
| 19  | GET    | `/triage/patient/:patientId` | DOCTOR, CHW, ADMIN | Vitals + symptom-report history for a patient, newest first                                                    |

**`POST /triage/vitals` body**

```json
{
  "patientId": 13,
  "temperature": 38.5,
  "bpSystolic": 120,
  "bpDiastolic": 80,
  "pulse": 78,
  "spo2": 98,
  "respiratoryRate": 16,
  "bloodSugar": 110
}
```

Response `data` includes: `{ "id": 41, "warnings": ["Temperature above normal"], "suggestedTriage": "NON_CRITICAL" }`

**`POST /triage/symptoms` body**

```json
{
  "patientId": 13,
  "vitalSignId": 41,
  "primaryComplaint": "Fever and headache since 2 days",
  "symptoms": ["FEVER", "BODY_ACHE", "FATIGUE"],
  "duration": "2_DAYS",
  "severity": "MODERATE",
  "triageStatus": "NON_CRITICAL",
  "notes": "History of diabetes, on medication"
}
```

---

## 5. Consultations — `/consultations` (Member 3)

| #   | Method | Endpoint                       | Access               | Description                                                                                             |
| --- | ------ | ------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------- |
| 20  | POST   | `/consultations`               | CHW                  | Schedule chat consultation (patient, doctor, datetime, reason). Notifies doctor + patient               |
| 21  | GET    | `/consultations`               | DOCTOR, CHW, PATIENT | Own consultations. Query: `?status=&date=&page=` (doctor: assigned; patient: own; CHW: scheduled-by-me) |
| 22  | GET    | `/consultations/:id`           | Participants + ADMIN | Detail incl. patient snapshot, diagnosis, and **full ordered chat transcript**                          |
| 23  | PATCH  | `/consultations/:id/diagnosis` | DOCTOR (assigned)    | Save diagnosis + doctor notes                                                                           |
| 24  | PATCH  | `/consultations/:id/complete`  | DOCTOR (assigned)    | Status → COMPLETED, chat locked, `consultationEnded` emitted                                            |

**Bodies**

```json
POST /consultations
{ "patientId": 13, "doctorId": 4, "scheduledAt": "2026-07-22T10:30:00+06:00", "reason": "Fever, 2 days, diabetic patient" }

PATCH /consultations/:id/diagnosis
{ "diagnosis": "Viral fever", "notes": "Mild dehydration, advised fluids" }
```

### WebSocket — namespace `/chat` (Socket.IO)

Connect: `io("http://localhost:3001/chat", { auth: { token: "<jwt>" } })` — invalid token → immediate disconnect.

| Direction       | Event                     | Payload                                                           | Behavior                                                                       |
| --------------- | ------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| client → server | `joinRoom`                | `{ consultationId }`                                              | Participant check → join room `consult:<id>` → broadcast `userJoined`          |
| client → server | `sendMessage`             | `{ consultationId, text }` (≤2000 chars)                          | Persist first, then broadcast `newMessage`. Rejected if consultation COMPLETED |
| client → server | `typing`                  | `{ consultationId }`                                              | Broadcast only, not stored                                                     |
| server → client | `newMessage`              | `{ id, consultationId, sender: {id,name,role}, message, sentAt }` | Delivered to both participants                                                 |
| server → client | `userJoined` / `userLeft` | `{ userId, name }`                                                | Presence                                                                       |
| server → client | `consultationEnded`       | `{ consultationId }`                                              | Client disables input                                                          |

---

## 6. Prescriptions & Treatment Plans (Member 3)

| #   | Method | Endpoint                              | Access                         | Description                                                          |
| --- | ------ | ------------------------------------- | ------------------------------ | -------------------------------------------------------------------- |
| 25  | POST   | `/prescriptions`                      | DOCTOR                         | Create prescription + line items (one transaction). Notifies patient |
| 26  | GET    | `/prescriptions`                      | DOCTOR, PATIENT                | Doctor: issued · Patient: received. Query: `?status=&page=`          |
| 27  | GET    | `/prescriptions/:id`                  | Issuer, patient, ADMIN         | Full detail: items w/ medicine info, doctor notes, consultation link |
| 28  | PATCH  | `/prescriptions/:id/cancel`           | Issuing DOCTOR                 | Cancel with reason. **No edit/delete exists — cancel & reissue**     |
| 29  | POST   | `/treatment-plans`                    | DOCTOR                         | Plan: title, details, startDate, endDate                             |
| 30  | GET    | `/treatment-plans/patient/:patientId` | DOCTOR, ADMIN, or that patient | Active + past plans                                                  |

**`POST /prescriptions` body**

```json
{
  "consultationId": 22,
  "patientId": 13,
  "notes": "Fluids, rest 3 days, return if symptoms persist past 5 days",
  "items": [
    {
      "medicineId": 5,
      "dosage": "1 tablet",
      "frequency": "3 times daily",
      "duration": "5 days",
      "route": "ORAL",
      "instructions": "After meals"
    },
    {
      "medicineId": 9,
      "dosage": "1 tablet",
      "frequency": "Once daily at night",
      "duration": "5 days",
      "route": "ORAL",
      "instructions": "For allergy symptoms"
    }
  ]
}
```

---

## 7. Medicines & Inventory — `/medicines` (Member 4)

| #   | Method | Endpoint                      | Access            | Description                                                                       |
| --- | ------ | ----------------------------- | ----------------- | --------------------------------------------------------------------------------- |
| 31  | GET    | `/medicines/search?q=`        | Any logged-in     | Case-insensitive match on brand OR generic name, with availability + stock status |
| 32  | GET    | `/medicines/low-stock`        | PHARMACIST, ADMIN | All items where `stock < threshold`                                               |
| 33  | GET    | `/medicines/:id/alternatives` | Any logged-in     | Interchangeable medicines with availability                                       |
| 34  | POST   | `/medicines`                  | ADMIN, PHARMACIST | Add to catalog + initial inventory + optional alternative links                   |
| 35  | PATCH  | `/medicines/:id`              | ADMIN, PHARMACIST | Edit catalog fields / toggle availability                                         |
| 36  | PATCH  | `/medicines/:id/stock`        | PHARMACIST        | Stock action. Below-threshold crossing → LOW_STOCK alert (same transaction)       |

Route-order note: declare `search` and `low-stock` BEFORE `:id` routes, or `low-stock` will be captured as an id.

**Bodies**

```json
POST /medicines
{
  "brandName": "Napa 500mg", "genericName": "Paracetamol",
  "manufacturer": "Beximco", "dosageForm": "TABLET", "strength": "500mg",
  "therapeuticClass": "Analgesic", "stockQty": 200, "threshold": 50,
  "alternativeIds": [12, 18]
}

PATCH /medicines/:id/stock
{ "action": "REDUCE", "quantity": 30, "reason": "DISPENSED" }
```

Stock can never go below 0 — over-reduction → 400.

---

## 8. Appointments — `/appointments` (Member 4)

| #   | Method | Endpoint            | Access                         | Description                                                                |
| --- | ------ | ------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| 37  | POST   | `/appointments`     | DOCTOR, CHW                    | Schedule follow-up. Notifies patient                                       |
| 38  | GET    | `/appointments`     | DOCTOR, PATIENT, CHW           | Own appointments. Query: `?filter=upcoming                                 | past&page=` |
| 39  | PATCH  | `/appointments/:id` | DOCTOR, CHW, or owning PATIENT | Reschedule (`scheduledAt`) or cancel (`status: "CANCELLED", cancelReason`) |

Cron (not an endpoint): daily 08:00 — APPOINTMENT_REMINDER for appointments within 24h, max once per appointment.

---

## 9. Notifications — `/notifications` (Member 4)

| #   | Method | Endpoint                  | Access        | Description                                                                 |
| --- | ------ | ------------------------- | ------------- | --------------------------------------------------------------------------- |
| 40  | GET    | `/notifications`          | Any logged-in | Own notifications newest-first + `unreadCount`. Query: `?unread=true&page=` |
| 41  | PATCH  | `/notifications/:id/read` | Owner         | Mark one read                                                               |
| 42  | PATCH  | `/notifications/read-all` | Owner         | Mark all read                                                               |

Notification `type` values: `EMERGENCY_ALERT` · `PRESCRIPTION_READY` · `APPOINTMENT_REMINDER` · `LOW_STOCK` · `ASSIGNMENT`

---

## Quick Role → Endpoint Matrix

| Role       | Can call                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Public     | 1, 2, 4, 5, 6, 7                                                                                                     |
| PATIENT    | 3, 12(own), 15(own), 21, 22(own), 26, 27(own), 30(own), 31, 33, 38, 39(own), 40–42, chat(own)                        |
| CHW        | 3, 12(own), 13–19, 20, 21, 22(scheduled), 31, 33, 37–42, chat(scheduled)                                             |
| DOCTOR     | 3, 12(own), 14, 15, 19, 21–30, 31, 33, 37–42, chat(assigned)                                                         |
| PHARMACIST | 3, 12(own), 31–36, 40–42                                                                                             |
| ADMIN      | everything except issuing prescriptions/diagnoses (clinical actions stay with DOCTOR) and stock actions (PHARMACIST) |
