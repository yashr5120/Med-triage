import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ExtractRequestSchema,
  TriageIntakeSchema,
  ConfirmRequestSchema,
} from '@triagevoice/shared';
import multer from 'multer';
import { extractClinicalData } from '../services/gemmaService';
import { transcribeAudioBuffer } from '../services/transcribeService';
import { runSafetyRules, hasBlockingAlerts } from '../services/safetyRules';
import {
  saveIntake,
  getIntake,
  getAllIntakes,
  getStats,
} from '../store/intakeStore';
import { dispatchIntake } from '../services/fhirService';
import { DEMO_SCENARIOS } from '../data/scenarios';

export const triageRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});

// ─── POST /api/triage/transcribe ──────────────────────────────────────────────

triageRouter.post(
  '/transcribe',
  upload.single('audio'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let audioBuffer: Buffer | null = null;
      let mimeType = 'audio/webm';
      let scenarioId: string | undefined = undefined;

      if (req.file) {
        audioBuffer = req.file.buffer;
        mimeType =
          req.file.mimetype ||
          (typeof req.body?.mimeType === 'string' ? req.body.mimeType : 'audio/webm');
        scenarioId =
          typeof req.body?.scenarioId === 'string' ? req.body.scenarioId : undefined;
      } else if (req.body && typeof req.body.audioBase64 === 'string') {
        audioBuffer = Buffer.from(req.body.audioBase64, 'base64');
        mimeType =
          typeof req.body.mimeType === 'string' ? req.body.mimeType : 'audio/webm';
        scenarioId =
          typeof req.body.scenarioId === 'string' ? req.body.scenarioId : undefined;
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        res.status(400).json({ error: 'No audio provided for transcription' });
        return;
      }

      const result = await transcribeAudioBuffer(audioBuffer, mimeType, scenarioId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/triage/stats ────────────────────────────────────────────────────

triageRouter.get('/stats', (_req: Request, res: Response) => {
  res.json(getStats());
});

// ─── GET /api/triage/scenarios ────────────────────────────────────────────────

triageRouter.get('/scenarios', (_req: Request, res: Response) => {
  res.json(DEMO_SCENARIOS);
});

// ─── GET /api/triage/intakes ─────────────────────────────────────────────────

triageRouter.get('/intakes', (_req: Request, res: Response) => {
  res.json(getAllIntakes());
});

// ─── POST /api/triage/extract ─────────────────────────────────────────────────

triageRouter.post('/extract', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodyParsed = ExtractRequestSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: bodyParsed.error.flatten(),
      });
      return;
    }

    const { transcript } = bodyParsed.data;
    const scenarioId = typeof req.body.scenarioId === 'string' ? req.body.scenarioId : undefined;

    const { intake, extractionMode } = await extractClinicalData(transcript, scenarioId);
    const alerts = runSafetyRules(intake);
    intake.alerts = alerts;

    saveIntake(intake);

    res.json({ intake, alerts, extractionMode });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/triage/intakes/:id ─────────────────────────────────────────────

triageRouter.get('/intakes/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const intake = getIntake(id);
  if (!intake) {
    res.status(404).json({ error: 'Intake not found' });
    return;
  }
  res.json(intake);
});

// ─── PATCH /api/triage/intakes/:id ───────────────────────────────────────────

const PatchIntakeSchema = z.object({
  chiefComplaint: z.string().optional(),
  patient: z.object({
    estimatedAge: z.number().int().min(0).max(130).nullable().optional(),
    gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  }).optional(),
  vitals: z.object({
    heartRateBpm: z.number().int().min(0).max(350).nullable().optional(),
    bloodPressureSystolic: z.number().int().min(0).max(350).nullable().optional(),
    bloodPressureDiastolic: z.number().int().min(0).max(200).nullable().optional(),
    spo2Percentage: z.number().min(0).max(100).nullable().optional(),
    respiratoryRate: z.number().int().min(0).max(100).nullable().optional(),
    temperatureCelsius: z.number().min(25).max(45).nullable().optional(),
  }).optional(),
  history: z.object({
    relevantHistory: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    currentMedications: z.array(z.string()).optional(),
  }).optional(),
  interventions: z.array(z.string()).optional(),
  fieldReview: z.record(z.string(), z.object({
    source: z.enum(['extracted', 'missing', 'flagged', 'manual']),
    note: z.string().optional(),
  })).optional(),
});

