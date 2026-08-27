'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import RichTextEditor from '../RichTextEditor';
import CompanyAutocomplete from '../CompanyAutocomplete';

export default function OpportunitiesTab() {
  const { allUsers, getOptions } = useApp();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    opportunity_name: '',
    company: '',
    opportunity_type_id: '',
    primary_sales_owner: '',
    secondary_sales_owners: '',
    source_id: '',
    deal_stage_id: '',
    priority_id: '',
    estimated_deal_value: 0,
    contract_tenure: 0,
    win_probability: 0,
    complexity_id: '',
    received_date: new Date().toISOString().split('T')[0],
    target_submission_date: '',
    internal_review_date: '',
    presales_owner: '',
    supporting_presales_members: '',
    summary: '',
    risks: '',
    special_instructions: ''
  });

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/opportunities');
      const data = await res.json();
      setOpportunities(data);
    } catch (e) {
      console.error('Error fetching opportunities:', e);
      setError('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedOpp(null);
    setFormData({
      opportunity_name: '',
      company: '',
      opportunity_type_id: getOptions('opportunity_type')[0]?.id || '',
      primary_sales_owner: allUsers[2] || allUsers[0] || '',
      secondary_sales_owners: '',
      source_id: '',
      deal_stage_id: getOptions('deal_stage').find(o => o.option_name === 'Proposal')?.id || getOptions('deal_stage')[0]?.id || '',
      priority_id: getOptions('priority').find(o => o.option_name === 'Medium')?.id || '',
      estimated_deal_value: 0,
      contract_tenure: 12,
      win_probability: 50,
      complexity_id: getOptions('complexity')[1]?.id || '',
      received_date: new Date().toISOString().split('T')[0],
      target_submission_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      internal_review_date: '',
      presales_owner: allUsers[1] || allUsers[0] || '',
      supporting_presales_members: '',
      summary: '',
      risks: '',
      special_instructions: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (opp) => {
    setIsEditMode(true);
    setSelectedOpp(opp);
    setFormData({
      opportunity_name: opp.opportunity_name,
      company: opp.company,
      opportunity_type_id: opp.opportunity_type_id || '',
      primary_sales_owner: opp.primary_sales_owner || '',
      secondary_sales_owners: opp.secondary_sales_owners || '',
      source_id: opp.source_id || '',
      deal_stage_id: opp.deal_stage_id || '',
      priority_id: opp.priority_id || '',
      estimated_deal_value: parseFloat(opp.estimated_deal_value) || 0,
      contract_tenure: opp.contract_tenure || 0,
      win_probability: opp.win_probability || 0,
      complexity_id: opp.complexity_id || '',
      received_date: opp.received_date ? opp.received_date.split('T')[0] : '',
      target_submission_date: opp.target_submission_date ? opp.target_submission_date.split('T')[0] : '',
      internal_review_date: opp.internal_review_date ? opp.internal_review_date.split('T')[0] : '',
      presales_owner: opp.presales_owner || '',
      supporting_presales_members: opp.supporting_presales_members || '',
      summary: opp.summary || '',
      risks: opp.risks || '',
      special_instructions: opp.special_instructions || ''
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

    if (!formData.opportunity_name.trim() || !formData.company.trim() || !formData.opportunity_type_id || !formData.primary_sales_owner || !formData.presales_owner || !formData.received_date || !formData.target_submission_date) {
      setError('Please fill in all required fields.');
      return;
    }

    if (new Date(formData.target_submission_date) < new Date(formData.received_date)) {
      setError('Target Submission Date must be on or after Received Date.');
      return;
    }

    try {
      const url = isEditMode ? `/api/opportunities/${selectedOpp.id}` : '/api/opportunities';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save opportunity');
      }

      setIsModalOpen(false);
      fetchOpportunities();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this opportunity? This will permanently delete all associated tasks, versions, and feedback!')) return;

    try {
      const res = await fetch(`/api/opportunities/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete opportunity');
      }
      fetchOpportunities();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header bar with controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>Opportunities Pipeline</h2>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Create Opportunity
        </button>
      </div>

      {/* Main Table Panel */}
      <div className="paper-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading opportunities...</p>
        ) : opportunities.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No opportunities found. Click &quot;Create Opportunity&quot; to begin.</p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Opportunity & Company</th>
                  <th>Type</th>
                  <th>Deal Stage</th>
                  <th>Value</th>
                  <th>Target Date</th>
                  <th>Priority</th>
                  <th>Presales Owner</th>
                  <th>Revisions</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opp) => (
                  <tr key={opp.id}>
                    <td>
                      <div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.98rem' }}>{opp.opportunity_name}</strong>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {opp.company}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {opp.opportunity_type_name}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {opp.deal_stage_name || 'Unassigned'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(opp.estimated_deal_value)}</td>
                    <td>{opp.target_submission_date ? opp.target_submission_date.split('T')[0] : 'N/A'}</td>
                    <td>
                      <span className="badge badge-warning">
                        {opp.priority_name || 'Medium'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        @{opp.presales_owner}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: opp.revision_counter >= 3 ? 'var(--color-danger-text)' : 'var(--text-primary)', fontWeight: opp.revision_counter >= 3 ? 700 : 500 }}>
                        {opp.revision_counter || 0}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                        (C:{opp.commercial_revision_counter || 0})
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => openEditModal(opp)}>
                          Edit
                        </button>
                        <button className="btn btn-danger" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => handleDelete(opp.id)}>
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

      {/* CREATE / EDIT OPPORTUNITY OVERLAY MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content paper-panel" style={{ maxWidth: '850px' }}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              {isEditMode ? 'Edit Opportunity Details' : 'Register New Opportunity'}
            </h3>

            {error && (
              <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div className="form-grid">
                
                <div className="form-group">
                  <label className="form-label">
                    Opportunity Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="opportunity_name"
                    className="form-control"
                    value={formData.opportunity_name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Cloud ERP Upgrade"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Company Name <span className="required">*</span>
                  </label>
                  <CompanyAutocomplete
                    value={formData.company}
                    onChange={(val) => handleSwitchChange('company', val)}
                    opportunities={opportunities}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Opportunity Type <span className="required">*</span>
                  </label>
                  <select
                    name="opportunity_type_id"
                    className="form-control form-select"
                    value={formData.opportunity_type_id}
                    onChange={handleInputChange}
                    required
                  >
                    {getOptions('opportunity_type').map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Complexity <span className="required">*</span>
                  </label>
                  <select
                    name="complexity_id"
                    className="form-control form-select"
                    value={formData.complexity_id}
                    onChange={handleInputChange}
                    required
                  >
                    {getOptions('complexity').map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Sales Owner <span className="required">*</span></label>
                  <select
                    name="primary_sales_owner"
                    className="form-control form-select"
                    value={formData.primary_sales_owner}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Sales Owner</option>
                    {allUsers.map(u => (
                      <option key={u} value={u}>@{u}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Presales Owner <span className="required">*</span></label>
                  <select
                    name="presales_owner"
                    className="form-control form-select"
                    value={formData.presales_owner}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Presales Owner</option>
                    {allUsers.map(u => (
                      <option key={u} value={u}>@{u}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Secondary Sales Owners</label>
                  <input
                    type="text"
                    name="secondary_sales_owners"
                    className="form-control"
                    placeholder="e.g. john_smith, alice_williams"
                    value={formData.secondary_sales_owners}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supporting Presales Members</label>
                  <input
                    type="text"
                    name="supporting_presales_members"
                    className="form-control"
                    placeholder="e.g. bob_jones, jane_doe"
                    value={formData.supporting_presales_members}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    name="priority_id"
                    className="form-control form-select"
                    value={formData.priority_id}
                    onChange={handleInputChange}
                  >
                    {getOptions('priority').map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Contract Tenure (Months)</label>
                  <input
                    type="number"
                    name="contract_tenure"
                    className="form-control"
                    min="0"
                    value={formData.contract_tenure}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Win Probability %</label>
                  <input
                    type="number"
                    name="win_probability"
                    className="form-control"
                    min="0"
                    max="100"
                    value={formData.win_probability}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Received Date <span className="required">*</span></label>
                  <input
                    type="date"
                    name="received_date"
                    className="form-control"
                    value={formData.received_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Submission Date <span className="required">*</span></label>
                  <input
                    type="date"
                    name="target_submission_date"
                    className="form-control"
                    value={formData.target_submission_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Internal Review Date</label>
                  <input
                    type="date"
                    name="internal_review_date"
                    className="form-control"
                    value={formData.internal_review_date}
                    onChange={handleInputChange}
                  />
                </div>

              </div>

              {/* Rich Text Areas */}
              <div className="form-group">
                <label className="form-label">Opportunity Summary</label>
                <RichTextEditor
                  value={formData.summary}
                  onChange={(val) => handleSwitchChange('summary', val)}
                  placeholder="Summarize the deal context and key client needs..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Key Risks & Mitigations</label>
                <RichTextEditor
                  value={formData.risks}
                  onChange={(val) => handleSwitchChange('risks', val)}
                  placeholder="Document delivery risks, technology constraints, competitors..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Special Instructions</label>
                <RichTextEditor
                  value={formData.special_instructions}
                  onChange={(val) => handleSwitchChange('special_instructions', val)}
                  placeholder="Note any specific document formats, executive summaries, or custom needs..."
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditMode ? 'Save Changes' : 'Create Opportunity'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
