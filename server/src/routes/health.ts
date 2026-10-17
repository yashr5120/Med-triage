import { Router, Request, Response } from 'express';
import { config } from '../config';
import { getStats } from '../store/intakeStore';
import { getAllRecords } from '../services/fhirService';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  const stats = getStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    demoMode: config.demoMode,
    model: config.gemmaModel,
    aiConnected: !!config.geminiApiKey && !config.demoMode,
    intakeStats: stats,
    fhirRecordCount: getAllRecords().length,
    disclaimer: 'PROTOTYPE ONLY — Not a medical device. Not for clinical use.',
  });
});
