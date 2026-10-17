import { TriageCategory, FieldSource, IntakeStatus } from '@triagevoice/shared';

export function formatTriageCategory(cat: TriageCategory | null): string {
  if (!cat) return 'Not reviewed';
  const map: Record<TriageCategory, string> = {
    'immediate': 'Immediate (ESI 1-sim)',
    'emergent': 'Emergent (ESI 2-sim)',
    'urgent': 'Urgent (ESI 3-sim)',
    'less-urgent': 'Less Urgent (ESI 4-sim)',
    'non-urgent': 'Non-Urgent (ESI 5-sim)',
    'needs-review': 'Needs Clinician Review',
  };
  return map[cat];
}

export function triageCategoryBadgeClass(cat: TriageCategory | null | undefined): string {
  if (!cat) return 'badge badge-neutral';
  const map: Record<TriageCategory, string> = {
    'immediate': 'badge badge-triage-immediate',
    'emergent': 'badge badge-triage-emergent',
    'urgent': 'badge badge-triage-urgent',
    'less-urgent': 'badge badge-triage-less-urgent',
    'non-urgent': 'badge badge-triage-non-urgent',
    'needs-review': 'badge badge-triage-needs-review',
  };
  return map[cat];
}

export function fieldSourceBadgeClass(source: FieldSource): string {
  const map: Record<FieldSource, string> = {
    'extracted': 'badge badge-extracted',
    'missing': 'badge badge-missing',
    'flagged': 'badge badge-flagged',
    'manual': 'badge badge-manual',
  };
  return map[source];
}

export function intakeStatusClass(status: IntakeStatus): string {
  const map: Record<IntakeStatus, string> = {
    'draft': 'status-chip status-draft',
    'extracted': 'status-chip status-extracted',
    'reviewed': 'status-chip status-reviewed',
    'confirmed': 'status-chip status-confirmed',
    'dispatched': 'status-chip status-dispatched',
    'error': 'status-chip status-error',
  };
  return map[status];
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function vitalCardClass(fieldKey: string, fieldReview: Record<string, { source: string }> | undefined): string {
  const source = fieldReview?.[fieldKey]?.source;
  if (source === 'flagged') return 'vital-card flagged';
  if (source === 'missing') return 'vital-card missing';
  return 'vital-card';
}
