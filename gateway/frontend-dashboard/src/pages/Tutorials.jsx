import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Play, CheckCircle2, Copy, Check } from 'lucide-react';
import './Tutorials.css';

function Code({ children, label }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="t-code">
      {label && <div className="t-code-label">{label}</div>}
      <button className="t-code-copy" onClick={copy}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <pre>{children}</pre>
    </div>
  );
}

function Note({ children }) {
  return <div className="t-note">{children}</div>;
}

const tutorials = [
  {
    id: 'first-integration',
    title: 'Build Your First Integration',
    desc: 'Create an integration, send traffic, and see it on the dashboard.',
    difficulty: 'Beginner',
    steps: 6,
  },
  {
    id: 'detect-attack',
    title: 'Detect and Block an Attack',
    desc: 'Simulate an attack, watch the risk score spike, and block the attacker.',
    difficulty: 'Intermediate',
    steps: 5,
  },
  {
    id: 'sales-demo',
    title: 'Prove It Doesn\'t False-Alarm',
    desc: 'Run the built-in demo to show the system distinguishes normal days from attacks.',
    difficulty: 'Beginner',
    steps: 3,
  },
];

const tutorialSteps = {
  'first-integration': [
    {
      title: 'Make Sure G-Watch Is Running',
      content: 'Before we start, confirm G-Watch is running. Open two terminals:',
      code: `# Terminal 1
cd backend-server && npm run dev

# Terminal 2
cd frontend-dashboard && npm run dev`,
      tip: 'If you haven\'t set up G-Watch yet, follow the Quick Start guide first.',
    },
    {
      title: 'Login and Get a Token',
      content: 'Open a third terminal. We\'ll use it for all API calls. First, login:',
      code: `TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@gwatch.dev","password":"password123"}' \\
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Verify it worked
curl http://localhost:3000/api/auth/me \\
  -H "Authorization: Bearer $TOKEN"`,
      note: 'You should see your user info in the response. If you get a 401 error, the token didn\'t save — try the commands again.',
    },
    {
      title: 'Create Your Integration',
      content: 'Now create an integration. This represents your third-party partner:',
      code: `curl -X POST http://localhost:3000/api/integrations \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "tutorial-partner",
    "description": "My first integration"
  }'`,
      note: 'Notice we didn\'t set targetUrl. That means G-Watch will log requests but won\'t proxy them to a real backend. This is fine for learning.',
    },
    {
      title: 'Create an API Key',
      content: 'Your partner needs a key to authenticate. Create one:',
      code: `# Get the integration ID
INT_ID=$(curl -s http://localhost:3000/api/integrations \\
  -H "Authorization: Bearer $TOKEN" \\
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Create the API key
curl -X POST http://localhost:3000/api/integrations/$INT_ID/credentials \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "api_key",
    "name": "tutorial-key",
    "credential": "tutorial-secret-123"
  }'`,
    },
    {
      title: 'Send a Request',
      content: 'Now simulate what your partner would do. Send a request through G-Watch:',
      code: `# This is what the partner sends
curl http://localhost:3000/customers/123 \\
  -H "X-Api-Key: tutorial-secret-123"`,
      note: 'You\'ll see a response from G-Watch. Check the dashboard — the request appears in the activity feed.',
    },
    {
      title: 'See It on the Dashboard',
      content: 'Open http://localhost:5173 in your browser. Here\'s what to look for:',
      check: 'You\'ve created your first integration and sent traffic through G-Watch. The request is logged with a risk score and decision. You can see it on the Dashboard and in the Integrations page.',
    },
  ],

  'detect-attack': {
    title: 'Detect and Block an Attack',
    intro: 'Let\'s see what happens when a partner starts misbehaving. We\'ll simulate an attack and watch G-Watch detect and block it.',
    sections: [
      {
        heading: 'What We\'re Simulating',
        text: 'Imagine a delivery partner that normally accesses customer addresses. Suddenly, they start trying to access payment data they have no permission for. This is what an attack looks like.',
      },
      {
        heading: 'Step 1: Check Current State',
        text: 'Before the attack, check the delivery partner\'s trust score:',
        code: `curl http://localhost:3000/api/dashboard/trust-scores \\
  -H "Authorization: Bearer $TOKEN" \\
  | grep -A5 "delivery-provider"`,
        text2: 'You should see a trust score around 80-100 (high). This is normal behaviour.',
      },
      {
        heading: 'Step 2: Launch the Attack',
        text: 'Fire 30 unauthorized access attempts:',
        code: `curl -X POST http://localhost:3000/api/dev/simulate-batch \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "scenarioName": "REPEATED_ATTACK",
    "count": 30,
    "delayMs": 80
  }'`,
        text2: 'Watch the output. You\'ll see risk scores climbing with each request.',
      },
      {
        heading: 'Step 3: See the Damage',
        text: 'Check the dashboard now:',
        code: `# Check trust score again
curl http://localhost:3000/api/dashboard/trust-scores \\
  -H "Authorization: Bearer $TOKEN" \\
  | grep -A5 "delivery-provider"`,
        text2: 'The trust score has dropped dramatically. Alerts have been created.',
      },
      {
        heading: 'Step 4: Review and Block',
        text: 'Go to the Alerts tab on the dashboard. Find an alert and review it. Or use the API:',
        code: `# Get an alert ID
ALERT_ID=$(curl -s "http://localhost:3000/api/alerts?status=open" \\
  -H "Authorization: Bearer $TOKEN" \\
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Review and block
curl -X POST http://localhost:3000/api/alerts/$ALERT_ID/review \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "adminDecision": "block",
    "adminNotes": "Repeated unauthorized access to payment data"
  }'`,
        check: 'You\'ve detected an attack, watched the risk score spike, and blocked the integration. This is how G-Watch protects your API in real time.',
      },
    ],
  },

  'sales-demo': {
    title: 'Prove It Doesn\'t False-Alarm',
    intro: 'This demo proves that G-Watch doesn\'t trigger false alarms on busy days. It fires normal traffic (no alerts) then attack traffic (gets blocked).',
    sections: [
      {
        heading: 'What the Demo Does',
        text: 'The demo runs two phases automatically:',
        check: 'Phase 1: 30 normal requests → all allowed, risk stays low, zero blocks.\nPhase 2: 30 attack requests → risk spikes, multiple blocks, alerts created.\n\nThis proves the system can tell the difference between a busy day and a real attack.',
      },
      {
        heading: 'Run It',
        text: 'Open the Dashboard at http://localhost:5173 and find the simulation section. Click "Run Demo".',
        text2: 'Or run it from the terminal:',
        code: `# Phase 1: Normal traffic
curl -X POST http://localhost:3000/api/dev/simulate-batch \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"scenarioName":"NORMAL","count":30,"delayMs":80}'

# Phase 2: Attack traffic
curl -X POST http://localhost:3000/api/dev/simulate-batch \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"scenarioName":"REPEATED_ATTACK","count":30,"delayMs":80}'`,
      },
      {
        heading: 'Read the Results',
        text: 'After the demo completes, look at the comparison:',
        check: 'Normal traffic: Average risk ~8, 0 blocks, verdict "No action needed".\nAttack traffic: Average risk ~85, multiple blocks, verdict "Requires review".\n\nThe risk timeline chart shows green dots (normal) on the left and red dots (attack) on the right. The contrast is obvious.',
      },
    ],
  },
};

