'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import LoaderSpinner from '@/components/LoaderSpinner';
import LoginPage from '@/components/LoginPage';
import { Sun, Moon, LogOut, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

// Import Tabs
import DashboardTab from '@/components/tabs/DashboardTab';
import OpportunitiesTab from '@/components/tabs/OpportunitiesTab';
import WorkItemsTab from '@/components/tabs/WorkItemsTab';
import EffortLogsTab from '@/components/tabs/EffortLogsTab';
import VersionsTab from '@/components/tabs/VersionsTab';
import AuditLogTab from '@/components/tabs/AuditLogTab';
import SettingsTab from '@/components/tabs/SettingsTab';
import EditProfileModal from '@/components/EditProfileModal';
import NotificationCenter from '@/components/NotificationCenter';

export default function Home() {
  const { currentUser, userRole, isLoggedIn, logout, handleUserChange, loading, allUsers, resourceProfiles, globalSearchQuery, setGlobalSearchQuery } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('glass-light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [globalOpportunities, setGlobalOpportunities] = useState([]);
  const [targetOppFromNotification, setTargetOppFromNotification] = useState(null);

  const fetchGlobalOpportunities = async () => {
    try {
      const res = await fetch('/api/opportunities');
      const data = await res.json();
      if (Array.isArray(data)) {
        setGlobalOpportunities(data);
      }
    } catch (err) {
      console.error('Error fetching opportunities for notifications:', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchGlobalOpportunities();
    }
  }, [isLoggedIn]);

  const handleNavigateToOpp = (opp) => {
    setActiveTab('opportunities');
    if (opp) {
      setTargetOppFromNotification(opp);
    }
  };

  const activeProfile = (resourceProfiles || []).find(
    (p) => p.username && p.username.toLowerCase() === (currentUser || '').toLowerCase()
  );
  const userDisplayName = activeProfile?.name || (currentUser ? formatUserName(currentUser) : 'User');

  // Inactivity session timeout: 30 minutes warning, 60 seconds countdown
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
        if (inactiveTime >= 30 * 60 * 1000) { // 30 minutes
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        return <DashboardTab onNavigateToOpp={handleNavigateToOpp} />;
      case 'opportunities':
        return (
          <OpportunitiesTab
            targetOppFromNotification={targetOppFromNotification}
            onClearTargetOpp={() => setTargetOppFromNotification(null)}
            onOpportunitiesUpdated={fetchGlobalOpportunities}
          />
        );
      case 'workitems':
        return <WorkItemsTab />;
      case 'efforts':
        return <EffortLogsTab />;
      case 'versions':
        return <VersionsTab />;
      case 'auditlog':
      case 'auditlogs':
        return <AuditLogTab />;
      case 'settings':
      case 'profiles':
      case 'admin':
        if (userRole !== 'Admin') {
          return (
            <div className="paper-panel" style={{ textAlign: 'center', padding: '4rem 2rem', marginTop: '2rem' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔒</div>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 700 }}>
                Access Restricted (Admin Only)
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
                The Settings section is restricted exclusively to Admin role accounts. Non-admin users cannot access or modify system options.
              </p>
              <button className="btn btn-pill-cobalt" onClick={() => setActiveTab('dashboard')}>
                Return to Dashboard
              </button>
            </div>
          );
        }
        return <SettingsTab />;
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
            className="top-theme-toggle-switch"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            <span className={`toggle-icon-wrap ${theme === 'dark' ? 'active-dark' : 'active-light'}`}>
              {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            </span>
          </button>
        </div>
        <LoginPage />
      </>
    );
  }

  const showSearchBar = activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'profiles' && activeTab !== 'admin';

  return (
    <div className="app-container">

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>

        {/* Logo Brand Panel */}
        <div className="sidebar-brand-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0.25rem' : '0.85rem', flexShrink: 0 }}>
            <div className="brand-logo-icon">N</div>
            {!isSidebarCollapsed && (
              <div className="brand-details">
                <span className="brand-title" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>NetSales</span>
                <span className="brand-subtitle">NetSales</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="sidebar-toggle-btn"
            title={isSidebarCollapsed ? undefined : "Collapse Sidebar"}
            data-tooltip={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Menu */}
        <ul className="nav-menu">
          <li>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-item-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              title={isSidebarCollapsed ? undefined : "Dashboard"}
              data-tooltip="Dashboard"
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span className="nav-item-icon">📐</span>
              {!isSidebarCollapsed && <span className="nav-item-text">Dashboard</span>}
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`nav-item-link ${activeTab === 'opportunities' ? 'active' : ''}`}
              title={isSidebarCollapsed ? undefined : "Opportunities"}
              data-tooltip="Opportunities"
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span className="nav-item-icon">💼</span>
              {!isSidebarCollapsed && <span className="nav-item-text">Opportunities</span>}
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('workitems')}
              className={`nav-item-link ${activeTab === 'workitems' ? 'active' : ''}`}
              title={isSidebarCollapsed ? undefined : "Work Items"}
              data-tooltip="Work Items"
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span className="nav-item-icon">⚡</span>
              {!isSidebarCollapsed && <span className="nav-item-text">Work Items</span>}
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('efforts')}
              className={`nav-item-link ${activeTab === 'efforts' ? 'active' : ''}`}
              title={isSidebarCollapsed ? undefined : "Effort Logging"}
              data-tooltip="Effort Logging"
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span className="nav-item-icon">⏱️</span>
              {!isSidebarCollapsed && <span className="nav-item-text">Effort Logging</span>}
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('versions')}
              className={`nav-item-link ${activeTab === 'versions' ? 'active' : ''}`}
              title={isSidebarCollapsed ? undefined : "Revision"}
              data-tooltip="Revision"
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span className="nav-item-icon">🔄</span>
              {!isSidebarCollapsed && <span className="nav-item-text">Revision</span>}
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('auditlog')}
              className={`nav-item-link ${activeTab === 'auditlog' || activeTab === 'auditlogs' ? 'active' : ''}`}
              title={isSidebarCollapsed ? undefined : "Audit Logs"}
              data-tooltip="Audit Logs"
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span className="nav-item-icon">📋</span>
              {!isSidebarCollapsed && <span className="nav-item-text">Audit Logs</span>}
            </button>
          </li>
          {userRole === 'Admin' && (
            <li>
              <button
                onClick={() => setActiveTab('settings')}
                className={`nav-item-link ${activeTab === 'settings' || activeTab === 'profiles' || activeTab === 'admin' ? 'active' : ''}`}
                title={isSidebarCollapsed ? undefined : "Settings"}
                data-tooltip="Settings"
                style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
              >
                <span className="nav-item-icon">⚙️</span>
                {!isSidebarCollapsed && <span className="nav-item-text">Settings</span>}
              </button>
            </li>
          )}
        </ul>

        {/* User Footer */}
        <div className="sidebar-footer">
          {/* Minimalistic Active User Profile Section */}
          <div
            className="minimal-user-card"
            onClick={() => setIsEditProfileOpen(true)}
            style={{ cursor: 'pointer' }}
            data-tooltip={`Profile: ${userDisplayName}`}
            title={isSidebarCollapsed ? undefined : `Click to Edit Profile - Logged in as ${userDisplayName}`}
          >
            <div className="user-avatar-badge">
              <span>{userDisplayName ? userDisplayName.charAt(0).toUpperCase() : 'U'}</span>
              <span className={`status-dot ${userRole === 'Admin' ? 'admin' : 'user'}`} />
            </div>
            {!isSidebarCollapsed && (
              <div className="user-details">
                <div className="user-name">{userDisplayName}</div>
                <div className="user-role">{userRole}</div>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                logout();
              }}
              className="btn-logout-minimal"
              data-tooltip="Sign Out"
              title={isSidebarCollapsed ? undefined : "Sign Out Session"}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

        {/* Universal Top Header Bar (Search Bar & Top-Right Theme Toggle) */}
        <div className="global-top-header">
          <div className="top-header-left">
            {showSearchBar ? (
              <div className="global-search-container">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="global-search-input"
                  placeholder="Search across opportunities, tasks, logs..."
                  value={globalSearchQuery || ''}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                />
                {globalSearchQuery && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setGlobalSearchQuery('')}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : <div style={{ flex: 1 }} />}
          </div>

          <div className="top-header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Opportunity Deadline Notifications for directly related user */}
            <NotificationCenter
              opportunities={globalOpportunities}
              currentUser={currentUser}
              userRole={userRole}
              onNavigateToOpp={handleNavigateToOpp}
            />

            {/* Redesigned Dark/Light Mode Switch (No text label, just Sun/Moon toggle) */}
            <button
              onClick={toggleTheme}
              className="top-theme-toggle-switch"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              <div className={`switch-track ${theme === 'dark' ? 'dark-active' : 'light-active'}`}>
                <div className="switch-thumb">
                  {theme === 'dark' ? <Moon size={13} className="icon-moon" /> : <Sun size={13} className="icon-sun" />}
                </div>
              </div>
            </button>
          </div>
        </div>

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

      {/* Edit Profile Modal for Avatar Click */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

    </div>
  );
}
