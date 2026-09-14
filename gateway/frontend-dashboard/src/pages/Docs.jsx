import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, ArrowLeft, Copy, Check, Terminal, Zap, Shield, AlertTriangle, Rocket } from 'lucide-react';
import './Docs.css';

function Code({ children, label }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="d-code">
      {label && <div className="d-code-label">{label}</div>}
      <button className="d-code-copy" onClick={copy}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <pre>{children}</pre>
    </div>
  );
}

function Note({ children }) {
  return <div className="d-note">{children}</div>;
}

function Tip({ children }) {
  return <div className="d-tip">{children}</div>;
}

function Warn({ children }) {
  return <div className="d-warn">{children}</div>;
}

const pages = {
  'introduction': {
    title: 'Introduction',
    icon: <BookOpen size={20} />,
    content: (
      <>
        <p className="d-lead">Welcome to G-Watch! This guide will help you understand what G-Watch does and how to use it.</p>

        <h3>What is G-Watch?</h3>
        <p>Imagine you have a delivery partner, a payment processor, or an analytics service that needs to access your API. You give them access, but then you wonder:</p>
        <ul>
          <li>What data are they actually accessing?</li>
          <li>Are they accessing things they shouldn't?</li>
          <li>What if they suddenly start making thousands of requests?</li>
          <li>What if someone steals their API key?</li>
        </ul>
        <p><strong>G-Watch answers all of these questions.</strong> It sits between your backend and your partners, watching everything that happens.</p>

        <h3>The Big Picture</h3>
        <p>Here's the idea in 30 seconds:</p>
        <ol>
          <li>You give your partner G-Watch's URL instead of your real backend URL</li>
          <li>When they make a request, it goes to G-Watch first</li>
          <li>G-Watch checks: Is this normal? Is this allowed? Is this suspicious?</li>
          <li>If it looks good, G-Watch forwards it to your real backend</li>
          <li>You see everything on a dashboard in real time</li>
        </ol>

        <Note>The best part? <strong>Your partner doesn't need to change anything.</strong> Their code works exactly the same. They just hit a different URL.</Note>

        <h3>What You'll Learn</h3>
        <div className="d-learn-grid">
          <Link to="/docs" className="d-learn-card">
            <Rocket size={18} />
            <div>
              <strong>Quick Start</strong>
              <span>Get running in 5 minutes</span>
            </div>
          </Link>
          <Link to="/guides" className="d-learn-card">
            <Terminal size={18} />
            <div>
              <strong>Guides</strong>
              <span>Step-by-step walkthroughs</span>
            </div>
          </Link>
          <Link to="/tutorials" className="d-learn-card">
            <Zap size={18} />
            <div>
              <strong>Tutorials</strong>
              <span>Hands-on learning by doing</span>
            </div>
          </Link>
        </div>
      </>
    ),
  },

  'quick-start': {
    title: 'Quick Start',
    icon: <Rocket size={20} />,
    content: (
      <>
        <p className="d-lead">Let's get G-Watch running on your machine. This takes about 5 minutes.</p>

        <h3>Step 1: Get the Code</h3>
        <p>Open your terminal and clone the repository:</p>
        <Code label="Terminal">{`git clone <repo-url> && cd gateway`}</Code>

        <h3>Step 2: Install Dependencies</h3>
        <p>You need to install packages for both the backend and the frontend. Run these commands one at a time:</p>
        <Code label="Terminal">{`# Install backend packages
cd backend-server
npm install

# Install frontend packages
cd ../frontend-dashboard
npm install`}</Code>

        <Tip>This might take a minute or two depending on your internet connection.</Tip>

        <h3>Step 3: Set Up the Database</h3>
        <p>G-Watch needs a PostgreSQL database. If you don't have one running, start it first.</p>
        <p>Then, create the tables and add demo data:</p>
        <Code label="Terminal">{`cd backend-server

# Copy the example config
cp .env.example .env

# Edit .env and set these two values:
#   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/gwatch_security
#   JWT_SECRET=any-random-string-here

# Create all the tables
npx drizzle-kit push

# Fill the database with demo data
npm run seed`}</Code>

        <Note>The <code>npm run seed</code> command creates an admin user, 5 integrations, 9 data resources, 34 sample events, and 5 alerts so you have something to look at right away.</Note>

        <h3>Step 4: Start the Servers</h3>
        <p>You need two terminal windows for this.</p>

        <Code label="Terminal 1 — Backend">{`cd backend-server
npm run dev

# You should see:
# Server running on port 3000
# Database connected`}</Code>

        <Code label="Terminal 2 — Frontend">{`cd frontend-dashboard
npm run dev

# You should see:
# Local: http://localhost:5173`}</Code>

        <h3>Step 5: Open the Dashboard</h3>
        <p>Open <strong>http://localhost:5173</strong> in your browser. You'll see the login page.</p>
        <p>Sign in with these demo credentials:</p>

        <div className="d-table-wrap">
          <table className="d-table">
            <thead><tr><th>Email</th><th>Password</th><th>Role</th></tr></thead>
            <tbody>
              <tr><td><code>admin@gwatch.dev</code></td><td><code>password123</code></td><td>Admin (full access)</td></tr>
            </tbody>
          </table>
        </div>

        <p>After logging in, you'll see the dashboard with demo data already loaded. You'll see charts, trust scores, and recent activity.</p>

        <Note>Try clicking around! Check the Integrations page, Alerts page, and Resources page to see what's available.</Note>

        <h3>What's Next?</h3>
        <p>Now that G-Watch is running, you have a few options:</p>
        <ul>
          <li><Link to="/guides">Connect your real backend</Link> — Route real traffic through G-Watch</li>
          <li><Link to="/tutorials">Try the tutorials</Link> — Hands-on exercises to learn the system</li>
          <li><a href="#" onClick={(e) => { e.preventDefault(); }}>Understand the traffic flow</a> — Learn what happens when a request comes in</li>
        </ul>
      </>
    ),
  },

  'traffic-flow': {
    title: 'What Happens When a Request Comes In',
    icon: <Zap size={20} />,
    content: (
      <>
        <p className="d-lead">Let's trace a request from start to finish so you understand exactly what G-Watch does.</p>

        <h3>The Scenario</h3>
        <p>Let's say you have a delivery partner. They need to check customer addresses. Instead of giving them your API URL, you give them G-Watch's URL.</p>
        <p>They send this request:</p>
        <Code label="What the partner sends">{`curl http://localhost:3000/customers/123/address \\
  -H "X-Api-Key: delivery-key-123"`}</Code>

        <p>Here's what happens behind the scenes:</p>

        <h3>Step 1: "Who Are You?"</h3>
        <p>G-Watch looks at the API key <code>delivery-key-123</code> and finds which integration owns it. It's the "delivery-provider" integration.</p>
        <p>If the key is invalid, G-Watch returns a 401 error immediately. Done.</p>

        <h3>Step 2: "Are You Within Limits?"</h3>
        <p>G-Watch checks if the delivery-provider is making too many requests. The limits are:</p>
        <ul>
          <li>100 requests per minute</li>
          <li>1,000 requests per hour</li>
        </ul>
        <p>If they exceed the limit, G-Watch returns a 429 "Too Many Requests" error.</p>

        <h3>Step 3: "Is This Normal?"</h3>
        <p>This is where it gets interesting. G-Watch runs 5 checks simultaneously:</p>

        <div className="d-steps">
          <div className="d-step">
            <div className="d-step-num">1</div>
            <div className="d-step-body">
              <strong>Volume Check</strong>
              <p>Is the delivery-provider sending way more requests than usual? If they usually send 10 per hour and suddenly send 50 in a minute, that's suspicious.</p>
            </div>
          </div>
          <div className="d-step">
            <div className="d-step-num">2</div>
            <div className="d-step-body">
              <strong>New Data Check</strong>
              <p>Has the delivery-provider ever accessed "address" data before? If this is the first time, that's worth noting.</p>
            </div>
          </div>
          <div className="d-step">
            <div className="d-step-num">3</div>
            <div className="d-step-body">
              <strong>Permission Check</strong>
              <p>Does the delivery-provider have permission to read address data? If not, that's a problem.</p>
            </div>
          </div>
          <div className="d-step">
            <div className="d-step-num">4</div>
            <div className="d-step-body">
              <strong>IP Check</strong>
              <p>Is this request coming from an IP address we've seen before? New IPs can be suspicious.</p>
            </div>
          </div>
          <div className="d-step">
            <div className="d-step-num">5</div>
            <div className="d-step-body">
              <strong>Time Check</strong>
              <p>Is it 3 AM? Requests at unusual hours are more suspicious.</p>
            </div>
          </div>
        </div>

        <h3>Step 4: "How Risky Is This?"</h3>
        <p>G-Watch calculates a risk score from 0 to 100. Each problem adds points:</p>
        <ul>
          <li>Each anomaly found: <strong>+15 points</strong></li>
          <li>No permission: <strong>+20 points</strong></li>
          <li>Unusual hour: <strong>+5 points</strong></li>
          <li>Previously blocked: <strong>+20 points</strong></li>
        </ul>

        <div className="d-table-wrap">
          <table className="d-table">
            <thead><tr><th>Score</th><th>Risk Level</th><th>What Happens</th></tr></thead>
            <tbody>
              <tr><td><span className="d-badge d-badge-green">0-29</span></td><td>Low</td><td>Request is allowed through</td></tr>
              <tr><td><span className="d-badge d-badge-yellow">30-59</span></td><td>Medium</td><td>Allowed, but flagged for watching</td></tr>
              <tr><td><span className="d-badge d-badge-orange">60-79</span></td><td>High</td><td>Allowed, but an alert is created</td></tr>
              <tr><td><span className="d-badge d-badge-red">80-100</span></td><td>Critical</td><td>Blocked! Third party gets an error</td></tr>
            </tbody>
          </table>
        </div>

        <h3>Step 5: "Forward or Block?"</h3>
        <p>If the score is below 80, G-Watch forwards the request to your real backend. Your backend processes it normally and sends back the real response.</p>
        <p>G-Watch then returns that response to the delivery partner. They never know anything happened.</p>
        <p>If the score is 80 or above, G-Watch blocks the request. The partner gets an error message.</p>

        <h3>Step 6: "Log Everything"</h3>
        <p>G-Watch saves everything to the database: who made the request, what they accessed, the risk score, and what decision was made.</p>
        <p>It also pushes the event to the dashboard in real time via Socket.IO. You see it instantly.</p>

        <Note>You can watch all of this happening live on the Dashboard. Open http://localhost:5173 and check the Activity feed.</Note>
      </>
    ),
  },

  'your-first-integration': {
    title: 'Your First Integration',
    icon: <Shield size={20} />,
    content: (
      <>
        <p className="d-lead">Let's create an integration from scratch and test it. This is the most important thing to learn.</p>

        <h3>What Is an Integration?</h3>
        <p>An integration represents a third-party partner who accesses your API. Each integration has:</p>
        <ul>
          <li><strong>A name</strong> — like "delivery-provider" or "payment-partner"</li>
          <li><strong>API keys</strong> — credentials the partner uses to authenticate</li>
          <li><strong>Permissions</strong> — what data they're allowed to access</li>
          <li><strong>A trust score</strong> — 0 to 100 based on their behaviour</li>
        </ul>

        <h3>Step 1: Login</h3>
        <p>First, get a login token. You'll use this for all API calls.</p>
        <Code label="Terminal">{`# Login and save the token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@gwatch.dev","password":"password123"}' \\
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Verify it worked — you should see your user info
curl http://localhost:3000/api/auth/me \\
  -H "Authorization: Bearer $TOKEN"`}</Code>

        <Tip>If you get a 401 error, the token didn't save correctly. Try the commands again.</Tip>

        <h3>Step 2: Create the Integration</h3>
        <p>Now create an integration for your partner:</p>
        <Code label="Terminal">{`curl -X POST http://localhost:3000/api/integrations \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-delivery-partner",
    "description": "Handles delivery tracking for us",
    "targetUrl": "https://api.yourapp.com"
  }'`}</Code>

        <p>You'll get back a response with the integration's ID. Save it:</p>
        <Code label="Terminal">{`# Save the integration ID
INT_ID=$(curl -s http://localhost:3000/api/integrations \\
  -H "Authorization: Bearer $TOKEN" \\
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Integration ID: $INT_ID"`}</Code>

        <Note>The <code>targetUrl</code> is important. This is your real backend URL. When the partner sends a request through G-Watch, G-Watch will forward it to this URL.</Note>

        <h3>Step 3: Create an API Key</h3>
        <p>Your partner needs an API key to authenticate. Create one:</p>
        <Code label="Terminal">{`curl -X POST http://localhost:3000/api/integrations/$INT_ID/credentials \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "api_key",
    "name": "delivery-production-key",
    "credential": "deliv-key-abc123"
  }'`}</Code>

        <p>The <code>credential</code> field is the actual key value your partner will use. You can make this anything you want.</p>

        <h3>Step 4: Test It</h3>
        <p>Now simulate what your partner would do. Send a request through G-Watch:</p>
        <Code label="Terminal">{`# This is what the partner sends
curl http://localhost:3000/customers/123 \\
  -H "X-Api-Key: deliv-key-abc123"`}</Code>

        <p>You should see the response from your real backend (if targetUrl is set). If not, you'll see a status response from G-Watch.</p>

        <h3>Step 5: See It on the Dashboard</h3>
        <p>Open http://localhost:5173 and go to the Integrations page. You'll see "my-delivery-partner" in the list.</p>
        <p>Click on it to see:</p>
        <ul>
          <li>The trust score</li>
          <li>Total requests</li>
          <li>Recent activity</li>
          <li>Permissions</li>
        </ul>

        <h3>Step 6: What If Something Goes Wrong?</h3>
        <p>Try sending a request to a path you haven't granted permission for. For example, if you only gave read access to addresses, try accessing payment data:</p>
        <Code label="Terminal">{`curl http://localhost:3000/payments/456 \\
  -H "X-Api-Key: deliv-key-abc123"`}</Code>

        <p>Check the dashboard. You'll see the risk score went up because the partner accessed data without permission.</p>

        <h3>What You Just Learned</h3>
        <p>You now know how to:</p>
        <ul>
          <li>Create an integration</li>
          <li>Create API keys</li>
          <li>Send requests through the gateway</li>
          <li>See the results on the dashboard</li>
        </ul>
        <p>Next, learn how to <Link to="/guides">set up permissions</Link> to control what data each partner can access.</p>
      </>
    ),
  },

  'permissions': {
    title: 'Setting Up Permissions',
    icon: <Shield size={20} />,
    content: (
      <>
        <p className="d-lead">Permissions control what data each integration can access. This is important for keeping your data safe.</p>

        <h3>Why Permissions Matter</h3>
        <p>Without permissions, every integration can access everything. That's dangerous. If a delivery partner suddenly starts reading payment data, you want to know — and you want G-Watch to flag it.</p>
        <p>Permissions let you say: "The delivery partner can read addresses, but nothing else."</p>

        <h3>How Permissions Affect Risk</h3>
        <p>When an integration tries to access data it doesn't have permission for, the risk score goes up by <strong>20 points</strong>. That's a lot — it can push a request from "allowed" to "alert" or even "blocked."</p>

        <h3>Step 1: See What Data Categories Exist</h3>
        <p>G-Watch has 9 built-in data categories:</p>
        <div className="d-table-wrap">
          <table className="d-table">
            <thead><tr><th>Category</th><th>Example</th><th>Sensitivity</th></tr></thead>
            <tbody>
              <tr><td><code>customer_profile</code></td><td>Name, email, preferences</td><td>Confidential</td></tr>
              <tr><td><code>customer_address</code></td><td>Home/work address</td><td>Confidential</td></tr>
              <tr><td><code>customer_contact</code></td><td>Phone number</td><td>Confidential</td></tr>
              <tr><td><code>order_data</code></td><td>Order history, status</td><td>Internal</td></tr>
              <tr><td><code>payment_data</code></td><td>Card details, transactions</td><td>Restricted</td></tr>
              <tr><td><code>identity_data</code></td><td>ID numbers, documents</td><td>Restricted</td></tr>
              <tr><td><code>analytics_data</code></td><td>Usage stats, trends</td><td>Internal</td></tr>
              <tr><td><code>authentication_data</code></td><td>Login tokens, sessions</td><td>Restricted</td></tr>
              <tr><td><code>internal_data</code></td><td>Internal metrics</td><td>Internal</td></tr>
            </tbody>
          </table>
        </div>

        <h3>Step 2: Grant Permission</h3>
        <p>Let's give the delivery partner read access to customer addresses:</p>
        <Code label="Terminal">{`# First, find the resource ID for customer_address
curl http://localhost:3000/api/resources \\
  -H "Authorization: Bearer $TOKEN" \\
  | grep -A2 "customer_address"`}</Code>

        <p>Copy the ID from the response, then grant the permission:</p>
        <Code label="Terminal">{`curl -X POST http://localhost:3000/api/integrations/$INT_ID/permissions \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "resourceId": "RESOURCE_ID_FROM_ABOVE",
    "action": "read",
    "allowed": true,
    "maxRecordsPerRequest": 1000,
    "maxRecordsPerHour": 10000
  }'`}</Code>

        <Note>The <code>maxRecordsPerRequest</code> and <code>maxRecordsPerHour</code> limits are optional but recommended. They prevent an integration from downloading your entire database.</Note>

        <h3>Step 3: Test the Permission</h3>
        <p>Now the delivery partner can access addresses:</p>
        <Code label="Terminal">{`# This works — they have permission
curl http://localhost:3000/customers/123/address \\
  -H "X-Api-Key: deliv-key-abc123"`}</Code>

        <p>But if they try to access payment data:</p>
        <Code label="Terminal">{`# This will increase their risk score
curl http://localhost:3000/payments/456 \\
  -H "X-Api-Key: deliv-key-abc123"`}</Code>

        <h3>Step 4: See It on the Dashboard</h3>
        <p>Go to the Dashboard and look at the Data Access Matrix. You'll see a grid showing which integrations can access which data.</p>
        <ul>
          <li><strong>Green cells</strong> — permission granted and used</li>
        </ul>
      </>
    ),
  },

  'understanding-the-dashboard': {
    title: 'Understanding the Dashboard',
    icon: <Zap size={20} />,
    content: (
      <>
        <p className="d-lead">The dashboard is where you see everything happening in real time. Let's walk through each section.</p>

        <h3>Overview Stats</h3>
        <p>At the top of the dashboard, you see key numbers:</p>
        <ul>
          <li><strong>Total Integrations</strong> — how many partners are connected</li>
          <li><strong>Requests Today</strong> — total API calls through G-Watch today</li>
          <li><strong>Anomalies Today</strong> — suspicious activities detected</li>
          <li><strong>Open Alerts</strong> — issues waiting for your review</li>
          <li><strong>Blocked Requests</strong> — requests that were stopped</li>
        </ul>

        <h3>Trust Scores</h3>
        <p>Each integration has a trust score from 0 to 100. This number changes based on behaviour:</p>
        <ul>
          <li><strong>80-100 (High)</strong> — Green. Trusted. Normal behaviour.</li>
          <li><strong>60-79 (Medium)</strong> — Yellow. Some concerns. Watch closely.</li>
          <li><strong>40-59 (Low)</strong> — Orange. Multiple issues. Needs attention.</li>
          <li><strong>0-39 (Critical)</strong> — Red. Serious problems. Act now.</li>
        </ul>

        <h3>Data Access Matrix</h3>
        <p>This is a grid that shows, at a glance, which integrations can access which data. It's one of the most useful views in G-Watch.</p>
        <p>Each cell in the grid represents one integration accessing one data category. The colour tells you the status:</p>
        <ul>
          <li><strong>Bright green</strong> — Permitted and actively used</li>
          <li><strong>Dim green</strong> — Permitted but never used (over-privileged)</li>
          <li><strong>Red</strong> — Accessed without permission (anomaly!)</li>
          <li><strong>Grey</strong> — No access</li>
        </ul>

        <Tip>Dim green cells are a signal. If an integration has permission but never uses it, you might want to remove that permission to reduce risk.</Tip>

        <h3>Activity Feed</h3>
        <p>The activity feed shows every request as it happens. Each entry shows:</p>
        <ul>
          <li>Which integration made the request</li>
          <li>What endpoint they called</li>
          <li>The risk score</li>
          <li>The decision (allowed, monitored, blocked)</li>
        </ul>
        <p>This updates in real time — no page refresh needed.</p>

        <h3>Risk Timeline</h3>
        <p>A chart showing risk scores over time. You can see patterns: Is risk going up? Did something change? This helps you spot trends before they become problems.</p>

        <h3>Alerts Page</h3>
        <p>When an integration's risk score gets high enough, an alert is created. You can:</p>
        <ul>
          <li><strong>Acknowledge</strong> — "I've seen this, I'm looking into it"</li>
          <li><strong>Resolve</strong> — "This is handled"</li>
          <li><strong>Review</strong> — Make a decision: allow, monitor, rate limit, alert, or block</li>
        </ul>

        <Note>The system recommends a decision, but <strong>you always make the final call</strong>. This is the "admin-in-the-loop" approach.</Note>

        <h3>Integrations Page</h3>
        <p>See all your integrations with their status, trust level, and last seen time. Click any integration to see detailed stats, permissions, and recent alerts.</p>
      </>
    ),
  },

  'production': {
    title: 'Going to Production',
    icon: <Rocket size={20} />,
    content: (
      <>
        <p className="d-lead">When you're ready to deploy G-Watch for real use, here's what you need to do.</p>

        <h3>Environment Variables</h3>
        <p>Set these in your production environment:</p>
        <Code label=".env">{`# Database
DATABASE_URL=postgresql://user:password@host:5432/gwatch_security

# Security — REQUIRED, server won't start without it
JWT_SECRET=generate-a-strong-random-string-here

# Server
PORT=3000
NODE_ENV=production

# CORS — set to your frontend domain
CORS_ORIGIN=https://dashboard.yourdomain.com`}</Code>

        <Warn>To generate a strong JWT_SECRET, run: <code>node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"</code></Warn>

        <h3>Build the Frontend</h3>
        <Code label="Terminal">{`cd frontend-dashboard
npm run build

# This creates a dist/ folder with optimized files`}</Code>

        <h3>Start the Backend</h3>
        <Code label="Terminal">{`cd backend-server
npm start

# Or use pm2 for process management:
# pm2 start src/server.js --name gwatch-api`}</Code>

        <h3>Nginx Config</h3>
        <p>Use nginx to serve the frontend and proxy API requests:</p>
        <Code label="nginx.conf">{`server {
    listen 443 ssl;
    server_name dashboard.yourdomain.com;

    # SSL certs
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Serve frontend
    location / {
        root /path/to/gateway/frontend-dashboard/dist;
        try_files $uri /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:3000;
    }

    # Proxy gateway requests
    location /gateway {
        proxy_pass http://localhost:3000;
    }

    # Transparent proxy (catch-all)
    location / {
        proxy_pass http://localhost:3000;
    }

    # Socket.IO (for real-time updates)
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}`}</Code>

        <h3>Security Checklist</h3>
        <div className="d-checklist">
          {[
            'Set a strong JWT_SECRET',
            'Use HTTPS in production',
            'Set NODE_ENV=production',
            'Restrict CORS_ORIGIN to your domain',
            'Use a strong database password',
            'Run as a non-root user',
            'Enable PostgreSQL authentication',
            'Set up database backups',
          ].map((item, i) => (
            <label key={i} className="d-checklist-item">
              <input type="checkbox" />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </>
    ),
  },
};

const sections = [
  {
    title: 'Getting Started',
    items: [
      { id: 'introduction', title: 'Introduction', icon: <BookOpen size={14} /> },
      { id: 'quick-start', title: 'Quick Start', icon: <Rocket size={14} /> },
    ],
  },
  {
    title: 'How It Works',
    items: [
      { id: 'traffic-flow', title: 'What Happens When...', icon: <Zap size={14} /> },
      { id: 'your-first-integration', title: 'Your First Integration', icon: <Shield size={14} /> },
      { id: 'permissions', title: 'Setting Up Permissions', icon: <Shield size={14} /> },
      { id: 'understanding-the-dashboard', title: 'Understanding the Dashboard', icon: <AlertTriangle size={14} /> },
    ],
  },
  {
    title: 'Deploy',
    items: [
      { id: 'production', title: 'Going to Production', icon: <Rocket size={14} /> },
    ],
  },
];

export default function Docs() {
  const [active, setActive] = useState('introduction');
  const current = pages[active];

  return (
    <div className="docs-page">
      <nav className="docs-nav">
        <Link to="/" className="docs-nav-back"><ArrowLeft size={14} /> Home</Link>
        <div className="docs-nav-logo">
          <BookOpen size={16} />
          <span>Documentation</span>
        </div>
        <div className="docs-nav-links">
          <Link to="/guides">Guides</Link>
          <Link to="/tutorials">Tutorials</Link>
          <Link to="/login" className="btn-outline-sm">Sign In</Link>
          <Link to="/login" className="btn-primary-sm">Get Started</Link>
        </div>
      </nav>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          {sections.map((sec) => (
            <div key={sec.title} className="docs-sidebar-section">
              <div className="docs-sidebar-title">{sec.title}</div>
              {sec.items.map((item) => (
                <button
                  key={item.id}
                  className={`docs-sidebar-item ${active === item.id ? 'active' : ''}`}
                  onClick={() => setActive(item.id)}
                >
                  {item.icon}
                  <span>{item.title}</span>
                  {active === item.id && <ChevronRight size={12} />}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <main className="docs-content">
          <div className="docs-content-header">
            {current.icon}
            <h1>{current.title}</h1>
          </div>
          <div className="docs-body">
            {current.content}
          </div>
        </main>
      </div>
    </div>
  );
}
