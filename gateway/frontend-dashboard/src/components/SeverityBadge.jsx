import './SeverityBadge.css';

const severityConfig = {
  low: { className: 'severity-badge--low' },
  medium: { className: 'severity-badge--medium' },
  high: { className: 'severity-badge--high' },
  critical: { className: 'severity-badge--critical' },
};

export default function SeverityBadge({ severity }) {
  const config = severityConfig[severity] || severityConfig.low;
  return (
    <span className={`severity-badge ${config.className}`}>
      {severity}
    </span>
  );
}
