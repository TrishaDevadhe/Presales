'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import LoaderSpinner from '@/components/LoaderSpinner';

export default function LoginPage() {
  const { usersList, resourceProfiles, handleUserChange, login } = useApp();
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState('');

  // Combine and deduplicate users from mock list and database profiles
  const getCombinedUsers = () => {
    const mockUsers = usersList.map(u => ({ username: u.username, role: u.role }));
    const profileUsers = resourceProfiles.map(p => ({ username: p.username, role: p.role_name || 'Team Member' }));
    
    const allUsers = [...mockUsers];
    profileUsers.forEach(pu => {
      if (!allUsers.some(u => u.username === pu.username)) {
        allUsers.push(pu);
      }
    });
    return allUsers;
  };

  const allUsers = getCombinedUsers();

  // Set default selected user
  useEffect(() => {
    if (allUsers.length > 0 && !selectedUser) {
      setSelectedUser(allUsers[0].username);
    }
  }, [resourceProfiles]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please select a user identity to proceed.');
      return;
    }
    
    setIsAuthenticating(true);
    setError('');

    // Simulate network authentication delay
    setTimeout(() => {
      const userProfile = resourceProfiles.find(
        (p) => p.username.toLowerCase().trim() === selectedUser.toLowerCase().trim()
      );

      const expectedPassword = userProfile ? userProfile.password : '';

      if (!expectedPassword) {
        setError('Security Error: Password not configured for this user.');
        setIsAuthenticating(false);
        return;
      }

      if (password !== expectedPassword) {
        setError('Authentication Failed: Invalid password passcode.');
        setIsAuthenticating(false);
        return;
      }

      handleUserChange(selectedUser);
      login(selectedUser);
      setIsAuthenticating(false);
    }, 1200);
  };

  // RBAC properties schema definition for UI display
  const rbacMatrix = [
    { role: 'Admin', scope: 'Full System Control', badgeColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', access: 'All Tab Modules, Picklists, Settings & Impersonation' },
    { role: 'Sales Owner', scope: 'Deals & Pipeline', badgeColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', access: 'Opportunities, Pipeline management & Client Requests' },
    { role: 'Presales Owner', scope: 'Scoping & Capacity', badgeColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', access: 'Work Items, Proposal Revisions & Resource Allocation' },
    { role: 'Team Member', scope: 'Delivery & Hours', badgeColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', access: 'Work Item Boards, Effort Logs & Client Feedback' }
  ];

  return (
    <div className="login-container">
      {/* Background Refraction Effects */}
      <div className="login-refraction-blob-1"></div>
      <div className="login-refraction-blob-2"></div>

      <div className="login-card-container" style={{ maxWidth: '480px' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #06B6D4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '900',
            color: '#fff',
            fontSize: '1.8rem',
            fontFamily: 'var(--font-title)',
            boxShadow: '0 10px 20px rgba(30, 58, 138, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
            margin: '0 auto 0.75rem'
          }}>
            N
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', fontFamily: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            NetSales Enterprise
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Unified Role-Based Access Control Gateway
          </p>
        </div>

        {/* Unified Credentials Form */}
        <div className="paper-panel login-form-panel" style={{ padding: '2.25rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '1.25rem' }}>🔐</span>
            <div>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Authenticate Session</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Select your employee identity to proceed</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* User Selector Dropdown */}
            <div className="form-group">
              <label className="form-label" htmlFor="user-select">User Identity</label>
              <select
                id="user-select"
                className="form-control form-select"
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  setError('');
                }}
                disabled={isAuthenticating}
                style={{ fontWeight: 600 }}
              >
                {allUsers.length === 0 ? (
                  <option value="">Loading users...</option>
                ) : (
                  allUsers.map((u) => (
                    <option key={u.username} value={u.username}>
                      @{u.username}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Passcode Entry */}
            <div className="form-group">
              <label className="form-label" htmlFor="password-input">Password Passcode</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAuthenticating}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block', lineHeight: 1.3 }}>
                Auth is simulated. You may leave it blank or enter anything.
              </span>
            </div>

            {error && (
              <div className="alert-banner alert-banner-danger" style={{ padding: '0.65rem 1rem', fontSize: '0.78rem' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Authenticate Submit Button */}
            <button
              type="submit"
              className="btn btn-pill-cobalt btn-lg"
              style={{ width: '100%', marginTop: '0.25rem' }}
              disabled={isAuthenticating || !selectedUser}
            >
              {isAuthenticating ? (
                <>
                  <LoaderSpinner size={18} color="#ffffff" />
                  <span>Authorizing Session...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <span>⚡</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
