import './RiskBadge.css';

const riskConfig = {
  low: { label: 'Low', className: 'risk-badge--low' },
  medium: { label: 'Medium', className: 'risk-badge--medium' },
  high: { label: 'High', className: 'risk-badge--high' },
  critical: { label: 'Critical', className: 'risk-badge--critical' },
};

export default function RiskBadge({ level, score }) {
  const config = riskConfig[level] || riskConfig.low;
  return (
    <span className={`risk-badge ${config.className}`}>
      {score != null && <span className="risk-badge-score">{score}</span>}
      {config.label}
    </span>
  );
}
