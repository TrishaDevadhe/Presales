'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import ResourceProfilesTab from './ResourceProfilesTab';
import AdminTab from './AdminTab';
import AuditLogTab from './AuditLogTab';

export default function SettingsTab() {
  const { userRole } = useApp();
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users' | 'admin' | 'audit'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Settings Sub-Tab Navigation Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div className="tab-group">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`tab-item ${activeSubTab === 'users' ? 'active' : ''}`}
          >
            👥 User Management
          </button>
          <button
            onClick={() => setActiveSubTab('admin')}
            className={`tab-item ${activeSubTab === 'admin' ? 'active' : ''}`}
          >
            ⚙️ Admin Console {userRole !== 'Admin' && '🔒'}
          </button>
          {userRole === 'Admin' && (
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`tab-item ${activeSubTab === 'audit' ? 'active' : ''}`}
            >
              🛡️ Audit Log
            </button>
          )}
        </div>
      </div>

      {/* Render Active Sub-Tab View */}
      {activeSubTab === 'users' && <ResourceProfilesTab />}

      {activeSubTab === 'admin' && (
        userRole === 'Admin' ? (
          <AdminTab />
        ) : (
          <div className="paper-panel" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '45vh',
            gap: '1rem',
            padding: '3rem'
          }}>
            <div style={{ fontSize: '3rem' }}>🔒</div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.4rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}>
              Access Restricted
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', textAlign: 'center', fontSize: '0.92rem', lineHeight: 1.5 }}>
              Admin Console configuration options are restricted to Administrator accounts.
            </p>
          </div>
        )
      )}

      {activeSubTab === 'audit' && <AuditLogTab />}

    </div>
  );
}
