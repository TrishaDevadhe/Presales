'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isUserAssociatedWithOpp } from '@/lib/userAssociation';
import RichTextEditor from '../RichTextEditor';
import CompanyAutocomplete from '../CompanyAutocomplete';
import StaffMultiSelect from '../StaffMultiSelect';

import RecordHistoryView from '../RecordHistoryView';

export default function OpportunitiesTab() {
  const { currentUser, userRole, allUsers, getOptions, getOptionBadgeStyle, formatUserName, showToast, showAlert, showConfirm, globalSearchQuery } = useApp();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [modalSubTab, setModalSubTab] = useState('details'); // 'details' | 'history'

  const STANDARD_PROJECT_TYPES = [
    'Lumenore Licence',
    'Netlink Services',
    'Lumenore Professional Services'
  ];

  const [projectTypeSelect, setProjectTypeSelect] = useState('');
  const [customProjectType, setCustomProjectType] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    opportunity_name: '',
    company: '',
    opportunity_type_id: '',
    deliverable_type_id: '',
    primary_sales_owner: '',
    secondary_sales_owners: '',
    delivery_team: '',
    project_type: '',
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
    special_instructions: '',
    tcv_amount: 0,
    tcv_currency: 'USD'
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

  // Filter Opportunity Types to "New Business", "Renewal", and "Change Request"
  const allowedOpportunityTypes = getOptions('opportunity_type').filter(opt => {
    const name = opt.option_name.toLowerCase().trim();
    return name === 'new business' || name === 'renewal' || name === 'change request';
  });

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedOpp(null);
    setModalSubTab('details');
    setProjectTypeSelect('');
    setCustomProjectType('');
    const defaultOppType = allowedOpportunityTypes[0]?.id || getOptions('opportunity_type')[0]?.id || '';
    setFormData({
      opportunity_name: '',
      company: '',
      opportunity_type_id: defaultOppType,
      deliverable_type_id: getOptions('deliverable_type').filter(o => !o.option_name.toLowerCase().includes('pdf'))[0]?.id || '',
      primary_sales_owner: allUsers[2] || allUsers[0] || '',
      secondary_sales_owners: '',
      delivery_team: '',
      project_type: '',
      source_id: '',
      deal_stage_id: getOptions('deal_stage').find(o => o.option_name === 'Discovery')?.id || getOptions('deal_stage')[0]?.id || '',
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
      special_instructions: '',
      tcv_amount: 0,
      tcv_currency: 'USD'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (opp) => {
    setIsEditMode(true);
    setSelectedOpp(opp);
    setModalSubTab('details');
    const curProjType = opp.project_type || '';
    if (STANDARD_PROJECT_TYPES.includes(curProjType)) {
      setProjectTypeSelect(curProjType);
      setCustomProjectType('');
    } else if (curProjType) {
      setProjectTypeSelect('Other');
      setCustomProjectType(curProjType);
    } else {
      setProjectTypeSelect('');
      setCustomProjectType('');
    }
    setFormData({
      opportunity_name: opp.opportunity_name,
      company: opp.company,
      opportunity_type_id: opp.opportunity_type_id || '',
      deliverable_type_id: opp.deliverable_type_id || '',
      primary_sales_owner: opp.primary_sales_owner || '',
      secondary_sales_owners: opp.secondary_sales_owners || opp.secondary_sales_owner || '',
      delivery_team: opp.delivery_team || '',
      project_type: curProjType,
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
      special_instructions: opp.special_instructions || '',
      tcv_amount: opp.tcv_amount !== undefined && opp.tcv_amount !== null ? opp.tcv_amount : (opp.estimated_deal_value || 0),
      tcv_currency: opp.tcv_currency || 'USD'
    });
    setIsModalOpen(true);
  };

  const formatTCV = (amount, currency = 'USD') => {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) return '—';
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$', SGD: 'S$', JPY: '¥', AED: 'AED ' };
    const symbol = symbols[currency] || `${currency} `;
    return `${symbol}${num.toLocaleString()}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProjectTypeSelectChange = (e) => {
    const val = e.target.value;
    setProjectTypeSelect(val);
    if (val === 'Other') {
      setFormData(prev => ({ ...prev, project_type: customProjectType }));
    } else {
      setFormData(prev => ({ ...prev, project_type: val }));
    }
  };

  const handleCustomProjectTypeChange = (e) => {
    const val = e.target.value;
    setCustomProjectType(val);
    setFormData(prev => ({ ...prev, project_type: val }));
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

  // Filter opportunities for non-admin users based on association + global search query
  const userFilteredOpps = userRole === 'Admin'
    ? opportunities
    : opportunities.filter(opp => isUserAssociatedWithOpp(opp, currentUser));

  const displayOpportunities = userFilteredOpps.filter(opp => {
    if (!globalSearchQuery) return true;
    const q = globalSearchQuery.toLowerCase();
    return (
      (opp.opportunity_name && opp.opportunity_name.toLowerCase().includes(q)) ||
      (opp.company && opp.company.toLowerCase().includes(q)) ||
      (opp.opportunity_type_name && opp.opportunity_type_name.toLowerCase().includes(q)) ||
      (opp.deliverable_type_name && opp.deliverable_type_name.toLowerCase().includes(q)) ||
      (opp.presales_owner && opp.presales_owner.toLowerCase().includes(q)) ||
      (opp.primary_sales_owner && opp.primary_sales_owner.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      
      {/* Top action controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
                  <th className="num-col">TCV</th>
                  <th>Due Date</th>
                  <th>Presales Owner</th>
                  <th className="num-col">Actions</th>
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
                      <span className="badge badge-categorical" style={getOptionBadgeStyle('opportunity_type', opp.opportunity_type_name)}>
                        {opp.opportunity_type_name || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-categorical" style={getOptionBadgeStyle('deliverable_type', opp.deliverable_type_name)}>
                        {opp.deliverable_type_name || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={getOptionBadgeStyle('deal_stage', opp.deal_stage_name)}>
                        {opp.deal_stage_name || 'Proposal'}
                      </span>
                    </td>
                    <td className="num-col" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {formatTCV(opp.tcv_amount || opp.estimated_deal_value, opp.tcv_currency)}
                    </td>
                    <td style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {opp.target_submission_date ? opp.target_submission_date.split('T')[0] : 'N/A'}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatUserName(opp.presales_owner) || 'Unassigned'}</strong>
                    </td>
                    <td className="num-col">
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(opp)}>
                          Edit
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', paddingRight: '3.5rem' }}>
              <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
                {isEditMode ? 'Modify Opportunity' : 'Register New Opportunity'}
              </h3>
              {isEditMode && selectedOpp && (
                <div className="tab-group" style={{ background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: 'var(--radius-md)' }}>
                  <button
                    type="button"
                    className={`tab-item ${modalSubTab === 'details' ? 'active' : ''}`}
                    onClick={() => setModalSubTab('details')}
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}
                  >
                    📝 Details
                  </button>
                  <button
                    type="button"
                    className={`tab-item ${modalSubTab === 'history' ? 'active' : ''}`}
                    onClick={() => setModalSubTab('history')}
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}
                  >
                    📜 History
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
                <div>{error}</div>
              </div>
            )}

            {modalSubTab === 'history' && isEditMode && selectedOpp && (
              <RecordHistoryView entityType="Opportunity" entityId={selectedOpp.id} />
            )}

            <form onSubmit={handleSubmit} style={{ display: modalSubTab === 'details' ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
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

                    <CompanyAutocomplete
                      label="Company Name"
                      value={formData.company}
                      onChange={(val) => setFormData(prev => ({ ...prev, company: val }))}
                      opportunities={opportunities}
                      required={true}
                    />

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

                    {/* Project Type */}
                    <div className="form-group">
                      <label className="form-label">Project Type</label>
                      <select
                        name="project_type_select"
                        className="form-control form-select"
                        value={projectTypeSelect}
                        onChange={handleProjectTypeSelectChange}
                      >
                        <option value="">Select Project Type</option>
                        {STANDARD_PROJECT_TYPES.map(pt => (
                          <option key={pt} value={pt}>{pt}</option>
                        ))}
                        <option value="Other">Other (Custom)</option>
                      </select>
                      {projectTypeSelect === 'Other' && (
                        <input
                          type="text"
                          name="custom_project_type"
                          className="form-control"
                          style={{ marginTop: '0.5rem' }}
                          placeholder="Enter custom project type..."
                          value={customProjectType}
                          onChange={handleCustomProjectTypeChange}
                        />
                      )}
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
                        {getOptions('deliverable_type')
                          .filter(opt => !opt.option_name.toLowerCase().includes('pdf'))
                          .map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                          ))}
                      </select>
                    </div>

                    {/* Opportunity Status (Deal Stage) */}
                    <div className="form-group">
                      <label className="form-label">Status <span className="required">*</span></label>
                      <select
                        name="deal_stage_id"
                        className="form-control form-select"
                        value={formData.deal_stage_id}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Status</option>
                        {getOptions('deal_stage').map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Delivery Team */}
                    <div className="form-group">
                      <label className="form-label">Delivery Team</label>
                      <select
                        name="delivery_team"
                        className="form-control form-select"
                        value={formData.delivery_team || ''}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Delivery Team</option>
                        {allUsers.map(u => (
                          <option key={u} value={u}>{formatUserName(u)}</option>
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
                        <option value="">Select Primary Owner</option>
                        {allUsers.map(u => (
                          <option key={u} value={u}>{formatUserName(u)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Secondary Sales Owners Multi-Select */}
                    <StaffMultiSelect
                      label="Secondary Sales Owners"
                      allUsers={allUsers}
                      value={formData.secondary_sales_owners}
                      onChange={(updatedList) => setFormData(prev => ({ ...prev, secondary_sales_owners: Array.isArray(updatedList) ? updatedList.join(', ') : updatedList }))}
                      placeholder="Select additional sales owners..."
                    />

                    {/* Lead Source */}
                    <div className="form-group">
                      <label className="form-label">Lead Source</label>
                      <select
                        name="source_id"
                        className="form-control form-select"
                        value={formData.source_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Source</option>
                        {getOptions('source').map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.option_name}</option>
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
                          <option key={u} value={u}>{formatUserName(u)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Supporting Presales Team Multi-Select */}
                    <StaffMultiSelect
                      label="Supporting Presales Team"
                      allUsers={allUsers}
                      value={formData.supporting_presales_members}
                      onChange={(updatedList) => setFormData(prev => ({ ...prev, supporting_presales_members: Array.isArray(updatedList) ? updatedList.join(', ') : updatedList }))}
                      placeholder="Select supporting engineers & architects..."
                    />

                  </div>
                </div>

                {/* Section 2: Deal Sizing & Key Dates */}
                <div className="form-section">
                  <div className="form-section-header">
                    <span className="form-section-title">
                      <span>📊</span> 2. Commercial Terms, Metrics & Target Dates
                    </span>
                  </div>
                  <div className="form-grid-3">

                    {/* TCV (Total Contract Value) */}
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">TCV (Total Contract Value)</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          name="tcv_currency"
                          className="form-control form-select"
                          style={{ width: '115px', flexShrink: 0 }}
                          value={formData.tcv_currency || 'USD'}
                          onChange={handleInputChange}
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="INR">INR (₹)</option>
                          <option value="AUD">AUD ($)</option>
                          <option value="CAD">CAD ($)</option>
                          <option value="SGD">SGD ($)</option>
                          <option value="JPY">JPY (¥)</option>
                          <option value="AED">AED (AED)</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          name="tcv_amount"
                          className="form-control"
                          placeholder="Enter TCV amount (e.g. 150000)"
                          value={formData.tcv_amount || ''}
                          onChange={handleInputChange}
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Priority</label>
                      <select
                        name="priority_id"
                        className="form-control form-select"
                        value={formData.priority_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Priority</option>
                        {getOptions('priority').map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Solution Complexity</label>
                      <select
                        name="complexity_id"
                        className="form-control form-select"
                        value={formData.complexity_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Complexity</option>
                        {getOptions('complexity').map(opt => (
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
                        min="0"
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
                </div>

                {/* Section 3: Detailed Notes */}
                <div className="form-section">
                  <div className="form-section-header">
                    <span className="form-section-title">
                      <span>📝</span> 3. Solution Details, Scope & Key Risks
                    </span>
                  </div>

                  <div className="form-grid-3" style={{ alignItems: 'stretch' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <label className="form-label" style={{ minHeight: '2.2rem', display: 'flex', alignItems: 'flex-end', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Executive Summary & Scope Description
                      </label>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <RichTextEditor
                          value={formData.summary}
                          onChange={(val) => handleRichTextChange('summary', val)}
                          placeholder="Provide a high-level summary of the solution..."
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <label className="form-label" style={{ minHeight: '2.2rem', display: 'flex', alignItems: 'flex-end', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Identified Solution Risks & Dependencies
                      </label>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <RichTextEditor
                          value={formData.risks}
                          onChange={(val) => handleRichTextChange('risks', val)}
                          placeholder="Detail key risks, dependencies..."
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <label className="form-label" style={{ minHeight: '2.2rem', display: 'flex', alignItems: 'flex-end', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Special Instructions & Customer Preferences
                      </label>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <RichTextEditor
                          value={formData.special_instructions}
                          onChange={(val) => handleRichTextChange('special_instructions', val)}
                          placeholder="Special RFP formatting requirements..."
                        />
                      </div>
                    </div>
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