triageRouter.patch('/intakes/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const intake = getIntake(id);
  if (!intake) {
    res.status(404).json({ error: 'Intake not found' });
    return;
  }

  if (intake.status === 'dispatched') {
    res.status(409).json({ error: 'Cannot modify a dispatched intake' });
    return;
  }

  const parsed = PatchIntakeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid patch data', details: parsed.error.flatten() });
    return;
  }

  const patch = parsed.data;
  if (patch.chiefComplaint) intake.chiefComplaint = patch.chiefComplaint;
  if (patch.patient) {
    if (patch.patient.estimatedAge !== undefined) intake.patient.estimatedAge = patch.patient.estimatedAge ?? null;
    if (patch.patient.gender) intake.patient.gender = patch.patient.gender;
  }
  if (patch.vitals) {
    intake.vitals = { ...intake.vitals, ...patch.vitals };
  }
  if (patch.history) {
    intake.history = { ...intake.history, ...patch.history };
  }
  if (patch.interventions) intake.interventions = patch.interventions;
  if (patch.fieldReview) {
    intake.fieldReview = { ...intake.fieldReview, ...patch.fieldReview };
  }

  // Rerun safety rules after edit
  const alerts = runSafetyRules(intake);
  intake.alerts = alerts;
  intake.status = 'reviewed';

  saveIntake(intake);
  res.json(intake);
});

// ─── POST /api/triage/intakes/:id/confirm ────────────────────────────────────

triageRouter.post('/intakes/:id/confirm', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const intake = getIntake(id);
  if (!intake) {
    res.status(404).json({ error: 'Intake not found' });
    return;
  }

  if (intake.status === 'dispatched') {
    res.status(409).json({ error: 'Intake is already dispatched' });
    return;
  }

  const parsed = ConfirmRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid confirm request', details: parsed.error.flatten() });
    return;
  }

  const alerts = intake.alerts ?? runSafetyRules(intake);
  const blocking = alerts.filter(a => a.isBlocking);
  if (blocking.length > 0) {
    res.status(422).json({
      error: 'Cannot confirm intake with blocking data-integrity errors',
      blockingAlerts: blocking,
    });
    return;
  }

  intake.triageReview.reviewedCategory = parsed.data.reviewedCategory;
  intake.triageReview.reviewerNotes = parsed.data.reviewerNotes;
  intake.triageReview.reviewerConfirmed = true;
  intake.triageReview.reviewedAt = new Date().toISOString();
  intake.status = 'confirmed';
  intake.alerts = alerts;

  saveIntake(intake);
  res.json(intake);
});

// ─── POST /api/triage/intakes/:id/dispatch ───────────────────────────────────

triageRouter.post('/intakes/:id/dispatch', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const intake = getIntake(id);
  if (!intake) {
    res.status(404).json({ error: 'Intake not found' });
    return;
  }

  try {
    // dispatchIntake validates status server-side — does not trust client flags
    const record = dispatchIntake(intake);
    intake.status = 'dispatched';
    saveIntake(intake);

    res.json({
      fhirBundleId: record.bundle.id,
      recordId: record.recordId,
      dispatchedAt: record.dispatchedAt,
      message: 'Mock dispatch accepted by simulated hospital gateway. No real EHR was contacted.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(422).json({ error: msg });
  }
});

// ─── DELETE /api/triage/reset ────────────────────────────────────────────────

import { deleteAllIntakes } from '../store/intakeStore';
import { getAllRecords } from '../services/fhirService';

triageRouter.delete('/reset', (_req: Request, res: Response) => {
  deleteAllIntakes();
  res.json({ message: 'All synthetic demo data has been reset.' });
});
