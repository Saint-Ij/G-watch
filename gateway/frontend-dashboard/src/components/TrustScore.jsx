import './TrustScore.css';

const trustColors = {
  high: '#22c55e',
  medium: '#f59e0b',
  low: '#f97316',
  critical: '#ef4444',
};

export default function TrustScore({ score, level, size = 'default' }) {
  const color = trustColors[level] || trustColors.medium;
  const radius = size === 'large' ? 28 : 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const fontSize = size === 'large' ? 16 : 11;

  return (
    <div className={`trust-score trust-score--${size}`}>
      <svg className="trust-score-ring" width={radius * 2 + 6} height={radius * 2 + 6}>
        <circle
          cx={radius + 3}
          cy={radius + 3}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={size === 'large' ? 4 : 3}
        />
        <circle
          cx={radius + 3}
          cy={radius + 3}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={size === 'large' ? 4 : 3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${radius + 3} ${radius + 3})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="trust-score-value" style={{ color, fontSize }}>
        {score}
      </span>
    </div>
  );
}
