import { z } from 'zod';

// ─── Enums ─────────────────────────────────────────────────────────────────

export const GenderSchema = z.enum(['male', 'female', 'other', 'unknown']);
export type Gender = z.infer<typeof GenderSchema>;

export const FieldSourceSchema = z.enum([
  'extracted',    // Pulled from transcript by AI
  'missing',      // Not present in transcript
  'flagged',      // Present but uncertain / needs human check
  'manual',       // Set or corrected by human reviewer
]);
export type FieldSource = z.infer<typeof FieldSourceSchema>;

export const TriageCategorySchema = z.enum([
  'immediate',        // Simulation ESI 1 — life-threatening
  'emergent',         // Simulation ESI 2 — high risk
  'urgent',           // Simulation ESI 3 — stable but urgent
  'less-urgent',      // Simulation ESI 4 — low acuity
  'non-urgent',       // Simulation ESI 5 — very low acuity
  'needs-review',     // Insufficient info for categorisation
]);
export type TriageCategory = z.infer<typeof TriageCategorySchema>;

export const IntakeStatusSchema = z.enum([
  'draft',
  'extracted',
  'reviewed',
  'confirmed',
  'dispatched',
  'error',
]);
export type IntakeStatus = z.infer<typeof IntakeStatusSchema>;

// ─── Field review wrapper ───────────────────────────────────────────────────

export const FieldReviewSchema = z.object({
  source: FieldSourceSchema,
  note: z.string().optional(),
});
export type FieldReview = z.infer<typeof FieldReviewSchema>;

// ─── Vitals ────────────────────────────────────────────────────────────────

export const VitalsSchema = z.object({
  heartRateBpm: z.number().int().min(0).max(350).nullable(),
  bloodPressureSystolic: z.number().int().min(0).max(350).nullable(),
  bloodPressureDiastolic: z.number().int().min(0).max(200).nullable(),
  spo2Percentage: z.number().min(0).max(100).nullable(),
  respiratoryRate: z.number().int().min(0).max(100).nullable(),
  temperatureCelsius: z.number().min(25).max(45).nullable(),
});
export type Vitals = z.infer<typeof VitalsSchema>;

// ─── Patient ───────────────────────────────────────────────────────────────

export const PatientSchema = z.object({
  syntheticPatientId: z.string().min(1),
  estimatedAge: z.number().int().min(0).max(130).nullable(),
  gender: GenderSchema,
});
export type Patient = z.infer<typeof PatientSchema>;

// ─── History ───────────────────────────────────────────────────────────────

export const HistorySchema = z.object({
  relevantHistory: z.array(z.string()),
  allergies: z.array(z.string()),
  currentMedications: z.array(z.string()),
});
export type History = z.infer<typeof HistorySchema>;

// ─── Triage review ─────────────────────────────────────────────────────────

export const TriageReviewSchema = z.object({
  /** Category proposed by AI — always unverified */
  suggestedCategory: TriageCategorySchema.nullable(),
  /** Category explicitly selected by human reviewer */
  reviewedCategory: TriageCategorySchema.nullable(),
  reviewerConfirmed: z.boolean(),
  reviewerNotes: z.string().optional(),
  reviewedAt: z.string().datetime().optional(),
});
export type TriageReview = z.infer<typeof TriageReviewSchema>;

// ─── Safety alert ──────────────────────────────────────────────────────────

export const AlertSeveritySchema = z.enum(['info', 'warning', 'critical']);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const SafetyAlertSchema = z.object({
  field: z.string(),
  severity: AlertSeveritySchema,
  message: z.string(),
  isBlocking: z.boolean(),
});
export type SafetyAlert = z.infer<typeof SafetyAlertSchema>;

// ─── Triage Intake (core document) ─────────────────────────────────────────

export const TriageIntakeSchema = z.object({
  intakeId: z.string().min(1),
  patient: PatientSchema,
  chiefComplaint: z.string().min(1),
  vitals: VitalsSchema,
  history: HistorySchema,
  interventions: z.array(z.string()),
  transcript: z.string(),
  /** Per-field review metadata */
  fieldReview: z.record(z.string(), FieldReviewSchema),
  triageReview: TriageReviewSchema,
  /** Safety/validation alerts attached to this intake */
  alerts: z.array(SafetyAlertSchema).optional(),
  /** Whether extraction used real Gemma or deterministic mock */
  extractionMode: z.enum(['gemma', 'mock']).optional(),
  status: IntakeStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TriageIntake = z.infer<typeof TriageIntakeSchema>;

// ─── API request/response shapes ───────────────────────────────────────────

export const ExtractRequestSchema = z.object({
  transcript: z.string().min(10).max(10_000),
});
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

export const ExtractResponseSchema = z.object({
  intake: TriageIntakeSchema,
  alerts: z.array(SafetyAlertSchema),
  extractionMode: z.enum(['gemma', 'mock']),
});
export type ExtractResponse = z.infer<typeof ExtractResponseSchema>;

export const ConfirmRequestSchema = z.object({
  reviewedCategory: TriageCategorySchema,
  reviewerNotes: z.string().max(2000).optional(),
});
export type ConfirmRequest = z.infer<typeof ConfirmRequestSchema>;

export const DispatchResponseSchema = z.object({
  fhirBundleId: z.string(),
  dispatchedAt: z.string().datetime(),
  message: z.string(),
});
export type DispatchResponse = z.infer<typeof DispatchResponseSchema>;

// ─── FHIR mock structures ─────────────────────────────────────────────────

export const FhirResourceSchema = z.object({
  resourceType: z.string(),
  id: z.string(),
  // Allow any additional fields
}).passthrough();
export type FhirResource = z.infer<typeof FhirResourceSchema>;

export const FhirBundleSchema = z.object({
  resourceType: z.literal('Bundle'),
  id: z.string(),
  type: z.literal('transaction'),
  timestamp: z.string().datetime(),
  entry: z.array(z.object({
    resource: FhirResourceSchema,
    request: z.object({
      method: z.string(),
      url: z.string(),
    }),
  })),
});
export type FhirBundle = z.infer<typeof FhirBundleSchema>;

export const MockFhirRecordSchema = z.object({
  recordId: z.string(),
  intakeId: z.string(),
  bundle: FhirBundleSchema,
  dispatchedAt: z.string().datetime(),
  status: z.enum(['received', 'processing', 'complete']),
  // Summary fields for dashboard display
  patientId: z.string(),
  chiefComplaint: z.string(),
  urgencyCategory: TriageCategorySchema,
});
export type MockFhirRecord = z.infer<typeof MockFhirRecordSchema>;

// ─── Demo scenario ─────────────────────────────────────────────────────────

export const DemoScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  transcript: z.string(),
  expectedFlags: z.array(z.string()).optional(),
});
export type DemoScenario = z.infer<typeof DemoScenarioSchema>;

// ─── Transcription request/response ────────────────────────────────────────

export const TranscribeResponseSchema = z.object({
  transcript: z.string(),
  source: z.enum(['ai', 'mock', 'speech_api']),
  scenarioId: z.string().optional(),
});
export type TranscribeResponse = z.infer<typeof TranscribeResponseSchema>;

