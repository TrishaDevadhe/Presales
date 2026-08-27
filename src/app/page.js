'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

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
  const { currentUser, userRole, handleUserChange, loading, allUsers } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('warm-minimal'); // Default to Warm Minimal "The Ledger"

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'warm-minimal' ? 'dark' : 'warm-minimal'));
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
              <div style={{ fontSize: '3rem' }}>🔒</div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem' }}>Access Denied</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center' }}>
                You are currently impersonating the role <strong>&quot;{userRole}&quot;</strong>. Only users with the <strong>Admin</strong> role can access the Configuration panel.
              </p>
              <button className="btn btn-primary" onClick={() => handleUserChange('admin')}>
                Switch to Admin Role
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
        gap: '1rem'
      }}>
        <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>🌀</div>
        <div style={{ fontFamily: 'var(--font-title)', fontWeight: 600 }}>GravitySales System initializing...</div>
        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        
        {/* Logo Brand */}
        <div style={{
          padding: '1.75rem 1.5rem 1.25rem',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: '#fff',
            fontSize: '1.2rem',
            fontFamily: 'var(--font-title)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            G
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'var(--font-title)' }}>GravitySales</h1>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Presales Engine</span>
          </div>
        </div>

        {/* Navigation list */}
        <ul className="nav-menu">
          <li>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-item-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              style={{ width: '100%', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span>📊</span> Dashboard Home
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
              <span>⚡</span> Work Items (Tasks)
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
              <span>🔄</span> Proposal Revisions
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
                opacity: userRole !== 'Admin' ? 0.6 : 1
              }}
            >
              <span>⚙️</span> Admin Panel {userRole !== 'Admin' && '🔒'}
            </button>
          </li>
        </ul>

        {/* Theme Switcher & Identity Footer */}
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid var(--glass-border)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{
              fontSize: '0.8rem',
              width: '100%',
              justifyContent: 'space-between',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>THEME MODE</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {theme === 'warm-minimal' ? '📜 The Ledger' : '🌙 Obsidian Dark'}
            </span>
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Identity</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: userRole === 'Admin' ? 'var(--color-danger)' : 'var(--color-success)' }}></span>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>@{currentUser}</span>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                {userRole}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace content */}
      <main className="main-content">
        
        {/* Header navigation bar */}
        <header className="app-header">
          <div className="header-title-section">
            <h2 className="header-title">
              {activeTab === 'dashboard' && 'Dashboard Analytics'}
              {activeTab === 'opportunities' && 'Opportunities Pipeline'}
              {activeTab === 'workitems' && 'Work Items & Task Boards'}
              {activeTab === 'efforts' && 'Workload Effort Logging'}
              {activeTab === 'versions' && 'Proposal Revision Logs'}
              {activeTab === 'feedback' && 'Client Feedback Loop'}
              {activeTab === 'profiles' && 'Team Resource Profiles'}
              {activeTab === 'admin' && 'Configuration Console'}
            </h2>
            <p className="header-subtitle">
              {activeTab === 'dashboard' && 'Enterprise-wide summaries, workload capacities, and revision alarms.'}
              {activeTab === 'opportunities' && 'Track deals, assign presales support, and auto-initialize workflows.'}
              {activeTab === 'workitems' && 'Assign scope items, set estimates, and resolve roadblocks.'}
              {activeTab === 'efforts' && 'Submit hours against tasks and analyze project burn rate variance.'}
              {activeTab === 'versions' && 'Manage drafts, pricing structures, and track delta scopes.'}
              {activeTab === 'feedback' && 'Record client requests and automatically trigger action-plan tasks.'}
              {activeTab === 'profiles' && 'Map team seniority, focus areas, weekly capacities, and core skills.'}
              {activeTab === 'admin' && 'Modify picklist choices, predefined task lists, and warning thresholds.'}
            </p>
          </div>

          {/* User selector in header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Impersonate User:</span>
            <select
              className="form-control form-select"
              style={{
                padding: '0.45rem 1.8rem 0.45rem 0.75rem',
                fontSize: '0.85rem',
                width: '180px'
              }}
              value={currentUser}
              onChange={(e) => handleUserChange(e.target.value)}
            >
              {allUsers.map((username) => (
                <option key={username} value={username}>
                  @{username}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Active view component */}
        {renderActiveTab()}

      </main>

    </div>
  );
}
