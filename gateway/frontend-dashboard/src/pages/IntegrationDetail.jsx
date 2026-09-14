import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../store.jsx';
import StatCard from '../components/StatCard.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import DataAccessMatrix from '../components/DataAccessMatrix.jsx';
import {
  ArrowLeft,
  Ban,
  Activity,
  AlertTriangle,
  Shield,
  Key,
  Globe,
  Settings,
  Plus,
  Trash2,
  Target,
} from 'lucide-react';
import './IntegrationDetail.css';

const categoryLabels = {
  customer_profile: 'Customer Profile',
  customer_contact: 'Customer Contact',
  customer_address: 'Customer Address',
  order_data: 'Order Data',
  payment_data: 'Payment Data',
  identity_data: 'Identity Data',
  analytics_data: 'Analytics',
  authentication_data: 'Auth Tokens',
  internal_data: 'Internal Data',
};

const actionColors = {
  read: 'var(--green)',
  write: 'var(--amber)',
  delete: 'var(--red)',
};

export default function IntegrationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [resources, setResources] = useState([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showAddCredential, setShowAddCredential] = useState(false);
  const [showAddPermission, setShowAddPermission] = useState(false);

  // Settings form
  const [settingsName, setSettingsName] = useState('');
  const [settingsDesc, setSettingsDesc] = useState('');
  const [settingsStatus, setSettingsStatus] = useState('active');
  const [settingsTargetUrl, setSettingsTargetUrl] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Credential form
  const [credType, setCredType] = useState('api_key');
  const [credName, setCredName] = useState('');
  const [credValue, setCredValue] = useState('');
  const [credError, setCredError] = useState('');
  const [credSaving, setCredSaving] = useState(false);

  // Permission form
  const [permResource, setPermResource] = useState('');
  const [permAction, setPermAction] = useState('read');
  const [permAllowed, setPermAllowed] = useState(true);
  const [permMaxReq, setPermMaxReq] = useState(1000);
  const [permMaxHour, setPermMaxHour] = useState(10000);
  const [permError, setPermError] = useState('');
  const [permSaving, setPermSaving] = useState(false);

  async function fetchAll() {
    try {
      const [dashData, permData, credData, resData] = await Promise.all([
        api.get(`/dashboard/integrations/${id}`),
        api.get(`/integrations/${id}/permissions`),
        api.get(`/integrations/${id}/credentials`),
        api.get('/resources'),
      ]);
      setData(dashData);
      setPermissions(permData.permissions);
      setCredentials(credData.credentials);
      setResources(resData.resources);
    } catch {
      setLoadError('Failed to load integration details');
    } finally {
      setReady(true);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, [id]);

  // Open settings modal with current values
  function openSettings() {
    setSettingsName(data.integration.name);
    setSettingsDesc(data.integration.description || '');
    setSettingsStatus(data.integration.status);
    setSettingsTargetUrl(data.integration.targetUrl || '');
    setSettingsError('');
    setShowSettings(true);
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSettingsError('');
    setSettingsSaving(true);
    try {
      await api.patch(`/integrations/${id}`, {
        name: settingsName,
        description: settingsDesc || undefined,
        status: settingsStatus,
        targetUrl: settingsTargetUrl || null,
      });
      setShowSettings(false);
      // refetch
      await fetchAll();
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleDeleteIntegration() {
    if (!confirm('Delete this integration? This cannot be undone.')) return;
    try {
      await api.delete(`/integrations/${id}`);
      navigate('/integrations');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAddCredential(e) {
    e.preventDefault();
    setCredError('');
    setCredSaving(true);
    try {
      await api.post(`/integrations/${id}/credentials`, {
        type: credType,
        name: credName,
        credential: credValue,
      });
      setShowAddCredential(false);
      setCredName('');
      setCredValue('');
      // refetch
      await fetchAll();
    } catch (err) {
      setCredError(err.message);
    } finally {
      setCredSaving(false);
    }
  }

  async function handleRevokeCredential(credId) {
    if (!confirm('Revoke this credential?')) return;
    try {
      await api.delete(`/integrations/${id}/credentials/${credId}`);
      // refetch
      await fetchAll();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAddPermission(e) {
    e.preventDefault();
    setPermError('');
    setPermSaving(true);
    try {
      await api.post(`/integrations/${id}/permissions`, {
        resourceId: permResource,
        action: permAction,
        allowed: permAllowed,
        maxRecordsPerRequest: Number(permMaxReq),
        maxRecordsPerHour: Number(permMaxHour),
      });
      setShowAddPermission(false);
      setPermResource('');
      // refetch
      await fetchAll();
    } catch (err) {
      setPermError(err.message);
    } finally {
      setPermSaving(false);
    }
  }

  async function handleDeletePermission(permId) {
    if (!confirm('Remove this permission?')) return;
    try {
      await api.delete(`/integrations/${id}/permissions/${permId}`);
      // refetch
      await fetchAll();
    } catch (err) {
      alert(err.message);
    }
  }

  if (!ready) return <LoadingSpinner />;
  if (loadError) {
    return (
      <div className="detail-page">
        <div className="detail-header">
          <button className="detail-back" onClick={() => navigate('/integrations')}>
            <ArrowLeft size={16} />
          </button>
        </div>
        <div className="dashboard-empty" style={{ padding: 40 }}>
          <p>{loadError}</p>
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => { setLoadError(''); setReady(false); fetchAll(); }}>Retry</button>
        </div>
      </div>
    );
  }
  if (!data) return <EmptyState title="Integration not found" />;

  const { integration, totalRequests, blockedRequests, anomalies, dataCategories, endpoints, recentAlerts, trustScore } = data;

  const categoryRows = Object.entries(dataCategories)
    .map(([cat, count]) => ({ category: cat, count }))
    .sort((a, b) => b.count - a.count);

  const endpointRows = Object.entries(endpoints)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count);

  const trustLevel = trustScore >= 80 ? 'high' : trustScore >= 60 ? 'medium' : trustScore >= 40 ? 'low' : 'critical';

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="detail-back" onClick={() => navigate('/integrations')}>
          <ArrowLeft size={16} />
        </button>
        <div className="detail-header-info">
          <div className="detail-header-row">
            <h1>{integration.name}</h1>
            {canManage && (
              <button className="btn btn-ghost btn-sm" onClick={openSettings}>
                <Settings size={13} style={{ marginRight: 3, verticalAlign: -1 }} />
                Settings
              </button>
            )}
          </div>
          <div className="detail-header-meta">
            <StatusBadge status={integration.status} />
            <RiskBadge level={integration.riskLevel} />
            <span className="detail-slug">{integration.slug}</span>
          </div>
        </div>
      </div>

      {integration.description && (
        <p className="detail-desc">{integration.description}</p>
      )}

      {integration.targetUrl && (
        <div className="detail-target-url">
          <Globe size={12} />
          <span>Proxies to</span>
          <code>{integration.targetUrl}</code>
        </div>
      )}

      <div className="detail-stats">
        <StatCard icon={Target} label="Trust Score" value={trustScore} color={trustLevel === 'high' ? 'green' : trustLevel === 'medium' ? 'amber' : 'red'} />
        <StatCard icon={Globe} label="Total Requests" value={totalRequests} color="blue" />
        <StatCard icon={Ban} label="Blocked" value={blockedRequests} color="red" />
        <StatCard icon={Activity} label="Anomalies" value={anomalies} color="amber" />
        <StatCard icon={Key} label="Credentials" value={credentials.length} />
      </div>

      <div className="detail-grid">
        {/* Permissions */}
        <div className="detail-card">
          <div className="detail-card-header">
            <Shield size={16} />
            <span>Permissions</span>
            {canManage && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginLeft: 'auto' }}
                onClick={() => {
                  setPermResource(resources[0]?.id || '');
                  setPermError('');
                  setShowAddPermission(true);
                }}
              >
                <Plus size={12} style={{ marginRight: 2, verticalAlign: -1 }} />
                Add
              </button>
            )}
          </div>
          {permissions.length > 0 ? (
            <div className="detail-permissions">
              {permissions.map((p) => (
                <div key={p.id} className="detail-perm-row">
                  <span className="detail-perm-resource">{p.resourceName}</span>
                  <span className="detail-perm-action" style={{ color: actionColors[p.action] }}>
                    {p.action}
                  </span>
                  <span className={`detail-perm-allowed ${p.allowed ? 'detail-perm-allowed--yes' : 'detail-perm-allowed--no'}`}>
                    {p.allowed ? 'Allowed' : 'Denied'}
                  </span>
                  {isAdmin && (
                    <button
                      className="detail-icon-btn"
                      onClick={() => handleDeletePermission(p.id)}
                      title="Remove permission"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No permissions configured" />
          )}
        </div>

        {/* Credentials */}
        <div className="detail-card">
          <div className="detail-card-header">
            <Key size={16} />
            <span>Credentials</span>
            {canManage && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginLeft: 'auto' }}
                onClick={() => {
                  setCredName('');
                  setCredValue('');
                  setCredError('');
                  setShowAddCredential(true);
                }}
              >
                <Plus size={12} style={{ marginRight: 2, verticalAlign: -1 }} />
                Add
              </button>
            )}
          </div>
          {credentials.length > 0 ? (
            <div className="detail-credentials">
              {credentials.map((c) => (
                <div key={c.id} className="detail-cred-row">
                  <div className="detail-cred-info">
                    <span className="detail-cred-name">{c.name}</span>
                    <span className="detail-cred-type">{c.type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="detail-cred-meta">
                    <StatusBadge status={c.status} />
                    {isAdmin && c.status === 'active' && (
                      <button
                        className="detail-icon-btn detail-icon-btn--danger"
                        onClick={() => handleRevokeCredential(c.id)}
                        title="Revoke"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No credentials" description="Add an API key or token to authenticate this integration." />
          )}
        </div>

        {/* Data Categories */}
        <div className="detail-card">
          <div className="detail-card-header">
            <Activity size={16} />
            <span>Data Categories</span>
          </div>
          {categoryRows.length > 0 ? (
            <div className="detail-categories">
              {categoryRows.map((row) => (
                <div key={row.category} className="detail-cat-row">
                  <span className="detail-cat-name">{categoryLabels[row.category] || row.category}</span>
                  <div className="detail-cat-bar-bg">
                    <div
                      className="detail-cat-bar"
                      style={{
                        width: `${(row.count / Math.max(...categoryRows.map((r) => r.count))) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="detail-cat-value">{row.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No category data" />
          )}
        </div>

        {/* Endpoints */}
        <div className="detail-card">
          <div className="detail-card-header">
            <Globe size={16} />
            <span>Top Endpoints</span>
          </div>
          {endpointRows.length > 0 ? (
            <div className="detail-endpoints">
              {endpointRows.slice(0, 10).map((ep) => (
                <div key={ep.path} className="detail-ep-row">
                  <span className="detail-ep-path data-table-mono">{ep.path}</span>
                  <span className="detail-ep-count">{ep.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No endpoint data" />
          )}
        </div>

        {/* Recent Alerts */}
        <div className="detail-card detail-card--full">
          <div className="detail-card-header">
            <AlertTriangle size={16} />
            <span>Recent Alerts</span>
          </div>
          {recentAlerts && recentAlerts.length > 0 ? (
            <div className="detail-alerts">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="detail-alert-row">
                  <div className="detail-alert-info">
                    <SeverityBadge severity={alert.severity} />
                    <span className="detail-alert-title">{alert.title}</span>
                  </div>
                  <div className="detail-alert-meta">
                    <StatusBadge status={alert.status} />
                    <span className="detail-alert-time">
                      {new Date(alert.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No alerts" />
          )}
        </div>
      </div>

      {/* Data Access Matrix - Full Width */}
      <div className="detail-card detail-card--full" style={{ marginTop: 12 }}>
        <div className="detail-card-header">
          <Shield size={16} />
          <span>Data Access Map</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
            What {integration.name} can reach across all data categories
          </span>
        </div>
        <DataAccessMatrix />
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <Modal title="Integration Settings" onClose={() => setShowSettings(false)}>
          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                type="text"
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                type="text"
                value={settingsDesc}
                onChange={(e) => setSettingsDesc(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={settingsStatus}
                onChange={(e) => setSettingsStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target URL</label>
              <input
                className="form-input"
                type="url"
                placeholder="https://api.your-backend.com"
                value={settingsTargetUrl}
                onChange={(e) => setSettingsTargetUrl(e.target.value)}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Backend URL to proxy allowed requests to. Leave empty for demo mode.
              </span>
            </div>
            {settingsError && <div className="form-error">{settingsError}</div>}
            <div className="form-actions">
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteIntegration}
                  style={{ marginRight: 'auto' }}
                >
                  Delete Integration
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => setShowSettings(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={settingsSaving}>
                {settingsSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Credential Modal */}
      {showAddCredential && (
        <Modal title="Add Credential" onClose={() => setShowAddCredential(false)}>
          <form onSubmit={handleAddCredential}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                type="text"
                value={credName}
                onChange={(e) => setCredName(e.target.value)}
                placeholder="e.g. Production API Key"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={credType}
                onChange={(e) => setCredType(e.target.value)}
              >
                <option value="api_key">API Key</option>
                <option value="bearer_token">Bearer Token</option>
                <option value="webhook_signature">Webhook Signature</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Credential Value</label>
              <input
                className="form-input"
                type="text"
                value={credValue}
                onChange={(e) => setCredValue(e.target.value)}
                placeholder="The actual key or token"
                required
              />
            </div>
            {credError && <div className="form-error">{credError}</div>}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddCredential(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={credSaving}>
                {credSaving ? 'Adding...' : 'Add Credential'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Permission Modal */}
      {showAddPermission && (
        <Modal title="Add Permission" onClose={() => setShowAddPermission(false)}>
          <form onSubmit={handleAddPermission}>
            <div className="form-group">
              <label className="form-label">Resource</label>
              <select
                className="form-select"
                value={permResource}
                onChange={(e) => setPermResource(e.target.value)}
                required
              >
                <option value="">Select a resource...</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.category})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Action</label>
              <select
                className="form-select"
                value={permAction}
                onChange={(e) => setPermAction(e.target.value)}
              >
                <option value="read">Read</option>
                <option value="write">Write</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Allowed</label>
              <select
                className="form-select"
                value={permAllowed ? 'true' : 'false'}
                onChange={(e) => setPermAllowed(e.target.value === 'true')}
              >
                <option value="true">Allowed</option>
                <option value="false">Denied</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max Records Per Request</label>
              <input
                className="form-input"
                type="number"
                value={permMaxReq}
                onChange={(e) => setPermMaxReq(e.target.value)}
                min="1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Records Per Hour</label>
              <input
                className="form-input"
                type="number"
                value={permMaxHour}
                onChange={(e) => setPermMaxHour(e.target.value)}
                min="1"
              />
            </div>
            {permError && <div className="form-error">{permError}</div>}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddPermission(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={permSaving}>
                {permSaving ? 'Adding...' : 'Add Permission'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
