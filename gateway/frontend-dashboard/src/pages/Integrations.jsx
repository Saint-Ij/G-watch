import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../store.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { Plug, Plus } from 'lucide-react';
import './Integrations.css';

function timeAgo(ts) {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const trustColors = { high: '#22c55e', medium: '#f59e0b', low: '#f97316', critical: '#ef4444' };

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [trustScores, setTrustScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createTargetUrl, setCreateTargetUrl] = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin';

  async function fetchData() {
    try {
      const [intgData, trustData] = await Promise.all([
        api.get('/integrations'),
        api.get('/dashboard/trust-scores'),
      ]);
      setIntegrations(intgData.integrations);
      const trustMap = {};
      trustData.integrations.forEach((t) => { trustMap[t.integrationId] = t; });
      setTrustScores(trustMap);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      await api.post('/integrations', { name: createName, description: createDesc || undefined, targetUrl: createTargetUrl || undefined });
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
      setCreateTargetUrl('');
      setLoading(true);
      await fetchData();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="integrations-page">
      <div className="integrations-header">
        <div className="integrations-header-left">
          <h1>Integrations</h1>
          <span className="integrations-header-count">{integrations.length} total</span>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
            New Integration
          </button>
        )}
      </div>

      {integrations.length === 0 ? (
        <div className="integrations-empty">
          <EmptyState icon={Plug} title="No integrations" description="No third-party integrations have been registered yet." />
          {canManage && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowCreate(true)}>
              <Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
              Create Your First Integration
            </button>
          )}
        </div>
      ) : (
        <div className="integrations-grid">
          {integrations.map((intg) => {
            const trust = trustScores[intg.id];
            return (
              <div key={intg.id} className="integration-card" onClick={() => navigate(`/integrations/${intg.id}`)}>
                <div className="integration-card-top">
                  <div className="integration-card-icon"><Plug size={18} /></div>
                  <StatusBadge status={intg.status} />
                </div>
                <div className="integration-card-name">{intg.name}</div>
                <div className="integration-card-slug">{intg.slug}</div>
                {intg.description && <div className="integration-card-desc">{intg.description}</div>}
                <div className="integration-card-footer">
                  <RiskBadge level={intg.riskLevel} />
                  {trust && (
                    <div className="integration-card-trust">
                      <svg width="28" height="28">
                        <circle cx="14" cy="14" r="10" fill="none" stroke="var(--border-subtle)" strokeWidth="2" />
                        <circle
                          cx="14" cy="14" r="10" fill="none"
                          stroke={trustColors[trust.trustLevel]}
                          strokeWidth="2"
                          strokeDasharray={2 * Math.PI * 10}
                          strokeDashoffset={2 * Math.PI * 10 - (trust.trustScore / 100) * 2 * Math.PI * 10}
                          strokeLinecap="round"
                          transform="rotate(-90 14 14)"
                        />
                      </svg>
                      <span className="integration-card-trust-score" style={{ color: trustColors[trust.trustLevel] }}>
                        {trust.trustScore}
                      </span>
                    </div>
                  )}
                  <span className="integration-card-time">{timeAgo(intg.lastSeenAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <Modal title="New Integration" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. payment-gateway" required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input className="form-input" type="text" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="What does this integration do?" />
            </div>
            <div className="form-group">
              <label className="form-label">Target URL (optional)</label>
              <input className="form-input" type="url" value={createTargetUrl} onChange={(e) => setCreateTargetUrl(e.target.value)} placeholder="https://api.your-backend.com" />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Backend to proxy allowed requests to. Leave empty for demo mode.
              </span>
            </div>
            {createError && <div className="form-error">{createError}</div>}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={createLoading}>{createLoading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
