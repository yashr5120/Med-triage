import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle, Clock, Send, Shield,
  Edit2, Save, X, ChevronDown, Loader2, Info,
  Activity, Heart, Thermometer, Wind, Eye
} from 'lucide-react';
import { TriageIntake, SafetyAlert, TriageCategory, Vitals } from '@triagevoice/shared';
import {
  getIntake, updateIntake, confirmIntake, dispatchIntake
} from '../services/api';
import {
  formatTriageCategory, triageCategoryBadgeClass,
  fieldSourceBadgeClass, intakeStatusClass, formatDateTime, vitalCardClass
} from '../utils/format';

const TRIAGE_CATEGORIES: TriageCategory[] = [
  'immediate', 'emergent', 'urgent', 'less-urgent', 'non-urgent', 'needs-review'
];

const VITAL_META: { key: keyof Vitals; label: string; unit: string; icon: React.ReactNode }[] = [
  { key: 'heartRateBpm', label: 'Heart Rate', unit: 'bpm', icon: <Heart size={14} /> },
  { key: 'bloodPressureSystolic', label: 'BP Systolic', unit: 'mmHg', icon: <Activity size={14} /> },
  { key: 'bloodPressureDiastolic', label: 'BP Diastolic', unit: 'mmHg', icon: <Activity size={14} /> },
  { key: 'spo2Percentage', label: 'SpO₂', unit: '%', icon: <Eye size={14} /> },
  { key: 'respiratoryRate', label: 'Resp Rate', unit: '/min', icon: <Wind size={14} /> },
  { key: 'temperatureCelsius', label: 'Temperature', unit: '°C', icon: <Thermometer size={14} /> },
];

