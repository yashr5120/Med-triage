import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, FileText, CheckCircle, Send, AlertTriangle,
  Plus, RefreshCw, Zap, Shield
} from 'lucide-react';
import { TriageIntake } from '@triagevoice/shared';
import { getHealth, getIntakes, HealthStatus } from '../services/api';
import { formatDateTime, intakeStatusClass, triageCategoryBadgeClass, formatTriageCategory } from '../utils/format';

interface DashboardProps {
  health: HealthStatus | null;
  onHealthRefresh: () => void;
}

export function Dashboard({ health, onHealthRefresh }: DashboardProps) {
  const [intakes, setIntakes] = useState<TriageIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getIntakes();
      setIntakes(data);
      onHealthRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load intakes');
    } finally {
      setLoading(false);
    }
  }

  const stats = health?.intakeStats ?? { total: 0, awaitingReview: 0, confirmed: 0, dispatched: 0 };

  return (
    <div className="page">
      {/* Page header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Command Dashboard</h1>
            <p className="page-subtitle">TriageVoice AI — Voice-driven emergency patient intake</p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-outline btn-sm"
              onClick={loadData}
              aria-label="Refresh dashboard"
              id="dashboard-refresh-btn"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <Link to="/intake/new" className="btn btn-primary" id="new-intake-btn">
              <Plus size={16} />
              New Intake
            </Link>
          </div>
        </div>
      </div>

      {/* Mode banner */}
      {health && (
        <div className={`alert mb-6 ${health.demoMode ? 'alert-demo' : 'alert-info'}`}>
          {health.demoMode ? (
            <><Zap size={16} /><span><strong>Demo Mode Active</strong> — Using deterministic mock fixtures. No Gemma API calls are made. Results are clearly labeled as mock data.</span></>
          ) : (
            <><Activity size={16} /><span><strong>Live Mode</strong> — Connected to Gemini API using model <code>{health.model}</code>. Extraction uses real AI inference.</span></>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="stat-grid mb-8">
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Synthetic Intakes Created</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-value">{stats.awaitingReview}</div>
          <div className="stat-label">Awaiting Human Review</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-value">{stats.confirmed}</div>
          <div className="stat-label">Confirmed by Reviewer</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #6366f1' }}>
          <div className="stat-value">{stats.dispatched}</div>
          <div className="stat-label">Sent to Mock Hospital</div>
        </div>
      </div>

      {/* Recent intakes */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileText size={18} />
            Recent Synthetic Intake Activity
          </div>
          <span className="badge badge-neutral">{intakes.length} total</span>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner" />
            <p className="text-muted mt-2 text-sm">Loading intakes…</p>
          </div>
        )}

        {error && (
          <div className="alert alert-critical">
            <AlertTriangle size={16} />
            {error}. Is the backend running?
          </div>
        )}

        {!loading && !error && intakes.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={48} /></div>
            <h3>No intakes yet</h3>
            <p>Start a new intake to see activity here.</p>
            <Link to="/intake/new" className="btn btn-primary mt-4" id="empty-new-intake-btn">
              <Plus size={16} />
              Create First Intake
            </Link>
          </div>
        )}

        {!loading && !error && intakes.length > 0 && (
          <div className="table-wrapper">
            <table className="table" aria-label="Recent intakes table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Chief Complaint</th>
                  <th>Status</th>
                  <th>Urgency</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {intakes.slice(0, 10).map(intake => (
                  <tr key={intake.intakeId}>
                    <td>
                      <code className="mono">{intake.patient.syntheticPatientId}</code>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <span title={intake.chiefComplaint} style={{
                        display: 'block', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {intake.chiefComplaint}
                      </span>
                    </td>
                    <td>
                      <span className={intakeStatusClass(intake.status)}>
                        {intake.status}
                      </span>
                    </td>
                    <td>
                      <span className={triageCategoryBadgeClass(intake.triageReview.reviewedCategory ?? intake.triageReview.suggestedCategory)}>
                        {formatTriageCategory(intake.triageReview.reviewedCategory ?? intake.triageReview.suggestedCategory)}
                      </span>
                    </td>
                    <td className="text-secondary text-sm">
                      {formatDateTime(intake.createdAt)}
                    </td>
                    <td>
                      <Link
                        to={`/intakes/${intake.intakeId}`}
                        className="btn btn-ghost btn-sm"
                        id={`view-intake-${intake.intakeId}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Safety disclaimer */}
      <div className="alert alert-info mt-6">
        <Shield size={16} style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.8125rem' }}>
          <strong>Prototype Disclaimer:</strong> TriageVoice AI is a hackathon demonstration only.
          It is not a medical device, not clinically validated, and must not be used for real patient care.
          All data is synthetic. No real EHR or hospital systems are connected.
        </div>
      </div>
    </div>
  );
}
