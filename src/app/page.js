'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
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
              <h3 style={{ color: '#fff', fontSize: '1.5rem' }}>Access Denied</h3>
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
        backgroundColor: '#0a0d16',
        color: '#fff',
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
        
        {/* Logo Brand Brand */}
        <div style={{
          padding: '2rem 1.5rem 1.5rem',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: '#fff',
            fontSize: '1.2rem',
            fontFamily: 'var(--font-title)'
          }}>
            G
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, fontFamily: 'var(--font-title)' }}>GravitySales</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Presales Engine</span>
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

        {/* User Identity / Role display footer */}
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid var(--glass-border)',
          background: 'rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Identity</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: userRole === 'Admin' ? 'var(--color-danger)' : 'var(--color-success)' }}></span>
            <span style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 600 }}>@{currentUser}</span>
          </div>
          <span className="badge" style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--accent-secondary)',
            alignSelf: 'flex-start',
            fontSize: '0.72rem',
            border: '1px solid rgba(6, 182, 212, 0.2)'
          }}>
            {userRole}
          </span>
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

          {/* Simple mock auth dropdown selector in header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Impersonate User:</span>
            <select
              className="form-control form-select"
              style={{
                padding: '0.45rem 1.8rem 0.45rem 0.75rem',
                fontSize: '0.85rem',
                background: 'var(--bg-secondary)',
                borderColor: 'var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
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
