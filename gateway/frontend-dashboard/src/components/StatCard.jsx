import './StatCard.css';

export default function StatCard({ icon: Icon, label, value, color }) {
  const colorClass = color ? `stat-card--${color}` : '';
  return (
    <div className={`stat-card ${colorClass}`}>
      <div className="stat-card-icon">
        <Icon size={18} />
      </div>
      <div className="stat-card-body">
        <span className="stat-card-value">{value ?? '--'}</span>
        <span className="stat-card-label">{label}</span>
      </div>
    </div>
  );
}