export function IntakeReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [intake, setIntake] = useState<TriageIntake | null>(null);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  // Confirm dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TriageCategory>('needs-review');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadIntake();
  }, [id]);

  async function loadIntake() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getIntake(id);
      setIntake(data);
      setAlerts(data.alerts ?? []);
      setSelectedCategory(data.triageReview.reviewedCategory ?? data.triageReview.suggestedCategory ?? 'needs-review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load intake');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!id || !intake) return;
    setConfirmError(null);
    setSaving(true);
    try {
      const updated = await confirmIntake(id, {
        reviewedCategory: selectedCategory,
        reviewerNotes: reviewerNotes || undefined,
      });
      setIntake(updated);
      setAlerts(updated.alerts ?? []);
      setShowConfirm(false);
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : 'Confirm failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDispatch() {
    if (!id || !intake) return;
    setDispatchError(null);
    setDispatching(true);
    try {
      const result = await dispatchIntake(id);
      setDispatchSuccess(`Mock dispatch accepted. Bundle ID: ${result.fhirBundleId}`);
      await loadIntake();
    } catch (e) {
      setDispatchError(e instanceof Error ? e.message : 'Dispatch failed');
    } finally {
      setDispatching(false);
    }
  }

  if (loading) return (
    <div className="page">
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="loading-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <p className="text-muted mt-4">Loading intake…</p>
      </div>
    </div>
  );

  if (error || !intake) return (
    <div className="page">
      <div className="alert alert-critical">
        <AlertTriangle size={18} />
        <span>{error ?? 'Intake not found'}</span>
      </div>
    </div>
  );

  const blockingAlerts = alerts.filter(a => a.isBlocking);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning' && !a.isBlocking);
  const canConfirm = intake.status !== 'confirmed' && intake.status !== 'dispatched' && blockingAlerts.length === 0;
  const canDispatch = intake.status === 'confirmed';

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={intakeStatusClass(intake.status)}>{intake.status}</span>
              {intake.extractionMode && (
                <span className={`badge ${intake.extractionMode === 'mock' ? 'badge-demo' : 'badge-info'}`}>
                  {intake.extractionMode === 'mock' ? '🔬 MOCK DATA' : '🤖 Gemma AI'}
                </span>
              )}
            </div>
            <h1 className="page-title">Intake Review — {intake.patient.syntheticPatientId}</h1>
            <p className="page-subtitle">Created {formatDateTime(intake.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            {canConfirm && (
              <button
                className="btn btn-success"
                onClick={() => setShowConfirm(true)}
                id="confirm-intake-btn"
              >
                <CheckCircle size={16} />
                Confirm Intake
              </button>
            )}
            {canDispatch && (
              <button
                className="btn btn-primary"
                onClick={handleDispatch}
                disabled={dispatching}
                id="dispatch-intake-btn"
              >
                {dispatching ? <Loader2 size={16} /> : <Send size={16} />}
                Dispatch to Mock Hospital
              </button>
            )}
            {intake.status === 'dispatched' && (
              <span className="badge badge-success" style={{ padding: '8px 14px' }}>
                <CheckCircle size={14} />
                Dispatched
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dispatch result */}
      {dispatchSuccess && (
        <div className="alert alert-success mb-6">
          <CheckCircle size={16} />
          <span>{dispatchSuccess}. <a href="/hospital" style={{ color: 'inherit', fontWeight: 600 }}>View hospital dashboard →</a></span>
        </div>
      )}
      {dispatchError && (
        <div className="alert alert-critical mb-6">
          <AlertTriangle size={16} />
          {dispatchError}
        </div>
      )}

      {/* Safety alerts */}
      {alerts.length > 0 && (
        <div className="card mb-6" style={{ borderLeft: blockingAlerts.length > 0 ? '4px solid #ef4444' : criticalAlerts.length > 0 ? '4px solid #ef4444' : '4px solid #f59e0b' }}>
          <div className="card-title mb-4">
            <Shield size={18} />
            Safety & Data-Quality Review
            {blockingAlerts.length > 0 && (
              <span className="badge badge-critical ml-2">{blockingAlerts.length} Blocking</span>
            )}
          </div>

          {blockingAlerts.length > 0 && (
            <div className="alert alert-critical mb-4">
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <div>
                <strong>Blocking errors must be resolved before confirming this intake.</strong>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {blockingAlerts.map((a, i) => (
                    <li key={i} style={{ fontSize: '0.8125rem' }}>{a.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alerts.filter(a => !a.isBlocking).map((a, i) => (
              <div key={i} className={`alert alert-${a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'info'}`}
                style={{ fontSize: '0.8125rem' }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span><strong>{a.field}:</strong> {a.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Patient info */}
        <div className="card">
          <div className="card-title mb-4">Patient Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div className="label">Synthetic Patient ID</div>
              <code className="mono" style={{ fontSize: '1rem', fontWeight: 700 }}>{intake.patient.syntheticPatientId}</code>
            </div>
            <div>
              <div className="label">Estimated Age</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {intake.patient.estimatedAge !== null ? `${intake.patient.estimatedAge} yrs` : '—'}
                {intake.fieldReview.estimatedAge && (
                  <span className={`${fieldSourceBadgeClass(intake.fieldReview.estimatedAge.source)} ml-2`} style={{ fontSize: '0.625rem', verticalAlign: 'middle' }}>
                    {intake.fieldReview.estimatedAge.source}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="label">Gender</div>
              <div style={{ fontWeight: 600 }}>{intake.patient.gender}</div>
            </div>
            <div>
              <div className="label">Intake ID</div>
              <code className="mono text-xs text-muted">{intake.intakeId}</code>
            </div>
          </div>
        </div>

        {/* Chief complaint */}
        <div className="card">
          <div className="card-title mb-4">Chief Complaint</div>
          <p style={{ fontSize: '1rem', lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
            {intake.chiefComplaint}
          </p>
        </div>
      </div>

      {/* Vital signs */}
      <div className="card mt-6">
        <div className="card-title mb-4">
          <Activity size={18} />
          Vital Signs
          <span className="badge badge-neutral ml-2" style={{ fontWeight: 400 }}>
            Missing = null (not invented)
          </span>
        </div>
        <div className="vital-grid">
          {VITAL_META.map(({ key, label, unit }) => {
            const value = intake.vitals[key];
            const review = intake.fieldReview[key];
            const cardClass = vitalCardClass(key, intake.fieldReview);
            return (
              <div key={key} className={cardClass}>
                <div className="vital-label">{label}</div>
                {value !== null ? (
                  <>
                    <div className="vital-value">{value}</div>
                    <div className="vital-unit">{unit}</div>
                  </>
                ) : (
                  <div className="vital-value missing-value">—</div>
                )}
                {review && (
                  <span className={`${fieldSourceBadgeClass(review.source)}`}
                    style={{ fontSize: '0.5625rem', marginTop: 4, display: 'inline-block' }}>
                    {review.source}
                  </span>
                )}
                {review?.note && (
                  <div style={{ fontSize: '0.6875rem', color: '#92400e', marginTop: 4, lineHeight: 1.4 }}>
                    {review.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* History, Allergies, Medications */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="card">
          <div className="card-title mb-3">Relevant History</div>
          {intake.history.relevantHistory.length > 0 ? (
            <ul style={{ paddingLeft: 16, lineHeight: 2 }}>
              {intake.history.relevantHistory.map((h, i) => <li key={i} className="text-sm">{h}</li>)}
            </ul>
          ) : <p className="text-sm text-muted">None reported</p>}
        </div>
        <div className="card">
          <div className="card-title mb-3">Allergies</div>
          {intake.history.allergies.length > 0 ? (
            <ul style={{ paddingLeft: 16, lineHeight: 2 }}>
              {intake.history.allergies.map((a, i) => <li key={i} className="text-sm">{a}</li>)}
            </ul>
          ) : <p className="text-sm text-muted">None reported</p>}
          {intake.fieldReview.allergies?.source === 'flagged' && (
            <div className="alert alert-warning mt-3" style={{ fontSize: '0.75rem' }}>
              <AlertTriangle size={12} />
              {intake.fieldReview.allergies.note}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title mb-3">Interventions</div>
          {intake.interventions.length > 0 ? (
            <ul style={{ paddingLeft: 16, lineHeight: 2 }}>
              {intake.interventions.map((iv, i) => <li key={i} className="text-sm">{iv}</li>)}
            </ul>
          ) : <p className="text-sm text-muted">None reported</p>}
        </div>
      </div>

      {/* Triage review */}
      <div className="card mt-6" style={{ borderLeft: '4px solid var(--color-warning)' }}>
        <div className="card-title mb-4">
          <Shield size={18} />
          Triage Assessment
          <span className="badge badge-warning ml-2">Human Review Required</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <div className="label">AI-Suggested Category (Unverified)</div>
            <div className="mt-2">
              {intake.triageReview.suggestedCategory ? (
                <>
                  <span className={triageCategoryBadgeClass(intake.triageReview.suggestedCategory)}>
                    {formatTriageCategory(intake.triageReview.suggestedCategory)}
                  </span>
                  <div className="text-xs text-muted mt-2">
                    ⚠ AI suggestion only — not a clinically validated triage decision.
                    This is a simulation label and must not guide real patient care.
                  </div>
                </>
              ) : (
                <span className="text-muted text-sm">No suggestion available</span>
              )}
            </div>
          </div>
          <div>
            <div className="label">Human-Reviewed Category</div>
            {intake.triageReview.reviewedCategory ? (
              <>
                <span className={triageCategoryBadgeClass(intake.triageReview.reviewedCategory)}>
                  {formatTriageCategory(intake.triageReview.reviewedCategory)}
                </span>
                {intake.triageReview.reviewedAt && (
                  <div className="text-xs text-muted mt-2">
                    Reviewed {formatDateTime(intake.triageReview.reviewedAt)}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted mt-2">
                Not yet reviewed. Use "Confirm Intake" above.
              </div>
            )}
          </div>
        </div>
        {intake.triageReview.reviewerNotes && (
          <div className="mt-4">
            <div className="label">Reviewer Notes</div>
            <p className="text-sm" style={{ marginTop: 4, fontStyle: 'italic' }}>{intake.triageReview.reviewerNotes}</p>
          </div>
        )}
      </div>

      {/* Source transcript */}
      <div className="card mt-6">
        <div className="card-title mb-4">
          <Info size={18} />
          Source Transcript
        </div>
        <div style={{
          background: '#f8fafc', borderRadius: 8, padding: '1rem',
          lineHeight: 1.8, fontSize: '0.875rem', whiteSpace: 'pre-wrap',
          fontFamily: 'inherit', color: 'var(--color-text-secondary)'
        }}>
          {intake.transcript}
        </div>
      </div>

      {/* Confirm dialog (inline modal) */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div style={{
            background: '#fff', borderRadius: 16, padding: '2rem',
            width: '100%', maxWidth: 520, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Confirm Patient Intake</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(false)}
                aria-label="Close confirm dialog">
                <X size={16} />
              </button>
            </div>

            <div className="alert alert-warning mb-4">
              <AlertTriangle size={16} />
              <span>You are about to confirm this intake for dispatch to the mock hospital. This action requires a human-reviewed urgency category.</span>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="confirm-category">Reviewed Urgency Category *</label>
              <select
                id="confirm-category"
                className="select"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value as TriageCategory)}
              >
                {TRIAGE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{formatTriageCategory(cat)}</option>
                ))}
              </select>
              <div className="text-xs text-muted mt-1">
                Selecting "Needs Clinician Review" is appropriate when information is insufficient.
                These are simulation labels, not validated ESI scores.
              </div>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="reviewer-notes">Reviewer Notes (optional)</label>
              <textarea
                id="reviewer-notes"
                className="textarea"
                style={{ minHeight: 80 }}
                placeholder="Any additional observations or corrections…"
                value={reviewerNotes}
                onChange={e => setReviewerNotes(e.target.value)}
                maxLength={2000}
              />
            </div>

            {confirmError && (
              <div className="alert alert-critical mb-4">
                <AlertTriangle size={16} />
                {confirmError}
              </div>
            )}

            <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowConfirm(false)}
                disabled={saving}>
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleConfirm}
                disabled={saving}
                id="confirm-submit-btn"
              >
                {saving ? <><Loader2 size={16} />Confirming…</> : <><CheckCircle size={16} />Confirm Intake</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
