'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import LoaderSpinner from '@/components/LoaderSpinner';

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
  const [theme, setTheme] = useState('glass-light'); 

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
          ISOMETRIC TECH ENGINE INITIALIZING...
        </div>
      </div>
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
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>ISOMETRIC TECH</span>
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
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(226, 232, 240, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{
              fontSize: '0.8rem',
              width: '100%',
              justifyContent: 'space-between',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-pill)'
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>THEME PERSPECTIVE</span>
            <span style={{ fontWeight: 800, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {theme === 'glass-light' ? '💎 Glass Tech' : '🌙 Obsidian Dark'}
            </span>
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active User</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: userRole === 'Admin' ? 'var(--color-danger)' : 'var(--color-success)', boxShadow: '0 0 6px currentColor' }}></span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>@{currentUser}</span>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                {userRole}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Workspace */}
      <main className="main-content">
        
        {/* Header navigation bar */}
        <header className="app-header">
          <div className="header-title-section">
            <h2 className="header-title">
              {activeTab === 'dashboard' && 'Isometric Solution Stage'}
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

          {/* User Impersonation selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#0369A1', fontWeight: 700 }}>Active Role:</span>
            <select
              className="form-control form-select"
              style={{
                padding: '0.45rem 1.8rem 0.45rem 0.85rem',
                fontSize: '0.85rem',
                width: '180px',
                borderRadius: 'var(--radius-pill)',
                fontWeight: 600
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
