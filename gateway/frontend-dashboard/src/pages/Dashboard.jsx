import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import { useAuth } from '../store.jsx';
import StatCard from '../components/StatCard.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import DataAccessMatrix from '../components/DataAccessMatrix.jsx';
import SalesSimulation from '../components/SalesSimulation.jsx';
import RiskTimeline from '../components/RiskTimeline.jsx';
import {
  Plug,
  Activity,
  AlertTriangle,
  Ban,
  TrendingUp,
  Eye,
  BarChart3,
  Shield,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import './Dashboard.css';

const RISK_COLORS = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
const DECISION_COLORS = { allow: '#22c55e', monitor: '#3b82f6', rate_limit: '#f59e0b', alert: '#f97316', block: '#ef4444' };
const decisionLabel = { allow: 'Allowed', monitor: 'Monitored', rate_limit: 'Rate Limited', alert: 'Alert', block: 'Blocked' };

function formatTime(ts) {
  if (!ts) return '--';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState([]);
  const [riskStats, setRiskStats] = useState(null);
  const [dataAccess, setDataAccess] = useState(null);
  const [trustScores, setTrustScores] = useState([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const { user } = useAuth();
  const canSimulate = user?.role === 'admin';

  const [scenarios, setScenarios] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [ov, act, risk, da, ts] = await Promise.all([
        api.get('/dashboard/overview'),
        api.get('/dashboard/activity?limit=15'),
        api.get('/dashboard/risk'),
        api.get('/dashboard/data-access'),
        api.get('/dashboard/trust-scores'),
      ]);
      setOverview(ov);
      setActivity(act.activity || []);
      setRiskStats(risk);
      setDataAccess(da);
      setTrustScores(ts.integrations || []);
    } catch {
      setLoadError('Failed to load dashboard data');
    } finally {
      setReady(true);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const socket = getSocket();
    const onEvent = () => fetchData();
    socket.on('integration:event', onEvent);
    socket.on('alert:new', onEvent);
    socket.on('alert:reviewed', onEvent);
    return () => {
      socket.off('integration:event', onEvent);
      socket.off('alert:new', onEvent);
      socket.off('alert:reviewed', onEvent);
    };
  }, [fetchData]);

  useEffect(() => {
    api.get('/dev/scenarios')
      .then(({ scenarios }) => setScenarios(scenarios))
      .catch(() => {});
  }, []);

  if (!ready) return <LoadingSpinner />;

  if (loadError) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
        </div>
        <div className="dashboard-empty" style={{ padding: 40 }}>
          <p>{loadError}</p>
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => { setLoadError(''); setReady(false); fetchData(); }}>Retry</button>
        </div>
      </div>
    );
  }

  const riskData = riskStats
    ? Object.entries(riskStats.riskDistribution).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1), value,
      }))
    : [];

  const decisionData = riskStats
    ? Object.entries(riskStats.decisionCounts)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          name: decisionLabel[key] || key, value, color: DECISION_COLORS[key],
        }))
    : [];

  const categoryData = dataAccess
    ? Object.entries(dataAccess.dataCategories)
        .map(([key, value]) => ({
          name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), value,
        }))
        .sort((a, b) => b.value - a.value).slice(0, 8)
    : [];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
        <span className="dashboard-header-sub">
          {canSimulate ? 'Full system overview' : 'Your integrations and activity'}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-stats">
        <StatCard icon={Plug} label="Total Integrations" value={overview?.totalIntegrations} />
        <StatCard icon={Activity} label="Requests Today" value={overview?.requestsToday} color="blue" />
        <StatCard icon={TrendingUp} label="Anomalies Today" value={overview?.anomaliesToday} color="amber" />
        <StatCard icon={Ban} label="Blocked" value={overview?.blockedRequests} color="red" />
        <StatCard icon={AlertTriangle} label="Open Alerts" value={overview?.openAlerts} color="red" />
        <StatCard icon={Eye} label="High Risk" value={overview?.highRiskIntegrations} color="amber" />
      </div>

      {/* Integration Trust Scores */}
      {trustScores.length > 0 && (
        <div className="dashboard-card dashboard-card--full">
          <div className="dashboard-card-header">
            <Shield size={16} />
            <span>Integration Trust Scores</span>
          </div>
          <div className="dashboard-trust-grid">
            {trustScores.map((t) => (
              <div key={t.integrationId} className="dashboard-trust-item">
                <div className="dashboard-trust-ring">
                  <svg width="52" height="52">
                    <circle cx="26" cy="26" r="20" fill="none" stroke="var(--border-subtle)" strokeWidth="3" />
                    <circle
                      cx="26" cy="26" r="20" fill="none"
                      stroke={t.trustLevel === 'high' ? '#22c55e' : t.trustLevel === 'medium' ? '#f59e0b' : t.trustLevel === 'low' ? '#f97316' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={2 * Math.PI * 20 - (t.trustScore / 100) * 2 * Math.PI * 20}
                      strokeLinecap="round"
                      transform="rotate(-90 26 26)"
                    />
                  </svg>
                  <span className="dashboard-trust-score" style={{
                    color: t.trustLevel === 'high' ? '#22c55e' : t.trustLevel === 'medium' ? '#f59e0b' : t.trustLevel === 'low' ? '#f97316' : '#ef4444',
                  }}>
                    {t.trustScore}
                  </span>
                </div>
                <div className="dashboard-trust-info">
                  <span className="dashboard-trust-name">{t.name}</span>
                  <span className="dashboard-trust-meta">
                    {t.totalEvents} events, {t.anomalyCount} anomalies, {t.openAlerts} alerts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Risk Distribution */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <BarChart3 size={16} />
            <span>Risk Distribution</span>
            <span className="dashboard-card-count">{riskStats?.totalEvents || 0} events</span>
          </div>
          {riskData.length > 0 ? (
            <div className="dashboard-chart">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={riskData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fill: '#80869c', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#80869c', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ background: '#181b22', border: '1px solid #2a2f3e', borderRadius: 4, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {riskData.map((entry) => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name.toLowerCase()]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dashboard-empty">No risk data</div>
          )}
        </div>

        {/* Decision Breakdown */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <BarChart3 size={16} />
            <span>Decision Breakdown</span>
          </div>
          {decisionData.length > 0 ? (
            <div className="dashboard-chart dashboard-chart--donut">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={decisionData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                    {decisionData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#181b22', border: '1px solid #2a2f3e', borderRadius: 4, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="dashboard-donut-legend">
                {decisionData.map((entry) => (
                  <div key={entry.name} className="dashboard-legend-item">
                    <span className="dashboard-legend-dot" style={{ background: entry.color }} />
                    <span>{entry.name}</span>
                    <span className="dashboard-legend-value">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="dashboard-empty">No decision data</div>
          )}
        </div>

        {/* Risk Timeline */}
        <div className="dashboard-card dashboard-card--full">
          <div className="dashboard-card-header">
            <Activity size={16} />
            <span>Risk Timeline</span>
          </div>
          <RiskTimeline />
        </div>

        {/* Data Access Matrix */}
        <div className="dashboard-card dashboard-card--full">
          <div className="dashboard-card-header">
            <Shield size={16} />
            <span>Data Access Map</span>
            <span className="dashboard-card-count">What each integration can reach</span>
          </div>
          <DataAccessMatrix />
        </div>

        {/* False Alarm Demo */}
        {canSimulate && (
          <div className="dashboard-card dashboard-card--full">
            <div className="dashboard-card-header">
              <Zap size={16} />
              <span>False Alarm Proof</span>
              <span className="dashboard-card-count">Sales spike vs attack pattern</span>
            </div>
            <SalesSimulation />
          </div>
        )}

        {/* Data Categories */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <BarChart3 size={16} />
            <span>Data Categories Accessed</span>
          </div>
          {categoryData.length > 0 ? (
            <div className="dashboard-categories">
              {categoryData.map((cat) => (
                <div key={cat.name} className="dashboard-cat-row">
                  <span className="dashboard-cat-name">{cat.name}</span>
                  <div className="dashboard-cat-bar-bg">
                    <div className="dashboard-cat-bar" style={{ width: `${(cat.value / Math.max(...categoryData.map((c) => c.value))) * 100}%` }} />
                  </div>
                  <span className="dashboard-cat-value">{cat.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">No category data</div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <Activity size={16} />
            <span>Recent Activity</span>
          </div>
          {activity.length > 0 ? (
            <div className="dashboard-activity">
              {activity.map((evt) => (
                <div key={evt.id} className="dashboard-activity-item">
                  <div className="dashboard-activity-dot-wrap">
                    <span className={`dashboard-activity-dot ${evt.anomalyDetected ? 'dashboard-activity-dot--anomaly' : ''}`} />
                  </div>
                  <div className="dashboard-activity-body">
                    <div className="dashboard-activity-top">
                      <span className="dashboard-activity-method">{evt.method}</span>
                      <span className="dashboard-activity-path data-table-mono">{evt.path}</span>
                    </div>
                    <div className="dashboard-activity-meta">
                      <RiskBadge level={riskToLevel(evt.riskScore)} score={evt.riskScore} />
                      <span className="dashboard-activity-decision">{decisionLabel[evt.decision]}</span>
                      <span className="dashboard-activity-time">{formatTime(evt.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">No recent activity</div>
          )}
        </div>

        {/* Dev Simulator */}
        {canSimulate && scenarios.length > 0 && (
          <div className="dashboard-card dashboard-card--full">
            <div className="dashboard-card-header">
              <Zap size={16} />
              <span>Dev Simulator</span>
            </div>
            <div className="dashboard-simulator-scenarios">
              {scenarios.map((s) => (
                <SimulatorRow key={s.name} scenario={s} onDone={fetchData} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SimulatorRow({ scenario, onDone }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await api.post(`/dev/simulate-scenario/${scenario.name}`);
      setResult(res);
      onDone();
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="dashboard-sim-item">
      <div className="dashboard-sim-info">
        <span className="dashboard-sim-name">{scenario.name}</span>
        <span className="dashboard-sim-desc">{scenario.description}</span>
        {result && !result.error && (
          <span className="dashboard-sim-result">
            {result.result.decision} (risk: {result.result.riskScore})
            {result.result.anomalyDetected && ' -- anomaly'}
          </span>
        )}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={run} disabled={running}>
        {running ? 'Running...' : 'Run'}
      </button>
    </div>
  );
}

function riskToLevel(score) {
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'high';
  return 'critical';
}
