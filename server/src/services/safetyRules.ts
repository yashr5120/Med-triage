import { SafetyAlert, TriageIntake, Vitals } from '@triagevoice/shared';

/**
 * Safety rules module.
 * These rules generate data-quality alerts — NOT clinical diagnoses.
 * Plausibility warnings do not replace clinical assessment.
 *
 * All thresholds are documented below and tested in safetyRules.test.ts
 */

// ─── Threshold configuration (documented, testable) ─────────────────────────

export const VITAL_THRESHOLDS = {
  // Values outside these ranges are physiologically implausible for adults
  heartRate: { min: 30, max: 250, criticalLow: 40, criticalHigh: 180 },
  systolic: { min: 50, max: 300, criticalLow: 80, criticalHigh: 220 },
  diastolic: { min: 20, max: 180, criticalLow: 40, criticalHigh: 130 },
  spo2: { min: 50, max: 100, warningLow: 92, criticalLow: 88 },
  respiratoryRate: { min: 4, max: 70, criticalLow: 8, criticalHigh: 40 },
  temperature: { min: 28, max: 43, criticalLow: 32, criticalHigh: 40 },
  // Pulse pressure (systolic - diastolic): narrow or wide may be significant
  pulsePressure: { narrowThreshold: 20, wideThreshold: 80 },
} as const;

// ─── Individual rule functions ───────────────────────────────────────────────

function checkHeartRate(vitals: Vitals, alerts: SafetyAlert[]): void {
  const hr = vitals.heartRateBpm;
  if (hr === null) {
    alerts.push({ field: 'heartRateBpm', severity: 'info', message: 'Heart rate not reported', isBlocking: false });
    return;
  }
  if (hr < VITAL_THRESHOLDS.heartRate.min || hr > VITAL_THRESHOLDS.heartRate.max) {
    alerts.push({
      field: 'heartRateBpm',
      severity: 'warning',
      message: `Heart rate ${hr} bpm is outside the physiologically plausible range (${VITAL_THRESHOLDS.heartRate.min}–${VITAL_THRESHOLDS.heartRate.max}). Verify the value.`,
      isBlocking: true,
    });
  } else if (hr <= VITAL_THRESHOLDS.heartRate.criticalLow) {
    alerts.push({
      field: 'heartRateBpm',
      severity: 'critical',
      message: `Heart rate ${hr} bpm is critically low. Requires immediate human verification.`,
      isBlocking: false,
    });
  } else if (hr >= VITAL_THRESHOLDS.heartRate.criticalHigh) {
    alerts.push({
      field: 'heartRateBpm',
      severity: 'critical',
      message: `Heart rate ${hr} bpm is critically elevated. Requires immediate human verification.`,
      isBlocking: false,
    });
  }
}

function checkBloodPressure(vitals: Vitals, alerts: SafetyAlert[]): void {
  const sys = vitals.bloodPressureSystolic;
  const dia = vitals.bloodPressureDiastolic;

  if (sys === null && dia === null) {
    alerts.push({ field: 'bloodPressure', severity: 'info', message: 'Blood pressure not reported', isBlocking: false });
    return;
  }
  if (sys === null || dia === null) {
    alerts.push({
      field: 'bloodPressure',
      severity: 'warning',
      message: 'Only one blood pressure component reported — both systolic and diastolic are required.',
      isBlocking: false,
    });
    return;
  }

  if (sys < VITAL_THRESHOLDS.systolic.min || sys > VITAL_THRESHOLDS.systolic.max) {
    alerts.push({
      field: 'bloodPressureSystolic',
      severity: 'warning',
      message: `Systolic BP ${sys} mmHg is outside plausible range. Verify.`,
      isBlocking: true,
    });
  } else if (sys <= VITAL_THRESHOLDS.systolic.criticalLow) {
    alerts.push({
      field: 'bloodPressureSystolic',
      severity: 'critical',
      message: `Systolic BP ${sys} mmHg is critically low. Verify immediately.`,
      isBlocking: false,
    });
  }

  if (dia < VITAL_THRESHOLDS.diastolic.min || dia > VITAL_THRESHOLDS.diastolic.max) {
    alerts.push({
      field: 'bloodPressureDiastolic',
      severity: 'warning',
      message: `Diastolic BP ${dia} mmHg is outside plausible range. Verify.`,
      isBlocking: true,
    });
  }

  if (dia >= sys) {
    alerts.push({
      field: 'bloodPressure',
      severity: 'warning',
      message: `Diastolic (${dia}) ≥ Systolic (${sys}) — this is physiologically implausible. Verify both values.`,
      isBlocking: true,
    });
  } else {
    const pp = sys - dia;
    if (pp < VITAL_THRESHOLDS.pulsePressure.narrowThreshold) {
      alerts.push({
        field: 'bloodPressure',
        severity: 'warning',
        message: `Narrow pulse pressure (${pp} mmHg) — may indicate haemodynamic compromise. Verify clinically.`,
        isBlocking: false,
      });
    } else if (pp > VITAL_THRESHOLDS.pulsePressure.wideThreshold) {
      alerts.push({
        field: 'bloodPressure',
        severity: 'info',
        message: `Wide pulse pressure (${pp} mmHg) — note for clinical assessment.`,
        isBlocking: false,
      });
    }
  }
}

