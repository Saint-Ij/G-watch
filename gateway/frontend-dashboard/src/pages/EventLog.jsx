import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import RiskBadge from '../components/RiskBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Radio, Pause, Play } from 'lucide-react';
import './EventLog.css';

const DECISION_COLORS = { allow: 'var(--green)', monitor: 'var(--blue)', rate_limit: 'var(--amber)', alert: '#f97316', block: 'var(--red)' };
const DECISION_LABEL = { allow: 'Allowed', monitor: 'Monitored', rate_limit: 'Rate Limited', alert: 'Alert', block: 'Blocked' };
const METHOD_COLORS = { GET: 'var(--green)', POST: 'var(--blue)', PUT: 'var(--amber)', DELETE: 'var(--red)' };

function formatTimestamp(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function riskToLevel(score) {
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'high';
  return 'critical';
}

export default function EventLog() {
  const [events, setEvents] = useState([]);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const listRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/dashboard/activity?limit=50')
      .then(({ activity }) => setEvents(activity || []))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    function onEvent(data) {
      setEvents((prev) => {
        const next = [{ ...data, id: Date.now(), createdAt: new Date().toISOString(), _live: true }, ...prev];
        return next.slice(0, 200);
      });
      if (!live) setNewCount((c) => c + 1);
    }
    socket.on('integration:event', onEvent);
    return () => socket.off('integration:event', onEvent);
  }, [live]);

  useEffect(() => {
    if (live && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' });
      setNewCount(0);
    }
  }, [events, live]);

  function jumpToTop() {
    setLive(true);
    setNewCount(0);
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!ready) return <LoadingSpinner />;

  return (
    <div className="eventlog-page">
      <div className="eventlog-header">
        <div className="eventlog-header-left">
          <h1>Event Log</h1>
          <span className="eventlog-header-count">{events.length} events</span>
        </div>
        <div className="eventlog-header-right">
          {!live && newCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={jumpToTop}>
              {newCount} new event{newCount !== 1 ? 's' : ''} — click to view
            </button>
          )}
          <button
            className={`btn btn-ghost btn-sm ${live ? 'eventlog-live-btn--on' : ''}`}
            onClick={() => { setLive(!live); if (!live) setNewCount(0); }}
            title={live ? 'Pause live feed' : 'Resume live feed'}
          >
            {live ? <Pause size={13} /> : <Play size={13} />}
            <Radio size={13} style={{ color: live ? 'var(--red)' : 'var(--text-muted)', animation: live ? 'pulse 1.5s infinite' : 'none' }} />
            {live ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No events yet"
          description="Send a request through the gateway to see events appear here in real time."
        />
      ) : (
        <div className="eventlog-table-wrap" ref={listRef}>
          <table className="eventlog-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Time</th>
                <th style={{ width: 60 }}>Method</th>
                <th>Path</th>
                <th style={{ width: 90 }}>Risk</th>
                <th style={{ width: 90 }}>Decision</th>
                <th style={{ width: 80 }}>Anomaly</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt, i) => (
                <tr key={evt.id || i} className={evt._live ? 'eventlog-row--live' : ''}>
                  <td className="eventlog-time">{formatTimestamp(evt.createdAt)}</td>
                  <td>
                    <span className="eventlog-method" style={{ color: METHOD_COLORS[evt.method] || 'var(--text-primary)' }}>
                      {evt.method}
                    </span>
                  </td>
                  <td className="eventlog-path">{evt.path}</td>
                  <td>
                    <RiskBadge level={riskToLevel(evt.riskScore)} score={evt.riskScore} />
                  </td>
                  <td>
                    <span className="eventlog-decision" style={{ color: DECISION_COLORS[evt.decision] || 'var(--text-muted)' }}>
                      {DECISION_LABEL[evt.decision] || evt.decision}
                    </span>
                  </td>
                  <td>
                    {evt.anomalyDetected ? (
                      <span className="eventlog-anomaly">Yes</span>
                    ) : (
                      <span className="eventlog-normal">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
