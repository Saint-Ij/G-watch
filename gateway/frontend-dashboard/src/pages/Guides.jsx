import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Copy, Check, Terminal, Shield, AlertTriangle, Play, Eye, Settings } from 'lucide-react';
import './Guides.css';

function Code({ children, label }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="g-code">
      {label && <div className="g-code-label">{label}</div>}
      <button className="g-code-copy" onClick={copy}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <pre>{children}</pre>
    </div>
  );
}

function Note({ children }) {
  return <div className="g-note">{children}</div>;
}

function Tip({ children }) {
  return <div className="g-tip">{children}</div>;
}

const guides = [
  {
    id: 'connect-backend',
    title: 'Connect Your Backend',
    desc: 'Route third-party traffic through G-Watch to your real backend.',
    icon: <Terminal size={16} />,
    difficulty: 'Beginner',
    time: '5 min',
  },
  {
    id: 'setup-permissions',
    title: 'Set Up Permissions',
    desc: 'Control what data each integration can access.',
    icon: <Shield size={16} />,
    difficulty: 'Beginner',
    time: '3 min',
  },
  {
    id: 'handle-alerts',
    title: 'Handle Alerts',
    desc: 'Review, acknowledge, and resolve alerts.',
    icon: <AlertTriangle size={16} />,
    difficulty: 'Intermediate',
    time: '4 min',
  },
  {
    id: 'run-demo',
    title: 'Run the Demo',
    desc: 'See the system detect real vs. fake threats.',
    icon: <Play size={16} />,
    difficulty: 'Beginner',
    time: '2 min',
  },
  {
    id: 'monitor-realtime',
    title: 'Real-Time Monitoring',
    desc: 'Watch events stream in live.',
    icon: <Eye size={16} />,
    difficulty: 'Beginner',
    time: '3 min',
  },
  {
    id: 'customize',
    title: 'Customize Settings',
    desc: 'Adjust rate limits, thresholds, and scoring.',
    icon: <Settings size={16} />,
    difficulty: 'Advanced',
    time: '10 min',
  },
];

