import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, AlertTriangle, Plus } from 'lucide-react';
import { TriageIntake } from '@triagevoice/shared';
import { getIntakes } from '../services/api';
import {
  intakeStatusClass, triageCategoryBadgeClass, formatTriageCategory, formatDateTime
} from '../utils/format';

export function AllIntakes() {
  const [intakes, setIntakes] = useState<TriageIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try { setIntakes(await getIntakes()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">All Synthetic Intakes</h1>
            <p className="page-subtitle">Showing all demo session intakes ({intakes.length} total)</p>
          </div>
          <div className="flex gap-2">
            <Link to="/intake/new" className="btn btn-primary" id="all-intakes-new-btn">
              <Plus size={16} />New Intake
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        {loading && <div style={{ textAlign: 'center', padding: '2rem' }}><div className="loading-spinner" /></div>}
        {error && <div className="alert alert-critical"><AlertTriangle size={16} />{error}</div>}
        {!loading && !error && intakes.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><ClipboardList size={48} /></div>
            <h3>No intakes yet</h3>
            <p>Create a new intake to get started.</p>
            <Link to="/intake/new" className="btn btn-primary mt-4">
              <Plus size={16} />Create First Intake
            </Link>
          </div>
        )}
        {!loading && !error && intakes.length > 0 && (
          <div className="table-wrapper">
            <table className="table" aria-label="All intakes table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Chief Complaint</th>
                  <th>Age/Gender</th>
                  <th>Status</th>
                  <th>Urgency</th>
                  <th>Extraction</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {intakes.map(intake => (
                  <tr key={intake.intakeId}>
                    <td><code className="mono">{intake.patient.syntheticPatientId}</code></td>
                    <td style={{ maxWidth: 240 }}>
                      <span title={intake.chiefComplaint} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {intake.chiefComplaint}
                      </span>
                    </td>
                    <td className="text-sm">
                      {intake.patient.estimatedAge !== null ? `${intake.patient.estimatedAge}y` : '?'} / {intake.patient.gender}
                    </td>
                    <td><span className={intakeStatusClass(intake.status)}>{intake.status}</span></td>
                    <td>
                      <span className={triageCategoryBadgeClass(intake.triageReview.reviewedCategory ?? intake.triageReview.suggestedCategory)}>
                        {formatTriageCategory(intake.triageReview.reviewedCategory ?? intake.triageReview.suggestedCategory)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${intake.extractionMode === 'mock' ? 'badge-demo' : 'badge-info'}`}>
                        {intake.extractionMode ?? '—'}
                      </span>
                    </td>
                    <td className="text-sm text-secondary">{formatDateTime(intake.createdAt)}</td>
                    <td>
                      <Link to={`/intakes/${intake.intakeId}`} className="btn btn-ghost btn-sm"
                        id={`view-all-intake-${intake.intakeId}`}>
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
