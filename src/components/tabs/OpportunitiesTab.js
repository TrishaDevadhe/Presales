'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isUserAssociatedWithOpp } from '@/lib/userAssociation';
import RichTextEditor from '../RichTextEditor';
import CompanyAutocomplete from '../CompanyAutocomplete';
import StaffMultiSelect from '../StaffMultiSelect';

export default function OpportunitiesTab() {
  const { currentUser, userRole, allUsers, getOptions, getOptionBadgeStyle, showToast, showAlert, showConfirm } = useApp();
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
    deliverable_type_id: '',
    primary_sales_owner: '',
    secondary_sales_owners: '',
    source_id: '',
    deal_stage_id: '',
    priority_id: '',
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

  // Filter Opportunity Types to ONLY "New Business" and "Renewal"
  const allowedOpportunityTypes = getOptions('opportunity_type').filter(opt => {
    const name = opt.option_name.toLowerCase().trim();
    return name === 'new business' || name === 'renewal';
  });

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedOpp(null);
    const defaultOppType = allowedOpportunityTypes[0]?.id || getOptions('opportunity_type')[0]?.id || '';
    setFormData({
      opportunity_name: '',
      company: '',
      opportunity_type_id: defaultOppType,
      deliverable_type_id: getOptions('deliverable_type')[0]?.id || '',
      primary_sales_owner: allUsers[2] || allUsers[0] || '',
      secondary_sales_owners: allUsers[0] || '',
      source_id: '',
      deal_stage_id: getOptions('deal_stage').find(o => o.option_name === 'Proposal')?.id || getOptions('deal_stage')[0]?.id || '',
      priority_id: getOptions('priority').find(o => o.option_name === 'Medium')?.id || '',
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
      deliverable_type_id: opp.deliverable_type_id || '',
      primary_sales_owner: opp.primary_sales_owner || '',
      secondary_sales_owners: opp.secondary_sales_owners || '',
      source_id: opp.source_id || '',
      deal_stage_id: opp.deal_stage_id || '',
      priority_id: opp.priority_id || '',
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

  const handleRichTextChange = (name, val) => {
    setFormData(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.opportunity_name || !formData.company || !formData.opportunity_type_id) {
      setError('Opportunity Name, Company Name, and Opportunity Type are required.');
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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save opportunity');
      }

      const oppName = formData.opportunity_name;
      setIsModalOpen(false);
      fetchOpportunities();
      showToast(`✓ Opportunity "${oppName}" registered successfully!`, 'success');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Opportunity',
      message: 'Are you sure you want to delete this opportunity? This will permanently delete all associated tasks, versions, and feedback!',
      danger: true
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/opportunities/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete opportunity');
      }
      fetchOpportunities();
      showToast('Opportunity deleted successfully.', 'success');
    } catch (err) {
      showAlert(err.message, 'Error', 'danger');
    }
  };

  // Filter opportunities for non-admin users based on association
  const displayOpportunities = userRole === 'Admin'
    ? opportunities
    : opportunities.filter(opp => isUserAssociatedWithOpp(opp, currentUser));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header bar with controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>Opportunities Pipeline</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {userRole === 'Admin'
              ? 'Showing all organization opportunities.'
              : `Showing opportunities associated with @${currentUser}.`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Add Opportunity
        </button>
      </div>

      {/* Grid Table view */}
      <div className="paper-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading opportunities...</p>
        ) : displayOpportunities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💼</div>
            <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>No Associated Opportunities Found</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {userRole === 'Admin'
                ? 'No opportunities found. Click "+ Add Opportunity" to create one.'
                : `You are currently not listed as a sales owner or presales member on any active opportunity.`}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Opportunity & Client</th>
                  <th>Type</th>
                  <th>Deliverable Type</th>
                  <th>Stage</th>
                  <th>Due Date</th>
                  <th>Presales Owner</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayOpportunities.map((opp) => (
                  <tr key={opp.id}>
                    <td>
                      <div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{opp.opportunity_name}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        🏢 {opp.company}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={getOptionBadgeStyle('opportunity_type', opp.opportunity_type_name)}>
                        {opp.opportunity_type_name || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={getOptionBadgeStyle('deliverable_type', opp.deliverable_type_name)}>
                        {opp.deliverable_type_name || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={getOptionBadgeStyle('deal_stage', opp.deal_stage_name)}>
                        {opp.deal_stage_name || 'Proposal'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {opp.target_submission_date ? opp.target_submission_date.split('T')[0] : 'N/A'}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>@{opp.presales_owner || 'Unassigned'}</strong>
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
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content paper-panel" style={{ maxWidth: '1400px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', fontWeight: 700 }}>
              {isEditMode ? 'Modify Opportunity' : 'Register New Opportunity'}
            </h3>

            {error && (
              <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Section 1: Basic Information & Team Roles */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-title">
                    <span>💼</span> 1. Opportunity Overview & Team Assignments
                  </span>
                </div>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                  
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Opportunity Name <span className="required">*</span></label>
                    <input
                      type="text"
                      name="opportunity_name"
                      className="form-control"
                      placeholder="e.g. Enterprise Cloud Infrastructure Migration"
                      value={formData.opportunity_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <CompanyAutocomplete
                      label="Company Name"
                      value={formData.company}
                      onChange={(val) => setFormData(prev => ({ ...prev, company: val }))}
                      opportunities={opportunities}
                      required={true}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Opportunity Type <span className="required">*</span></label>
                    <select
                      name="opportunity_type_id"
                      className="form-control form-select"
                      value={formData.opportunity_type_id}
                      onChange={handleInputChange}
                      required
                    >
                      {allowedOpportunityTypes.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Lead Source dropdown */}
                  <div className="form-group">
                    <label className="form-label">Lead Source</label>
                    <select
                      name="lead_source_id"
                      className="form-control form-select"
                      value={formData.lead_source_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Lead Source</option>
                      {getOptions('lead_source').map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Deliverable Type option */}
                  <div className="form-group">
                    <label className="form-label">Deliverable Type <span className="required">*</span></label>
                    <select
                      name="deliverable_type_id"
                      className="form-control form-select"
                      value={formData.deliverable_type_id}
                      onChange={handleInputChange}
                      required
                    >
                      {getOptions('deliverable_type').map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Primary Sales Owner */}
                  <div className="form-group">
                    <label className="form-label">Primary Sales Owner <span className="required">*</span></label>
                    <select
                      name="primary_sales_owner"
                      className="form-control form-select"
                      value={formData.primary_sales_owner}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Account Manager / Sales Owner</option>
                      {allUsers.map(u => (
                        <option key={u} value={u}>@{u}</option>
                      ))}
                    </select>
                  </div>

                  {/* Secondary Sales Owner */}
                  <div className="form-group">
                    <label className="form-label">Secondary Sales Owner</label>
                    <select
                      name="secondary_sales_owners"
                      className="form-control form-select"
                      value={formData.secondary_sales_owners}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Secondary Sales Owner</option>
                      {allUsers.map(u => (
                        <option key={u} value={u}>@{u}</option>
                      ))}
                    </select>
                  </div>

                  {/* Presales Owner */}
                  <div className="form-group">
                    <label className="form-label">Presales Owner <span className="required">*</span></label>
                    <select
                      name="presales_owner"
                      className="form-control form-select"
                      value={formData.presales_owner}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Presales Lead</option>
                      {allUsers.map(u => (
                        <option key={u} value={u}>@{u}</option>
                      ))}
                    </select>
                  </div>

                  {/* Presales Members (Multi-Select) */}
                  <StaffMultiSelect
                    label="Presales Members (Multi-Select)"
                    options={allUsers}
                    selectedValues={formData.supporting_presales_members ? formData.supporting_presales_members.split(',').map(s => s.trim()).filter(Boolean) : []}
                    onChange={(vals) => setFormData(prev => ({ ...prev, supporting_presales_members: Array.isArray(vals) ? vals.join(', ') : vals }))}
                    placeholder="Select presales team members..."
                  />

                </div>
              </div>

              {/* Section 2: Timeline & Parameters */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-title">
                    <span>📊</span> 2. Timeline & Key Dates
                  </span>
                </div>
                <div className="form-grid-3">
                  
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
                      value={formData.contract_tenure}
                      onChange={handleInputChange}
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Win Probability (%)</label>
                    <input
                      type="number"
                      name="win_probability"
                      className="form-control"
                      value={formData.win_probability}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">RFP/Req Received Date <span className="required">*</span></label>
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
              </div>

              {/* Section 3: Detailed Notes, Scope & Risks */}
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-title">
                    <span>📝</span> 3. Solution Details, Scope & Key Risks
                  </span>
                </div>

                <div className="form-group">
                  <RichTextEditor
                    label="Executive Summary & Scope Description"
                    value={formData.summary}
                    onChange={(val) => handleRichTextChange('summary', val)}
                    placeholder="Provide a high-level summary of the solution..."
                  />
                </div>

                <div className="form-group">
                  <RichTextEditor
                    label="Identified Solution Risks & Dependencies"
                    value={formData.risks}
                    onChange={(val) => handleRichTextChange('risks', val)}
                    placeholder="Detail key risks, dependencies..."
                  />
                </div>

                <div className="form-group">
                  <RichTextEditor
                    label="Special Instructions & Customer Preferences"
                    value={formData.special_instructions}
                    onChange={(val) => handleRichTextChange('special_instructions', val)}
                    placeholder="Special RFP formatting requirements..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-pill-cobalt" style={{ padding: '0.65rem 1.75rem' }}>
                  ⚡ {isEditMode ? 'Save Opportunity Changes' : 'Submit Opportunity'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
