import { TriageIntake } from '@triagevoice/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Deterministic mock extraction fixtures.
 * These are returned when DEMO_MODE=true or when no API key is configured.
 * They are clearly labeled as mock data and never presented as Gemma output.
 */

function now(): string {
  return new Date().toISOString();
}

export function getMockIntakeForScenario(scenarioId: string, transcript: string): TriageIntake {
  const intakeId = `SIM-${uuidv4().slice(0, 8).toUpperCase()}`;
  const patientId = `PT-${Math.floor(1000 + Math.random() * 9000)}`;
  const ts = now();

  switch (scenarioId) {
    case 'scenario-resp-distress':
      return {
        intakeId,
        patient: { syntheticPatientId: patientId, estimatedAge: 58, gender: 'male' },
        chiefComplaint: 'Severe shortness of breath for approximately 2 hours',
        vitals: {
          heartRateBpm: 118,
          bloodPressureSystolic: 148,
          bloodPressureDiastolic: 92,
          spo2Percentage: 84,
          respiratoryRate: 28,
          temperatureCelsius: null,
        },
        history: {
          relevantHistory: ['COPD'],
          allergies: ['No known drug allergies (reported by family)'],
          currentMedications: ['Albuterol as needed'],
        },
        interventions: ['Oxygen via non-rebreather mask at 15 L/min'],
        transcript,
        fieldReview: {
          spo2Percentage: { source: 'flagged', note: 'Critically low SpO2 — requires immediate human verification' },
          respiratoryRate: { source: 'flagged', note: 'Tachypnoea noted' },
          heartRateBpm: { source: 'flagged', note: 'Tachycardia noted' },
          temperatureCelsius: { source: 'missing' },
        },
        triageReview: {
          suggestedCategory: 'immediate',
          reviewedCategory: null,
          reviewerConfirmed: false,
        },
        extractionMode: 'mock',
        status: 'extracted',
        createdAt: ts,
        updatedAt: ts,
      };

    case 'scenario-chest-discomfort':
      return {
        intakeId,
        patient: { syntheticPatientId: patientId, estimatedAge: 67, gender: 'female' },
        chiefComplaint: 'Central chest discomfort radiating to left shoulder, 8/10 pain, onset 40 minutes ago',
        vitals: {
          heartRateBpm: 94,
          bloodPressureSystolic: 102,
          bloodPressureDiastolic: 68,
          spo2Percentage: 96,
          respiratoryRate: 18,
          temperatureCelsius: 36.8,
        },
        history: {
          relevantHistory: ['Hypertension', 'Type 2 diabetes'],
          allergies: ['No known drug allergies'],
          currentMedications: ['Lisinopril 10 mg daily', 'Metformin 500 mg twice daily'],
        },
        interventions: [
          'Aspirin 325 mg administered orally',
          'IV access established — normal saline at keep-open rate',
          'Oxygen via nasal cannula at 2 L/min',
          '12-lead ECG in progress',
        ],
        transcript,
        fieldReview: {
          bloodPressureSystolic: { source: 'flagged', note: 'Relative hypotension given reported chest discomfort — verify clinically' },
          bloodPressureDiastolic: { source: 'flagged', note: 'Low diastolic — confirm accuracy' },
        },
        triageReview: {
          suggestedCategory: 'emergent',
          reviewedCategory: null,
          reviewerConfirmed: false,
        },
        extractionMode: 'mock',
        status: 'extracted',
        createdAt: ts,
        updatedAt: ts,
      };

    case 'scenario-fall-injury':
      return {
        intakeId,
        patient: { syntheticPatientId: patientId, estimatedAge: null, gender: 'female' },
        chiefComplaint: 'Right hip pain after unwitnessed fall',
        vitals: {
          heartRateBpm: 88,
          bloodPressureSystolic: 134,
          bloodPressureDiastolic: 78,
          spo2Percentage: 94,
          respiratoryRate: 16,
          temperatureCelsius: null,
        },
        history: {
          relevantHistory: ['Confused — unable to provide reliable history'],
          allergies: [],
          currentMedications: ['Warfarin — dose and indication unknown from medic-alert bracelet'],
        },
        interventions: [
          'Cervical spine precautions applied',
          'Backboard in place',
        ],
        transcript,
        fieldReview: {
          estimatedAge: { source: 'flagged', note: 'Age not confirmed — estimated "appears to be in her 80s"' },
          temperatureCelsius: { source: 'missing', note: 'Not obtained in field' },
          currentMedications: { source: 'flagged', note: 'Warfarin dose and indication undetermined — bleeding risk unknown' },
          allergies: { source: 'missing', note: 'Unable to obtain from confused patient' },
        },
        triageReview: {
          suggestedCategory: 'urgent',
          reviewedCategory: null,
          reviewerConfirmed: false,
        },
        extractionMode: 'mock',
        status: 'extracted',
        createdAt: ts,
        updatedAt: ts,
      };

    case 'scenario-incomplete-handoff':
      return {
        intakeId,
        patient: { syntheticPatientId: patientId, estimatedAge: null, gender: 'male' },
        chiefComplaint: 'Left flank pain following reported altercation',
        vitals: {
          heartRateBpm: null,   // reported as range 100-120 — not a single reliable value
          bloodPressureSystolic: null,  // monitor malfunction
          bloodPressureDiastolic: null,
          spo2Percentage: 97,   // single unreliable reading
          respiratoryRate: null,   // not formally counted
          temperatureCelsius: null,
        },
        history: {
          relevantHistory: ['Possible altercation mechanism — details unclear'],
          allergies: [],  // conflicting report — not safe to assert no allergies
          currentMedications: ['Unknown antihypertensive — name not available'],
        },
        interventions: [],
        transcript,
        fieldReview: {
          estimatedAge: { source: 'flagged', note: 'Estimated 30-40 years — not confirmed' },
          heartRateBpm: { source: 'flagged', note: 'Range 100-120 reported — no single reliable value extracted; null preserved' },
          bloodPressureSystolic: { source: 'missing', note: 'Monitor malfunction — no reliable reading' },
          bloodPressureDiastolic: { source: 'missing', note: 'Monitor malfunction — no reliable reading' },
          spo2Percentage: { source: 'flagged', note: 'Single reading with probe signal loss — reliability uncertain' },
          respiratoryRate: { source: 'missing', note: 'Not formally measured in field' },
          temperatureCelsius: { source: 'missing' },
          allergies: { source: 'flagged', note: 'Conflicting allergy history — patient initially denied then reported a past hospital reaction; not safe to assert no allergies' },
          currentMedications: { source: 'flagged', note: 'Unknown antihypertensive — name and dose not available' },
        },
        triageReview: {
          suggestedCategory: 'needs-review',
          reviewedCategory: null,
          reviewerConfirmed: false,
        },
        extractionMode: 'mock',
        status: 'extracted',
        createdAt: ts,
        updatedAt: ts,
      };

    default:
      // Generic fallback for arbitrary transcript
      return buildGenericMockIntake(intakeId, patientId, transcript, ts);
  }
}

