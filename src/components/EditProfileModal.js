'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function EditProfileModal({ isOpen, onClose }) {
  const { currentUser, userRole, resourceProfiles, setCurrentUser, refreshProfiles, showToast, showAlert, getOptions, formatUserName } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role_id: '',
    seniority_id: '',
    department_id: '',
    weekly_capacity_hours: 40,
    standard_focus_area: ''
  });

  const [saving, setSaving] = useState(false);
  const [originalUser, setOriginalUser] = useState('');

  useEffect(() => {
    if (isOpen && currentUser && resourceProfiles) {
      const prof = resourceProfiles.find(p => p.username.toLowerCase() === currentUser.toLowerCase()) || {};
      setOriginalUser(currentUser);
      const defaultName = prof.name || (currentUser === 'admin' ? 'Adhesh(admin)' : prof.username || currentUser);
      const defaultPwd = prof.password || (currentUser === 'admin' ? '-admin123' : '');
      setFormData({
        name: defaultName,
        username: prof.username || currentUser,
        password: defaultPwd,
        role_id: prof.role_id || (getOptions('role')[0]?.id || ''),
        seniority_id: prof.seniority_id || (getOptions('seniority')[0]?.id || ''),
        department_id: prof.department_id || (getOptions('department')[0]?.id || ''),
        weekly_capacity_hours: prof.weekly_capacity_hours ? parseFloat(prof.weekly_capacity_hours) : 40,
        standard_focus_area: prof.standard_focus_area || prof.standard_focus || '',
        is_active: prof.is_active !== false
      });
    }
  }, [isOpen, currentUser, resourceProfiles]);

  const [mySignInLogs, setMySignInLogs] = useState([]);
  const [loadingSignInLogs, setLoadingSignInLogs] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setLoadingSignInLogs(true);
      fetch(`/api/auditlogs?tab=access&user=${encodeURIComponent(currentUser)}&role=${encodeURIComponent(userRole)}&currentUser=${encodeURIComponent(currentUser)}`, {
        headers: {
          'x-user-role': userRole || 'Team Member',
          'x-real-user': currentUser || ''
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setMySignInLogs(data.slice(0, 10));
          }
        })
        .catch(err => console.error('Failed to load user sign-in logs:', err))
        .finally(() => setLoadingSignInLogs(false));
    }
  }, [isOpen, currentUser, userRole]);

  if (!isOpen) return null;

  const isAdmin = userRole === 'Admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      showAlert('User ID / Username is required', 'Validation Error', 'danger');
      return;
    }
    if (!formData.name.trim()) {
      showAlert('Name is required', 'Validation Error', 'danger');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        original_username: originalUser,
        username: formData.username.trim(),
        name: formData.name.trim(),
        password: formData.password.trim(),
        role_id: formData.role_id || null,
        seniority_id: formData.seniority_id || null,
        department_id: formData.department_id || null,
        weekly_capacity_hours: parseFloat(formData.weekly_capacity_hours) || 40,
        standard_focus_area: formData.standard_focus_area,
        is_active: formData.is_active
      };

      const res = await fetch('/api/resourceprofiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update profile');
      }

      const updated = await res.json();

      // If username was changed, update active current user state
      if (updated.username && updated.username.toLowerCase() !== originalUser.toLowerCase()) {
        setCurrentUser(updated.username);
      }

      await refreshProfiles();
      showToast('✓ Profile details updated successfully!', 'success');
      onClose();
    } catch (err) {
      showAlert(err.message, 'Error', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content paper-panel" style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={onClose}>×</button>

        {/* Modal Header */}
        <div className="form-section-header" style={{ marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary, #3b82f6), #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1.25rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              flexShrink: 0
            }}>
              {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
                My User Profile & Credentials
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Manage personal account identity, login passcode, and profile settings for <strong style={{ color: 'var(--text-primary)' }}>{formatUserName(currentUser)}</strong>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Form Section 1: User Credentials & Identity */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="form-section-title">
                <span>👤</span> Account Identity & Credentials
              </span>
            </div>

            <div className="form-grid-2">
              {/* Full / Display Name */}
              <div className="form-group">
                <label className="form-label">
                  Full / Display Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Trisha Devadhe"
                  required
                />
              </div>

              {/* User ID / Username */}
              <div className="form-group">
                <label className="form-label">
                  User ID / Handle <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. trisha"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="form-label">
                Account Passcode / Password
              </label>
              <input
                type="text"
                className="form-control"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter secret passcode"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', display: 'block' }}>
                Used to authenticate into NetSales system sessions.
              </span>
            </div>
          </div>

          {/* Form Section 2: Administrative / Role & Workload Controls */}
          <div className="form-section">
            <div className="form-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-section-title">
                <span>⚡</span> Organization & Workload Controls
              </span>
              {!isAdmin && (
                <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.12)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', fontSize: '0.72rem', fontWeight: 600 }}>
                  🔒 Managed by Admin
                </span>
              )}
            </div>

            <div className="form-grid-2">
              {/* Role */}
              <div className="form-group">
                <label className="form-label">
                  Role {!isAdmin && '(Admin Only)'}
                </label>
                <select
                  className="form-control form-select"
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  disabled={!isAdmin}
                >
                  {getOptions('role').map(o => (
                    <option key={o.id} value={o.id}>{o.option_name}</option>
                  ))}
                </select>
              </div>

              {/* Seniority Level */}
              <div className="form-group">
                <label className="form-label">
                  Seniority Level {!isAdmin && '(Admin Only)'}
                </label>
                <select
                  className="form-control form-select"
                  value={formData.seniority_id}
                  onChange={(e) => setFormData({ ...formData, seniority_id: e.target.value })}
                  disabled={!isAdmin}
                >
                  {getOptions('seniority').map(o => (
                    <option key={o.id} value={o.id}>{o.option_name}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div className="form-group">
                <label className="form-label">
                  Department {!isAdmin && '(Admin Only)'}
                </label>
                <select
                  className="form-control form-select"
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  disabled={!isAdmin}
                >
                  {getOptions('department').map(o => (
                    <option key={o.id} value={o.id}>{o.option_name}</option>
                  ))}
                </select>
              </div>

              {/* Weekly Capacity Hours */}
              <div className="form-group">
                <label className="form-label">
                  Weekly Capacity (Hours) {!isAdmin && '(Admin Only)'}
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.weekly_capacity_hours}
                  onChange={(e) => setFormData({ ...formData, weekly_capacity_hours: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
            </div>

            {/* Standard Focus Area / Skills */}
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="form-label">
                Standard Focus & Core Domain {!isAdmin && '(Admin Only)'}
              </label>
              <input
                type="text"
                className="form-control"
                value={formData.standard_focus_area}
                onChange={(e) => setFormData({ ...formData, standard_focus_area: e.target.value })}
                disabled={!isAdmin}
                placeholder="e.g. Core Presales Architect & Security Strategy"
              />
            </div>

            {/* Account Status / Active Toggle */}
            <div className="form-group" style={{ marginTop: '0.85rem' }}>
              <label className="form-label">
                User Status {!isAdmin && '(Admin Only)'}
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)'
              }}>
                <div>
                  <strong style={{ color: formData.is_active ? '#10b981' : 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {formData.is_active ? '🟢 Active Account' : '⚪ Inactive Account'}
                  </strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    {formData.is_active ? 'User account is active and can be assigned work.' : 'User account is inactive.'}
                  </div>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: isAdmin ? 'pointer' : 'not-allowed', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    disabled={!isAdmin}
                    style={{ width: '20px', height: '20px', cursor: isAdmin ? 'pointer' : 'not-allowed', accentColor: '#10b981' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: formData.is_active ? '#10b981' : 'var(--text-secondary)' }}>
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Section 3: My Sign-in Activity (Part G of Audit Spec) */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="form-section-title">
                <span>🛡️</span> My Sign-in Activity (Last 10 Events)
              </span>
            </div>

            {loadingSignInLogs ? (
              <div style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Loading sign-in history...</div>
            ) : mySignInLogs.length === 0 ? (
              <div style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>No sign-in activity recorded yet.</div>
            ) : (
              <div className="table-container" style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Event</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mySignInLogs.map(log => (
                      <tr key={log.id}>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${log.event_type === 'Login Failure' ? 'badge-danger' : log.event_type === 'Login Success' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                            {log.event_type}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{log.ip_address || '127.0.0.1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Actions Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
