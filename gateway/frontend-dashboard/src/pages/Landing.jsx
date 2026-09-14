import { Link } from 'react-router-dom';
import { Shield, Eye, Zap, Lock, Activity, AlertTriangle, ChevronRight } from 'lucide-react';
import './Landing.css';

const features = [
  {
    icon: <Eye size={22} />,
    title: 'Real-Time Monitoring',
    desc: 'Watch every request as it happens. Anomalies are detected and displayed in the live activity feed.',
    color: 'cyan',
  },
  {
    icon: <Zap size={22} />,
    title: 'Anomaly Detection',
    desc: 'Volume spikes, new data access, unauthorized requests, unknown IPs, unusual hours — all caught instantly.',
    color: 'amber',
  },
  {
    icon: <Activity size={22} />,
    title: 'Trust Scoring',
    desc: 'Every integration gets a 0-100 trust score. Know who to trust at a glance.',
    color: 'green',
  },
  {
    icon: <Lock size={22} />,
    title: 'Graded Response',
    desc: '5 levels: Allow, Monitor, Rate Limit, Alert, Block. No binary on/off — nuanced control.',
    color: 'purple',
  },
  {
    icon: <AlertTriangle size={22} />,
    title: 'Admin Review',
    desc: 'System recommends actions. Admins decide. Every decision is logged to the audit trail.',
    color: 'red',
  },
  {
    icon: <Shield size={22} />,
    title: 'Transparent Proxy',
    desc: 'Third parties don\'t know G-Watch exists. Give them your URL — G-Watch handles everything.',
    color: 'cyan',
  },
];

const steps = [
  { num: '01', title: 'Create Integration', desc: 'Register the third-party in G-Watch. Point it to your real backend.' },
  { num: '02', title: 'Share the URL', desc: 'Give the third party G-Watch\'s URL and an API key. Their code works unchanged.' },
  { num: '03', title: 'Monitor & Control', desc: 'Watch the dashboard. Review alerts. Block threats. Full visibility in real time.' },
];

export default function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link to="/" className="landing-logo">
          <div className="landing-logo-icon">G</div>
          <span>G-Watch</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <Link to="/docs">Docs</Link>
          <Link to="/guides">Guides</Link>
          <Link to="/tutorials">Tutorials</Link>
          <Link to="/login" className="btn btn-outline-sm">Sign In</Link>
          <Link to="/login" className="btn btn-primary-sm">Get Started</Link>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-glow" />
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Real-time monitoring active
        </div>
        <h1 className="hero-title">
          Know What Your<br />
          <span className="hero-accent">Partners Are Doing</span>
        </h1>
        <p className="hero-desc">
          G-Watch sits between your backend and third-party integrations. It monitors
          every request, detects anomalies, and blocks threats — without changing their code.
        </p>
        <div className="hero-actions">
          <Link to="/login" className="btn btn-primary-lg">Sign In</Link>
          <a href="#features" className="btn btn-outline-lg">See Features</a>
        </div>

        <div className="hero-terminal">
          <div className="terminal-header">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
          </div>
          <div className="terminal-body">
            <div className="t-line"><span className="t-comment">// Third-party calls your API (actually G-Watch)</span></div>
            <div className="t-line"><span className="t-kw">curl</span> https://gwatch.example.com/customers/123 \</div>
            <div className="t-line">&nbsp;&nbsp;-H <span className="t-str">"X-Api-Key: partner-key-123"</span></div>
            <div className="t-line" />
            <div className="t-line"><span className="t-comment">// G-Watch intercepts, evaluates, and proxies</span></div>
            <div className="t-line"><span className="t-ok">→</span> Auth: <span className="t-str">✓ Valid</span></div>
            <div className="t-line"><span className="t-ok">→</span> Risk: <span className="t-str">5/100 (Low)</span></div>
            <div className="t-line"><span className="t-ok">→</span> Decision: <span className="t-str">ALLOW</span></div>
            <div className="t-line"><span className="t-ok">→</span> Proxied to: <span className="t-str">https://api.yourapp.com/customers/123</span></div>
            <div className="t-line" />
            <div className="t-line"><span className="t-comment">// Attack detected — blocked in real time</span></div>
            <div className="t-line"><span className="t-warn">⚠</span> Volume spike: 340% above baseline</div>
            <div className="t-line"><span className="t-warn">⚠</span> Unauthorized: payment_data (no permission)</div>
            <div className="t-line"><span className="t-block">→ BLOCKED</span> — Risk: <span className="t-warn">85/100</span></div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="stat-item"><div className="stat-val">0-100</div><div className="stat-lbl">Risk Score</div></div>
        <div className="stat-item"><div className="stat-val">5</div><div className="stat-lbl">Response Levels</div></div>
        <div className="stat-item"><div className="stat-val">&lt;50ms</div><div className="stat-lbl">Detection</div></div>
        <div className="stat-item"><div className="stat-val">100%</div><div className="stat-lbl">Transparent</div></div>
      </section>

      <section id="features" className="features-section">
        <div className="section-tag">Features</div>
        <h2 className="section-heading">Everything You Need to Monitor Third-Party Access</h2>
        <p className="section-desc">Real-time detection, trust scoring, graded responses, and full visibility — all in one platform.</p>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className={`feature-card fc-${f.color}`}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="steps-section">
        <div className="section-tag">How It Works</div>
        <h2 className="section-heading">Three Steps to Full Visibility</h2>
        <p className="section-desc">No code changes needed on the third-party side.</p>
        <div className="steps-grid">
          {steps.map((s, i) => (
            <div key={i} className="step-card">
              <div className="step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to Monitor Your Integrations?</h2>
        <p>Set up in minutes. No code changes on the third-party side.</p>
        <div className="cta-actions">
          <Link to="/login" className="btn btn-primary-lg">Sign In</Link>
          <Link to="/docs" className="btn btn-outline-lg">Read the Docs <ChevronRight size={16} /></Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-brand">
          <div className="landing-logo-icon small">G</div>
          <span>G-Watch Gateway</span>
        </div>
        <div className="footer-links">
          <Link to="/docs">Documentation</Link>
          <Link to="/guides">Guides</Link>
          <Link to="/tutorials">Tutorials</Link>
          <Link to="/login">Sign In</Link>
        </div>
      </footer>
    </div>
  );
}
