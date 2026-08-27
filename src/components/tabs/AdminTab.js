'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function AdminTab() {
  const { dropdownOptions, refreshDropdowns, getOptions } = useApp();
  const [activeSubTab, setActiveSubTab] = useState('dropdowns');
  
  // -- Dropdown Manager State --
  const [selectedCategory, setSelectedCategory] = useState('deal_stage');
  const [isDropdownModalOpen, setIsDropdownModalOpen] = useState(false);
  const [isDropdownEdit, setIsDropdownEdit] = useState(false);
  const [selectedDropdownOpt, setSelectedDropdownOpt] = useState(null);
  const [dropdownForm, setDropdownForm] = useState({
    category: '',
    option_name: '',
    active: true,
    sort_order: 0,
    color: '#3b82f6'
  });

  // -- Task Templates State --
  const [templates, setTemplates] = useState([]);
  const [selectedDeliverableType, setSelectedDeliverableType] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTemplateEdit, setIsTemplateEdit] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    deliverable_type_id: '',
    task_name: '',
    default_estimated_hours: 4,
    default_role_id: '',
    sequence_order: 1
  });

  // -- Automation Settings State --
  const [automationSettings, setAutomationSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Available categories list
  const categoriesList = [
    { value: 'deal_stage', label: 'Deal Stages' },
    { value: 'opportunity_type', label: 'Opportunity Types' },
    { value: 'priority', label: 'Priority Levels' },
    { value: 'source', label: 'Lead Sources' },
    { value: 'complexity', label: 'Opportunity Complexity' },
    { value: 'work_category', label: 'Work Categories' },
    { value: 'task_status', label: 'Task Statuses' },
    { value: 'deliverable_type', label: 'Deliverable Types' },
    { value: 'estimation_confidence', label: 'Estimation Confidences' },
    { value: 'trigger_source', label: 'Revision Triggers' },
    { value: 'reason_category', label: 'Revision Reason Categories' },
    { value: 'deadline_impact', label: 'Deadline Impact Levels' },
    { value: 'effort_type', label: 'Effort Types' },
    { value: 'feedback_from', label: 'Feedback Sources' },
    { value: 'feedback_type', label: 'Feedback Types' },
    { value: 'feedback_status', label: 'Feedback Statuses' },
    { value: 'role', label: 'Resource Roles' },
    { value: 'seniority', label: 'Resource Seniority Levels' },
    { value: 'department', label: 'Resource Departments' }
  ];

  // Fetch Templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/tasktemplates');
      const data = await res.json();
      setTemplates(data);
    } catch (e) {
      console.error('Error fetching templates:', e);
    }
  };

  // Fetch Automation Settings
  const fetchAutomationSettings = async () => {
    try {
      const res = await fetch('/api/automationsettings');
      const data = await res.json();
      setAutomationSettings(data);
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchAutomationSettings();
  }, []);

  const allowedDeliverableNames = ['rfp', 'proposal', 'presentation deck', 'brochure'];

  const getDeliverableOptions = () => {
    const opts = getOptions('deliverable_type');
    return opts.filter(o => allowedDeliverableNames.includes(o.option_name.toLowerCase()));
  };

  useEffect(() => {
    const delivOpts = getDeliverableOptions();
    if (delivOpts.length > 0 && !selectedDeliverableType) {
      setSelectedDeliverableType(delivOpts[0].id.toString());
    }
  }, [dropdownOptions]);

  // -- DROPDOWN MANAGER HANDLERS --
  const openDropdownCreate = () => {
    setIsDropdownEdit(false);
    setSelectedDropdownOpt(null);
    setDropdownForm({
      category: selectedCategory,
      option_name: '',
      active: true,
      sort_order: dropdownOptions.filter(o => o.category === selectedCategory).length + 1,
      color: '#4f46e5'
    });
    setIsDropdownModalOpen(true);
  };

  const openDropdownEdit = (opt) => {
    setIsDropdownEdit(true);
    setSelectedDropdownOpt(opt);
    setDropdownForm({
      category: opt.category,
      option_name: opt.option_name,
      active: opt.active === true,
      sort_order: opt.sort_order || 0,
      color: opt.color || '#3b82f6'
    });
    setIsDropdownModalOpen(true);
  };

  const handleDropdownSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = '/api/dropdowns';
      const method = isDropdownEdit ? 'PUT' : 'POST';
      const payload = isDropdownEdit 
        ? { id: selectedDropdownOpt.id, ...dropdownForm }
        : dropdownForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save dropdown option');
      
      setIsDropdownModalOpen(false);
      refreshDropdowns();
    } catch (err) {
      alert(err.message);
    }
  };

  // -- TASK TEMPLATES HANDLERS --
  const openTemplateCreate = () => {
    setIsTemplateEdit(false);
    setSelectedTemplate(null);
    const delivOpts = getDeliverableOptions();
    setTemplateForm({
      deliverable_type_id: selectedDeliverableType || delivOpts[0]?.id || '',
      task_name: '',
      default_estimated_hours: 8,
      default_role_id: getOptions('role')[0]?.id || '',
      sequence_order: templates.filter(t => t.deliverable_type_id === parseInt(selectedDeliverableType, 10)).length + 1
    });
    setIsTemplateModalOpen(true);
  };

  const openTemplateEdit = (tpl) => {
    setIsTemplateEdit(true);
    setSelectedTemplate(tpl);
    setTemplateForm({
      deliverable_type_id: tpl.deliverable_type_id,
      task_name: tpl.task_name,
      default_estimated_hours: parseFloat(tpl.default_estimated_hours) || 4,
      default_role_id: tpl.default_role_id || '',
      sequence_order: tpl.sequence || tpl.sequence_order || 1
    });
    setIsTemplateModalOpen(true);
  };

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = '/api/tasktemplates';
      const method = isTemplateEdit ? 'PUT' : 'POST';
      const payload = isTemplateEdit
        ? { id: selectedTemplate.id, ...templateForm }
        : templateForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save task template');

      setIsTemplateModalOpen(false);
      fetchTemplates();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTemplateDelete = async (id) => {
    if (!confirm('Delete this template task?')) return;
    try {
      const res = await fetch(`/api/tasktemplates?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete template');
      fetchTemplates();
    } catch (err) {
      alert(err.message);
    }
  };

  // -- AUTOMATION SETTINGS HANDLERS --
  const handleAutomationChange = (name, val) => {
    setAutomationSettings(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleAutomationSubmit = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/automationsettings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(automationSettings)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      alert('Automation settings updated successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const currentCategoryOptions = dropdownOptions
    .filter(o => {
      if (o.category !== selectedCategory) return false;
      if (selectedCategory === 'deliverable_type') {
        return allowedDeliverableNames.includes(o.option_name.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.option_name.localeCompare(b.option_name));

  const filteredTemplates = templates.filter(t => t.deliverable_type_id === parseInt(selectedDeliverableType, 10));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Sub Tabs Navigation */}
      <div className="tab-bar">
        <button 
          className={`tab-btn ${activeSubTab === 'dropdowns' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('dropdowns')}
        >
          Dropdown Manager
        </button>
        <button 
          className={`tab-btn ${activeSubTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('templates')}
        >
          Task Templates
        </button>
        <button 
          className={`tab-btn ${activeSubTab === 'automations' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('automations')}
        >
          Automation & Warnings
        </button>
      </div>

      {/* --- SUB TAB 1: DROPDOWN MANAGER --- */}
      {activeSubTab === 'dropdowns' && (
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          
          {/* Category picker list */}
          <div className="paper-panel" style={{ width: '280px', padding: '1rem' }}>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)', fontWeight: 600 }}>Categories</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '55vh', overflowY: 'auto' }}>
              {categoriesList.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.6rem 0.8rem',
                    background: selectedCategory === cat.value ? 'var(--bg-secondary)' : 'transparent',
                    border: selectedCategory === cat.value ? '1px solid var(--border-subtle)' : '1px solid transparent',
                    color: selectedCategory === cat.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: selectedCategory === cat.value ? 600 : 500,
                    transition: 'all 0.2s'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Option list table */}
          <div className="paper-panel" style={{ flex: 1, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                {categoriesList.find(c => c.value === selectedCategory)?.label} Config Picklist
              </h3>
              <button className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }} onClick={openDropdownCreate}>
                + Add Option
              </button>
            </div>

            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Option Name</th>
                    <th>Sort Order</th>
                    <th>Color Tag</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCategoryOptions.map((opt) => (
                    <tr key={opt.id}>
                      <td><strong style={{ color: 'var(--text-primary)' }}>{opt.option_name}</strong></td>
                      <td>{opt.sort_order || 0}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: opt.color || 'var(--accent-primary)', border: '1px solid var(--border-subtle)' }}></span>
                          <code>{opt.color || '-'}</code>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${opt.active ? 'badge-success' : 'badge-danger'}`}>
                          {opt.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }} onClick={() => openDropdownEdit(opt)}>
                          Modify
                        </button>
                      </td>
                    </tr>
                  ))}
                  {currentCategoryOptions.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No options defined for this category.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- SUB TAB 2: TASK TEMPLATES --- */}
      {activeSubTab === 'templates' && (
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          
          {/* Deliverable type selector list */}
          <div className="paper-panel" style={{ width: '280px', padding: '1rem' }}>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)', fontWeight: 600 }}>Deliverable Types</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {getDeliverableOptions().map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedDeliverableType(opt.id.toString())}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.6rem 0.8rem',
                    background: selectedDeliverableType === opt.id.toString() ? 'var(--bg-secondary)' : 'transparent',
                    border: selectedDeliverableType === opt.id.toString() ? '1px solid var(--border-subtle)' : '1px solid transparent',
                    color: selectedDeliverableType === opt.id.toString() ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: selectedDeliverableType === opt.id.toString() ? 600 : 500
                  }}
                >
                  {opt.option_name}
                </button>
              ))}
            </div>
          </div>

          {/* Templates list table */}
          <div className="paper-panel" style={{ flex: 1, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                Auto-initialized Scope Tasks
              </h3>
              <button className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }} onClick={openTemplateCreate} disabled={!selectedDeliverableType}>
                + Add Task Template
              </button>
            </div>

            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Seq Order</th>
                    <th>Task Scope Name</th>
                    <th>Default Est. Hours</th>
                    <th>Default Assignee Role</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((tpl) => (
                    <tr key={tpl.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>#{tpl.sequence || tpl.sequence_order || 1}</td>
                      <td><strong style={{ color: 'var(--text-primary)' }}>{tpl.task_name}</strong></td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{tpl.default_estimated_hours} hrs</td>
                      <td>
                        <span className="badge badge-info">
                          {tpl.default_role_name}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }} onClick={() => openTemplateEdit(tpl)}>
                            Modify
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }} onClick={() => handleTemplateDelete(tpl.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTemplates.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No tasks defined in template for this deliverable type.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- SUB TAB 3: AUTOMATION SETTINGS --- */}
      {activeSubTab === 'automations' && automationSettings && (
        <div className="paper-panel" style={{ maxWidth: '680px', padding: '2rem' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.5rem', fontWeight: 700 }}>
            System Rules & Warnings Thresholds
          </h3>
          
          <form onSubmit={handleAutomationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <div
                className={`switch-container ${automationSettings.missing_effort_reminder ? 'checked' : ''}`}
                onClick={() => handleAutomationChange('missing_effort_reminder', !automationSettings.missing_effort_reminder)}
              >
                <div className="switch-track"><div className="switch-thumb"></div></div>
                <span className="form-label" style={{ margin: 0 }}>Enable Missing Effort Warnings / Reminders</span>
              </div>
            </div>

            <div className="form-grid">
              
              <div className="form-group">
                <label className="form-label">
                  Effort Variance Alarm Threshold (%)
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={automationSettings.effort_variance_threshold}
                  onChange={(e) => handleAutomationChange('effort_variance_threshold', parseFloat(e.target.value) || 0)}
                  min="0"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trigger warnings if cumulative logs exceed estimate by this %</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Revision Hotspot Alert Threshold
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={automationSettings.revision_threshold}
                  onChange={(e) => handleAutomationChange('revision_threshold', parseInt(e.target.value, 10) || 0)}
                  min="1"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flag opportunities that exceed this number of revisions</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Workload Overload Threshold (%)
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={automationSettings.overload_threshold}
                  onChange={(e) => handleAutomationChange('overload_threshold', parseFloat(e.target.value) || 0)}
                  min="100"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capacity alerts trigger when load is above this % of capacity</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Reminder Frequency
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={automationSettings.reminder_frequency}
                  onChange={(e) => handleAutomationChange('reminder_frequency', e.target.value)}
                  placeholder="e.g. Daily at 5:00 PM"
                />
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={savingSettings}>
                {savingSettings ? 'Saving Changes...' : 'Save Automation Rules'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* --- DROPDOWN EDIT MODAL --- */}
      {isDropdownModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content paper-panel" style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setIsDropdownModalOpen(false)}>×</button>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              {isDropdownEdit ? 'Modify Config Option' : 'Register Picklist Option'}
            </h3>

            <form onSubmit={handleDropdownSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input type="text" className="form-control" value={dropdownForm.category} disabled />
              </div>

              <div className="form-group">
                <label className="form-label">Option Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={dropdownForm.option_name}
                  onChange={(e) => setDropdownForm(prev => ({ ...prev, option_name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input
                    type="number"
                    className="form-control"
                    value={dropdownForm.sort_order}
                    onChange={(e) => setDropdownForm(prev => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Color Code Tag</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. #ef4444 or hsl(...)"
                    value={dropdownForm.color}
                    onChange={(e) => setDropdownForm(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <div
                  className={`switch-container ${dropdownForm.active ? 'checked' : ''}`}
                  onClick={() => setDropdownForm(prev => ({ ...prev, active: !prev.active }))}
                >
                  <div className="switch-track"><div className="switch-thumb"></div></div>
                  <span className="form-label" style={{ margin: 0 }}>Active Option</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsDropdownModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Option</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- TEMPLATE MODAL --- */}
      {isTemplateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content paper-panel" style={{ maxWidth: '550px' }}>
            <button className="modal-close" onClick={() => setIsTemplateModalOpen(false)}>×</button>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              {isTemplateEdit ? 'Modify Task Template' : 'Add Auto-Scaffold Task'}
            </h3>

            <form onSubmit={handleTemplateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group">
                <label className="form-label">Target Deliverable Type <span className="required">*</span></label>
                <select
                  className="form-control form-select"
                  value={templateForm.deliverable_type_id}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, deliverable_type_id: e.target.value }))}
                  required
                >
                  {getDeliverableOptions().map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Task Scope Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. RFP Scope Review"
                  value={templateForm.task_name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, task_name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Default Est. Hours <span className="required">*</span></label>
                  <input
                    type="number"
                    className="form-control"
                    value={templateForm.default_estimated_hours}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, default_estimated_hours: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Default Assignee Role</label>
                  <select
                    className="form-control form-select"
                    value={templateForm.default_role_id}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, default_role_id: e.target.value }))}
                  >
                    {getOptions('role').map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Execution Sequence Order</label>
                <input
                  type="number"
                  className="form-control"
                  value={templateForm.sequence_order}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, sequence_order: parseInt(e.target.value, 10) || 1 }))}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsTemplateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Template</button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