function buildGenericMockIntake(
  intakeId: string,
  patientId: string,
  transcript: string,
  ts: string
): TriageIntake {
  return {
    intakeId,
    patient: { syntheticPatientId: patientId, estimatedAge: null, gender: 'unknown' },
    chiefComplaint: 'Chief complaint not reliably extracted — manual review required',
    vitals: {
      heartRateBpm: null,
      bloodPressureSystolic: null,
      bloodPressureDiastolic: null,
      spo2Percentage: null,
      respiratoryRate: null,
      temperatureCelsius: null,
    },
    history: {
      relevantHistory: [],
      allergies: [],
      currentMedications: [],
    },
    interventions: [],
    transcript,
    fieldReview: {
      chiefComplaint: { source: 'flagged', note: 'Could not reliably extract from custom transcript in mock mode' },
      estimatedAge: { source: 'missing' },
      heartRateBpm: { source: 'missing' },
      bloodPressureSystolic: { source: 'missing' },
      bloodPressureDiastolic: { source: 'missing' },
      spo2Percentage: { source: 'missing' },
      respiratoryRate: { source: 'missing' },
      temperatureCelsius: { source: 'missing' },
    },
    triageReview: {
      suggestedCategory: 'needs-review',
      reviewedCategory: null,
      reviewerConfirmed: false,
    },
    extractionMode: 'mock',
    status: 'extracted',
    createdAt: ts,
    updatedAt: ts,
  };
}
