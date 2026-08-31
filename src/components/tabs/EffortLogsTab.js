'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function EffortLogsTab() {
  const { currentUser, allUsers, getOptions, showToast, showAlert, showConfirm } = useApp();
  const [effortLogs, setEffortLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Table filter states
  const [filterOpportunity, setFilterOpportunity] = useState('');
  const [filterDeliverableType, setFilterDeliverableType] = useState('');
  const [filterPerson, setFilterPerson] = useState('');

  // Selected Opportunity state for filtering tasks inside the modal form
  const [selectedOppId, setSelectedOppId] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [liveVarianceWarning, setLiveVarianceWarning] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    work_item_id: '',
    person: currentUser,
    date: new Date().toISOString().split('T')[0],
    hours_logged: 2,
    effort_type_id: '',
    activity_type_id: '',
    notes: ''
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

  const openCreateModal = () => {
    setError(null);
    setLiveVarianceWarning(null);

    const firstOppId = opportunities[0]?.id ? String(opportunities[0].id) : '';
    setSelectedOppId(firstOppId);

    const filteredTasks = firstOppId
      ? tasks.filter(t => t.opportunity_id === parseInt(firstOppId, 10))
      : tasks;

    setFormData({
      work_item_id: filteredTasks[0]?.id || tasks[0]?.id || '',
      person: currentUser,
      date: new Date().toISOString().split('T')[0],
      hours_logged: 4,
      effort_type_id: getOptions('effort_type')[0]?.id || '',
      activity_type_id: getOptions('work_category')[0]?.id || '',
      notes: ''
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

    // Auto-sync selected opportunity dropdown if task is changed directly
    if (taskId) {
      const task = tasks.find(t => t.id === parseInt(taskId, 10));
      if (task && task.opportunity_id) {
        setSelectedOppId(String(task.opportunity_id));
      }
    }
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

    if (!formData.work_item_id) {
      setError('Please select a Work Item Task.');
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

  // Filter effort logs based on table filters
  const filteredEffortLogs = effortLogs.filter(log => {
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
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>Effort Tracking Log</h2>
        <button className="btn btn-primary" onClick={openCreateModal} disabled={tasks.length === 0}>
          {tasks.length === 0 ? 'No active tasks to log' : 'Log Effort Hours'}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="paper-panel" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '100px' }}>
          <span>🔍</span> Filter Logs:
        </div>

        {/* Filter by Opportunity */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <select
            className="form-control form-select"
            value={filterOpportunity}
            onChange={(e) => setFilterOpportunity(e.target.value)}
            style={{ fontSize: '0.88rem', padding: '0.5rem 0.8rem' }}
          >
            <option value="">All Opportunities</option>
            {opportunities.map(opp => (
              <option key={opp.id} value={opp.id}>
                {opp.opportunity_name} ({opp.company})
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
            style={{ fontSize: '0.88rem', padding: '0.5rem 0.8rem' }}
          >
            <option value="">All Deliverable Types</option>
            {getOptions('deliverable_type').map(dt => (
              <option key={dt.id} value={dt.id}>
                {dt.option_name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Logging Person */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <select
            className="form-control form-select"
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
            style={{ fontSize: '0.88rem', padding: '0.5rem 0.8rem' }}
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

      {/* Main Table Panel */}
      <div className="paper-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading effort logs...</p>
        ) : filteredEffortLogs.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            {effortLogs.length === 0
              ? 'No hours logged yet. Click "Log Effort Hours" to submit workload details.'
              : 'No effort logs match the selected filter criteria.'}
          </p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Person</th>
                  <th>Work Item / Opportunity</th>
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
                    <td><strong style={{ color: 'var(--text-primary)' }}>{log.date ? log.date.split('T')[0] : ''}</strong></td>
                    <td>
                      <span className="badge badge-neutral">
                        @{log.person}
                      </span>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{log.work_item_title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {log.opportunity_name ? `${log.company} - ${log.opportunity_name}` : 'General Work'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {log.deliverable_type_name || 'N/A'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.hours_logged} hrs</td>
                    <td><span className="badge badge-info">{log.activity_type_name || 'General'}</span></td>
                    <td><span className="badge badge-neutral">{log.effort_type_name || 'Standard'}</span></td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.notes}>
                      {log.notes || '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-danger" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }} onClick={() => handleDelete(log.id)}>
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

      {/* LOG EFFORT OVERLAY MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content paper-panel" style={{ maxWidth: '600px' }}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              Log Effort Workload
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
                
                {/* Opportunity Selector Field at Top */}
                <div className="form-group">
                  <label className="form-label">Select Opportunity</label>
                  <select
                    className="form-control form-select"
                    value={selectedOppId}
                    onChange={handleOppChange}
                  >
                    <option value="">Show All Opportunities</option>
                    {opportunities.map(opp => (
                      <option key={opp.id} value={opp.id}>
                        {opp.opportunity_name} ({opp.company})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtered Work Item Task Dropdown */}
                <div className="form-group">
                  <label className="form-label">Work Item Task <span className="required">*</span></label>
                  <select
                    name="work_item_id"
                    className="form-control form-select"
                    value={formData.work_item_id}
                    onChange={handleTaskChange}
                    required
                  >
                    {availableTasks.length === 0 ? (
                      <option value="" disabled>No work items found for selected opportunity</option>
                    ) : (
                      <>
                        <option value="">Select a task...</option>
                        {availableTasks.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.title} — Est: {t.estimated_hours}h
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
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
                      onChange={handleInputChange}
                      required
                    />
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
              </div>

              {/* Action buttons */}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-pill-cobalt" style={{ padding: '0.65rem 1.75rem' }} disabled={availableTasks.length === 0}>
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
