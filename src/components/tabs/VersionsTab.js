'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import RichTextEditor from '../RichTextEditor';

export default function VersionsTab() {
  const { allUsers, getOptions } = useApp();
  const [versions, setVersions] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    opportunity_id: '',
    version_type_id: '',
    trigger_source_id: '',
    reason_category_id: '',
    change_summary: '',
    commercial_changed: false,
    scope_changed: false,
    timeline_changed: false,
    estimated_rework_hours: 0,
    deadline_impact_id: '',
    reviewed_by: '',
    approved_by: '',
    proposal_link: '',
    pricing_link: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [versionsRes, oppsRes] = await Promise.all([
        fetch('/api/versions'),
        fetch('/api/opportunities')
      ]);
      const versionsData = await versionsRes.json();
      const oppsData = await oppsRes.json();

      setVersions(versionsData);
      setOpportunities(oppsData);
    } catch (e) {
      console.error('Error fetching version data:', e);
      setError('Failed to load version logs');
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
      version_type_id: getOptions('version_type')[0]?.id || '',
      trigger_source_id: getOptions('trigger_source')[0]?.id || '',
      reason_category_id: getOptions('reason_category')[0]?.id || '',
      change_summary: '',
      commercial_changed: false,
      scope_changed: false,
      timeline_changed: false,
      estimated_rework_hours: 4,
      deadline_impact_id: getOptions('deadline_impact')[0]?.id || '',
      reviewed_by: allUsers[1] || allUsers[0] || '', // Presales owner or admin
      approved_by: allUsers[2] || allUsers[0] || '', // Sales owner or admin
      proposal_link: '',
      pricing_link: ''
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

    if (!formData.opportunity_id || !formData.version_type_id || !formData.trigger_source_id || !formData.change_summary.trim()) {
      setError('Opportunity, Version Type, Trigger Source, and Change Summary are required.');
      return;
    }

    try {
      const res = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save version');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#fff' }}>Version & Proposal Revision Logs</h2>
        <button className="btn btn-primary" onClick={openCreateModal} disabled={opportunities.length === 0}>
          {opportunities.length === 0 ? 'Register opportunity first' : '+ New Version Revision'}
        </button>
      </div>

      {/* Version list grouped by Opportunity */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading versions...</p>
        ) : versions.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No version records logged. Click &quot;New Version Revision&quot; to log a proposal revision.</p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Ver #</th>
                  <th>Version Type</th>
                  <th>Trigger Source</th>
                  <th>Rework Hours</th>
                  <th>Scope / Comm / Time</th>
                  <th>Impact</th>
                  <th>Links</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((ver) => (
                  <tr key={ver.id}>
                    <td>
                      <div><strong style={{ color: '#fff' }}>{ver.opportunity_name}</strong></div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ver.company}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--accent-primary)', color: '#fff', fontWeight: 'bold' }}>
                        v{ver.version_number}
                      </span>
                    </td>
                    <td>{ver.version_type_name}</td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                        {ver.trigger_source_name}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{ver.estimated_rework_hours} hrs</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <span className="badge" style={{ background: ver.scope_changed ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)', color: ver.scope_changed ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                          Scope
                        </span>
                        <span className="badge" style={{ background: ver.commercial_changed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)', color: ver.commercial_changed ? 'var(--color-success)' : 'var(--text-muted)' }}>
                          Comm
                        </span>
                        <span className="badge" style={{ background: ver.timeline_changed ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.02)', color: ver.timeline_changed ? 'var(--color-warning)' : 'var(--text-muted)' }}>
                          Time
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(0, 0, 0, 0.2)', color: ver.deadline_impact_name?.includes('Critical') ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {ver.deadline_impact_name || 'No Impact'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8rem' }}>
                        {ver.proposal_link ? (
                          <a href={ver.proposal_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)', textDecoration: 'none' }}>
                            📄 Proposal
                          </a>
                        ) : null}
                        {ver.pricing_link ? (
                          <a href={ver.pricing_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-success)', textDecoration: 'none' }}>
                            💲 Pricing
                          </a>
                        ) : null}
                        {!ver.proposal_link && !ver.pricing_link && <span style={{ color: 'var(--text-muted)' }}>None</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE VERSION REVISION MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '850px' }}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#fff', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              Log New Version & Revision Impact
            </h3>

            {error && (
              <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div className="form-grid">
                
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
                  <label className="form-label">Version Type <span className="required">*</span></label>
                  <select
                    name="version_type_id"
                    className="form-control form-select"
                    value={formData.version_type_id}
                    onChange={handleInputChange}
                    required
                  >
                    {getOptions('version_type').map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Trigger Source <span className="required">*</span></label>
                  <select
                    name="trigger_source_id"
                    className="form-control form-select"
                    value={formData.trigger_source_id}
                    onChange={handleInputChange}
                    required
                  >
                    {getOptions('trigger_source').map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason Category</label>
                  <select
                    name="reason_category_id"
                    className="form-control form-select"
                    value={formData.reason_category_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Reason</option>
                    {getOptions('reason_category').map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Scope Toggles Row */}
              <div style={{ display: 'flex', gap: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                <div
                  className={`switch-container ${formData.commercial_changed ? 'checked' : ''}`}
                  onClick={() => handleSwitchChange('commercial_changed', !formData.commercial_changed)}
                >
                  <div className="switch-track"><div className="switch-thumb"></div></div>
                  <span className="form-label" style={{ margin: 0 }}>Commercial Changed</span>
                </div>

                <div
                  className={`switch-container ${formData.scope_changed ? 'checked' : ''}`}
                  onClick={() => handleSwitchChange('scope_changed', !formData.scope_changed)}
                >
                  <div className="switch-track"><div className="switch-thumb"></div></div>
                  <span className="form-label" style={{ margin: 0 }}>Scope Changed</span>
                </div>

                <div
                  className={`switch-container ${formData.timeline_changed ? 'checked' : ''}`}
                  onClick={() => handleSwitchChange('timeline_changed', !formData.timeline_changed)}
                >
                  <div className="switch-track"><div className="switch-thumb"></div></div>
                  <span className="form-label" style={{ margin: 0 }}>Timeline Changed</span>
                </div>
              </div>

              <div className="form-grid">
                
                <div className="form-group">
                  <label className="form-label">Estimated Rework Hours</label>
                  <input
                    type="number"
                    name="estimated_rework_hours"
                    className="form-control"
                    min="0"
                    value={formData.estimated_rework_hours}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deadline Impact</label>
                  <select
                    name="deadline_impact_id"
                    className="form-control form-select"
                    value={formData.deadline_impact_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Impact</option>
                    {getOptions('deadline_impact').map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Reviewed By</label>
                  <select
                    name="reviewed_by"
                    className="form-control form-select"
                    value={formData.reviewed_by}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Reviewer</option>
                    {allUsers.map(u => (
                      <option key={u} value={u}>@{u}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Approved By</label>
                  <select
                    name="approved_by"
                    className="form-control form-select"
                    value={formData.approved_by}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Approver</option>
                    {allUsers.map(u => (
                      <option key={u} value={u}>@{u}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Proposal Link (URL)</label>
                  <input
                    type="url"
                    name="proposal_link"
                    className="form-control"
                    placeholder="https://..."
                    value={formData.proposal_link}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Pricing Template Link (URL)</label>
                  <input
                    type="url"
                    name="pricing_link"
                    className="form-control"
                    placeholder="https://..."
                    value={formData.pricing_link}
                    onChange={handleInputChange}
                  />
                </div>

              </div>

              <div className="form-group">
                <label className="form-label">Change Summary <span className="required">*</span></label>
                <RichTextEditor
                  value={formData.change_summary}
                  onChange={(val) => handleSwitchChange('change_summary', val)}
                  placeholder="Detail the scope additions, pricing reductions, or core modifications made in this version..."
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Proposal Version
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