const guideContent = {
  'connect-backend': {
    title: 'Connect Your Backend',
    intro: 'Let\'s route real traffic through G-Watch. This guide assumes you\'ve already run the Quick Start and have G-Watch running.',
    sections: [
      {
        heading: 'What We\'re Doing',
        text: 'We\'re going to tell G-Watch about your real backend URL. When a third-party sends a request to G-Watch, G-Watch will forward it to your backend and return the real response.',
      },
      {
        heading: 'Step 1: Get Your Login Token',
        text: 'Every API call needs a login token. Let\'s get one:',
        code: `TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@gwatch.dev","password":"password123"}' \\
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo $TOKEN`,
        note: 'If you see a long string of characters, it worked. If you see nothing, check that the backend is running.',
      },
      {
        heading: 'Step 2: Create an Integration',
        text: 'An integration represents your third-party partner. We\'ll create one and point it to your real backend:',
        code: `curl -X POST http://localhost:3000/api/integrations \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-backend",
    "description": "My production API",
    "targetUrl": "https://api.yourapp.com"
  }'`,
        note: 'Replace https://api.yourapp.com with your actual backend URL. If you don\'t have one yet, leave out targetUrl and G-Watch will just log requests without proxying.',
      },
      {
        heading: 'Step 3: Create an API Key',
        text: 'Your partner needs a key to authenticate. Create one:',
        code: `# First, get the integration ID
INT_ID=$(curl -s http://localhost:3000/api/integrations \\
  -H "Authorization: Bearer $TOKEN" \\
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Now create the API key
curl -X POST http://localhost:3000/api/integrations/$INT_ID/credentials \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "api_key",
    "name": "partner-key",
    "credential": "my-secret-key-123"
  }'`,
        note: 'The credential field is the actual key your partner will use. Make it something secure in production.',
      },
      {
        heading: 'Step 4: Test It',
        text: 'Now simulate what your partner would do:',
        code: `curl http://localhost:3000/customers/123 \\
  -H "X-Api-Key: my-secret-key-123"`,
        text2: 'If targetUrl is set, you\'ll get the real response from your backend. If not, you\'ll see a status response from G-Watch.',
      },
      {
        heading: 'Step 5: Watch the Dashboard',
        text: 'Open http://localhost:5173 and go to the Integrations page. Click on your integration to see the request you just made, along with the risk score and trust level.',
        check: 'Done! Your partner can now send requests to G-Watch and they\'ll be proxied to your real backend.',
      },
    ],
  },

  'setup-permissions': {
    title: 'Set Up Permissions',
    intro: 'Permissions control what data each integration can access. Without them, every partner can access everything.',
    sections: [
      {
        heading: 'Why This Matters',
        text: 'If a delivery partner suddenly starts reading payment data, you want G-Watch to flag it. Permissions make this possible. When an integration accesses data it doesn\'t have permission for, the risk score jumps by 20 points.',
      },
      {
        heading: 'Step 1: See Available Data',
        text: 'First, let\'s see what data categories exist:',
        code: `curl http://localhost:3000/api/resources \\
  -H "Authorization: Bearer $TOKEN"`,
        text2: 'You\'ll see a list of data categories like customer_profile, customer_address, payment_data, etc.',
      },
      {
        heading: 'Step 2: Grant Read Access',
        text: 'Let\'s give the delivery partner read access to customer addresses:',
        code: `# Find the resource ID for customer_address
RES_ID=$(curl -s http://localhost:3000/api/resources \\
  -H "Authorization: Bearer $TOKEN" \\
  | grep -B1 "customer_address" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

# Grant permission
curl -X POST http://localhost:3000/api/integrations/$INT_ID/permissions \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"resourceId\\": \\"$RES_ID\\",
    \\"action\\": \\"read\\",
    \\"allowed\\": true,
    \\"maxRecordsPerRequest\\": 1000,
    \\"maxRecordsPerHour\\": 10000
  }"`,
        note: 'The maxRecords limits are optional but recommended. They prevent an integration from downloading your entire database.',
      },
      {
        heading: 'Step 3: Test It',
        text: 'Try accessing data they have permission for (should work):',
        code: `curl http://localhost:3000/customers/123/address \\
  -H "X-Api-Key: my-secret-key-123"`,
        text2: 'Now try accessing data they don\'t have permission for (risk score goes up):',
        code2: `curl http://localhost:5173  # Check the dashboard
# You'll see the risk score increased`,
        check: 'The delivery partner can now access addresses, and any attempt to access other data will be flagged.',
      },
    ],
  },

  'handle-alerts': {
    title: 'Handle Alerts',
    intro: 'When an integration\'s behaviour gets suspicious, G-Watch creates an alert. Here\'s how to handle them.',
    sections: [
      {
        heading: 'How Alerts Work',
        text: 'When a risk score reaches 60 or higher, an alert is created. The system recommends an action, but you make the final decision. This is the "admin-in-the-loop" approach.',
      },
      {
        heading: 'Step 1: See Open Alerts',
        text: 'Check for any open alerts:',
        code: `curl "http://localhost:3000/api/alerts?status=open" \\
  -H "Authorization: Bearer $TOKEN"`,
        text2: 'You\'ll see a list of alerts with severity, integration name, and when they were created.',
      },
      {
        heading: 'Step 2: Get Alert Details',
        text: 'Pick an alert and get more details:',
        code: `# Replace ALERT_ID with the actual ID
curl http://localhost:3000/api/alerts/ALERT_ID \\
  -H "Authorization: Bearer $TOKEN"`,
        text2: 'This shows you the full picture: what happened, the risk score, what data was accessed, and the system\'s recommendation.',
      },
      {
        heading: 'Step 3: Make a Decision',
        text: 'Review the alert and decide what to do:',
        code: `curl -X POST http://localhost:3000/api/alerts/ALERT_ID/review \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "adminDecision": "block",
    "adminNotes": "Repeated unauthorized access pattern"
  }'`,
        text2: 'Your options are:',
        note: 'allow = let it continue, monitor = watch closely, rate_limit = slow them down, alert = escalate, block = stop them. Every decision is logged to the audit trail.',
      },
    ],
  },

  'run-demo': {
    title: 'Run the Demo',
    intro: 'See the system in action. This demo proves G-Watch can tell the difference between normal traffic and attacks.',
    sections: [
      {
        heading: 'What the Demo Does',
        text: 'It fires 30 normal requests (all allowed, low risk) and then 30 attack requests (gets blocked, high risk). This proves the system doesn\'t false-alarm on busy days.',
      },
      {
        heading: 'Step 1: Fire Normal Traffic',
        text: 'These are requests a delivery partner would normally make:',
        code: `curl -X POST http://localhost:3000/api/dev/simulate-batch \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "scenarioName": "NORMAL",
    "count": 30,
    "delayMs": 80
  }'`,
        text2: 'Expected result: All 30 allowed. Average risk around 8. Zero blocks. Zero alerts.',
      },
      {
        heading: 'Step 2: Fire Attack Traffic',
        text: 'Now simulate an attack — repeated unauthorized access:',
        code: `curl -X POST http://localhost:3000/api/dev/simulate-batch \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "scenarioName": "REPEATED_ATTACK",
    "count": 30,
    "delayMs": 80
  }'`,
        text2: 'Expected result: Multiple blocks. Average risk around 85. Alerts created.',
      },
      {
        heading: 'Step 3: Compare on the Dashboard',
        text: 'Open http://localhost:5173 and look at:',
        check: 'The risk timeline shows green dots (normal) then red dots (attack). The side-by-side comparison makes the contrast obvious. Normal traffic = no action needed. Attack traffic = requires review.',
      },
    ],
  },

  'monitor-realtime': {
    title: 'Real-Time Monitoring',
    intro: 'G-Watch pushes events to the dashboard in real time. No page refresh needed.',
    sections: [
      {
        heading: 'How It Works',
        text: 'G-Watch uses Socket.IO — a technology for real-time communication. When a third-party sends a request, the dashboard updates instantly.',
      },
      {
        heading: 'Step 1: Open the Dashboard',
        text: 'Go to http://localhost:5173 and find the Activity feed on the Dashboard.',
      },
      {
        heading: 'Step 2: Fire Some Requests',
        text: 'In another terminal, fire requests and watch them appear in real time:',
        code: `curl -X POST http://localhost:3000/api/dev/simulate-batch \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"scenarioName":"NORMAL","count":10,"delayMs":100}'`,
        text2: 'Watch the Activity feed — each request appears as it happens.',
      },
      {
        heading: 'Step 3: Try Different Scenarios',
        text: 'Fire an attack scenario and watch the alerts appear in real time:',
        code: `curl -X POST http://localhost:3000/api/dev/simulate-scenario/REPEATED_ATTACK \\
  -H "Authorization: Bearer $TOKEN"`,
        check: 'You\'ll see the alert appear in the Alerts tab immediately, and the trust score update on the Dashboard.',
      },
    ],
  },

  'customize': {
    title: 'Customize Settings',
    intro: 'Adjust G-Watch\'s behaviour to match your needs. This involves editing the source code.',
    sections: [
      {
        heading: 'What You Can Change',
        text: 'Rate limits, anomaly thresholds, and risk scoring weights are all configurable in the source code.',
      },
      {
        heading: 'Rate Limits',
        text: 'Default: 100 requests/minute, 1000/hour. Edit these in the gateway service:',
        code: `// backend-server/src/services/gateway.service.js

const RATE_LIMIT_MINUTE = 100;   // Change this
const RATE_LIMIT_HOUR = 1000;    // Change this`,
      },
      {
        heading: 'Anomaly Thresholds',
        text: 'Volume spike detection uses 3x the baseline. Change the multiplier:',
        code: `// backend-server/src/services/anomaly.service.js

const VOLUME_SPIKE_MULTIPLIER = 3;  // Change to 2 for more sensitive`,
      },
      {
        heading: 'Risk Score Weights',
        text: 'Each anomaly adds 15 points. Unauthorized access adds 20. Adjust these values:',
        code: `// backend-server/src/services/gateway.service.js

// In calculateRiskScore():
for (const anomaly of anomalies) {
  riskScore += 15;  // Change this value
}
if (hasNoPermission) riskScore += 20;  // Change this
if (isUnusualHour) riskScore += 5;     // Change this`,
        note: 'After changing these values, restart the backend server.',
      },
    ],
  },
};

