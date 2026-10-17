import { describe, it, expect } from 'vitest';
import { buildFhirBundle, dispatchIntake } from '../src/services/fhirService';
import { TriageIntake } from '@triagevoice/shared';

function makeConfirmedIntake(vitalsOverride = {}): TriageIntake {
  const now = new Date().toISOString();
  return {
    intakeId: 'SIM-FHIR001',
    patient: { syntheticPatientId: 'PT-9001', estimatedAge: 67, gender: 'female' },
    chiefComplaint: 'Chest discomfort',
    vitals: {
      heartRateBpm: 94,
      bloodPressureSystolic: 102,
      bloodPressureDiastolic: 68,
      spo2Percentage: 96,
      respiratoryRate: 18,
      temperatureCelsius: 36.8,
      ...vitalsOverride,
    },
    history: { relevantHistory: ['Hypertension'], allergies: [], currentMedications: ['Lisinopril'] },
    interventions: ['Aspirin 325mg'],
    transcript: 'Fictional chest discomfort scenario',
    fieldReview: {},
    triageReview: {
      suggestedCategory: 'emergent',
      reviewedCategory: 'emergent',
      reviewerConfirmed: true,
      reviewedAt: now,
    },
    status: 'confirmed',
    createdAt: now,
    updatedAt: now,
  };
}

describe('FHIR bundle structure', () => {
  it('produces a Bundle resourceType', () => {
    const bundle = buildFhirBundle(makeConfirmedIntake());
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('transaction');
  });

  it('contains an Encounter resource', () => {
    const bundle = buildFhirBundle(makeConfirmedIntake());
    const encounter = bundle.entry.find(e => e.resource.resourceType === 'Encounter');
    expect(encounter).toBeDefined();
    expect(encounter?.request.method).toBe('POST');
    expect(encounter?.request.url).toBe('Encounter');
  });

  it('contains vital sign Observations for non-null values', () => {
    const bundle = buildFhirBundle(makeConfirmedIntake());
    const observations = bundle.entry.filter(e => e.resource.resourceType === 'Observation');
    // 6 vitals all non-null → 6 observations
    expect(observations.length).toBe(6);
  });

  it('omits Observation for null vital signs', () => {
    const intake = makeConfirmedIntake({
      heartRateBpm: null,
      temperatureCelsius: null,
    });
    const bundle = buildFhirBundle(intake);
    const observations = bundle.entry.filter(e => e.resource.resourceType === 'Observation');
    // 4 non-null vitals remain
    expect(observations.length).toBe(4);
  });

  it('uses correct LOINC code for heart rate', () => {
    const bundle = buildFhirBundle(makeConfirmedIntake());
    const hrObs = bundle.entry.find(e => {
      const r = e.resource as any;
      return r.resourceType === 'Observation' &&
        r.code?.coding?.[0]?.code === '8867-4';
    });
    expect(hrObs).toBeDefined();
  });

  it('uses correct LOINC code for SpO2', () => {
    const bundle = buildFhirBundle(makeConfirmedIntake());
    const spo2Obs = bundle.entry.find(e => {
      const r = e.resource as any;
      return r.resourceType === 'Observation' &&
        r.code?.coding?.[0]?.code === '59408-5';
    });
    expect(spo2Obs).toBeDefined();
  });

  it('includes UCUM unit for heart rate', () => {
    const bundle = buildFhirBundle(makeConfirmedIntake());
    const hrObs = bundle.entry.find(e => {
      const r = e.resource as any;
      return r.resourceType === 'Observation' && r.code?.coding?.[0]?.code === '8867-4';
    });
    const r = hrObs?.resource as any;
    expect(r?.valueQuantity?.unit).toBe('/min');
  });

  it('bundle has a valid timestamp', () => {
    const bundle = buildFhirBundle(makeConfirmedIntake());
    expect(() => new Date(bundle.timestamp)).not.toThrow();
    expect(isNaN(new Date(bundle.timestamp).getTime())).toBe(false);
  });
});

describe('dispatchIntake — state validation', () => {
  it('throws when intake status is not confirmed', () => {
    const intake = { ...makeConfirmedIntake(), status: 'extracted' as const };
    expect(() => dispatchIntake(intake)).toThrow(/status.*extracted/i);
  });

  it('throws when reviewerConfirmed is false', () => {
    const intake = {
      ...makeConfirmedIntake(),
      status: 'confirmed' as const,
      triageReview: { ...makeConfirmedIntake().triageReview, reviewerConfirmed: false }
    };
    expect(() => dispatchIntake(intake)).toThrow(/human reviewer/i);
  });

  it('throws when reviewedCategory is null', () => {
    const intake = {
      ...makeConfirmedIntake(),
      status: 'confirmed' as const,
      triageReview: { ...makeConfirmedIntake().triageReview, reviewedCategory: null }
    };
    expect(() => dispatchIntake(intake)).toThrow(/urgency category/i);
  });

  it('succeeds and returns a record for a valid confirmed intake', () => {
    const intake = makeConfirmedIntake();
    const record = dispatchIntake(intake);
    expect(record.intakeId).toBe(intake.intakeId);
    expect(record.bundle.resourceType).toBe('Bundle');
    expect(record.status).toBe('received');
  });
});
