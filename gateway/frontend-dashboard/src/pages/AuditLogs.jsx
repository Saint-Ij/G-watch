import { useState, useEffect } from 'react';
import { api } from '../api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { ScrollText } from 'lucide-react';
import './AuditLogs.css';

const actionLabels = {
  integration_created: 'Integration Created',
  integration_updated: 'Integration Updated',
  integration_deleted: 'Integration Deleted',
  credential_created: 'Credential Created',
  credential_revoked: 'Credential Revoked',
  permission_changed: 'Permission Changed',
  alert_acknowledged: 'Alert Acknowledged',
  alert_resolved: 'Alert Resolved',
};

const resourceColors = {
  integration: 'var(--blue)',
  credential: 'var(--purple)',
  permission: 'var(--amber)',
  alert: 'var(--red)',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterAction) params.set('action', filterAction);
    const qs = params.toString();
    api.get(`/audit-logs${qs ? `?${qs}` : ''}`)
      .then(({ logs }) => setLogs(logs))
      .finally(() => setLoading(false));
  }, [filterAction]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="audit-page">
      <div className="audit-header">
        <h1>Audit Log</h1>
        <div className="audit-filters">
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setLoading(true); }}
            className="audit-filter"
          >
            <option value="">All Actions</option>
            <option value="integration_created">Integration Created</option>
            <option value="integration_updated">Integration Updated</option>
            <option value="integration_deleted">Integration Deleted</option>
            <option value="credential_created">Credential Created</option>
            <option value="credential_revoked">Credential Revoked</option>
            <option value="permission_changed">Permission Changed</option>
            <option value="alert_acknowledged">Alert Acknowledged</option>
            <option value="alert_resolved">Alert Resolved</option>
          </select>
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit logs"
          description="No audit entries match your current filter."
        />
      ) : (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
                <th>IP Address</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className="audit-action">
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td>
                    <span
                      className="audit-resource-dot"
                      style={{ background: resourceColors[log.resourceType] || 'var(--text-muted)' }}
                    />
                    <span className="audit-resource-type">{log.resourceType}</span>
                  </td>
                  <td>
                    {log.metadata ? (
                      <span className="audit-meta data-table-mono">
                        {JSON.stringify(log.metadata).slice(0, 80)}
                      </span>
                    ) : (
                      <span className="audit-no-meta">--</span>
                    )}
                  </td>
                  <td>
                    <span className="audit-ip data-table-mono">{log.ipAddress || '--'}</span>
                  </td>
                  <td className="audit-time">
                    {new Date(log.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
