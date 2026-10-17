import { describe, it, expect } from 'vitest';
import {
  formatTriageCategory,
  triageCategoryBadgeClass,
  fieldSourceBadgeClass,
  intakeStatusClass,
  formatDuration,
  vitalCardClass,
} from '../utils/format';

describe('Client format utilities', () => {
  it('formats triage categories correctly', () => {
    expect(formatTriageCategory('immediate')).toBe('Immediate (ESI 1-sim)');
    expect(formatTriageCategory('emergent')).toBe('Emergent (ESI 2-sim)');
    expect(formatTriageCategory('urgent')).toBe('Urgent (ESI 3-sim)');
    expect(formatTriageCategory('less-urgent')).toBe('Less Urgent (ESI 4-sim)');
    expect(formatTriageCategory('non-urgent')).toBe('Non-Urgent (ESI 5-sim)');
    expect(formatTriageCategory('needs-review')).toBe('Needs Clinician Review');
    expect(formatTriageCategory(null)).toBe('Not reviewed');
  });

  it('returns appropriate badge classes for categories', () => {
    expect(triageCategoryBadgeClass('immediate')).toBe('badge badge-triage-immediate');
    expect(triageCategoryBadgeClass('emergent')).toBe('badge badge-triage-emergent');
    expect(triageCategoryBadgeClass(null)).toBe('badge badge-neutral');
  });

  it('returns appropriate badge classes for field sources', () => {
    expect(fieldSourceBadgeClass('extracted')).toBe('badge badge-extracted');
    expect(fieldSourceBadgeClass('missing')).toBe('badge badge-missing');
    expect(fieldSourceBadgeClass('flagged')).toBe('badge badge-flagged');
    expect(fieldSourceBadgeClass('manual')).toBe('badge badge-manual');
  });

  it('formats intake status classes', () => {
    expect(intakeStatusClass('draft')).toBe('status-chip status-draft');
    expect(intakeStatusClass('confirmed')).toBe('status-chip status-confirmed');
    expect(intakeStatusClass('dispatched')).toBe('status-chip status-dispatched');
  });

  it('formats duration into mm:ss format', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('computes vital card class based on review status', () => {
    expect(vitalCardClass('spo2', { spo2: { source: 'flagged' } })).toBe('vital-card flagged');
    expect(vitalCardClass('spo2', { spo2: { source: 'missing' } })).toBe('vital-card missing');
    expect(vitalCardClass('spo2', { spo2: { source: 'extracted' } })).toBe('vital-card');
    expect(vitalCardClass('spo2', undefined)).toBe('vital-card');
  });
});
