import { useState } from 'react';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import { Play, Square } from 'lucide-react';
import './SalesSimulation.css';

export default function SalesSimulation() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(null);
  const [normalResults, setNormalResults] = useState(null);
  const [attackResults, setAttackResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [chartData, setChartData] = useState([]);

  async function runDemo() {
    setRunning(true);
    setNormalResults(null);
    setAttackResults(null);
    setChartData([]);
    setProgress(0);

    // Phase 1: Normal traffic spike (simulating a sale)
    setPhase('normal');
    try {
      const normal = await api.post('/dev/simulate-batch', {
        scenarioName: 'NORMAL',
        count: 30,
        delayMs: 80,
      });
      setNormalResults(normal.summary);
      setChartData((prev) => [
        ...prev,
        ...normal.results.map((r) => ({ ...r, phase: 'normal' })),
      ]);
    } catch { /* ignore */ }
    setProgress(50);

    await new Promise((r) => setTimeout(r, 600));

    // Phase 2: Suspicious traffic
    setPhase('attack');
    try {
      const attack = await api.post('/dev/simulate-batch', {
        scenarioName: 'REPEATED_ATTACK',
        count: 30,
        delayMs: 80,
      });
      setAttackResults(attack.summary);
      setChartData((prev) => [
        ...prev,
        ...attack.results.map((r) => ({ ...r, phase: 'attack' })),
      ]);
    } catch { /* ignore */ }
    setProgress(100);

    setPhase(null);
    setRunning(false);

    const socket = getSocket();
    socket.emit('integration:event');
  }

  function stopDemo() {
    setRunning(false);
    setPhase(null);
  }

  return (
    <div className="sales-sim">
      <div className="sales-sim-controls">
        {running ? (
          <button className="btn btn-danger btn-sm" onClick={stopDemo}>
            <Square size={12} style={{ marginRight: 3, verticalAlign: -1 }} />
            Stop
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={runDemo}>
            <Play size={12} style={{ marginRight: 3, verticalAlign: -1 }} />
            Run Demo
          </button>
        )}
        {phase && (
          <span className={`sales-sim-phase sales-sim-phase--${phase}`}>
            {phase === 'normal' ? 'Phase 1: Sales Spike (Normal Traffic)' : 'Phase 2: Suspicious Activity'}
          </span>
        )}
        {!running && !phase && !normalResults && (
          <span className="sales-sim-hint">
            Fires 30 normal requests, then 30 attack requests. Shows that normal spikes don't trigger false alarms.
          </span>
        )}
      </div>

      {(normalResults || attackResults) && (
        <>
          <div className="sales-sim-bar-wrap">
            <div className="sales-sim-bar" style={{ width: `${progress}%` }} />
          </div>

          <div className="sales-sim-comparison">
            <div className="sales-sim-col sales-sim-col--normal">
              <div className="sales-sim-col-header">
                <span className="sales-sim-col-dot" style={{ background: '#22c55e' }} />
                <span>Sales Spike (30 requests)</span>
              </div>
              {normalResults && (
                <>
                  <div className="sales-sim-stat">
                    <span className="sales-sim-stat-label">Avg Risk Score</span>
                    <span className="sales-sim-stat-value" style={{ color: '#22c55e' }}>{normalResults.avgRiskScore}</span>
                  </div>
                  <div className="sales-sim-stat">
                    <span className="sales-sim-stat-label">Anomalies</span>
                    <span className="sales-sim-stat-value">{normalResults.anomaliesDetected}</span>
                  </div>
                  <div className="sales-sim-stat">
                    <span className="sales-sim-stat-label">Blocked</span>
                    <span className="sales-sim-stat-value">{normalResults.blocked}</span>
                  </div>
                  <div className="sales-sim-stat">
                    <span className="sales-sim-stat-label">Decisions</span>
                    <span className="sales-sim-stat-detail">
                      {normalResults.allowed} allow, {normalResults.monitored} monitor
                    </span>
                  </div>
                  <div className="sales-sim-verdict sales-sim-verdict--pass">
                    Normal baseline traffic -- no action needed
                  </div>
                </>
              )}
            </div>

            <div className="sales-sim-divider" />

            <div className="sales-sim-col sales-sim-col--attack">
              <div className="sales-sim-col-header">
                <span className="sales-sim-col-dot" style={{ background: '#ef4444' }} />
                <span>Attack Pattern (30 requests)</span>
              </div>
              {attackResults && (
                <>
                  <div className="sales-sim-stat">
                    <span className="sales-sim-stat-label">Avg Risk Score</span>
                    <span className="sales-sim-stat-value" style={{ color: '#ef4444' }}>{attackResults.avgRiskScore}</span>
                  </div>
                  <div className="sales-sim-stat">
                    <span className="sales-sim-stat-label">Anomalies</span>
                    <span className="sales-sim-stat-value" style={{ color: '#f59e0b' }}>{attackResults.anomaliesDetected}</span>
                  </div>
                  <div className="sales-sim-stat">
                    <span className="sales-sim-stat-label">Blocked</span>
                    <span className="sales-sim-stat-value" style={{ color: '#ef4444' }}>{attackResults.blocked}</span>
                  </div>
                  <div className="sales-sim-stat">
                    <span className="sales-sim-stat-label">Decisions</span>
                    <span className="sales-sim-stat-detail">
                      {attackResults.alerted} alert, {attackResults.blocked} block
                    </span>
                  </div>
                  <div className="sales-sim-verdict sales-sim-verdict--fail">
                    Abnormal behaviour detected -- requires review
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Risk sparkline */}
          {chartData.length > 0 && (
            <div className="sales-sim-chart">
              <svg viewBox="0 0 600 80" className="sales-sim-sparkline" preserveAspectRatio="none">
                {chartData.map((r, i) => {
                  const x = (i / (chartData.length - 1)) * 590 + 5;
                  const y = 75 - (r.riskScore / 100) * 70;
                  const color = r.phase === 'normal' ? '#22c55e' : '#ef4444';
                  return <circle key={i} cx={x} cy={y} r={2.5} fill={color} opacity={0.8} />;
                })}
                <line
                  x1={(normalResults ? 30 : 0) / chartData.length * 590 + 5}
                  y1="5" x2={(normalResults ? 30 : 0) / chartData.length * 590 + 5} y2="75"
                  stroke="#2a2f3e" strokeWidth="1" strokeDasharray="3,3"
                />
                {/* Threshold lines */}
                <line x1="5" y1={75 - (30 / 100) * 70} x2="595" y2={75 - (30 / 100) * 70} stroke="#22c55e" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.3" />
                <line x1="5" y1={75 - (60 / 100) * 70} x2="595" y2={75 - (60 / 100) * 70} stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.3" />
                <line x1="5" y1={75 - (80 / 100) * 70} x2="595" y2={75 - (80 / 100) * 70} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.3" />
              </svg>
              <div className="sales-sim-chart-labels">
                <span style={{ color: '#22c55e' }}>Normal traffic</span>
                <span style={{ color: '#ef4444' }}>Suspicious traffic</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
