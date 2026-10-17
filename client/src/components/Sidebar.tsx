import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity, FileText, ClipboardList, Hospital, Settings,
  Cross, Zap
} from 'lucide-react';
import { HealthStatus } from '../services/api';

interface SidebarProps {
  health: HealthStatus | null;
}

const navItems = [
  { to: '/', icon: Activity, label: 'Dashboard' },
  { to: '/intake/new', icon: FileText, label: 'New Intake' },
  { to: '/intakes', icon: ClipboardList, label: 'All Intakes' },
  { to: '/hospital', icon: Hospital, label: 'Hospital Dashboard' },
  { to: '/settings', icon: Settings, label: 'Settings & Demo' },
];

export function Sidebar({ health }: SidebarProps) {
  const location = useLocation();

  return (
    <nav className="sidebar" aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-cross">
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, background: '#ef4444', borderRadius: 10,
            marginBottom: 10
          }}>
            <Cross size={20} color="#fff" strokeWidth={2.5} />
          </span>
        </div>
        <h1>TriageVoice AI</h1>
        <div className="logo-sub">Emergency Intake Prototype</div>
      </div>

      {/* Nav */}
      <div className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive || (to !== '/' && location.pathname.startsWith(to)) ? 'active' : ''}`
            }
            aria-label={label}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Footer status */}
      <div className="sidebar-footer">
        {health ? (
          <div className={`mode-badge ${health.demoMode ? 'demo' : 'live'}`}>
            <div className="mode-badge-dot" />
            {health.demoMode ? (
              <span>Demo Mode (Mock Fixtures)</span>
            ) : (
              <span>Live — {health.model}</span>
            )}
          </div>
        ) : (
          <div className="mode-badge demo">
            <div className="mode-badge-dot" />
            <span>Connecting…</span>
          </div>
        )}
        <div style={{
          marginTop: 12, fontSize: '0.6875rem', color: '#4a6fa5',
          lineHeight: 1.5, padding: '0 4px'
        }}>
          <Zap size={11} style={{ display: 'inline', marginRight: 4 }} />
          Prototype only. Not for clinical use.
        </div>
      </div>
    </nav>
  );
}
