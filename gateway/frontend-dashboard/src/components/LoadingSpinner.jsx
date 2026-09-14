import './LoadingSpinner.css';

export default function LoadingSpinner({ size = 20 }) {
  return (
    <div className="loading-spinner-wrapper">
      <div className="loading-spinner" style={{ width: size, height: size }} />
    </div>
  );
}