function checkSpo2(vitals: Vitals, alerts: SafetyAlert[]): void {
  const spo2 = vitals.spo2Percentage;
  if (spo2 === null) {
    alerts.push({ field: 'spo2Percentage', severity: 'info', message: 'Oxygen saturation not reported', isBlocking: false });
    return;
  }
  if (spo2 < VITAL_THRESHOLDS.spo2.min || spo2 > VITAL_THRESHOLDS.spo2.max) {
    alerts.push({
      field: 'spo2Percentage',
      severity: 'warning',
      message: `SpO2 ${spo2}% is outside a plausible range. Verify the value.`,
      isBlocking: true,
    });
  } else if (spo2 <= VITAL_THRESHOLDS.spo2.criticalLow) {
    alerts.push({
      field: 'spo2Percentage',
      severity: 'critical',
      message: `SpO2 ${spo2}% is critically low. Requires immediate human attention.`,
      isBlocking: false,
    });
  } else if (spo2 <= VITAL_THRESHOLDS.spo2.warningLow) {
    alerts.push({
      field: 'spo2Percentage',
      severity: 'warning',
      message: `SpO2 ${spo2}% is below the warning threshold (${VITAL_THRESHOLDS.spo2.warningLow}%). Flag for clinical review.`,
      isBlocking: false,
    });
  }
}

function checkRespiratoryRate(vitals: Vitals, alerts: SafetyAlert[]): void {
  const rr = vitals.respiratoryRate;
  if (rr === null) {
    alerts.push({ field: 'respiratoryRate', severity: 'info', message: 'Respiratory rate not reported', isBlocking: false });
    return;
  }
  if (rr < VITAL_THRESHOLDS.respiratoryRate.min || rr > VITAL_THRESHOLDS.respiratoryRate.max) {
    alerts.push({
      field: 'respiratoryRate',
      severity: 'warning',
      message: `Respiratory rate ${rr}/min is outside plausible range. Verify.`,
      isBlocking: true,
    });
  } else if (rr <= VITAL_THRESHOLDS.respiratoryRate.criticalLow) {
    alerts.push({
      field: 'respiratoryRate',
      severity: 'critical',
      message: `Respiratory rate ${rr}/min is critically low.`,
      isBlocking: false,
    });
  } else if (rr >= VITAL_THRESHOLDS.respiratoryRate.criticalHigh) {
    alerts.push({
      field: 'respiratoryRate',
      severity: 'warning',
      message: `Respiratory rate ${rr}/min is significantly elevated.`,
      isBlocking: false,
    });
  }
}

function checkTemperature(vitals: Vitals, alerts: SafetyAlert[]): void {
  const temp = vitals.temperatureCelsius;
  if (temp === null) return; // temperature is optional in pre-hospital setting
  if (temp < VITAL_THRESHOLDS.temperature.min || temp > VITAL_THRESHOLDS.temperature.max) {
    alerts.push({
      field: 'temperatureCelsius',
      severity: 'warning',
      message: `Temperature ${temp}°C is outside plausible range. Verify.`,
      isBlocking: true,
    });
  } else if (temp <= VITAL_THRESHOLDS.temperature.criticalLow) {
    alerts.push({
      field: 'temperatureCelsius',
      severity: 'critical',
      message: `Temperature ${temp}°C suggests hypothermia. Verify immediately.`,
      isBlocking: false,
    });
  } else if (temp >= VITAL_THRESHOLDS.temperature.criticalHigh) {
    alerts.push({
      field: 'temperatureCelsius',
      severity: 'critical',
      message: `Temperature ${temp}°C is critically elevated. Verify immediately.`,
      isBlocking: false,
    });
  }
}

function checkRequiredFields(intake: TriageIntake, alerts: SafetyAlert[]): void {
  if (!intake.chiefComplaint || intake.chiefComplaint.trim().length === 0) {
    alerts.push({
      field: 'chiefComplaint',
      severity: 'critical',
      message: 'Chief complaint is required and is missing.',
      isBlocking: true,
    });
  }
  if (!intake.patient.syntheticPatientId) {
    alerts.push({
      field: 'syntheticPatientId',
      severity: 'critical',
      message: 'Patient identifier is missing.',
      isBlocking: true,
    });
  }
}

function checkFlaggedFields(intake: TriageIntake, alerts: SafetyAlert[]): void {
  const flaggedFields = Object.entries(intake.fieldReview)
    .filter(([, review]) => review.source === 'flagged')
    .map(([field]) => field);

  if (flaggedFields.length > 0) {
    alerts.push({
      field: 'fieldReview',
      severity: 'warning',
      message: `${flaggedFields.length} field(s) flagged for human verification: ${flaggedFields.join(', ')}`,
      isBlocking: false,
    });
  }
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Run all safety rules against an intake.
 * Returns a list of SafetyAlerts. Does NOT modify the intake.
 * Does NOT make clinical decisions.
 */
export function runSafetyRules(intake: TriageIntake): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  checkRequiredFields(intake, alerts);
  checkHeartRate(intake.vitals, alerts);
  checkBloodPressure(intake.vitals, alerts);
  checkSpo2(intake.vitals, alerts);
  checkRespiratoryRate(intake.vitals, alerts);
  checkTemperature(intake.vitals, alerts);
  checkFlaggedFields(intake, alerts);
  return alerts;
}

/**
 * Returns true if any blocking alert exists (prevents dispatch).
 */
export function hasBlockingAlerts(alerts: SafetyAlert[]): boolean {
  return alerts.some(a => a.isBlocking);
}
