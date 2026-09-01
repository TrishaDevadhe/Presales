'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function ResourceProfilesTab() {
  const { getOptions, getOptionBadgeStyle, refreshProfiles, showToast, showAlert } = useApp();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    role_id: '',
    seniority_id: '',
    skills: '',
    department_id: '',
    weekly_capacity_hours: 40,
    standard_focus_area: ''
  });

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/resourceprofiles?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setProfiles(data);
    } catch (e) {
      console.error('Error fetching resource profiles:', e);
      setError('Failed to load resource profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedProfile(null);
    setError(null);
    setFormData({
      username: '',
      role_id: getOptions('role')[0]?.id || '',
      seniority_id: getOptions('seniority')[0]?.id || '',
      skills: '',
      department_id: getOptions('department')[0]?.id || '',
      weekly_capacity_hours: 40,
      standard_focus_area: 'Core Presales Architect'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prof) => {
    setIsEditMode(true);
    setSelectedProfile(prof);
    setError(null);
    setFormData({
      username: prof.username,
      role_id: prof.role_id || '',
      seniority_id: prof.seniority_id || '',
      skills: prof.skills || '',
      department_id: prof.department_id || '',
      weekly_capacity_hours: parseFloat(prof.weekly_capacity_hours) || 40,
      standard_focus_area: prof.standard_focus_area || ''
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.username.trim() || !formData.role_id || !formData.weekly_capacity_hours) {
      setError('Username, Role, and Weekly Capacity are required.');
      return;
    }

    try {
      const url = '/api/resourceprofiles';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save resource profile');
      }

      setIsModalOpen(false);
      fetchProfiles();
      refreshProfiles();

      if (!isEditMode) {
        showAlert(
          'Resource Registered Successfully',
          `A secure passcode has been generated for @${formData.username.toLowerCase().trim()}:\n\nPasscode: ${data.password}\n\nPlease share this passcode with the employee.`,
          'info'
        );
      } else {
        showToast('Resource profile updated successfully!', 'success');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>Team Resource Profiles</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Manage team members, roles, skill matrices, weekly capacity limits, and system access passcodes.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Register Resource
        </button>
      </div>

      {/* Profiles list */}
      <div className="paper-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading profiles...</p>
        ) : profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</div>
            <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>No Resource Profiles Registered</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Click &quot;+ Register Resource&quot; above to add team members and assign capacity limits.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Passcode</th>
                  <th>Seniority</th>
                  <th>Department</th>
                  <th>Weekly Capacity</th>
                  <th>Primary Focus Area</th>
                  <th>Skills / Expertise</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((prof) => (
                  <tr key={prof.id}>
                    <td>
                      <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>@{prof.username}</strong>
                    </td>
                    <td>
                      <span className="badge" style={getOptionBadgeStyle('role', prof.role_name)}>
                        {prof.role_name}
                      </span>
                    </td>
                    <td>
                      <code style={{ 
                        background: 'rgba(37, 99, 235, 0.08)', 
                        color: 'var(--accent-secondary)', 
                        padding: '0.2rem 0.55rem', 
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.82rem',
                        fontWeight: 700
                      }}>
                        {prof.password || 'N/A'}
                      </code>
                    </td>
                    <td><span className="badge" style={getOptionBadgeStyle('seniority', prof.seniority_name)}>{prof.seniority_name}</span></td>
                    <td><span className="badge" style={getOptionBadgeStyle('department', prof.department_name)}>{prof.department_name}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{prof.weekly_capacity_hours} hrs</td>
                    <td style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{prof.standard_focus_area || 'Core Presales'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', maxWidth: '280px' }}>
                        {prof.skills ? prof.skills.split(',').map((skill, idx) => (
                          <span key={idx} className="badge badge-neutral" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>
                            {skill.trim()}
                          </span>
                        )) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => openEditModal(prof)}>
                        Edit Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT PROFILE OVERLAY MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content paper-panel" style={{ maxWidth: '1000px', width: '95%' }}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              {isEditMode ? `Edit Profile: @${formData.username}` : 'Register Team Member Profile'}
            </h3>

            {error && (
              <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-title">
                    <span>👥</span> User Identity & Workload Capacity
                  </span>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Username / Handle <span className="required">*</span></label>
                    <input
                      type="text"
                      name="username"
                      className="form-control"
                      placeholder="e.g. david_miller"
                      value={formData.username}
                      onChange={handleInputChange}
                      disabled={isEditMode}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Weekly Capacity (Hours) <span className="required">*</span></label>
                    <input
                      type="number"
                      name="weekly_capacity_hours"
                      className="form-control"
                      min="1"
                      max="168"
                      placeholder="e.g. 40"
                      value={formData.weekly_capacity_hours}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Role <span className="required">*</span></label>
                    <select
                      name="role_id"
                      className="form-control form-select"
                      value={formData.role_id}
                      onChange={handleInputChange}
                      required
                    >
                      {getOptions('role').map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Seniority</label>
                    <select
                      name="seniority_id"
                      className="form-control form-select"
                      value={formData.seniority_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Seniority</option>
                      {getOptions('seniority').map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group col-span-full">
                    <label className="form-label">Department</label>
                    <select
                      name="department_id"
                      className="form-control form-select"
                      value={formData.department_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Department</option>
                      {getOptions('department').map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-title">
                    <span>⚡</span> Domain Focus & Core Skill Matrix
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Standard Focus Area</label>
                  <input
                    type="text"
                    name="standard_focus_area"
                    className="form-control"
                    placeholder="e.g. AWS & Azure Architecture, Security RFP Solutions"
                    value={formData.standard_focus_area}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Skills & Technology Expertise (Comma-separated)</label>
                  <input
                    type="text"
                    name="skills"
                    className="form-control"
                    placeholder="e.g. AWS, React, Python, PostgreSQL, Security, RFPs"
                    value={formData.skills}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-pill-cobalt" style={{ padding: '0.65rem 1.75rem' }}>
                  ⚡ {isEditMode ? 'Save Profile' : 'Register Profile'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
