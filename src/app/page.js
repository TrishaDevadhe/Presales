'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import LoaderSpinner from '@/components/LoaderSpinner';
import LoginPage from '@/components/LoginPage';
import { Sun, Moon, LogOut } from 'lucide-react';

// Import Tabs
import DashboardTab from '@/components/tabs/DashboardTab';
import OpportunitiesTab from '@/components/tabs/OpportunitiesTab';
import WorkItemsTab from '@/components/tabs/WorkItemsTab';
import EffortLogsTab from '@/components/tabs/EffortLogsTab';
import VersionsTab from '@/components/tabs/VersionsTab';
import FeedbackTab from '@/components/tabs/FeedbackTab';
import ResourceProfilesTab from '@/components/tabs/ResourceProfilesTab';
import AdminTab from '@/components/tabs/AdminTab';

export default function Home() {
  const { currentUser, userRole, isLoggedIn, logout, handleUserChange, loading, allUsers } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('glass-light');

  // Inactivity session timeout: 5 minutes warning, 60 seconds countdown
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef(null);

  // Monitor user activity events
  useEffect(() => {
    if (!isLoggedIn) {
      setShowTimeoutWarning(false);
      return;
    }

    const updateActivity = () => {
      // Only update activity if warning is not active
      if (!showTimeoutWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    // Check inactivity every 2 seconds
    const intervalId = setInterval(() => {
      if (!showTimeoutWarning) {
        const inactiveTime = Date.now() - lastActivityRef.current;
        if (inactiveTime >= 5 * 60 * 1000) { // 5 minutes
          setShowTimeoutWarning(true);
          setTimeLeft(60);
        }
      }
    }, 2000);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(intervalId);
    };
  }, [isLoggedIn, showTimeoutWarning]);

  // Warning Countdown timer
  useEffect(() => {
    if (showTimeoutWarning) {
      warningTimerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(warningTimerRef.current);
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
      }
    }

    return () => {
      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
      }
    };
  }, [showTimeoutWarning]);

  const handleExtendSession = () => {
    setShowTimeoutWarning(false);
    lastActivityRef.current = Date.now();
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'glass-light' ? 'dark' : 'glass-light'));
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'opportunities':
        return <OpportunitiesTab />;
      case 'workitems':
        return <WorkItemsTab />;
      case 'efforts':
        return <EffortLogsTab />;
      case 'versions':
        return <VersionsTab />;
      case 'feedback':
        return <FeedbackTab />;
      case 'profiles':
        return <ResourceProfilesTab />;
      case 'admin':
        if (userRole !== 'Admin') {
          return (
            <div className="paper-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem', padding: '3rem' }}>
              <div style={{ fontSize: '3rem' }}>🔒</div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontFamily: 'var(--font-title)' }}>Access Restricted</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', textAlign: 'center', fontSize: '0.95rem' }}>
                You are currently impersonating <strong>&quot;{userRole}&quot;</strong>. Switch to the <strong>Admin</strong> identity to access configuration console modules.
              </p>
              <button className="btn btn-pill-cobalt" onClick={() => handleUserChange('admin')}>
                ⚡ Switch to Admin Role
              </button>
            </div>
          );
        }
        return <AdminTab />;
      default:
        return <DashboardTab />;
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        gap: '1.25rem'
      }}>
        <LoaderSpinner size={56} color="var(--accent-primary)" />
        <div style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
          NetSales INITIALIZING...
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 100 }}>
          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-pill)',
              padding: '0.5rem 1rem',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {theme === 'glass-light' ? '🌙 Obsidian Dark' : '💎 Glass Tech'}
          </button>
        </div>
        <LoginPage />
      </>
    );
  }

  return (
    <div className="app-container">

      {/* Sidebar Navigation */}
      <aside className="sidebar">

        {/* Logo Brand Panel */}
        <div style={{
          padding: '1.75rem 1.5rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #06B6D4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '900',
            color: '#fff',
            fontSize: '1.3rem',
            fontFamily: 'var(--font-title)',
            boxShadow: '0 8px 16px rgba(30, 58, 138, 0.3), inset 0 1px 1px rgba(255,255,255,0.6)'
          }}>
            N
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 800, fontFamily: 'var(--font-title)', letterSpacing: '-0.02em' }}>NetSales</h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>NetSales</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <ul className="nav-menu">
          <li>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-item-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span>📐</span> Dashboard Stage
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`nav-item-link ${activeTab === 'opportunities' ? 'active' : ''}`}
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span>💼</span> Opportunities
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('workitems')}
              className={`nav-item-link ${activeTab === 'workitems' ? 'active' : ''}`}
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span>⚡</span> Work Items
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('efforts')}
              className={`nav-item-link ${activeTab === 'efforts' ? 'active' : ''}`}
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span>⏱️</span> Effort Logging
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('versions')}
              className={`nav-item-link ${activeTab === 'versions' ? 'active' : ''}`}
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span>🔄</span> Revision Logs
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`nav-item-link ${activeTab === 'feedback' ? 'active' : ''}`}
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span>💬</span> Client Feedback
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`nav-item-link ${activeTab === 'profiles' ? 'active' : ''}`}
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span>👥</span> Resource Profiles
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('admin')}
              className={`nav-item-link ${activeTab === 'admin' ? 'active' : ''}`}
              style={{
                width: '100%',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                opacity: userRole !== 'Admin' ? 0.65 : 1
              }}
            >
              <span>⚙️</span> Admin Console {userRole !== 'Admin' && '🔒'}
            </button>
          </li>
        </ul>

        {/* Theme Switcher & User Footer */}
        <div className="sidebar-footer">
          {/* Minimalistic Theme Switch Toggle */}
          <div className="minimal-theme-toggle" onClick={toggleTheme} title="Switch Theme">
            <div className="toggle-info">
              {theme === 'dark' ? <Moon size={15} className="toggle-icon" /> : <Sun size={15} className="toggle-icon" />}
              <span className="toggle-text">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <div className={`minimal-switch-track ${theme === 'dark' ? 'checked' : ''}`}>
              <div className="minimal-switch-thumb" />
            </div>
          </div>

          {/* Minimalistic Active User Profile Section */}
          <div className="minimal-user-card">
            <div className="user-avatar-badge">
              <span>{currentUser ? currentUser.charAt(0).toUpperCase() : 'U'}</span>
              <span className={`status-dot ${userRole === 'Admin' ? 'admin' : 'user'}`} />
            </div>
            <div className="user-details">
              <div className="user-name">@{currentUser}</div>
              <div className="user-role">{userRole}</div>
            </div>
            <button
              onClick={logout}
              className="btn-logout-minimal"
              title="Sign Out Session"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Workspace */}
      <main className="main-content">

        {/* Header navigation bar */}
        <header className="app-header">
          <div className="header-title-section">
            <h2 className="header-title">
              {activeTab === 'dashboard' && 'NetSales Solution Stage'}
              {activeTab === 'opportunities' && 'Opportunities Pipeline'}
              {activeTab === 'workitems' && 'Work Items & Task Boards'}
              {activeTab === 'efforts' && 'Workload Effort Logging'}
              {activeTab === 'versions' && 'Proposal Revision Logs'}
              {activeTab === 'feedback' && 'Client Feedback Loop'}
              {activeTab === 'profiles' && 'Team Resource Profiles'}
              {activeTab === 'admin' && 'Configuration Console'}
            </h2>
            <p className="header-subtitle">
              {activeTab === 'dashboard' && 'Modular AI prototype engine, isometric workload capacities, and revision alarms.'}
              {activeTab === 'opportunities' && 'Track deals, assign presales support, and auto-initialize workflows.'}
              {activeTab === 'workitems' && 'Assign scope items, set estimates, and resolve roadblocks.'}
              {activeTab === 'efforts' && 'Submit hours against tasks and analyze project burn rate variance.'}
              {activeTab === 'versions' && 'Manage drafts, pricing structures, and track delta scopes.'}
              {activeTab === 'feedback' && 'Record client requests and automatically trigger action-plan tasks.'}
              {activeTab === 'profiles' && 'Map team seniority, focus areas, weekly capacities, and core skills.'}
              {activeTab === 'admin' && 'Modify picklist choices, predefined task lists, and warning thresholds.'}
            </p>
          </div>
        </header>

        {/* Active view component */}
        {renderActiveTab()}

      </main>

      {/* Inactivity Warning Modal */}
      {showTimeoutWarning && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeInOverlay 0.25s ease'
        }}>
          <div className="paper-panel" style={{
            maxWidth: '420px',
            width: '100%',
            padding: '2.25rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg), 0 20px 40px rgba(0,0,0,0.3)',
            border: '1.5px solid rgba(239, 68, 68, 0.25)',
            animation: 'scaleUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>⏳</div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}>
              Session Inactivity Warning
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              You have been inactive for 5 minutes. You will be automatically logged out in:
            </p>

            {/* Countdown Badge */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '3px solid var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'var(--color-danger-text)',
              margin: '0 auto 1.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.15)'
            }}>
              {timeLeft}s
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={logout}
                className="btn btn-secondary"
                style={{ flex: 1, borderRadius: 'var(--radius-pill)', justifyContent: 'center' }}
              >
                Sign Out
              </button>
              <button
                onClick={handleExtendSession}
                className="btn btn-pill-cobalt"
                style={{ flex: 1.3, borderRadius: 'var(--radius-pill)', justifyContent: 'center' }}
              >
                Stay Connected
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
