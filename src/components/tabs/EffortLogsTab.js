'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isUserAssociatedWithTask, isUserAssociatedWithEffort } from '@/lib/userAssociation';

export default function EffortLogsTab() {
  const { currentUser, userRole, allUsers, getOptions, getOptionBadgeStyle, showToast, showAlert, showConfirm } = useApp();
  const [effortLogs, setEffortLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active view tab state: 'work-items' (default) or 'hours-logged'
  const [activeTab, setActiveTab] = useState('work-items');

  // Table filter states (shared across both tabs)
  const [filterOpportunity, setFilterOpportunity] = useState('');
  const [filterDeliverableType, setFilterDeliverableType] = useState('');
  const [filterPerson, setFilterPerson] = useState('');

  // Selected Opportunity state for filtering tasks inside the modal form
  const [selectedOppId, setSelectedOppId] = useState('');

  // Modal mode states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLockedTaskMode, setIsLockedTaskMode] = useState(false);
  const [lockedTask, setLockedTask] = useState(null);
  const [liveVarianceWarning, setLiveVarianceWarning] = useState(null);

  // Local date helpers (enforces Today & Yesterday only, avoids UTC offset shifting)
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Form state
  const [formData, setFormData] = useState({
    work_item_id: '',
    person: currentUser,
    date: getTodayDateString(),
    hours_logged: 2,
    effort_type_id: '',
    activity_type_id: '',
    notes: '',
    mark_completed: false
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, tasksRes, oppsRes, settingsRes] = await Promise.all([
        fetch('/api/efforts'),
        fetch('/api/workitems'),
        fetch('/api/opportunities'),
        fetch('/api/automationsettings')
      ]);
      const logsData = await logsRes.json();
      const tasksData = await tasksRes.json();
      const oppsData = await oppsRes.json();
      const settingsData = await settingsRes.json();

      setEffortLogs(logsData);
      setTasks(tasksData);
      setOpportunities(oppsData);
      setSettings(settingsData);
    } catch (e) {
      console.error('Error fetching effort data:', e);
      setError('Failed to load effort logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, person: currentUser }));
  }, [currentUser]);

  // Live effort variance warning computation
  useEffect(() => {
    if (!formData.work_item_id || !formData.hours_logged || !settings) {
      setLiveVarianceWarning(null);
      return;
    }

    const task = tasks.find(t => t.id === parseInt(formData.work_item_id, 10));
    if (!task) return;

    const estHours = parseFloat(task.estimated_hours) || 0;
    const inputHours = parseFloat(formData.hours_logged) || 0;

    const existingHours = effortLogs
      .filter(l => l.work_item_id === task.id)
      .reduce((sum, l) => sum + (parseFloat(l.hours_logged) || 0), 0);

    const totalProposed = existingHours + inputHours;
    const thresholdPct = parseFloat(settings.effort_variance_threshold) || 20.0;
    const varianceLimit = estHours * (1 + thresholdPct / 100);

    if (totalProposed > varianceLimit) {
      const pctOver = Math.round(((totalProposed - estHours) / estHours) * 100);
      setLiveVarianceWarning(
        `⚠️ Effort Variance Alert: Logging these hours will bring total effort to ${totalProposed} hrs, which is ${pctOver}% over the task's estimate of ${estHours} hrs (Configured threshold is ${thresholdPct}%).`
      );
    } else {
      setLiveVarianceWarning(null);
    }
  }, [formData.work_item_id, formData.hours_logged, tasks, effortLogs, settings]);

  // Open modal pre-filled and locked for a specific task row
  const openLogModalForTask = (task) => {
    setError(null);
    setLiveVarianceWarning(null);
    setIsLockedTaskMode(true);
    setLockedTask(task);
    setSelectedOppId(task.opportunity_id ? String(task.opportunity_id) : '');

    setFormData({
      work_item_id: task.id,
      person: currentUser,
      date: getTodayDateString(),
      hours_logged: 4,
      effort_type_id: getOptions('effort_type')[0]?.id || '',
      activity_type_id: task.work_category_id || getOptions('work_category')[0]?.id || '',
      notes: '',
      mark_completed: false
    });
    setIsModalOpen(true);
  };

  const handleOppChange = (e) => {
    const oppId = e.target.value;
    setSelectedOppId(oppId);

    const filtered = oppId
      ? tasks.filter(t => t.opportunity_id === parseInt(oppId, 10))
      : tasks;

    setFormData(prev => ({
      ...prev,
      work_item_id: filtered[0]?.id || ''
    }));
  };

  const handleTaskChange = (e) => {
    const taskId = e.target.value;
    setFormData(prev => ({ ...prev, work_item_id: taskId }));

    if (taskId) {
      const task = tasks.find(t => t.id === parseInt(taskId, 10));
      if (task && task.opportunity_id) {
        setSelectedOppId(String(task.opportunity_id));
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.work_item_id) {
      setError('Please select a Work Item Task.');
      return;
    }

    const todayStr = getTodayDateString();
    const yesterdayStr = getYesterdayDateString();
    if (formData.date < yesterdayStr || formData.date > todayStr) {
      setError(`Date must be either Today (${todayStr}) or Yesterday (${yesterdayStr}). Future or older dates are not allowed.`);
      return;
    }

    const hours = parseFloat(formData.hours_logged);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      setError('Hours Logged must be greater than 0 and less than or equal to 24.');
      return;
    }

    try {
      const res = await fetch('/api/efforts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save effort log');
      }

      setIsModalOpen(false);
      fetchData();
      showToast('Effort logged successfully', 'success');
      if (data.variance_metadata?.variance_exceeded) {
        showAlert(data.variance_metadata.warning, 'Effort Variance Warning', 'warning');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Effort Log',
      message: 'Are you sure you want to delete this effort log?',
      danger: true
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/efforts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete effort log');
      }
      showToast('Effort log deleted successfully', 'success');
      fetchData();
    } catch (err) {
      showAlert(err.message, 'Error', 'danger');
    }
  };

  // Filter tasks based on selected opportunity for modal form
  const availableTasks = selectedOppId
    ? tasks.filter(t => t.opportunity_id === parseInt(selectedOppId, 10))
    : tasks;

  // Filter work items list for "Work Items" tab
  const filteredWorkItems = tasks.filter(task => {
    if (userRole !== 'Admin' && !isUserAssociatedWithTask(task, currentUser, opportunities)) {
      return false;
    }
    if (filterOpportunity && String(task.opportunity_id) !== String(filterOpportunity)) {
      return false;
    }
    if (filterDeliverableType && String(task.deliverable_type_id) !== String(filterDeliverableType)) {
      return false;
    }
    if (filterPerson && String(task.assigned_to) !== String(filterPerson)) {
      return false;
    }
    return true;
  });

  // Filter effort logs list for "Hours Logged" tab
  const filteredEffortLogs = effortLogs.filter(log => {
    if (userRole !== 'Admin' && !isUserAssociatedWithEffort(log, currentUser, tasks, opportunities)) {
      return false;
    }
    if (filterOpportunity && String(log.opportunity_id) !== String(filterOpportunity)) {
      return false;
    }
    if (filterDeliverableType && String(log.deliverable_type_id) !== String(filterDeliverableType)) {
      return false;
    }
    if (filterPerson && String(log.person) !== String(filterPerson)) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>Workload Effort Logging</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Log hours directly against tasks, monitor burn rates, and track historical time allocations.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="paper-panel" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '100px' }}>
          <span>🔍</span> Filter Views:
        </div>

        {/* Filter by Opportunity */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <select
            className="form-control form-select"
            value={filterOpportunity}
            onChange={(e) => setFilterOpportunity(e.target.value)}
            style={{ fontSize: '0.88rem', padding: '0.45rem 0.8rem' }}
          >
            <option value="">All Opportunities</option>
            {opportunities.map(opp => (
              <option key={opp.id} value={opp.id}>
                {opp.company} - {opp.opportunity_name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Deliverable Type */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <select
            className="form-control form-select"
            value={filterDeliverableType}
            onChange={(e) => setFilterDeliverableType(e.target.value)}
            style={{ fontSize: '0.88rem', padding: '0.45rem 0.8rem' }}
          >
            <option value="">All Deliverable Types</option>
            {getOptions('deliverable_type').map(dt => (
              <option key={dt.id} value={dt.id}>
                {dt.option_name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Team Member */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <select
            className="form-control form-select"
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
            style={{ fontSize: '0.88rem', padding: '0.45rem 0.8rem' }}
          >
            <option value="">All Team Members</option>
            {allUsers.map(u => (
              <option key={u} value={u}>
                @{u}
              </option>
            ))}
          </select>
        </div>

        {(filterOpportunity || filterDeliverableType || filterPerson) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setFilterOpportunity('');
              setFilterDeliverableType('');
              setFilterPerson('');
            }}
            style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Segmented Tab Control */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="tab-group">
          <button
            type="button"
            className={`tab-item ${activeTab === 'work-items' ? 'active' : ''}`}
            onClick={() => setActiveTab('work-items')}
          >
            <span>📋</span> Work Items ({filteredWorkItems.length})
          </button>
          <button
            type="button"
            className={`tab-item ${activeTab === 'hours-logged' ? 'active' : ''}`}
            onClick={() => setActiveTab('hours-logged')}
          >
            <span>⏱️</span> Hours Logged ({filteredEffortLogs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: WORK ITEMS LIST VIEW */}
      {activeTab === 'work-items' && (
        <div className="paper-panel" style={{ overflow: 'hidden' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading work items...</p>
          ) : filteredWorkItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>No Work Items Match Filters</h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {tasks.length === 0
                  ? 'No active work items available. Register work items in the Work Items tab first.'
                  : 'Try adjusting or resetting your selected filters above to view matching tasks.'}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Task Title & Opportunity</th>
                    <th>Work Category</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                    <th>Est. Hours</th>
                    <th>Logged Hours</th>
                    <th style={{ minWidth: '140px' }}>Burn Progress</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkItems.map((task) => {
                    const loggedHours = effortLogs
                      .filter(l => l.work_item_id === task.id)
                      .reduce((sum, l) => sum + (parseFloat(l.hours_logged) || 0), 0);
                    const estHours = parseFloat(task.estimated_hours) || 0;
                    const pct = estHours > 0 ? Math.round((loggedHours / estHours) * 100) : 0;

                    let progressColor = 'var(--color-success)';
                    let badgeClass = 'badge-success';
                    if (pct > 100) {
                      progressColor = 'var(--color-danger)';
                      badgeClass = 'badge-danger';
                    } else if (pct > 90) {
                      progressColor = 'var(--color-warning)';
                      badgeClass = 'badge-warning';
                    }

                    return (
                      <tr key={task.id}>
                        <td>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{task.title}</strong>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {task.opportunity_name ? `${task.company} - ${task.opportunity_name}` : 'General Work'}
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={getOptionBadgeStyle('work_category', task.work_category_name)}>
                            {task.work_category_name || 'General'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            @{task.assigned_to}
                          </strong>
                        </td>
                        <td style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {task.due_date ? task.due_date.split('T')[0] : '-'}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {estHours > 0 ? `${estHours} hrs` : '-'}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {loggedHours} hrs
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: '130px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                              <span style={{ fontWeight: 700, color: pct > 100 ? 'var(--color-danger-text)' : pct > 90 ? 'var(--color-warning-text)' : 'var(--text-primary)' }}>
                                {loggedHours} / {estHours}h
                              </span>
                              <span className={`badge ${badgeClass}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                                {pct}%
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(226, 232, 240, 0.6)', borderRadius: '999px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${Math.min(pct, 100)}%`,
                                  backgroundColor: progressColor,
                                  borderRadius: '999px',
                                  transition: 'width 0.3s ease'
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={getOptionBadgeStyle('task_status', task.status_name)}>
                            {task.status_name || 'Not Started'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                            onClick={() => openLogModalForTask(task)}
                          >
                            + Add Log
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HOURS LOGGED LOG HISTORY VIEW */}
      {activeTab === 'hours-logged' && (
        <div className="paper-panel" style={{ overflow: 'hidden' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading effort logs...</p>
          ) : filteredEffortLogs.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              {effortLogs.length === 0
                ? 'No hours logged yet. Click "+ Add Log" on any work item task to submit workload details.'
                : 'No effort logs match the selected filter criteria.'}
            </p>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Person</th>
                    <th>Work Item & Opportunity</th>
                    <th>Deliverable</th>
                    <th>Hours Logged</th>
                    <th>Activity Type</th>
                    <th>Effort Type</th>
                    <th>Notes</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEffortLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {log.date ? (typeof log.date === 'string' ? log.date.split('T')[0] : log.date) : ''}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          @{log.person}
                        </strong>
                      </td>
                      <td>
                        <div>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{log.work_item_title}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {log.opportunity_name ? `${log.company} - ${log.opportunity_name}` : 'General Work'}
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={getOptionBadgeStyle('deliverable_type', log.deliverable_type_name)}>
                          {log.deliverable_type_name || 'N/A'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {log.hours_logged} hrs
                      </td>
                      <td>
                        <span className="badge" style={getOptionBadgeStyle('work_category', log.activity_type_name)}>
                          {log.activity_type_name || 'General'}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={getOptionBadgeStyle('effort_type', log.effort_type_name)}>
                          {log.effort_type_name || 'Standard'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.notes}>
                        {log.notes || '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => handleDelete(log.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LOG EFFORT OVERLAY MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content paper-panel" style={{ maxWidth: '1000px', width: '95%' }}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              Log Workload Hours
            </h3>

            {error && (
              <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
                <div>{error}</div>
              </div>
            )}

            {liveVarianceWarning && (
              <div className="alert-banner alert-banner-warning" style={{ marginBottom: '1.25rem' }}>
                <div>{liveVarianceWarning}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-title">
                    <span>⏱️</span> Workload Task Selection & Log Details
                  </span>
                </div>
                
                {/* Locked Task Card */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                    Selected Work Item Task
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {lockedTask?.title}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>Opportunity: <strong style={{ color: 'var(--text-primary)' }}>{lockedTask?.opportunity_name ? `${lockedTask.company} - ${lockedTask.opportunity_name}` : 'General Work'}</strong></span>
                    <span>•</span>
                    <span>Assignee: <strong style={{ color: 'var(--text-primary)' }}>@{lockedTask?.assigned_to}</strong></span>
                    <span>•</span>
                    <span>Estimated: <strong style={{ color: 'var(--text-primary)' }}>{lockedTask?.estimated_hours || 0} hrs</strong></span>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label">Logging Person</label>
                  <input
                    type="text"
                    name="person"
                    className="form-control"
                    value={formData.person}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-section-title">
                    <span>📊</span> Date, Hours & Classification
                  </span>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Date Worked <span className="required">*</span></label>
                    <input
                      type="date"
                      name="date"
                      className="form-control"
                      value={formData.date}
                      min={getYesterdayDateString()}
                      max={getTodayDateString()}
                      onChange={handleInputChange}
                      required
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Allowed dates: Today ({getTodayDateString()}) and Yesterday ({getYesterdayDateString()}) only.
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Hours Logged <span className="required">*</span></label>
                    <input
                      type="number"
                      name="hours_logged"
                      className="form-control"
                      min="0.1"
                      max="24"
                      step="0.1"
                      placeholder="e.g. 4.5"
                      value={formData.hours_logged}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Activity Type</label>
                    <select
                      name="activity_type_id"
                      className="form-control form-select"
                      value={formData.activity_type_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Activity</option>
                      {getOptions('work_category').map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Effort Type</label>
                    <select
                      name="effort_type_id"
                      className="form-control form-select"
                      value={formData.effort_type_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Standard / Core</option>
                      {getOptions('effort_type').map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Activity Notes</label>
                  <input
                    type="text"
                    name="notes"
                    className="form-control"
                    placeholder="Summarize work done during these hours..."
                    value={formData.notes}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Explicit Completion Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="mark_completed_checkbox"
                    name="mark_completed"
                    checked={formData.mark_completed}
                    onChange={handleInputChange}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                  />
                  <label htmlFor="mark_completed_checkbox" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                    Mark Task as Completed upon logging these hours
                  </label>
                </div>

              </div>

              {/* Action buttons */}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-pill-cobalt" style={{ padding: '0.65rem 1.75rem' }}>
                  ⚡ Log Effort Hours
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
