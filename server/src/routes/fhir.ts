import { Router, Request, Response } from 'express';
import { getAllRecords, getRecord } from '../services/fhirService';

export const fhirRouter = Router();

// All responses include the mock disclaimer header

fhirRouter.use((_req, res, next) => {
  res.setHeader('X-Mock-System', 'TRIAGEVOICE-AI-DEMO - NO REAL EHR');
  next();
});

// ─── GET /api/mock-fhir/records ───────────────────────────────────────────────

fhirRouter.get('/records', (_req: Request, res: Response) => {
  const records = getAllRecords().map(r => ({
    recordId: r.recordId,
    intakeId: r.intakeId,
    patientId: r.patientId,
    chiefComplaint: r.chiefComplaint,
    urgencyCategory: r.urgencyCategory,
    dispatchedAt: r.dispatchedAt,
    status: r.status,
    bundleId: r.bundle.id,
    resourceCount: r.bundle.entry.length,
  }));
  res.json(records);
});

// ─── GET /api/mock-fhir/records/:id ──────────────────────────────────────────

fhirRouter.get('/records/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const record = getRecord(id);
  if (!record) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }
  res.json(record);
});
