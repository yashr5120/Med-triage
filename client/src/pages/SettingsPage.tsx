import React, { useEffect, useState } from 'react';
import {
  Settings, Zap, RefreshCw, Trash2, AlertTriangle,
  CheckCircle, Activity, Shield
} from 'lucide-react';
import { getHealth, resetDemo, HealthStatus } from '../services/api';

interface SettingsPageProps {
  health: HealthStatus | null;
  onHealthRefresh: () => void;
}

export function SettingsPage({ health, onHealthRefresh }: SettingsPageProps) {
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      await resetDemo();
      setResetDone(true);
      onHealthRefresh();
      setShowResetConfirm(false);
      setTimeout(() => setResetDone(false), 3000);
    } catch (e) {
      alert('Reset failed: ' + (e instanceof Error ? e.message : e));
    } finally {
      setResetting(false);
    }
  }

  async function handleRefreshHealth() {
    setRefreshing(true);
    await onHealthRefresh();
    setRefreshing(false);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings & Demo</h1>
        <p className="page-subtitle">Application configuration, AI status, and demo management</p>
      </div>

      {/* AI status */}
      <div className="card mb-6">
        <div className="card-title mb-4">
          <Activity size={18} />
          AI & System Status
        </div>
        {health ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <div className="label">Extraction Mode</div>
              <div className={`mode-badge ${health.demoMode ? 'demo' : 'live'} mt-2`}
                style={{ display: 'inline-flex', marginTop: 4 }}>
                <div className="mode-badge-dot" />
                {health.demoMode ? 'DEMO MODE — Mock Fixtures' : 'LIVE MODE — Gemma API'}
              </div>
              <div className="text-xs text-muted mt-2">
                {health.demoMode
                  ? 'Extraction results are deterministic mock data. Set GEMINI_API_KEY and DEMO_MODE=false to enable live AI.'
                  : 'Extraction calls the Gemma API. Results are real AI inference.'}
              </div>
            </div>
            <div>
              <div className="label">Configured Model</div>
              <code className="mono" style={{ fontSize: '1rem', fontWeight: 700, display: 'block', marginTop: 4 }}>
                {health.model}
              </code>
              <div className="text-xs text-muted mt-2">
                Set via <code>GEMMA_MODEL</code> environment variable.
              </div>
            </div>
            <div>
              <div className="label">AI Connection</div>
              {health.aiConnected ? (
                <span className="badge badge-success mt-2">Connected</span>
              ) : (
                <span className="badge badge-warning mt-2">Not Connected (Demo Mode)</span>
              )}
            </div>
            <div>
              <div className="label">API Status</div>
              <span className="badge badge-success mt-2">
                <CheckCircle size={11} />
                {health.status}
              </span>
            </div>
            <div>
              <div className="label">Voice-to-Text Transcription</div>
              <span className="badge badge-success mt-2">
                <CheckCircle size={11} />
                Active (Web Speech + AI Pipeline)
              </span>
              <div className="text-xs text-muted mt-2">
                Real-time browser speech recognition with automated AI/demo fallback.
              </div>
            </div>
          </div>
        ) : (
          <div className="alert alert-warning">
            <AlertTriangle size={16} />
            Cannot reach backend. Is the server running on port 8080?
          </div>
        )}

        <div className="mt-4">
          <button
            className="btn btn-outline btn-sm"
            onClick={handleRefreshHealth}
            disabled={refreshing}
            id="settings-refresh-status-btn"
          >
            <RefreshCw size={14} />
            {refreshing ? 'Refreshing…' : 'Refresh Status'}
          </button>
        </div>
      </div>

      {/* Demo data */}
      <div className="card mb-6">
        <div className="card-title mb-4">
          <Zap size={18} />
          Demo Data Management
        </div>
        <div className="text-sm text-secondary mb-4">
          <p>Reset clears all synthetic intakes and mock FHIR records from memory. This is non-reversible.</p>
          <p className="mt-2">The server must be restarted to fully reset state between demos.</p>
        </div>

        {resetDone && (
          <div className="alert alert-success mb-4">
            <CheckCircle size={16} />
            All synthetic demo data has been reset successfully.
          </div>
        )}

        {!showResetConfirm ? (
          <button
            className="btn btn-danger"
            onClick={() => setShowResetConfirm(true)}
            id="reset-demo-btn"
          >
            <Trash2 size={16} />
            Reset Demo Data
          </button>
        ) : (
          <div className="alert alert-critical" style={{ flexDirection: 'column', gap: '1rem' }}>
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} />
              <strong>Are you sure? This will delete all synthetic intakes and FHIR records.</strong>
            </div>
            <div className="flex gap-3">
              <button
                className="btn btn-danger btn-sm"
                onClick={handleReset}
                disabled={resetting}
                id="reset-confirm-btn"
              >
                {resetting ? 'Resetting…' : 'Yes, Reset All Data'}
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Limitations */}
      <div className="card">
        <div className="card-title mb-4">
          <Shield size={18} />
          Safety & Clinical Limitations
        </div>
        <div className="alert alert-warning mb-4">
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <strong>This is a hackathon prototype. Read before demonstrating.</strong>
        </div>
        <ul style={{ listStyle: 'disc', paddingLeft: 20, lineHeight: 2.2, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          <li>Not a medical device. Not FDA cleared or CE marked.</li>
          <li>Not clinically validated. All AI outputs are unverified suggestions.</li>
          <li>Not HIPAA compliant. Uses synthetic data only.</li>
          <li>No real hospital or EHR systems are connected.</li>
          <li>ESI urgency labels are simulation categories, not validated triage scores.</li>
          <li>The AI must not be used to guide real patient care decisions.</li>
          <li>Any real deployment would require separate security, legal, regulatory, and clinical validation processes.</li>
          <li>Missing vital signs are preserved as null — never invented by the AI.</li>
          <li>Human confirmation is required before any mock dispatch.</li>
        </ul>
      </div>
    </div>
  );
}
