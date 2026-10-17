import { v4 as uuidv4 } from 'uuid';
import {
  TriageIntake,
  FhirBundle,
  MockFhirRecord,
  Vitals,
} from '@triagevoice/shared';

/**
 * Mock FHIR Gateway — generates FHIR-style resources and stores them locally.
 *
 * IMPORTANT: This is a simulation only. No real FHIR server, EHR, or hospital
 * system is contacted. All resources are stored in-memory.
 */

// ─── LOINC / UCUM codes for vital sign Observations ──────────────────────────

const VITAL_LOINC: Record<keyof Vitals, { code: string; display: string; unit: string }> = {
  heartRateBpm: { code: '8867-4', display: 'Heart rate', unit: '/min' },
  bloodPressureSystolic: { code: '8480-6', display: 'Systolic blood pressure', unit: 'mm[Hg]' },
  bloodPressureDiastolic: { code: '8462-4', display: 'Diastolic blood pressure', unit: 'mm[Hg]' },
  spo2Percentage: { code: '59408-5', display: 'Oxygen saturation by pulse oximetry', unit: '%' },
  respiratoryRate: { code: '9279-1', display: 'Respiratory rate', unit: '/min' },
  temperatureCelsius: { code: '8310-5', display: 'Body temperature', unit: 'Cel' },
};

// ─── Resource builders ───────────────────────────────────────────────────────

function buildEncounter(intake: TriageIntake, encounterId: string): object {
  return {
    resourceType: 'Encounter',
    id: encounterId,
    status: 'arrived',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'EMER',
      display: 'emergency',
    },
    subject: {
      display: `Synthetic Patient ${intake.patient.syntheticPatientId}`,
    },
    reasonCode: [
      {
        text: intake.chiefComplaint,
      },
    ],
    period: {
      start: intake.createdAt,
    },
    extension: [
      {
        url: 'http://triagevoice.ai/fhir/extension/simulation-flag',
        valueBoolean: true,
      },
    ],
  };
}

function buildObservation(
  intake: TriageIntake,
  encounterId: string,
  vitalKey: keyof Vitals,
  value: number,
): object {
  const coding = VITAL_LOINC[vitalKey];
  const obsId = `obs-${vitalKey}-${uuidv4().slice(0, 8)}`;
  return {
    resourceType: 'Observation',
    id: obsId,
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: coding.code,
          display: coding.display,
        },
      ],
      text: coding.display,
    },
    subject: {
      display: `Synthetic Patient ${intake.patient.syntheticPatientId}`,
    },
    encounter: { reference: `Encounter/${encounterId}` },
    effectiveDateTime: intake.createdAt,
    valueQuantity: {
      value,
      unit: coding.unit,
      system: 'http://unitsofmeasure.org',
      code: coding.unit,
    },
  };
}

// ─── Bundle builder ──────────────────────────────────────────────────────────

export function buildFhirBundle(intake: TriageIntake): FhirBundle {
  const bundleId = `bundle-${uuidv4()}`;
  const encounterId = `encounter-${uuidv4().slice(0, 8)}`;
  const entries: FhirBundle['entry'] = [];

  // Encounter entry
  entries.push({
    resource: buildEncounter(intake, encounterId) as FhirBundle['entry'][0]['resource'],
    request: { method: 'POST', url: 'Encounter' },
  });

  // Vital sign observations — only for non-null values
  const vitalKeys = Object.keys(VITAL_LOINC) as (keyof Vitals)[];
  for (const key of vitalKeys) {
    const value = intake.vitals[key];
    if (value !== null) {
      entries.push({
        resource: buildObservation(intake, encounterId, key, value) as FhirBundle['entry'][0]['resource'],
        request: { method: 'POST', url: 'Observation' },
      });
    }
  }

  return {
    resourceType: 'Bundle',
    id: bundleId,
    type: 'transaction',
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}

// ─── In-memory store ─────────────────────────────────────────────────────────

const fhirRecords = new Map<string, MockFhirRecord>();

export function storeRecord(record: MockFhirRecord): void {
  fhirRecords.set(record.recordId, record);
}

export function getRecord(recordId: string): MockFhirRecord | undefined {
  return fhirRecords.get(recordId);
}

export function getAllRecords(): MockFhirRecord[] {
  return Array.from(fhirRecords.values()).sort(
    (a, b) => new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime()
  );
}

export function getRecordByIntakeId(intakeId: string): MockFhirRecord | undefined {
  return Array.from(fhirRecords.values()).find(r => r.intakeId === intakeId);
}

/**
 * Dispatch an intake to the mock FHIR gateway.
 * Only accepts intakes that have been explicitly confirmed by a reviewer.
 */
export function dispatchIntake(intake: TriageIntake): MockFhirRecord {
  // State validation (server is authority — do not trust client-supplied flags)
  if (intake.status !== 'confirmed') {
    throw new Error(`Cannot dispatch intake with status "${intake.status}". Intake must be confirmed first.`);
  }
  if (!intake.triageReview.reviewerConfirmed) {
    throw new Error('Intake has not been explicitly confirmed by a human reviewer.');
  }
  if (!intake.triageReview.reviewedCategory) {
    throw new Error('A human-reviewed urgency category is required before dispatch.');
  }

  const bundle = buildFhirBundle(intake);
  const recordId = `rec-${uuidv4().slice(0, 12)}`;
  const dispatchedAt = new Date().toISOString();

  const record: MockFhirRecord = {
    recordId,
    intakeId: intake.intakeId,
    bundle,
    dispatchedAt,
    status: 'received',
    patientId: intake.patient.syntheticPatientId,
    chiefComplaint: intake.chiefComplaint,
    urgencyCategory: intake.triageReview.reviewedCategory,
  };

  storeRecord(record);
  return record;
}
