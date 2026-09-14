import './StatusBadge.css';

const statusConfig = {
  active: { className: 'status-badge--active', label: 'Active' },
  suspended: { className: 'status-badge--suspended', label: 'Suspended' },
  disabled: { className: 'status-badge--disabled', label: 'Disabled' },
  open: { className: 'status-badge--open', label: 'Open' },
  acknowledged: { className: 'status-badge--acknowledged', label: 'Acknowledged' },
  resolved: { className: 'status-badge--resolved', label: 'Resolved' },
  false_positive: { className: 'status-badge--resolved', label: 'False Positive' },
  revoked: { className: 'status-badge--disabled', label: 'Revoked' },
  expired: { className: 'status-badge--disabled', label: 'Expired' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { className: '', label: status };
  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
}
