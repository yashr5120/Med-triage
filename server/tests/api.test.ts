import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.demoMode).toBe('boolean');
    expect(typeof res.body.model).toBe('string');
  });

  it('includes disclaimer', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.disclaimer).toBeTruthy();
  });
});

describe('GET /api/triage/scenarios', () => {
  it('returns at least 4 demo scenarios', async () => {
    const res = await request(app).get('/api/triage/scenarios');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
  });

  it('each scenario has id, name, description, transcript', async () => {
    const res = await request(app).get('/api/triage/scenarios');
    for (const s of res.body) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.name).toBe('string');
      expect(typeof s.transcript).toBe('string');
      expect(s.transcript.length).toBeGreaterThan(20);
    }
  });
});

describe('POST /api/triage/extract', () => {
  it('returns 400 for missing transcript', async () => {
    const res = await request(app).post('/api/triage/extract').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for too-short transcript', async () => {
    const res = await request(app).post('/api/triage/extract').send({ transcript: 'hi' });
    expect(res.status).toBe(400);
  });

  it('extracts data in demo mode', async () => {
    const res = await request(app)
      .post('/api/triage/extract')
      .send({
        transcript: 'Medic 7, 58-year-old male, respiratory distress, SpO2 84%, HR 118.',
        scenarioId: 'scenario-resp-distress',
      });
    expect(res.status).toBe(200);
    expect(res.body.intake).toBeDefined();
    expect(res.body.extractionMode).toBe('mock'); // server is in demo mode during tests
    expect(res.body.intake.extractionMode).toBe('mock');
    expect(res.body.alerts).toBeDefined();
  });

  it('returns intake with synthetic patient ID', async () => {
    const res = await request(app)
      .post('/api/triage/extract')
      .send({ transcript: 'Patient is a 45-year-old male with chest pain and normal vitals.' });
    expect(res.status).toBe(200);
    expect(res.body.intake.patient.syntheticPatientId).toBeTruthy();
    expect(res.body.intake.patient.syntheticPatientId).toMatch(/PT-/);
  });
});

describe('GET /api/triage/intakes and PATCH', () => {
  let intakeId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/triage/extract')
      .send({ transcript: 'Patient is a 55-year-old female with shortness of breath.' });
    intakeId = res.body.intake.intakeId;
  });

  it('GET /api/triage/intakes returns the created intake', async () => {
    const res = await request(app).get('/api/triage/intakes');
    expect(res.status).toBe(200);
    const found = res.body.find((i: any) => i.intakeId === intakeId);
    expect(found).toBeDefined();
  });

  it('GET /api/triage/intakes/:id returns the intake', async () => {
    const res = await request(app).get(`/api/triage/intakes/${intakeId}`);
    expect(res.status).toBe(200);
    expect(res.body.intakeId).toBe(intakeId);
  });

  it('returns 404 for unknown intake', async () => {
    const res = await request(app).get('/api/triage/intakes/SIM-UNKNOWN');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/triage/intakes/:id/confirm', () => {
  let intakeId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/triage/extract')
      .send({ transcript: 'Patient is a 60-year-old male with stable vitals and chest pain.' });
    intakeId = res.body.intake.intakeId;
  });

  it('returns 400 when reviewedCategory is missing', async () => {
    const res = await request(app)
      .post(`/api/triage/intakes/${intakeId}/confirm`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('confirms intake with valid category', async () => {
    const res = await request(app)
      .post(`/api/triage/intakes/${intakeId}/confirm`)
      .send({ reviewedCategory: 'urgent', reviewerNotes: 'Test reviewer note' });
    expect([200, 422]).toContain(res.status); // 422 if blocking alerts
    if (res.status === 200) {
      expect(res.body.status).toBe('confirmed');
      expect(res.body.triageReview.reviewerConfirmed).toBe(true);
      expect(res.body.triageReview.reviewedCategory).toBe('urgent');
    }
  });
});

describe('POST /api/triage/intakes/:id/dispatch — before confirmation', () => {
  it('returns 422 when intake is not confirmed', async () => {
    const extractRes = await request(app)
      .post('/api/triage/extract')
      .send({ transcript: 'Patient 70 years old, fall from standing, complains of hip pain.' });
    const id = extractRes.body.intake.intakeId;

    const dispatchRes = await request(app).post(`/api/triage/intakes/${id}/dispatch`);
    expect(dispatchRes.status).toBe(422);
    expect(dispatchRes.body.error).toMatch(/status|confirmed/i);
  });
});

describe('GET /api/mock-fhir/records', () => {
  it('returns an array', async () => {
    const res = await request(app).get('/api/mock-fhir/records');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('includes mock disclaimer header', async () => {
    const res = await request(app).get('/api/mock-fhir/records');
    expect(res.headers['x-mock-system']).toBeTruthy();
  });
});

describe('POST /api/triage/transcribe', () => {
  it('returns 400 when no audio is provided', async () => {
    const res = await request(app).post('/api/triage/transcribe').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no audio provided/i);
  });

  it('transcribes base64 audio payload in demo mode', async () => {
    const fakeAudioBase64 = Buffer.from('RIFF....WAVEfmt....data....').toString('base64');
    const res = await request(app)
      .post('/api/triage/transcribe')
      .send({
        audioBase64: fakeAudioBase64,
        mimeType: 'audio/wav',
      });
    expect(res.status).toBe(200);
    expect(typeof res.body.transcript).toBe('string');
    expect(res.body.transcript.length).toBeGreaterThan(10);
    expect(res.body.source).toBe('mock');
  });

  it('transcribes multipart audio file upload in demo mode', async () => {
    const fakeAudioBuffer = Buffer.from('FAKE_AUDIO_SAMPLE');
    const res = await request(app)
      .post('/api/triage/transcribe')
      .attach('audio', fakeAudioBuffer, 'test-handoff.webm');
    expect(res.status).toBe(200);
    expect(typeof res.body.transcript).toBe('string');
    expect(res.body.transcript.length).toBeGreaterThan(10);
    expect(res.body.source).toBe('mock');
  });

  it('returns scenario transcript if scenarioId is provided in demo mode', async () => {
    const fakeAudioBuffer = Buffer.from('FAKE_AUDIO_SAMPLE');
    const res = await request(app)
      .post('/api/triage/transcribe')
      .field('scenarioId', 'scenario-resp-distress')
      .attach('audio', fakeAudioBuffer, 'test-handoff.webm');
    expect(res.status).toBe(200);
    expect(res.body.transcript).toContain('Medic 7');
    expect(res.body.source).toBe('mock');
  });
});