export default function Guides() {
  const [active, setActive] = useState('connect-backend');
  const current = guideContent[active];
  const currentGuide = guides.find((g) => g.id === active);

  return (
    <div className="docs-page">
      <nav className="docs-nav">
        <Link to="/" className="docs-nav-back"><ArrowLeft size={14} /> Home</Link>
        <div className="docs-nav-logo">Guides</div>
        <div className="docs-nav-links">
          <Link to="/docs">Docs</Link>
          <Link to="/tutorials">Tutorials</Link>
          <Link to="/login" className="btn-outline-sm">Sign In</Link>
          <Link to="/login" className="btn-primary-sm">Get Started</Link>
        </div>
      </nav>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="docs-sidebar-section">
            <div className="docs-sidebar-title">Guides</div>
            {guides.map((g) => (
              <button
                key={g.id}
                className={`docs-sidebar-item ${active === g.id ? 'active' : ''}`}
                onClick={() => setActive(g.id)}
              >
                {g.icon}
                <span>{g.title}</span>
                {active === g.id && <ChevronRight size={12} />}
              </button>
            ))}
          </div>
        </aside>

        <main className="docs-content">
          <div className="docs-content-header">
            {currentGuide.icon}
            <h1>{current.title}</h1>
          </div>
          <div className="guide-meta">
            <span className="guide-badge">{currentGuide.difficulty}</span>
            <span className="guide-time">{currentGuide.time} read</span>
          </div>
          <p className="d-lead">{current.intro}</p>

          {current.sections.map((sec, i) => (
            <div key={i} className="guide-section">
              <h3>{sec.heading}</h3>
              {sec.text && <p>{sec.text}</p>}
              {sec.code && <Code>{sec.code}</Code>}
              {sec.text2 && <p>{sec.text2}</p>}
              {sec.code2 && <Code>{sec.code2}</Code>}
              {sec.note && <Note>{sec.note}</Note>}
              {sec.check && <div className="guide-check">{sec.check}</div>}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
