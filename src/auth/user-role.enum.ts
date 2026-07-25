export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  CHW = 'CHW',
  PATIENT = 'PATIENT',
  PHARMACIST = 'PHARMACIST',
  STAFF = 'STAFF',
}

export enum TriageStatus {
  CRITICAL = 'CRITICAL',
  NON_CRITICAL = 'NON_CRITICAL',
}

export enum ConsultationStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PrescriptionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TreatmentPlanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum NotificationType {
  EMERGENCY_ALERT = 'EMERGENCY_ALERT',
  PRESCRIPTION_READY = 'PRESCRIPTION_READY',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  LOW_STOCK = 'LOW_STOCK',
  ASSIGNMENT = 'ASSIGNMENT',
}

export enum StockAction {
  ADD = 'ADD',
  REDUCE = 'REDUCE',
  SET = 'SET',
}
