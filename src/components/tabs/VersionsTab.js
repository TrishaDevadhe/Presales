'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isUserAssociatedWithOpp, isUserAssociatedWithTask } from '@/lib/userAssociation';

export default function VersionsTab() {
  const { currentUser, userRole, allUsers, getOptions, getOptionBadgeStyle, showToast, showAlert, showConfirm } = useApp();
  const [versions, setVersions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active view tab state: 'work-items' (default) or 'revision-logs'
  const [activeTab, setActiveTab] = useState('work-items');

  // Filters state
  const [filterOpportunity, setFilterOpportunity] = useState('');
  const [filterDeliverableType, setFilterDeliverableType] = useState('');
  const [filterPerson, setFilterPerson] = useState('');

  // Modal state for revising or terminating a work item
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [reviseFormData, setReviseFormData] = useState({
    is_terminated: false,
    version_number: 2,
    revising_person: currentUser || '',
    revision_description: '',
    trigger_source_id: '',
    version_type_id: '',
    estimated_rework_hours: 4,
    terminating_person: currentUser || '',
    termination_reason: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [versionsRes, oppsRes, tasksRes] = await Promise.all([
        fetch('/api/versions'),
        fetch('/api/opportunities'),
        fetch('/api/workitems')
      ]);
      const versionsData = await versionsRes.json();
      const oppsData = await oppsRes.json();
      const tasksData = await tasksRes.json();

      setVersions(Array.isArray(versionsData) ? versionsData : []);
      setOpportunities(Array.isArray(oppsData) ? oppsData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (e) {
      console.error('Error fetching revision log data:', e);
      setError('Failed to load revision logs and work items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update default revising/terminating person when currentUser loads
  useEffect(() => {
    if (currentUser) {
      setReviseFormData(prev => ({
        ...prev,
        revising_person: currentUser,
        terminating_person: currentUser
      }));
    }
  }, [currentUser]);

  // Open modal to revise or terminate a specific work item
  const openReviseModal = (task) => {
    setError(null);
    setSelectedTask(task);
    const currentVer = task.revision_number ? parseInt(task.revision_number, 10) : 1;
    const nextVer = currentVer + 1;

    setReviseFormData({
      is_terminated: false,
      version_number: nextVer,
      revising_person: currentUser || task.assigned_to || allUsers[0] || '',
      revision_description: '',
      trigger_source_id: getOptions('trigger_source')[0]?.id || '',
      version_type_id: getOptions('version_type')[0]?.id || '',
      estimated_rework_hours: task.estimated_hours || 4,
      terminating_person: currentUser || task.reviewer || task.assigned_to || allUsers[0] || '',
      termination_reason: ''
    });
    setIsReviseModalOpen(true);
  };

  // Submit handler: Process either Termination OR Revision
  const handleReviseSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedTask) return;

    // === TERMINATION FLOW ===
    if (reviseFormData.is_terminated) {
      if (!reviseFormData.termination_reason.trim()) {
        setError('Please provide a termination reason explaining why this work item is being terminated.');
        return;
      }

      try {
        const blockedStatus = getOptions('task_status').find(s => s.option_name === 'Blocked') || { id: 4 };
        const terminatingUser = reviseFormData.terminating_person || currentUser || 'Admin';

        // 1. Update task status to Blocked & save termination metadata
        const taskUpdatePayload = {
          ...selectedTask,
          status_id: blockedStatus.id,
          blocker_reason: `[Terminated by @${terminatingUser}] ${reviseFormData.termination_reason}`,
          reviewer: terminatingUser,
          start_date: selectedTask.start_date ? selectedTask.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
          due_date: selectedTask.due_date ? selectedTask.due_date.split('T')[0] : new Date().toISOString().split('T')[0]
        };

        const updateRes = await fetch(`/api/workitems/${selectedTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskUpdatePayload)
        });

        if (!updateRes.ok) {
          const errData = await updateRes.json();
          throw new Error(errData.error || 'Failed to terminate work item');
        }

        // 2. Log termination entry in /api/versions for audit trail
        const versionPayload = {
          opportunity_id: selectedTask.opportunity_id,
          version_number: selectedTask.revision_number ? parseInt(selectedTask.revision_number, 10) : 1,
          version_type_id: reviseFormData.version_type_id || getOptions('version_type')[0]?.id,
          trigger_source_id: reviseFormData.trigger_source_id || getOptions('trigger_source')[0]?.id,
          change_summary: `[WORK ITEM TERMINATED] "${selectedTask.title}" terminated by @${terminatingUser}. Reason: ${reviseFormData.termination_reason}`,
          commercial_changed: false,
          scope_changed: true,
          timeline_changed: false,
          estimated_rework_hours: 0,
          reviewed_by: terminatingUser,
          approved_by: currentUser || terminatingUser
        };

        await fetch('/api/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(versionPayload)
        });

        setIsReviseModalOpen(false);
        showToast(`🚫 Work item "${selectedTask.title}" set to Blocked and stored in Archives.`, 'success');
        fetchData();
      } catch (err) {
        console.error('Error terminating work item:', err);
        setError(err.message || 'Failed to terminate work item');
      }
      return;
    }

    // === STANDARD REVISION FLOW ===
    if (!reviseFormData.revision_description.trim()) {
      setError('Please provide a revision description explaining why this revision was required.');
      return;
    }

    try {
      const nextVer = reviseFormData.version_number;

      // 1. Log the revision entry in /api/versions
      const versionPayload = {
        opportunity_id: selectedTask.opportunity_id,
        version_number: nextVer,
        version_type_id: reviseFormData.version_type_id || getOptions('version_type')[0]?.id,
        trigger_source_id: reviseFormData.trigger_source_id || getOptions('trigger_source')[0]?.id,
        change_summary: `[Work Item Revision v${nextVer} for "${selectedTask.title}"] ${reviseFormData.revision_description}`,
        commercial_changed: false,
        scope_changed: true,
        timeline_changed: false,
        estimated_rework_hours: parseFloat(reviseFormData.estimated_rework_hours) || 0,
        reviewed_by: reviseFormData.revising_person,
        approved_by: currentUser || reviseFormData.revising_person
      };

      const verRes = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(versionPayload)
      });

      if (!verRes.ok) {
        const errData = await verRes.json();
        throw new Error(errData.error || 'Failed to log revision entry');
      }

      // 2. Create the new revised work item in /api/workitems with 'In Progress' status
      const cleanBaseTitle = selectedTask.title.replace(/\s*\(v\d+\)/gi, '').trim();
      const newWorkItemTitle = `${cleanBaseTitle} (v${nextVer})`;

      const inProgressStatus = getOptions('task_status').find(s => s.option_name === 'In Progress')?.id || selectedTask.status_id;

      const newTaskPayload = {
        opportunity_id: selectedTask.opportunity_id,
        work_category_id: selectedTask.work_category_id,
        deliverable_type_id: selectedTask.deliverable_type_id,
        title: newWorkItemTitle,
        description: `[Revised Version ${nextVer} - Revised by @${reviseFormData.revising_person}]\nReason: ${reviseFormData.revision_description}\n\nPrevious Description:\n${selectedTask.description || ''}`,
        assigned_to: selectedTask.assigned_to,
        reviewer: selectedTask.reviewer,
        collaborators: selectedTask.collaborators,
        priority_id: selectedTask.priority_id,
        start_date: new Date().toISOString().split('T')[0],
        due_date: selectedTask.due_date ? selectedTask.due_date.split('T')[0] : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estimated_hours: parseFloat(reviseFormData.estimated_rework_hours) || selectedTask.estimated_hours || 0,
        estimation_confidence_id: selectedTask.estimation_confidence_id,
        is_revision_work: true,
        revision_number: nextVer,
        status_id: inProgressStatus,
        blocker_reason: ''
      };

      const taskRes = await fetch('/api/workitems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskPayload)
      });

      if (!taskRes.ok) {
        const errData = await taskRes.json();
        throw new Error(errData.error || 'Failed to create revised work item');
      }

      // 3. Mark the original work item as Cancelled (superseded) so it is removed from active revision work items list
      const cancelledStatus = getOptions('task_status').find(s => s.option_name === 'Cancelled') ||
        getOptions('task_status').find(s => s.option_name === 'Terminated') || { id: 6 };

      await fetch(`/api/workitems/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedTask,
          status_id: cancelledStatus.id,
          blocker_reason: `[Revised to v${nextVer} by @${reviseFormData.revising_person}] Superseded by new version task "${newWorkItemTitle}".`,
          start_date: selectedTask.start_date ? selectedTask.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
          due_date: selectedTask.due_date ? selectedTask.due_date.split('T')[0] : new Date().toISOString().split('T')[0]
        })
      });

      setIsReviseModalOpen(false);
      showToast(`✓ Work item revised to Version ${nextVer}! Created new task "${newWorkItemTitle}".`, 'success');
      fetchData();
    } catch (err) {
      console.error('Error submitting revision:', err);
      setError(err.message || 'Failed to process revision');
    }
  };

  const handleDeleteVersion = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Revision Log',
      message: 'Are you sure you want to delete this revision log entry?',
      danger: true
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/versions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete version log');
      }
      showToast('Revision log deleted successfully', 'success');
      fetchData();
    } catch (err) {
      showAlert(err.message, 'Error', 'danger');
    }
  };

  // Filtering work items (show work items whose status is ANYTHING OTHER THAN 'Not Started' or 'Blocked')
  const filteredWorkItems = tasks.filter(task => {
    if (userRole !== 'Admin' && !isUserAssociatedWithTask(task, currentUser, opportunities)) return false;
    if (filterOpportunity && String(task.opportunity_id) !== String(filterOpportunity)) return false;
    if (filterDeliverableType && String(task.deliverable_type_id) !== String(filterDeliverableType)) return false;
    if (filterPerson && String(task.assigned_to) !== String(filterPerson)) return false;

    // Rule 1: Exclude tasks whose status is 'Not Started', 'Blocked', 'Cancelled', or 'Terminated'
    const status = (task.status_name || '').toLowerCase();
    if (status === 'not started' || status === 'blocked' || status === 'cancelled' || status === 'terminated') return false;

    return true;
  });

  // Filtering revision logs
  const filteredRevisionLogs = versions.filter(ver => {
    const opp = opportunities.find(o => String(o.id) === String(ver.opportunity_id));
    if (userRole !== 'Admin' && opp && !isUserAssociatedWithOpp(opp, currentUser)) return false;
    if (filterOpportunity && String(ver.opportunity_id) !== String(filterOpportunity)) return false;
    if (filterPerson && (ver.reviewed_by || '').toLowerCase() !== filterPerson.toLowerCase()) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Filter Views Panel */}
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
            className={`tab-item ${activeTab === 'revision-logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('revision-logs')}
          >
            <span>🔄</span> Revision Logs ({filteredRevisionLogs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: WORK ITEMS LIST FOR REVISION */}
      {activeTab === 'work-items' && (
        <div className="paper-panel" style={{ overflow: 'hidden' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading work items...</p>
          ) : filteredWorkItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>No Active Work Items Available</h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {tasks.length === 0
                  ? 'No active work items registered yet.'
                  : 'Adjust your selected filters to display matching work items.'}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Work Item & Opportunity</th>
                    <th>Work Category</th>
                    <th>Assignee</th>
                    <th>Version #</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkItems.map((task) => {
                    const verNum = task.revision_number ? parseInt(task.revision_number, 10) : 1;
                    return (
                      <tr key={task.id}>
                        <td>
                          <div><strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{task.title}</strong></div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            🏢 {task.company || 'Direct Work'} {task.opportunity_name ? `- ${task.opportunity_name}` : ''}
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={getOptionBadgeStyle('work_category', task.work_category_name)}>
                            {task.work_category_name || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>@{task.assigned_to}</strong>
                        </td>
                        <td>
                          <span className="badge badge-info" style={{ fontWeight: 700 }}>
                            v{verNum}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={getOptionBadgeStyle('task_status', task.status_name)}>
                            {task.status_name || 'Not Started'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-pill-cobalt"
                            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                            onClick={() => openReviseModal(task)}
                          >
                            🔄 Revise Work Item
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

      {/* TAB 2: REVISION LOGS HISTORY LIST */}
      {activeTab === 'revision-logs' && (
        <div className="paper-panel" style={{ overflow: 'hidden' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading revision logs...</p>
          ) : filteredRevisionLogs.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No revision logs recorded yet. Revise a work item from the &quot;Work Items&quot; tab above.</p>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Opportunity & Details</th>
                    <th>Version #</th>
                    <th>Revising Person</th>
                    <th>Trigger Source</th>
                    <th>Revision Description</th>
                    <th>Rework Hours</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRevisionLogs.map((ver) => (
                    <tr key={ver.id}>
                      <td>
                        <div><strong style={{ color: 'var(--text-primary)' }}>{ver.opportunity_name}</strong></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🏢 {ver.company}</div>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontWeight: 700 }}>
                          v{ver.version_number}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          @{ver.reviewed_by || ver.approved_by || 'Unassigned'}
                        </strong>
                      </td>
                      <td>
                        <span className="badge" style={getOptionBadgeStyle('trigger_source', ver.trigger_source_name)}>
                          {ver.trigger_source_name || 'Revision'}
                        </span>
                      </td>
                      <td style={{ maxWidth: '320px', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {ver.change_summary}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ver.estimated_rework_hours || 0} hrs
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => handleDeleteVersion(ver.id)}
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

      {/* REVISE / TERMINATE WORK ITEM MODAL */}
      {isReviseModalOpen && selectedTask && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsReviseModalOpen(false); }}>
          <div className="modal-content paper-panel" style={{ maxWidth: '650px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setIsReviseModalOpen(false)}>×</button>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', fontWeight: 700 }}>
              {reviseFormData.is_terminated ? '🚫 Terminate Work Item' : '🔄 Revise Work Item'}
            </h3>

            {/* Readonly Summary of Original Task */}
            <div style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Work Item Target</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{selectedTask.title}</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                🏢 {selectedTask.company || 'Direct'} {selectedTask.opportunity_name ? `- ${selectedTask.opportunity_name}` : ''} • Current: <strong>v{selectedTask.revision_number || 1}</strong>
              </div>
            </div>

            {error && (
              <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleReviseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Option Checkbox: Mark Work Item as Terminated */}
              <div style={{
                background: reviseFormData.is_terminated ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary)',
                border: `1px solid ${reviseFormData.is_terminated ? 'rgba(239, 68, 68, 0.3)' : 'var(--glass-border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                transition: 'all 0.2s ease'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: 700, color: reviseFormData.is_terminated ? '#dc2626' : 'var(--text-primary)', fontSize: '0.95rem' }}>
                  <input
                    type="checkbox"
                    checked={reviseFormData.is_terminated}
                    onChange={(e) => setReviseFormData(prev => ({ ...prev, is_terminated: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>🚫 Mark Work Item as Terminated</span>
                </label>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginLeft: '1.75rem' }}>
                  {reviseFormData.is_terminated
                    ? 'This work item will be marked as Terminated, removed from active views across the app, and stored in the Work Item Archives.'
                    : 'Check this option if the work item needs to be terminated or cancelled instead of revised.'}
                </div>
              </div>

              {reviseFormData.is_terminated ? (
                /* TERMINATION FIELDS */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Who is Terminating It <span className="required">*</span></label>
                    <select
                      className="form-control form-select"
                      value={reviseFormData.terminating_person}
                      onChange={(e) => setReviseFormData(prev => ({ ...prev, terminating_person: e.target.value }))}
                      required
                    >
                      <option value="">Select Person</option>
                      {allUsers.map(u => (
                        <option key={u} value={u}>@{u}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Why It Was Terminated (Termination Reason) <span className="required">*</span></label>
                    <textarea
                      className="form-control"
                      rows={4}
                      placeholder="Provide detailed justification explaining why this work item is being terminated..."
                      value={reviseFormData.termination_reason}
                      onChange={(e) => setReviseFormData(prev => ({ ...prev, termination_reason: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsReviseModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-danger" style={{ padding: '0.65rem 1.75rem', fontWeight: 700 }}>
                      🚫 Terminate Work Item & Send to Archives
                    </button>
                  </div>
                </div>
              ) : (
                /* REVISION FIELDS (Standard Flow) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>

                    {/* Auto-computed Next Version Number */}
                    <div className="form-group">
                      <label className="form-label">Revised Version Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={`Version ${reviseFormData.version_number} (v${reviseFormData.version_number})`}
                        disabled
                        style={{ fontWeight: 700, color: 'var(--accent-secondary)', background: 'var(--bg-secondary)' }}
                      />
                    </div>

                    {/* Name of Person Revising */}
                    <div className="form-group">
                      <label className="form-label">Person Revising <span className="required">*</span></label>
                      <select
                        className="form-control form-select"
                        value={reviseFormData.revising_person}
                        onChange={(e) => setReviseFormData(prev => ({ ...prev, revising_person: e.target.value }))}
                        required
                      >
                        <option value="">Select Member</option>
                        {allUsers.map(u => (
                          <option key={u} value={u}>@{u}</option>
                        ))}
                      </select>
                    </div>

                    {/* Trigger Source */}
                    <div className="form-group">
                      <label className="form-label">Trigger Source</label>
                      <select
                        className="form-control form-select"
                        value={reviseFormData.trigger_source_id}
                        onChange={(e) => setReviseFormData(prev => ({ ...prev, trigger_source_id: e.target.value }))}
                      >
                        {getOptions('trigger_source').map(ts => (
                          <option key={ts.id} value={ts.id}>{ts.option_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Rework Hours */}
                    <div className="form-group">
                      <label className="form-label">Estimated Rework Hours</label>
                      <input
                        type="number"
                        className="form-control"
                        value={reviseFormData.estimated_rework_hours}
                        onChange={(e) => setReviseFormData(prev => ({ ...prev, estimated_rework_hours: e.target.value }))}
                        min="0"
                        step="0.5"
                      />
                    </div>

                  </div>

                  {/* Revision Description */}
                  <div className="form-group">
                    <label className="form-label">Revision Description / Reason <span className="required">*</span></label>
                    <textarea
                      className="form-control"
                      rows={4}
                      placeholder="Explain why this work item revision was required (e.g. Scope update requested by client, technical redesign needed)..."
                      value={reviseFormData.revision_description}
                      onChange={(e) => setReviseFormData(prev => ({ ...prev, revision_description: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsReviseModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-pill-cobalt" style={{ padding: '0.65rem 1.75rem' }}>
                      ⚡ Submit Revision & Create Revised Work Item
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
