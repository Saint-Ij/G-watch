import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store.jsx';
import {
  LayoutDashboard,
  Plug,
  AlertTriangle,
  ScrollText,
  Database,
  LogOut,
  Shield,
  Activity,
  User,
  Radio,
} from 'lucide-react';
import './Layout.css';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/integrations', icon: Plug, label: 'Integrations' },
  { to: '/events', icon: Radio, label: 'Event Log' },
  { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { to: '/resources', icon: Database, label: 'Resources', roles: ['admin'] },
  { to: '/audit', icon: ScrollText, label: 'Audit Log' },
];

const roleLabels = { admin: 'Admin' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Shield size={20} />
          <span className="sidebar-brand-text">G-Watch</span>
          <span className="sidebar-brand-user">{user?.name}</span>
        </div>

        <nav className="sidebar-nav">
          {navItems
            .filter((item) => !item.roles || item.roles.includes(user?.role))
            .map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              <User size={16} />
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">{roleLabels[user?.role]}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <Activity size={14} className="topbar-status-icon" />
            <span className="topbar-status-text">System Operational</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-role">{roleLabels[user?.role]}</span>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
