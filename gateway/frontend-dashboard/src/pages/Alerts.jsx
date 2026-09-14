import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import { useAuth } from '../store.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { AlertTriangle, Check, X, Eye, Shield, Pencil } from 'lucide-react';
import './Alerts.css';

const decisionLabels = {
  allow: { label: 'Allow', color: 'var(--green)' },
  monitor: { label: 'Monitor', color: 'var(--blue)' },
  rate_limit: { label: 'Rate Limit', color: 'var(--amber)' },
  alert: { label: 'Alert', color: '#f97316' },
  block: { label: 'Block', color: 'var(--red)' },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertDetail, setAlertDetail] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [editForm, setEditForm] = useState({ severity: '', title: '', description: '' });
  const [editSaving, setEditSaving] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterSeverity) params.set('severity', filterSeverity);
      if (filterStatus) params.set('status', filterStatus);
      const qs = params.toString();
      const { alerts } = await api.get(`/alerts${qs ? `?${qs}` : ''}`);
      setAlerts(alerts);
    } catch {
      setLoadError('Failed to load alerts');
    } finally {
      setReady(true);
    }
  }, [filterSeverity, filterStatus]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await fetchAlerts();
      if (cancelled) return;
    };
    run();
    return () => { cancelled = true; };
  }, [fetchAlerts]);

  useEffect(() => {
    const socket = getSocket();
    const onAlert = () => fetchAlerts();
    socket.on('alert:new', onAlert);
    return () => socket.off('alert:new', onAlert);
  }, [fetchAlerts]);

  async function openReview(alert) {
    setSelectedAlert(alert);
    setReviewDecision(alert.recommendedDecision || '');
    setReviewNotes('');
    // Fetch full detail
    try {
      const { alert: detail } = await api.get(`/alerts/${alert.id}`);
      setAlertDetail(detail);
    } catch {
      setAlertDetail(alert);
    }
  }

  async function submitReview() {
    if (!reviewDecision || !selectedAlert) return;
    setReviewLoading(true);
    try {
      await api.post(`/alerts/${selectedAlert.id}/review`, {
        adminDecision: reviewDecision,
        adminNotes: reviewNotes || undefined,
      });
      setSelectedAlert(null);
      setAlertDetail(null);
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleAcknowledge(id) {
    await api.post(`/alerts/${id}/acknowledge`);
    fetchAlerts();
  }

  async function handleResolve(id) {
    await api.post(`/alerts/${id}/resolve`);
    fetchAlerts();
  }

  function openEdit(alert) {
    setEditingAlert(alert);
    setEditForm({ severity: alert.severity, title: alert.title, description: alert.description || '' });
  }

  async function handleEditSave(e) {
    e.preventDefault();
    if (!editingAlert) return;
    setEditSaving(true);
    try {
      await api.patch(`/alerts/${editingAlert.id}`, editForm);
      setEditingAlert(null);
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  if (!ready) return <LoadingSpinner />;

  return (
    <div className="alerts-page">
      <div className="alerts-header">
        <h1>Alerts</h1>
        {loadError && (
          <span style={{ fontSize: 13, color: 'var(--red)' }}>{loadError}</span>
        )}
        <div className="alerts-filters">
          <select
            value={filterSeverity}
            onChange={(e) => { setFilterSeverity(e.target.value); setReady(false); }}
            className="alerts-filter"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setReady(false); }}
            className="alerts-filter"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>
        </div>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No alerts"
          description="No alerts match your current filters."
        />
      ) : (
        <div className="alerts-table-wrap">
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Title</th>
                <th>Risk</th>
                <th>Recommended</th>
                <th>Status</th>
                <th>Admin Decision</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                const rec = decisionLabels[alert.recommendedDecision];
                const adminDec = alert.adminDecision ? decisionLabels[alert.adminDecision] : null;
                return (
                  <tr key={alert.id}>
                    <td><SeverityBadge severity={alert.severity} /></td>
                    <td className="alerts-title-cell">
                      <span className="alerts-title">{alert.title}</span>
                      {alert.description && (
                        <span className="alerts-desc">{alert.description}</span>
                      )}
                    </td>
                    <td>
                      <RiskBadge level={alert.severity} score={alert.riskScore} />
                    </td>
                    <td>
                      {rec ? (
                        <span className="alerts-decision" style={{ color: rec.color }}>
                          {rec.label}
                        </span>
                      ) : '--'}
                    </td>
                    <td><StatusBadge status={alert.status} /></td>
                    <td>
                      {adminDec ? (
                        <span className="alerts-decision alerts-decision--admin" style={{ color: adminDec.color }}>
                          {adminDec.label}
                        </span>
                      ) : (
                        <span className="alerts-decision-pending">Pending review</span>
                      )}
                    </td>
                    <td>
                      <div className="alerts-actions">
                        {isAdmin && (
                          <button
                            className="alerts-action-btn alerts-action-btn--edit"
                            onClick={() => openEdit(alert)}
                            title="Edit alert"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {alert.status === 'open' && !alert.adminDecision && isAdmin && (
                          <button
                            className="alerts-action-btn alerts-action-btn--review"
                            onClick={() => openReview(alert)}
                            title="Review alert"
                          >
                            <Shield size={14} />
                          </button>
                        )}
                        <button
                          className="alerts-action-btn alerts-action-btn--view"
                          onClick={() => openReview(alert)}
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        {alert.status === 'open' && (
                          <button
                            className="alerts-action-btn alerts-action-btn--ack"
                            onClick={() => handleAcknowledge(alert.id)}
                            title="Acknowledge"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {(alert.status === 'open' || alert.status === 'acknowledged') && (
                          <button
                            className="alerts-action-btn alerts-action-btn--resolve"
                            onClick={() => handleResolve(alert.id)}
                            title="Resolve"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {selectedAlert && (
        <Modal
          title="Alert Review"
          onClose={() => { setSelectedAlert(null); setAlertDetail(null); }}
        >
          <div className="review-panel">
            {/* Alert Summary */}
            <div className="review-section">
              <div className="review-row">
                <span className="review-label">Severity</span>
                <SeverityBadge severity={selectedAlert.severity} />
              </div>
              <div className="review-row">
                <span className="review-label">Risk Score</span>
                <RiskBadge level={selectedAlert.severity} score={selectedAlert.riskScore} />
              </div>
              {alertDetail?.integration && (
                <div className="review-row">
                  <span className="review-label">Integration</span>
                  <span className="review-value">{alertDetail.integration.name}</span>
                </div>
              )}
              <div className="review-row">
                <span className="review-label">Status</span>
                <StatusBadge status={selectedAlert.status} />
              </div>
            </div>

            {/* Event Details */}
            {alertDetail?.event && (
              <div className="review-section">
                <div className="review-section-title">Triggering Event</div>
                <div className="review-event">
                  <div className="review-row">
                    <span className="review-label">Method</span>
                    <span className="review-mono">{alertDetail.event.method}</span>
                  </div>
                  <div className="review-row">
                    <span className="review-label">Path</span>
                    <span className="review-mono">{alertDetail.event.path}</span>
                  </div>
                  {alertDetail.event.sourceIp && (
                    <div className="review-row">
                      <span className="review-label">Source IP</span>
                      <span className="review-mono">{alertDetail.event.sourceIp}</span>
                    </div>
                  )}
                  {alertDetail.event.dataCategory && (
                    <div className="review-row">
                      <span className="review-label">Data Category</span>
                      <span>{alertDetail.event.dataCategory.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {alertDetail.event.recordsAccessed > 0 && (
                    <div className="review-row">
                      <span className="review-label">Records Accessed</span>
                      <span className="review-mono">{alertDetail.event.recordsAccessed}</span>
                    </div>
                  )}
                  {alertDetail.event.anomalyType && (
                    <div className="review-row">
                      <span className="review-label">Anomalies</span>
                      <span className="review-anomalies">
                        {alertDetail.event.anomalyType.split(',').map((a) => (
                          <span key={a} className="review-anomaly-tag">{a.replace(/_/g, ' ')}</span>
                        ))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Risk Analysis */}
            {alertDetail?.description && (
              <div className="review-section">
                <div className="review-section-title">Risk Analysis</div>
                <div className="review-reasons">
                  {alertDetail.description.split('; ').map((reason, i) => (
                    <div key={i} className="review-reason">
                      <span className="review-reason-dot" />
                      {reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Recommendation */}
            {selectedAlert.recommendedDecision && (
              <div className="review-section">
                <div className="review-section-title">System Recommendation</div>
                <div className="review-recommendation">
                  <span
                    className="review-rec-badge"
                    style={{
                      background: decisionLabels[selectedAlert.recommendedDecision]?.color + '18',
                      color: decisionLabels[selectedAlert.recommendedDecision]?.color,
                      borderColor: decisionLabels[selectedAlert.recommendedDecision]?.color + '40',
                    }}
                  >
                    {decisionLabels[selectedAlert.recommendedDecision]?.label}
                  </span>
                  <span className="review-rec-explain">
                    {selectedAlert.recommendedDecision === 'block' && 'Risk score is critical. The system recommends blocking this integration.'}
                    {selectedAlert.recommendedDecision === 'alert' && 'Risk score is high. The system recommends alerting and monitoring.'}
                    {selectedAlert.recommendedDecision === 'monitor' && 'Risk score is medium. The system recommends continued monitoring.'}
                    {selectedAlert.recommendedDecision === 'rate_limit' && 'The system recommends rate limiting this integration.'}
                    {selectedAlert.recommendedDecision === 'allow' && 'Risk is low. The system recommends allowing this request.'}
                  </span>
                </div>
              </div>
            )}

            {/* Admin Decision */}
            {isAdmin && selectedAlert.status === 'open' && !selectedAlert.adminDecision && (
              <div className="review-section">
                <div className="review-section-title">Your Decision</div>
                <div className="review-decisions">
                  {Object.entries(decisionLabels).map(([key, { label, color }]) => (
                    <button
                      key={key}
                      className={`review-decision-btn ${reviewDecision === key ? 'review-decision-btn--active' : ''}`}
                      style={reviewDecision === key ? { borderColor: color, background: color + '18', color } : {}}
                      onClick={() => setReviewDecision(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Notes (optional)</label>
                  <input
                    className="form-input"
                    type="text"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Why this decision?"
                  />
                </div>
                <div className="form-actions">
                  <button className="btn btn-ghost" onClick={() => { setSelectedAlert(null); setAlertDetail(null); }}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={!reviewDecision || reviewLoading}
                    onClick={submitReview}
                  >
                    {reviewLoading ? 'Submitting...' : 'Submit Decision'}
                  </button>
                </div>
              </div>
            )}

            {/* Already Reviewed */}
            {selectedAlert.adminDecision && (
              <div className="review-section">
                <div className="review-section-title">Admin Decision</div>
                <div className="review-admin-decision">
                  <span
                    className="review-rec-badge"
                    style={{
                      background: decisionLabels[selectedAlert.adminDecision]?.color + '18',
                      color: decisionLabels[selectedAlert.adminDecision]?.color,
                      borderColor: decisionLabels[selectedAlert.adminDecision]?.color + '40',
                    }}
                  >
                    {decisionLabels[selectedAlert.adminDecision]?.label}
                  </span>
                  {selectedAlert.adminNotes && (
                    <span className="review-admin-notes">{selectedAlert.adminNotes}</span>
                  )}
                  {selectedAlert.adminDecisionAt && (
                    <span className="review-admin-time">
                      {new Date(selectedAlert.adminDecisionAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Alert Modal */}
      {editingAlert && (
        <Modal title="Edit Alert" onClose={() => setEditingAlert(null)}>
          <form onSubmit={handleEditSave}>
            <div className="form-group">
              <label className="form-label">Severity</label>
              <select
                className="form-select"
                value={editForm.severity}
                onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Risk analysis details"
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditingAlert(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
