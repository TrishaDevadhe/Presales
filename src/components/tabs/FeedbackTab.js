'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isUserAssociatedWithOpp } from '@/lib/userAssociation';
import RichTextEditor from '../RichTextEditor';

export default function FeedbackTab() {
  const { currentUser, userRole, allUsers, getOptions, dropdownOptions, getOptionBadgeStyle, formatUserName, showToast, showAlert, showConfirm } = useApp();
  const [feedbacks, setFeedbacks] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    opportunity_id: '',
    version_id: '',
    feedback_from_id: '',
    feedback_type_id: '',
    severity_id: '',
    feedback_text: '',
    action_required: false,
    owner: '',
    due_date: '',
    status_id: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [feedbacksRes, oppsRes, versionsRes] = await Promise.all([
        fetch('/api/feedbacks'),
        fetch('/api/opportunities'),
        fetch('/api/versions')
      ]);
      const feedbacksData = await feedbacksRes.json();
      const oppsData = await oppsRes.json();
      const versionsData = await versionsRes.json();

      setFeedbacks(feedbacksData);
      setOpportunities(oppsData);
      setVersions(versionsData);
    } catch (e) {
      console.error('Error fetching feedback data:', e);
      setError('Failed to load feedback logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setError(null);
    setFormData({
      opportunity_id: opportunities[0]?.id || '',
      version_id: '',
      feedback_from_id: getOptions('feedback_from')[0]?.id || '',
      feedback_type_id: getOptions('feedback_type')[0]?.id || '',
      severity_id: getOptions('severity')[1]?.id || '',
      feedback_text: '',
      action_required: false,
      owner: allUsers[1] || allUsers[0] || '',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status_id: getOptions('feedback_status').find(o => o.option_name === 'Open')?.id || ''
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

  const handleSwitchChange = (name, val) => {
    setFormData(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.opportunity_id || !formData.feedback_from_id || !formData.feedback_type_id || !formData.feedback_text.trim() || !formData.status_id) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.action_required) {
      if (!formData.owner || !formData.owner.trim()) {
        setError('Owner is required when Action Required is enabled.');
        return;
      }
      if (!formData.due_date) {
        setError('Due Date is required when Action Required is enabled.');
        return;
      }
    }

    try {
      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save feedback');
      }

      setIsModalOpen(false);
      fetchData();
      showToast('Client feedback logged successfully', 'success');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Feedback Log',
      message: 'Are you sure you want to delete this feedback log?',
      danger: true
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/feedbacks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete feedback');
      }
      showToast('Feedback log deleted successfully', 'success');
      fetchData();
    } catch (err) {
      showAlert(err.message, 'Error', 'danger');
    }
  };

  const handleResolve = async (fb) => {
    const resolvedOpt = getOptions('feedback_status').find(o => o.option_name === 'Resolved');
    if (!resolvedOpt) return;

    try {
      const res = await fetch(`/api/feedbacks/${fb.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status_id: resolvedOpt.id,
          action_required: fb.action_required,
          owner: fb.owner,
          due_date: fb.due_date ? fb.due_date.split('T')[0] : null
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resolve feedback');
      }
      showToast('Feedback marked as resolved', 'success');
      fetchData();
    } catch (err) {
      showAlert(err.message, 'Error', 'danger');
    }
  };

  const renderTaskStatus = (statusId) => {
    const opt = dropdownOptions.find(o => o.id === statusId);
    if (!opt) return null;
    return (
      <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
        Task: {opt.option_name}
      </span>
    );
  };

  const displayFeedbacks = userRole === 'Admin'
    ? feedbacks
    : feedbacks.filter(fb => {
        const ownerMatch = (fb.owner || '').toLowerCase().trim() === (currentUser || '').toLowerCase().trim();
        const opp = opportunities.find(o => String(o.id) === String(fb.opportunity_id));
        return ownerMatch || (opp && isUserAssociatedWithOpp(opp, currentUser));
      });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={openCreateModal} disabled={opportunities.length === 0}>
          {opportunities.length === 0 ? 'Register opportunity first' : '+ Register Feedback'}
        </button>
      </div>

      {/* Feedback list */}
      <div className="paper-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading feedbacks...</p>
        ) : displayFeedbacks.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No feedback records found for your associated opportunities.</p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Opportunity & Ver</th>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Feedback Detail</th>
                  <th>Owner</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayFeedbacks.map((fb) => (
                  <tr key={fb.id}>
                    <td>
                      <div><strong style={{ color: 'var(--text-primary)' }}>{fb.opportunity_name}</strong></div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {fb.company} {fb.version_number ? `(v${fb.version_number})` : ''}
                      </div>
                    </td>
                    <td><span className="badge" style={getOptionBadgeStyle('feedback_from', fb.feedback_from_name)}>{fb.feedback_from_name}</span></td>
                    <td><span className="badge" style={getOptionBadgeStyle('feedback_type', fb.feedback_type_name)}>{fb.feedback_type_name}</span></td>
                    <td>
                      <span className={`badge ${fb.severity_name === 'Critical' || fb.severity_name === 'High' ? 'badge-danger' : 'badge-neutral'}`}>
                        {fb.severity_name || 'Medium'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.9rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }} title={fb.feedback_text.replace(/<[^>]*>/g, '')}>
                      {fb.feedback_text.replace(/<[^>]*>/g, '')}
                    </td>
                    <td>
                      {fb.action_required ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-warning-text)' }}>
                            ⚠️ Owner: <strong>{formatUserName(fb.owner)}</strong>
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Due: {fb.due_date ? fb.due_date.split('T')[0] : 'N/A'}
                          </span>
                          {fb.linked_task_title && renderTaskStatus(fb.linked_task_status_id)}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={getOptionBadgeStyle('feedback_status', fb.status_name)}>
                        {fb.status_name}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        {fb.status_name !== 'Resolved' && (
                          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', color: 'var(--color-success-text)' }} onClick={() => handleResolve(fb)}>
                            Resolve
                          </button>
                        )}
                        <button className="btn btn-danger" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => handleDelete(fb.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE FEEDBACK OVERLAY MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content paper-panel" style={{ maxWidth: '1200px', width: '95%' }}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              Register Client Feedback & Revisions
            </h3>

            {error && (
              <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-title">
                    <span>💬</span> Feedback Context & Classification
                  </span>
                </div>
                <div className="form-grid-3">
                  
                  <div className="form-group">
                    <label className="form-label">Opportunity <span className="required">*</span></label>
                    <select
                      name="opportunity_id"
                      className="form-control form-select"
                      value={formData.opportunity_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Opportunity</option>
                      {opportunities.map(opp => (
                        <option key={opp.id} value={opp.id}>{opp.company} - {opp.opportunity_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Linked Proposal Version</label>
                    <select
                      name="version_id"
                      className="form-control form-select"
                      value={formData.version_id}
                      onChange={handleInputChange}
                    >
                      <option value="">None / General Feedback</option>
                      {versions.filter(v => v.opportunity_id === parseInt(formData.opportunity_id, 10)).map(ver => (
                        <option key={ver.id} value={ver.id}>v{ver.version_number} ({ver.version_type_name})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Feedback Source <span className="required">*</span></label>
                    <select
                      name="feedback_from_id"
                      className="form-control form-select"
                      value={formData.feedback_from_id}
                      onChange={handleInputChange}
                      required
                    >
                      {getOptions('feedback_from').map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Feedback Type <span className="required">*</span></label>
                    <select
                      name="feedback_type_id"
                      className="form-control form-select"
                      value={formData.feedback_type_id}
                      onChange={handleInputChange}
                      required
                    >
                      {getOptions('feedback_type').map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Severity</label>
                    <select
                      name="severity_id"
                      className="form-control form-select"
                      value={formData.severity_id}
                      onChange={handleInputChange}
                    >
                      {getOptions('severity').map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Feedback Status <span className="required">*</span></label>
                    <select
                      name="status_id"
                      className="form-control form-select"
                      value={formData.status_id}
                      onChange={handleInputChange}
                      required
                    >
                      {getOptions('feedback_status').map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

              {/* Action Required toggle panel */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-title">
                    <span>⚡</span> Action Plan & Task Creation
                  </span>
                </div>

                <div
                  className={`switch-container ${formData.action_required ? 'checked' : ''}`}
                  onClick={() => handleSwitchChange('action_required', !formData.action_required)}
                >
                  <div className="switch-track"><div className="switch-thumb"></div></div>
                  <span className="form-label" style={{ margin: 0 }}>Does this feedback require actions? (Auto-creates Task Work Item)</span>
                </div>

                {formData.action_required && (
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginTop: '0.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">Task Owner <span className="required">*</span></label>
                      <select
                        name="owner"
                        className="form-control form-select"
                        value={formData.owner}
                        onChange={handleInputChange}
                        required={formData.action_required}
                      >
                        <option value="">Select Owner</option>
                        {allUsers.map(u => (
                          <option key={u} value={u}>{formatUserName(u)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Action Due Date <span className="required">*</span></label>
                      <input
                        type="date"
                        name="due_date"
                        className="form-control"
                        value={formData.due_date}
                        onChange={handleInputChange}
                        required={formData.action_required}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-title">
                    <span>📝</span> Feedback Notes & Client Instructions
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Feedback Details / Notes <span className="required">*</span></label>
                  <RichTextEditor
                    value={formData.feedback_text}
                    onChange={(val) => handleSwitchChange('feedback_text', val)}
                    placeholder="Record the exact client comments, change requests, or clarification questions..."
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-pill-cobalt" style={{ padding: '0.65rem 1.75rem' }}>
                  ⚡ Record Feedback
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
