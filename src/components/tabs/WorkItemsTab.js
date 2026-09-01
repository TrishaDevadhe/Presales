'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isUserAssociatedWithTask } from '@/lib/userAssociation';
import RichTextEditor from '../RichTextEditor';

export default function WorkItemsTab() {
  const { currentUser, userRole, allUsers, getOptions, resourceProfiles, getOptionBadgeStyle, showToast, showAlert, showConfirm } = useApp();
  const [tasks, setTasks] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [filterOpp, setFilterOpp] = useState('');
  const [filterUser, setFilterUser] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Live Capacity Warning State
  const [capacityWarning, setCapacityWarning] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    opportunity_id: '',
    work_category_id: '',
    title: '',
    description: '',
    deliverable_type_id: '',
    assigned_to: '',
    reviewer: '',
    collaborators: '',
    priority_id: '',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    estimated_hours: 0,
    estimation_confidence_id: '',
    is_revision_work: false,
    revision_number: '',
    trigger_id: '',
    status_id: '',
    blocker_reason: '',
    deliverable_link: '',
    notes: ''
  });

  const [bulkTasks, setBulkTasks] = useState([
    {
      title: '',
      work_category_id: '',
      assigned_to: '',
      estimated_hours: 8,
      start_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reviewer: '',
      collaborators: '',
      description: ''
    }
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, oppsRes] = await Promise.all([
        fetch('/api/workitems'),
        fetch('/api/opportunities')
      ]);
      const tasksData = await tasksRes.json();
      const oppsData = await oppsRes.json();
      setTasks(tasksData);
      setOpportunities(oppsData);
    } catch (e) {
      console.error('Error fetching work items data:', e);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute live capacity check as the user fills out the form
  useEffect(() => {
    if (isEditMode) {
      if (!formData.assigned_to) {
        setCapacityWarning(null);
        return;
      }

      const username = formData.assigned_to;
      const hours = parseFloat(formData.estimated_hours) || 0;

      const profile = resourceProfiles.find(p => p.username === username);
      if (!profile) {
        setCapacityWarning(null);
        return;
      }
      const capacity = parseFloat(profile.weekly_capacity_hours) || 40;

      const completedOpt = getOptions('task_status').find(o => o.option_name === 'Completed');
      const completedId = completedOpt?.id;

      const activeTasksHours = tasks
        .filter(t => t.assigned_to === username && t.status_id !== completedId && t.id !== selectedTask?.id)
        .reduce((sum, t) => sum + (parseFloat(t.estimated_hours) || 0), 0);

      const totalHours = activeTasksHours + hours;
      if (totalHours > capacity) {
        setCapacityWarning(
          `⚠️ Capacity Alert: Adding this task brings @${username}'s workload to ${totalHours} hours, which exceeds their weekly capacity of ${capacity} hours (Current active load: ${activeTasksHours} hours).`
        );
      } else {
        setCapacityWarning(null);
      }
    } else {
      // Bulk mode capacity warning check
      const warnings = [];
      const completedOpt = getOptions('task_status').find(o => o.option_name === 'Completed');
      const completedId = completedOpt?.id;

      const addedHoursMap = {};
      bulkTasks.forEach(t => {
        if (t.assigned_to) {
          addedHoursMap[t.assigned_to] = (addedHoursMap[t.assigned_to] || 0) + (parseFloat(t.estimated_hours) || 0);
        }
      });

      Object.entries(addedHoursMap).forEach(([username, hours]) => {
        const profile = resourceProfiles.find(p => p.username === username);
        if (!profile) return;
        const capacity = parseFloat(profile.weekly_capacity_hours) || 40;
        const activeTasksHours = tasks
          .filter(t => t.assigned_to === username && t.status_id !== completedId)
          .reduce((sum, t) => sum + (parseFloat(t.estimated_hours) || 0), 0);
        const totalHours = activeTasksHours + hours;
        if (totalHours > capacity) {
          warnings.push(`@${username}: ${totalHours} hrs (exceeds ${capacity} capacity by ${totalHours - capacity} hrs)`);
        }
      });

      if (warnings.length > 0) {
        setCapacityWarning(`⚠️ Capacity Alert: The following assignees will exceed their capacity in this batch: ${warnings.join(', ')}`);
      } else {
        setCapacityWarning(null);
      }
    }
  }, [formData.assigned_to, formData.estimated_hours, bulkTasks, tasks, isEditMode, selectedTask, resourceProfiles]);

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedTask(null);
    setCapacityWarning(null);
    const initialOpp = opportunities[0];
    const defaultCategoryId = getOptions('work_category')[0]?.id || '';
    const defaultAssignee = allUsers[3] || allUsers[0] || '';

    setFormData({
      opportunity_id: initialOpp?.id || '',
      work_category_id: defaultCategoryId,
      title: '',
      description: '',
      deliverable_type_id: initialOpp?.deliverable_type_id || getOptions('deliverable_type')[0]?.id || '',
      assigned_to: defaultAssignee,
      reviewer: allUsers[1] || '',
      collaborators: '',
      priority_id: getOptions('priority').find(o => o.option_name === 'Medium')?.id || '',
      start_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimated_hours: 8,
      estimation_confidence_id: getOptions('estimation_confidence')[0]?.id || '',
      is_revision_work: false,
      revision_number: '',
      trigger_id: '',
      status_id: getOptions('task_status').find(o => o.option_name === 'Not Started')?.id || '',
      blocker_reason: '',
      deliverable_link: '',
      notes: ''
    });

    setBulkTasks([
      {
        title: '',
        work_category_id: defaultCategoryId,
        assigned_to: defaultAssignee,
        estimated_hours: 8,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reviewer: allUsers[1] || '',
        collaborators: '',
        description: ''
      }
    ]);

    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setIsEditMode(true);
    setSelectedTask(task);
    setCapacityWarning(null);
    setFormData({
      opportunity_id: task.opportunity_id || '',
      work_category_id: task.work_category_id || '',
      title: task.title || '',
      description: task.description || '',
      deliverable_type_id: task.deliverable_type_id || '',
      assigned_to: task.assigned_to || '',
      reviewer: task.reviewer || '',
      collaborators: task.collaborators || '',
      priority_id: task.priority_id || '',
      start_date: task.start_date ? task.start_date.split('T')[0] : '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      estimated_hours: task.estimated_hours || 0,
      estimation_confidence_id: task.estimation_confidence_id || '',
      is_revision_work: task.is_revision_work === true,
      revision_number: task.revision_number || '',
      trigger_id: task.trigger_id || '',
      status_id: task.status_id || '',
      blocker_reason: task.blocker_reason || '',
      deliverable_link: task.deliverable_link || '',
      notes: task.notes || ''
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'opportunity_id') {
      const selectedOpp = opportunities.find(o => String(o.id) === String(value));
      setFormData(prev => ({
        ...prev,
        opportunity_id: value,
        deliverable_type_id: selectedOpp?.deliverable_type_id || prev.deliverable_type_id
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSwitchChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isEditMode) {
      if (!formData.title || !formData.work_category_id || !formData.assigned_to) {
        setError('Title, Work Category, and Assignee are required.');
        return;
      }

      try {
        const res = await fetch(`/api/workitems/${selectedTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to save task');
        }

        setIsModalOpen(false);
        fetchData();
        showToast('Work item updated successfully', 'success');
        if (data.warning) {
          showAlert(data.warning, 'Capacity Alert', 'warning');
        }
      } catch (err) {
        setError(err.message);
      }
    } else {
      // Bulk submit mode
      for (let i = 0; i < bulkTasks.length; i++) {
        const t = bulkTasks[i];
        if (!t.title || !t.work_category_id || !t.assigned_to || !t.start_date || !t.due_date) {
          setError(`Task #${i + 1} is missing Title, Work Category, Assignee, Start Date, or Due Date.`);
          return;
        }
      }

      try {
        const warnings = [];
        const createdCount = bulkTasks.length;

        for (const t of bulkTasks) {
          const payload = {
            opportunity_id: formData.opportunity_id || null,
            priority_id: formData.priority_id || null,
            deliverable_type_id: formData.deliverable_type_id || null,
            status_id: formData.status_id || getOptions('task_status').find(o => o.option_name === 'Not Started')?.id || '',
            title: t.title,
            work_category_id: t.work_category_id,
            assigned_to: t.assigned_to,
            estimated_hours: parseFloat(t.estimated_hours) || 0,
            start_date: t.start_date,
            due_date: t.due_date,
            reviewer: t.reviewer || '',
            collaborators: t.collaborators || '',
            description: t.description || '',
            estimation_confidence_id: formData.estimation_confidence_id || getOptions('estimation_confidence')[0]?.id || '',
            is_revision_work: formData.is_revision_work === true,
            revision_number: formData.revision_number || '',
            trigger_id: formData.trigger_id || ''
          };

          const res = await fetch('/api/workitems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `Failed to save task: "${t.title}"`);
          }

          if (data.warning) {
            warnings.push(data.warning);
          }
        }

        setIsModalOpen(false);
        fetchData();
        showToast(`${createdCount} work items created successfully!`, 'success');
        if (warnings.length > 0) {
          showAlert(warnings.join('\n\n'), 'Capacity Alerts', 'warning');
        }
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Work Item',
      message: 'Are you sure you want to delete this work item?',
      danger: true
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/workitems/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete task');
      }
      showToast('Work item deleted successfully', 'success');
      fetchData();
    } catch (err) {
      showAlert(err.message, 'Error', 'danger');
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (userRole !== 'Admin' && !isUserAssociatedWithTask(t, currentUser, opportunities)) return false;
    if (filterOpp && t.opportunity_id !== parseInt(filterOpp, 10)) return false;
    if (filterUser && t.assigned_to !== filterUser) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>Work Items (Tasks)</h2>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Create Work Item
        </button>
      </div>

      {/* Filter panel */}
      <div className="paper-panel" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Filters:</span>
        <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <select
              className="form-control form-select"
              value={filterOpp}
              onChange={(e) => setFilterOpp(e.target.value)}
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem' }}
            >
              <option value="">All Opportunities</option>
              {opportunities.map(opp => (
                <option key={opp.id} value={opp.id}>{opp.company} - {opp.opportunity_name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <select
              className="form-control form-select"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem' }}
            >
              <option value="">All Assignees</option>
              {allUsers.map(u => (
                <option key={u} value={u}>@{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Grid List */}
      <div className="paper-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading tasks...</p>
        ) : filteredTasks.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No tasks found for the selected filters.</p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Task Title & Opportunity</th>
                  <th>Category</th>
                  <th>Assignee</th>
                  <th>Due Date</th>
                  <th>Estimate</th>
                  <th>Priority</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{task.title}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {task.opportunity_id ? `${task.company} - ${task.opportunity_name}` : 'Non-Opportunity Task'}
                        {task.is_revision_work && (
                          <span className="badge badge-danger" style={{ marginLeft: '0.5rem', padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>
                            Revision #{task.revision_number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={getOptionBadgeStyle('work_category', task.work_category_name)}>
                        {task.work_category_name}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>@{task.assigned_to}</strong>
                    </td>
                    <td>{task.due_date ? task.due_date.split('T')[0] : 'N/A'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.estimated_hours} hrs</td>
                    <td>
                      <span className="badge" style={getOptionBadgeStyle('priority', task.priority_name || 'Medium')}>
                        {task.priority_name || 'Medium'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => openEditModal(task)}>
                          Edit
                        </button>
                        <button className="btn btn-danger" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => handleDelete(task.id)}>
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

      {/* CREATE / EDIT WORK ITEM OVERLAY MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content paper-panel" style={{ maxWidth: '1400px', width: '95%' }}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              {isEditMode ? 'Edit Work Item' : 'Create New Work Item'}
            </h3>

            {error && (
              <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
                <div>{error}</div>
              </div>
            )}

            {capacityWarning && (
              <div className="alert-banner alert-banner-warning" style={{ marginBottom: '1.25rem' }}>
                <div>{capacityWarning}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {isEditMode ? (
                <>
                  {/* EDIT MODE: Single Work Item Edit Form */}
                  <div className="form-section">
                    <div className="form-section-header">
                      <span className="form-section-title">
                        <span>⚡</span> Work Item Specifications & Assignments
                      </span>
                    </div>
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>

                      <div className="form-group">
                        <label className="form-label">Linked Opportunity</label>
                        <select
                          name="opportunity_id"
                          className="form-control form-select"
                          value={formData.opportunity_id}
                          onChange={handleInputChange}
                        >
                          <option value="">None (Non-Opportunity work)</option>
                          {opportunities.map(opp => (
                            <option key={opp.id} value={opp.id}>{opp.company} - {opp.opportunity_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Work Category <span className="required">*</span></label>
                        <select
                          name="work_category_id"
                          className="form-control form-select"
                          value={formData.work_category_id}
                          onChange={handleInputChange}
                          required
                        >
                          {getOptions('work_category').map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Task Title <span className="required">*</span></label>
                        <input
                          type="text"
                          name="title"
                          className="form-control"
                          placeholder="e.g. Design Cloud Security Framework"
                          value={formData.title}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Assigned To <span className="required">*</span></label>
                        <select
                          name="assigned_to"
                          className="form-control form-select"
                          value={formData.assigned_to}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select Assignee</option>
                          {allUsers.map(u => (
                            <option key={u} value={u}>@{u}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Reviewer</label>
                        <select
                          name="reviewer"
                          className="form-control form-select"
                          value={formData.reviewer}
                          onChange={handleInputChange}
                        >
                          <option value="">None</option>
                          {allUsers.map(u => (
                            <option key={u} value={u}>@{u}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Collaborators (Comma-separated)</label>
                        <input
                          type="text"
                          name="collaborators"
                          className="form-control"
                          placeholder="e.g. bob_jones, jane_doe"
                          value={formData.collaborators}
                          onChange={handleInputChange}
                        />
                      </div>

                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-section-header">
                      <span className="form-section-title">
                        <span>⏱️</span> Estimates, Schedule & Deliverable Type
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
                        <label className="form-label">
                          Deliverable Type
                          {formData.opportunity_id && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                            </span>
                          )}
                        </label>
                        <select
                          name="deliverable_type_id"
                          className="form-control form-select"
                          value={formData.deliverable_type_id}
                          onChange={handleInputChange}
                          disabled={!!formData.opportunity_id}
                        >
                          <option value="">None</option>
                          {getOptions('deliverable_type').map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Estimated Hours <span className="required">*</span></label>
                        <input
                          type="number"
                          name="estimated_hours"
                          className="form-control"
                          min="0"
                          step="0.5"
                          placeholder="e.g. 16.0"
                          value={formData.estimated_hours}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Start Date <span className="required">*</span></label>
                        <input
                          type="date"
                          name="start_date"
                          className="form-control"
                          value={formData.start_date}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Due Date <span className="required">*</span></label>
                        <input
                          type="date"
                          name="due_date"
                          className="form-control"
                          value={formData.due_date}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-section-header">
                      <span className="form-section-title">
                        <span>📝</span> Task Brief & Deliverable Requirements
                      </span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Task Description</label>
                      <RichTextEditor
                        value={formData.description}
                        onChange={(val) => handleSwitchChange('description', val)}
                        placeholder="Detail out the scope of this task..."
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* CREATE MODE: Bulk / Multiple Work Items Form */}
                  <div className="form-section">
                    <div className="form-section-header">
                      <span className="form-section-title">
                        <span>⚙️</span> Shared Parameters (Applies to all tasks in this batch)
                      </span>
                    </div>
                    <div className="form-grid-3">

                      <div className="form-group">
                        <label className="form-label">Linked Opportunity</label>
                        <select
                          name="opportunity_id"
                          className="form-control form-select"
                          value={formData.opportunity_id}
                          onChange={handleInputChange}
                        >
                          <option value="">None (Non-Opportunity work)</option>
                          {opportunities.map(opp => (
                            <option key={opp.id} value={opp.id}>{opp.company} - {opp.opportunity_name}</option>
                          ))}
                        </select>
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
                        <label className="form-label">Deliverable Type</label>
                        <select
                          name="deliverable_type_id"
                          className="form-control form-select"
                          value={formData.deliverable_type_id}
                          onChange={handleInputChange}
                          disabled={!!formData.opportunity_id}
                        >
                          <option value="">None</option>
                          {getOptions('deliverable_type').map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                          ))}
                        </select>
                      </div>

                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-section-header">
                      <span className="form-section-title">
                        <span>⚡</span> Tasks in this Batch ({bulkTasks.length})
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: 'var(--radius-pill)', padding: '0.4rem 1.1rem', fontSize: '0.84rem' }}
                        onClick={() => {
                          const defaultCategoryId = getOptions('work_category')[0]?.id || '';
                          const defaultAssignee = allUsers[3] || allUsers[0] || '';
                          setBulkTasks(prev => [
                            ...prev,
                            {
                              title: '',
                              work_category_id: defaultCategoryId,
                              assigned_to: defaultAssignee,
                              estimated_hours: 8,
                              start_date: new Date().toISOString().split('T')[0],
                              due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                              reviewer: allUsers[1] || '',
                              collaborators: '',
                              description: ''
                            }
                          ]);
                        }}
                      >
                        + Add Another Task
                      </button>
                    </div>

                    <div style={{ overflowX: 'auto', width: '100%', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--surface-card, rgba(255, 255, 255, 0.95))' }}>
                      <div style={{ minWidth: '1750px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        
                        {/* Header Row */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '36px 2.2fr 1.6fr 1.6fr 1.3fr 1.4fr 1.4fr 1.4fr 1.8fr 2.5fr 36px',
                          gap: '0.75rem',
                          alignItems: 'center',
                          paddingBottom: '0.65rem',
                          borderBottom: '1px solid var(--border-subtle)',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-secondary)'
                        }}>
                          <div style={{ textAlign: 'center' }}>#</div>
                          <div style={{ whiteSpace: 'nowrap' }}>Task Title <span className="required">*</span></div>
                          <div style={{ whiteSpace: 'nowrap' }}>Work Category <span className="required">*</span></div>
                          <div style={{ whiteSpace: 'nowrap' }}>Assigned To <span className="required">*</span></div>
                          <div style={{ whiteSpace: 'nowrap' }}>Estimated Hours <span className="required">*</span></div>
                          <div style={{ whiteSpace: 'nowrap' }}>Start Date <span className="required">*</span></div>
                          <div style={{ whiteSpace: 'nowrap' }}>Due Date <span className="required">*</span></div>
                          <div style={{ whiteSpace: 'nowrap' }}>Reviewer</div>
                          <div style={{ whiteSpace: 'nowrap' }}>Collaborators</div>
                          <div style={{ whiteSpace: 'nowrap' }}>Task Description</div>
                          <div></div>
                        </div>

                        {/* Task Rows */}
                        {bulkTasks.map((task, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '36px 2.2fr 1.6fr 1.6fr 1.3fr 1.4fr 1.4fr 1.4fr 1.8fr 2.5fr 36px',
                              gap: '0.75rem',
                              alignItems: 'center',
                              padding: '0.5rem 0',
                              borderBottom: index === bulkTasks.length - 1 ? 'none' : '1px solid rgba(226, 232, 240, 0.5)'
                            }}
                          >
                            <div style={{
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              color: 'var(--accent-primary)'
                            }}>
                              {index + 1}
                            </div>

                            <div>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Design Cloud Security Framework"
                                value={task.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkTasks(prev => prev.map((t, idx) => idx === index ? { ...t, title: val } : t));
                                }}
                                required
                                style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div>
                              <select
                                className="form-control form-select"
                                value={task.work_category_id}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkTasks(prev => prev.map((t, idx) => idx === index ? { ...t, work_category_id: val } : t));
                                }}
                                required
                                style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                              >
                                {getOptions('work_category').map(opt => (
                                  <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <select
                                className="form-control form-select"
                                value={task.assigned_to}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkTasks(prev => prev.map((t, idx) => idx === index ? { ...t, assigned_to: val } : t));
                                }}
                                required
                                style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                              >
                                <option value="">Select Assignee</option>
                                {allUsers.map(u => (
                                  <option key={u} value={u}>@{u}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <input
                                type="number"
                                className="form-control"
                                min="0"
                                step="0.5"
                                placeholder="e.g. 16.0"
                                value={task.estimated_hours}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkTasks(prev => prev.map((t, idx) => idx === index ? { ...t, estimated_hours: val } : t));
                                }}
                                required
                                style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div>
                              <input
                                type="date"
                                className="form-control"
                                value={task.start_date}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkTasks(prev => prev.map((t, idx) => idx === index ? { ...t, start_date: val } : t));
                                }}
                                required
                                style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div>
                              <input
                                type="date"
                                className="form-control"
                                value={task.due_date}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkTasks(prev => prev.map((t, idx) => idx === index ? { ...t, due_date: val } : t));
                                }}
                                required
                                style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div>
                              <select
                                className="form-control form-select"
                                value={task.reviewer}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkTasks(prev => prev.map((t, idx) => idx === index ? { ...t, reviewer: val } : t));
                                }}
                                style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                              >
                                <option value="">None</option>
                                {allUsers.map(u => (
                                  <option key={u} value={u}>@{u}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. bob_jones, jane_doe"
                                value={task.collaborators}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkTasks(prev => prev.map((t, idx) => idx === index ? { ...t, collaborators: val } : t));
                                }}
                                style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Detail out the scope of this task..."
                                value={task.description}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkTasks(prev => prev.map((t, idx) => idx === index ? { ...t, description: val } : t));
                                }}
                                style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div style={{ textAlign: 'center' }}>
                              {bulkTasks.length > 1 && (
                                <button
                                  type="button"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#EF4444',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '1.1rem',
                                    padding: '0.2rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  onClick={() => {
                                    setBulkTasks(prev => prev.filter((_, idx) => idx !== index));
                                  }}
                                  title="Remove Task"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Action buttons */}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-pill-cobalt" style={{ padding: '0.65rem 1.75rem' }}>
                  ⚡ {isEditMode ? 'Save Changes' : 'Create Work Items'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
