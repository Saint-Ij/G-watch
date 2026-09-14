import { useState, useEffect } from 'react';
import { api } from '../api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity } from 'lucide-react';
import './RiskTimeline.css';

export default function RiskTimeline() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/risk-timeline')
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size={16} />;
  if (!data || data.timeline.length === 0) {
    return <EmptyState icon={Activity} title="No timeline data" />;
  }

  const chartData = data.timeline.map((b, i) => ({
    name: `#${i + 1}`,
    avgRisk: b.avgRisk,
    maxRisk: b.maxRisk,
    anomalies: b.anomalies,
    blocked: b.blocked,
  }));

  return (
    <div className="risk-timeline">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="name"
            tick={{ fill: '#80869c', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#80869c', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: '#181b22',
              border: '1px solid #2a2f3e',
              borderRadius: 4,
              fontSize: 11,
            }}
          />
          <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4} />
          <Line
            type="monotone"
            dataKey="avgRisk"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Avg Risk"
          />
          <Line
            type="monotone"
            dataKey="maxRisk"
            stroke="#f97316"
            strokeWidth={1}
            dot={false}
            strokeDasharray="4 2"
            name="Max Risk"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="risk-timeline-legend">
        <span><span className="risk-timeline-dot" style={{ background: '#3b82f6' }} /> Avg Risk</span>
        <span><span className="risk-timeline-dot" style={{ background: '#f97316' }} /> Max Risk</span>
        <span className="risk-timeline-zone risk-timeline-zone--low">Low &lt;30</span>
        <span className="risk-timeline-zone risk-timeline-zone--med">Med &lt;60</span>
        <span className="risk-timeline-zone risk-timeline-zone--high">High &lt;80</span>
        <span className="risk-timeline-zone risk-timeline-zone--crit">Crit 80+</span>
      </div>
    </div>
  );
}
