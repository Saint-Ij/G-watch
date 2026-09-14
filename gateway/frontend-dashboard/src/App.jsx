import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store.jsx';
import Layout from './components/Layout.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Docs from './pages/Docs.jsx';
import Guides from './pages/Guides.jsx';
import Tutorials from './pages/Tutorials.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Integrations from './pages/Integrations.jsx';
import IntegrationDetail from './pages/IntegrationDetail.jsx';
import Alerts from './pages/Alerts.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import Resources from './pages/Resources.jsx';
import EventLog from './pages/EventLog.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/guides" element={<Guides />} />
      <Route path="/tutorials" element={<Tutorials />} />

      {/* Auth routes */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />

      {/* Protected dashboard routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/integrations/:id" element={<IntegrationDetail />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/events" element={<EventLog />} />
        <Route path="/audit" element={<AuditLogs />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
