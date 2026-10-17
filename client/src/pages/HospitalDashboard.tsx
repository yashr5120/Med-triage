import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Hospital, AlertTriangle, RefreshCw, Eye, ChevronRight,
  Activity, Clock, Shield
} from 'lucide-react';
import { MockFhirRecord } from '@triagevoice/shared';
import { getFhirRecords, getFhirRecord, FhirRecordSummary } from '../services/api';
import { formatDateTime, triageCategoryBadgeClass, formatTriageCategory } from '../utils/format';

export function HospitalDashboard() {
  const [records, setRecords] = useState<FhirRecordSummary[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MockFhirRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { loadRecords(); }, []);

  async function loadRecords() {
    setLoading(true);
    try { setRecords(await getFhirRecords()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }

  async function openRecord(id: string) {
    setDetailLoading(true);
    try { setSelectedRecord(await getFhirRecord(id)); }
    catch (e) { alert('Failed to load record: ' + (e instanceof Error ? e.message : e)); }
    finally { setDetailLoading(false); }
  }

  return (
    <div>
      {/* Mock hospital banner */}
      <div className="mock-hospital-banner">
        🏥<span className="mock-flag">⚠ MOCK HOSPITAL — NO REAL EHR CONNECTION ⚠</span>🏥
        &nbsp; All records are synthetic demonstration data only
      </div>

      <div className="page">
        <div className="page-header">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Simulated Hospital Dashboard</h1>
              <p className="page-subtitle">Mock incoming patient handoffs — no real EHR connected</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={loadRecords} id="hospital-refresh-btn">
              <RefreshCw size={14} />Refresh
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selectedRecord ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
          {/* Records list */}
          <div className="card">
            <div className="card-title mb-4">
              <Hospital size={18} />
              Received Handoffs
              <span className="badge badge-neutral ml-2">{records.length}</span>
            </div>

            {loading && <div style={{ textAlign: 'center', padding: '2rem' }}><div className="loading-spinner" /></div>}
            {error && <div className="alert alert-critical"><AlertTriangle size={16} />{error}</div>}

            {!loading && !error && records.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon"><Hospital size={48} /></div>
                <h3>No handoffs received</h3>
                <p>Confirm and dispatch an intake to see it here.</p>
                <Link to="/intake/new" className="btn btn-primary mt-4">New Intake</Link>
              </div>
            )}

            {!loading && !error && records.map(rec => (
              <div
                key={rec.recordId}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 10, padding: '1rem', marginBottom: '0.75rem',
                  cursor: 'pointer', transition: 'all 150ms ease',
                  background: selectedRecord?.recordId === rec.recordId ? '#eff6ff' : '#fff',
                  borderColor: selectedRecord?.recordId === rec.recordId ? '#bfdbfe' : 'var(--color-border)',
                }}
                onClick={() => openRecord(rec.recordId)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && openRecord(rec.recordId)}
                aria-label={`View record ${rec.recordId}`}
                id={`hospital-record-${rec.recordId}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <code className="mono text-sm font-bold">{rec.patientId}</code>
                    <span className={triageCategoryBadgeClass(rec.urgencyCategory as any)}>
                      {formatTriageCategory(rec.urgencyCategory as any)}
                    </span>
                  </div>
                  <ChevronRight size={16} color="#94a3b8" />
                </div>
                <p className="text-sm" style={{ marginBottom: 6 }}>{rec.chiefComplaint}</p>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />{formatDateTime(rec.dispatchedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity size={11} />{rec.resourceCount} FHIR resources
                  </span>
                  <span className="badge badge-success" style={{ fontSize: '0.5625rem' }}>
                    {rec.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selectedRecord && (
            <div className="card">
              <div className="card-title mb-4">
                <Eye size={18} />
                FHIR Bundle Inspector
                <span className="badge badge-demo ml-2">SIMULATION</span>
              </div>

              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><div className="loading-spinner" /></div>
              ) : (
                <>
                  <div className="alert alert-info mb-4" style={{ fontSize: '0.8125rem' }}>
                    <Shield size={14} />
                    This FHIR bundle is a simulation. No real hospital was contacted.
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <div className="label">Bundle ID</div>
                    <code className="mono text-xs">{selectedRecord.bundle.id}</code>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <div className="label">Dispatched At</div>
                    <span className="text-sm">{formatDateTime(selectedRecord.dispatchedAt)}</span>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <div className="label">Resources ({selectedRecord.bundle.entry.length})</div>
                  </div>

                  {selectedRecord.bundle.entry.map((entry, i) => (
                    <div key={i} style={{
                      background: '#f8fafc', border: '1px solid var(--color-border)',
                      borderRadius: 8, padding: '0.75rem', marginBottom: '0.5rem'
                    }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="badge badge-info">{entry.resource.resourceType}</span>
                        <code className="mono text-xs text-muted">{entry.request.method} {entry.request.url}</code>
                      </div>
                      {Boolean((entry.resource as any)?.code) && (
                        <div className="text-xs text-secondary">
                          {(entry.resource.code as any)?.text}
                          {(entry.resource.valueQuantity as any)?.value !== undefined && (
                            <span className="font-bold ml-2">
                              {(entry.resource.valueQuantity as any).value} {(entry.resource.valueQuantity as any).unit}
                            </span>
                          )}
                        </div>
                      )}
                      {entry.resource.resourceType === 'Encounter' && (
                        <div className="text-xs text-secondary">
                          {(entry.resource.reasonCode as any)?.[0]?.text}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="mt-4">
                    <div className="label mb-2">Raw Bundle JSON</div>
                    <pre style={{
                      background: '#0f172a', color: '#94a3b8', padding: '1rem',
                      borderRadius: 8, overflow: 'auto', maxHeight: 300,
                      fontSize: '0.6875rem', lineHeight: 1.6
                    }}>
                      {JSON.stringify(selectedRecord.bundle, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
