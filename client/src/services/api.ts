import {
  TriageIntake,
  ExtractResponse,
  MockFhirRecord,
  DemoScenario,
  ConfirmRequest,
  TranscribeResponse,
} from '@triagevoice/shared';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: string;
  demoMode: boolean;
  model: string;
  aiConnected: boolean;
  intakeStats: {
    total: number;
    awaitingReview: number;
    confirmed: number;
    dispatched: number;
  };
  fhirRecordCount: number;
  disclaimer: string;
}

export function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>('/health');
}

// ─── Scenarios ───────────────────────────────────────────────────────────────

export function getScenarios(): Promise<DemoScenario[]> {
  return request<DemoScenario[]>('/triage/scenarios');
}

// ─── Intakes ─────────────────────────────────────────────────────────────────

export function getIntakes(): Promise<TriageIntake[]> {
  return request<TriageIntake[]>('/triage/intakes');
}

export function getIntake(id: string): Promise<TriageIntake> {
  return request<TriageIntake>(`/triage/intakes/${id}`);
}

export async function transcribeAudio(
  audioBlob: Blob,
  mimeType?: string,
  scenarioId?: string
): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  if (mimeType) {
    formData.append('mimeType', mimeType);
  }
  if (scenarioId) {
    formData.append('scenarioId', scenarioId);
  }

  const res = await fetch(`${API_BASE}/triage/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Transcription failed' }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export function extractClinicalData(transcript: string, scenarioId?: string): Promise<ExtractResponse> {
  return request<ExtractResponse>('/triage/extract', {
    method: 'POST',
    body: JSON.stringify({ transcript, scenarioId }),
  });
}

export function updateIntake(id: string, patch: Partial<TriageIntake>): Promise<TriageIntake> {
  return request<TriageIntake>(`/triage/intakes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function confirmIntake(id: string, data: ConfirmRequest): Promise<TriageIntake> {
  return request<TriageIntake>(`/triage/intakes/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function dispatchIntake(id: string): Promise<{
  fhirBundleId: string;
  recordId: string;
  dispatchedAt: string;
  message: string;
}> {
  return request(`/triage/intakes/${id}/dispatch`, { method: 'POST' });
}

export function resetDemo(): Promise<{ message: string }> {
  return request('/triage/reset', { method: 'DELETE' });
}

// ─── FHIR Records ────────────────────────────────────────────────────────────

export interface FhirRecordSummary {
  recordId: string;
  intakeId: string;
  patientId: string;
  chiefComplaint: string;
  urgencyCategory: string;
  dispatchedAt: string;
  status: string;
  bundleId: string;
  resourceCount: number;
}

export function getFhirRecords(): Promise<FhirRecordSummary[]> {
  return request<FhirRecordSummary[]>('/mock-fhir/records');
}

export function getFhirRecord(id: string): Promise<MockFhirRecord> {
  return request<MockFhirRecord>(`/mock-fhir/records/${id}`);
}