export default function Tutorials() {
  const [active, setActive] = useState('first-integration');
  const [currentStep, setCurrentStep] = useState(0);
  const tutorial = tutorials.find((t) => t.id === active);

  function selectTutorial(id) {
    setActive(id);
    setCurrentStep(0);
  }

  const content = tutorialSteps[active];
  const isStepBased = Array.isArray(content);

  return (
    <div className="docs-page">
      <nav className="docs-nav">
        <Link to="/" className="docs-nav-back"><ArrowLeft size={14} /> Home</Link>
        <div className="docs-nav-logo">Tutorials</div>
        <div className="docs-nav-links">
          <Link to="/docs">Docs</Link>
          <Link to="/guides">Guides</Link>
          <Link to="/login" className="btn-outline-sm">Sign In</Link>
          <Link to="/login" className="btn-primary-sm">Get Started</Link>
        </div>
      </nav>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="docs-sidebar-section">
            <div className="docs-sidebar-title">Tutorials</div>
            {tutorials.map((t) => (
              <button
                key={t.id}
                className={`docs-sidebar-item ${active === t.id ? 'active' : ''}`}
                onClick={() => selectTutorial(t.id)}
              >
                <Play size={14} />
                <span>{t.title}</span>
                {active === t.id && <ChevronRight size={12} />}
              </button>
            ))}
          </div>
        </aside>

        <main className="docs-content">
          <div className="docs-content-header">
            <Play size={20} />
            <h1>{tutorial.title}</h1>
          </div>
          <div className="guide-meta">
            <span className="guide-badge">{tutorial.difficulty}</span>
            <span className="guide-time">{tutorial.steps} steps</span>
          </div>

          {isStepBased ? (
            <>
              <p className="d-lead">{content[0].content}</p>

              <div className="tutorial-progress">
                {content.map((_, i) => (
                  <div
                    key={i}
                    className={`tutorial-progress-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}`}
                    onClick={() => setCurrentStep(i)}
                  >
                    {i < currentStep ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                ))}
              </div>

              <div className="tutorial-step">
                <div className="tutorial-step-header">
                  <span className="tutorial-step-num">Step {currentStep + 1} of {content.length}</span>
                  <h3>{content[currentStep].title}</h3>
                </div>
                {content[currentStep].content && <p>{content[currentStep].content}</p>}
                {content[currentStep].code && <Code>{content[currentStep].code}</Code>}
                {content[currentStep].tip && <Note>{content[currentStep].tip}</Note>}
                {content[currentStep].note && <div className="t-info">{content[currentStep].note}</div>}
                {content[currentStep].check && <div className="tutorial-check">{content[currentStep].check}</div>}
              </div>

              <div className="tutorial-nav">
                <button
                  className="btn-outline-sm"
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Previous
                </button>
                {currentStep < content.length - 1 ? (
                  <button
                    className="btn-primary-sm"
                    onClick={() => setCurrentStep(currentStep + 1)}
                  >
                    Next Step <ChevronRight size={14} />
                  </button>
                ) : (
                  <Link to="/login" className="btn-primary-sm">
                    <Play size={14} /> Try It Now
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="d-lead">{content.intro}</p>
              {content.sections.map((sec, i) => (
                <div key={i} className="guide-section">
                  <h3>{sec.heading}</h3>
                  {sec.text && <p>{sec.text}</p>}
                  {sec.code && <Code>{sec.code}</Code>}
                  {sec.text2 && <p>{sec.text2}</p>}
                  {sec.note && <div className="t-info">{sec.note}</div>}
                  {sec.check && <div className="tutorial-check">{sec.check}</div>}
                </div>
              ))}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
