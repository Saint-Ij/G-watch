import { AlertCircle } from 'lucide-react';
import './EmptyState.css';

export default function EmptyState({ icon: Icon = AlertCircle, title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={28} />
      </div>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-desc">{description}</div>}
    </div>
  );
}
