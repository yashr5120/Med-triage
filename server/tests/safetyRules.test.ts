import { describe, it, expect } from 'vitest';
import { runSafetyRules, hasBlockingAlerts, VITAL_THRESHOLDS } from '../src/services/safetyRules';
import { TriageIntake } from '@triagevoice/shared';

function makeIntake(overrides: Partial<TriageIntake> = {}): TriageIntake {
  const now = new Date().toISOString();
  return {
    intakeId: 'SIM-TEST001',
    patient: { syntheticPatientId: 'PT-1001', estimatedAge: 45, gender: 'male' },
    chiefComplaint: 'Chest pain',
    vitals: {
      heartRateBpm: 80,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      spo2Percentage: 98,
      respiratoryRate: 16,
      temperatureCelsius: 37.0,
    },
    history: { relevantHistory: [], allergies: [], currentMedications: [] },
    interventions: [],
    transcript: 'Synthetic transcript',
    fieldReview: {},
    triageReview: { suggestedCategory: null, reviewedCategory: null, reviewerConfirmed: false },
    status: 'extracted',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ─── Vital sign plausibility tests ────────────────────────────────────────────

describe('safetyRules — normal vitals', () => {
  it('produces no critical alerts for normal vitals', () => {
    const alerts = runSafetyRules(makeIntake());
    const critical = alerts.filter(a => a.severity === 'critical');
    expect(critical).toHaveLength(0);
  });

  it('produces no blocking alerts for normal vitals', () => {
    const alerts = runSafetyRules(makeIntake());
    expect(hasBlockingAlerts(alerts)).toBe(false);
  });
});

describe('safetyRules — heart rate', () => {
  it('flags critically low heart rate', () => {
    const intake = makeIntake({ vitals: { ...makeIntake().vitals, heartRateBpm: 35 } });
    const alerts = runSafetyRules(intake);
    const hrAlert = alerts.find(a => a.field === 'heartRateBpm');
    expect(hrAlert).toBeDefined();
    expect(hrAlert?.severity).toBe('critical');
  });

  it('flags critically high heart rate', () => {
    const intake = makeIntake({ vitals: { ...makeIntake().vitals, heartRateBpm: 200 } });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'heartRateBpm' && a.severity === 'critical')).toBe(true);
  });

  it('blocks on implausible heart rate (> 250)', () => {
    const intake = makeIntake({ vitals: { ...makeIntake().vitals, heartRateBpm: 400 } });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'heartRateBpm' && a.isBlocking)).toBe(true);
  });

  it('flags missing heart rate as info', () => {
    const intake = makeIntake({ vitals: { ...makeIntake().vitals, heartRateBpm: null } });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'heartRateBpm' && a.severity === 'info')).toBe(true);
  });
});

describe('safetyRules — SpO2', () => {
  it('flags critically low SpO2 (84%)', () => {
    const intake = makeIntake({ vitals: { ...makeIntake().vitals, spo2Percentage: 84 } });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'spo2Percentage' && a.severity === 'critical')).toBe(true);
  });

  it('warns on borderline SpO2 (91%)', () => {
    const intake = makeIntake({ vitals: { ...makeIntake().vitals, spo2Percentage: 91 } });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'spo2Percentage' && a.severity === 'warning')).toBe(true);
  });

  it('produces no SpO2 alert for 98%', () => {
    const intake = makeIntake({ vitals: { ...makeIntake().vitals, spo2Percentage: 98 } });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'spo2Percentage' && a.severity !== 'info')).toBe(false);
  });
});

describe('safetyRules — blood pressure', () => {
  it('blocks when diastolic >= systolic', () => {
    const intake = makeIntake({
      vitals: { ...makeIntake().vitals, bloodPressureSystolic: 80, bloodPressureDiastolic: 90 }
    });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'bloodPressure' && a.isBlocking)).toBe(true);
  });

  it('warns on critically low systolic (78)', () => {
    const intake = makeIntake({
      vitals: { ...makeIntake().vitals, bloodPressureSystolic: 78, bloodPressureDiastolic: 50 }
    });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'bloodPressureSystolic')).toBe(true);
  });

  it('warns on narrow pulse pressure', () => {
    const intake = makeIntake({
      vitals: { ...makeIntake().vitals, bloodPressureSystolic: 100, bloodPressureDiastolic: 85 }
    });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'bloodPressure' && a.message.toLowerCase().includes('narrow'))).toBe(true);
  });

  it('flags missing BP components', () => {
    const intake = makeIntake({
      vitals: { ...makeIntake().vitals, bloodPressureSystolic: null, bloodPressureDiastolic: null }
    });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'bloodPressure')).toBe(true);
  });
});

describe('safetyRules — respiratory rate', () => {
  it('flags elevated respiratory rate (42)', () => {
    const intake = makeIntake({ vitals: { ...makeIntake().vitals, respiratoryRate: 42 } });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'respiratoryRate')).toBe(true);
  });

  it('flags critically low respiratory rate (6)', () => {
    const intake = makeIntake({ vitals: { ...makeIntake().vitals, respiratoryRate: 6 } });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'respiratoryRate' && a.severity === 'critical')).toBe(true);
  });
});

describe('safetyRules — required fields', () => {
  it('blocks on missing chief complaint', () => {
    const intake = makeIntake({ chiefComplaint: '' });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'chiefComplaint' && a.isBlocking)).toBe(true);
    expect(hasBlockingAlerts(alerts)).toBe(true);
  });
});

describe('safetyRules — flagged fields', () => {
  it('warns when fields are flagged for review', () => {
    const intake = makeIntake({
      fieldReview: {
        spo2Percentage: { source: 'flagged', note: 'Uncertain reading' },
        heartRateBpm: { source: 'flagged', note: 'Monitor signal loss' },
      }
    });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'fieldReview' && a.severity === 'warning')).toBe(true);
  });
});

describe('safetyRules — temperature', () => {
  it('flags critically high temperature (40.5)', () => {
    const intake = makeIntake({ vitals: { ...makeIntake().vitals, temperatureCelsius: 40.5 } });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'temperatureCelsius' && a.severity === 'critical')).toBe(true);
  });

  it('allows null temperature without warning (optional field)', () => {
    const intake = makeIntake({ vitals: { ...makeIntake().vitals, temperatureCelsius: null } });
    const alerts = runSafetyRules(intake);
    expect(alerts.some(a => a.field === 'temperatureCelsius' && a.severity !== 'info')).toBe(false);
  });
});
