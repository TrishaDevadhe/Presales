'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function ResourceProfilesTab() {
  const { getOptions, refreshProfiles } = useApp();
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
      const res = await fetch('/api/resourceprofiles');
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
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>Team Resource Profiles</h2>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Register Resource
        </button>
      </div>

      {/* Profiles list */}
      <div className="paper-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading profiles...</p>
        ) : profiles.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No resource profiles registered.</p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
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
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.98rem' }}>@{prof.username}</strong>
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {prof.role_name}
                      </span>
                    </td>
                    <td>{prof.seniority_name}</td>
                    <td>{prof.department_name}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prof.weekly_capacity_hours} hrs</td>
                    <td>{prof.standard_focus_area || 'Core Presales'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', maxWidth: '300px' }}>
                        {prof.skills ? prof.skills.split(',').map((skill, idx) => (
                          <span key={idx} className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
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
        <div className="modal-overlay">
          <div className="modal-content paper-panel" style={{ maxWidth: '650px' }}>
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

              <div className="form-grid">
                
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

                <div className="form-group">
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

                <div className="form-group">
                  <label className="form-label">Weekly Capacity (Hours) <span className="required">*</span></label>
                  <input
                    type="number"
                    name="weekly_capacity_hours"
                    className="form-control"
                    min="1"
                    max="168"
                    value={formData.weekly_capacity_hours}
                    onChange={handleInputChange}
                    required
                  />
                </div>

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

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Profile
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
