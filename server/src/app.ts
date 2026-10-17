import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { healthRouter } from './routes/health';
import { triageRouter } from './routes/triage';
import { fhirRouter } from './routes/fhir';

export function createApp() {
  const app = express();

  // ─── CORS (restrictive for hackathon) ──────────────────────────────────────
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ─── Body parsing ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));

  // ─── Rate limiting for AI endpoints ────────────────────────────────────────
  const aiLimiter = rateLimit({
    windowMs: 60_000, // 1 minute
    max: 60,
    skip: () => config.nodeEnv === 'test',
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests to AI extraction. Please wait a moment.' },
  });

  // ─── Routes ────────────────────────────────────────────────────────────────
  app.use('/api', healthRouter);
  app.use('/api/triage', aiLimiter);
  app.use('/api/triage', triageRouter);
  app.use('/api/mock-fhir', fhirRouter);

  // ─── Global error handler ──────────────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[error]', err.message);
    // Never expose stack traces or internal details
    const safeMessage = config.nodeEnv === 'development' ? err.message : 'Internal server error';
    res.status(500).json({ error: safeMessage });
  });

  return app;
}
