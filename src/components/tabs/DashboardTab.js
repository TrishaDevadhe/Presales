'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isUserAssociatedWithOpp, isUserAssociatedWithTask } from '@/lib/userAssociation';

export default function DashboardTab() {
  const { currentUser, userRole, getOptionColor, getOptionBadgeStyle } = useApp();
  const [data, setData] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, oppsRes, tasksRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/opportunities'),
        fetch('/api/workitems')
      ]);
      const json = await dashRes.json();
      const oppsData = await oppsRes.json();
      const tasksData = await tasksRes.json();

      if (!dashRes.ok || json.error) {
        throw new Error(json.error || `HTTP error! status: ${dashRes.status}`);
      }
      setData(json);
      setOpportunities(oppsData);
      setTasks(tasksData);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
      setError(e.message || 'Failed to connect to database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
        Initializing Stage Metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-banner alert-banner-danger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.1rem' }}>
          ⚠️ System Connection Alert
        </div>
        <p style={{ fontSize: '0.92rem' }}>{error}</p>
        <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={fetchDashboardData}>
          🔄 Retry Connection
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary = {}, tasks_by_status = [], overdue_tasks = [], workload = [], timeline_alerts = [], rework_hotspots = [] } = data;

  const displaySummary = { ...summary };
  let displayTimelineAlerts = timeline_alerts;
  let displayWorkload = workload;
  let displayOverdueTasks = overdue_tasks;
  let displayReworkHotspots = rework_hotspots;
  let displayTasksByStatus = tasks_by_status;

  if (userRole !== 'Admin' && currentUser) {
    const userOpps = opportunities.filter(o => isUserAssociatedWithOpp(o, currentUser));
    const userTasks = tasks.filter(t => isUserAssociatedWithTask(t, currentUser, opportunities));

    displaySummary.total_opportunities = userOpps.length;
    displaySummary.active_tasks = userTasks.filter(t => t.status_name !== 'Completed').length;

    displayTimelineAlerts = timeline_alerts.filter(opp => isUserAssociatedWithOpp(opp, currentUser));
    displayWorkload = workload.filter(w => (w.username || '').toLowerCase() === currentUser.toLowerCase());
    displayOverdueTasks = overdue_tasks.filter(t => isUserAssociatedWithTask(t, currentUser, opportunities));
    displayReworkHotspots = rework_hotspots.filter(h => isUserAssociatedWithOpp(h, currentUser));

    const statusCounts = {};
    userTasks.forEach(t => {
      const name = t.status_name || 'Not Started';
      statusCounts[name] = (statusCounts[name] || 0) + 1;
    });

    displayTasksByStatus = tasks_by_status.map(st => ({
      ...st,
      count: statusCounts[st.status_name] || 0
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Level Metrics Cards — Floating Glass Panel */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        
        <div className="paper-panel metrics-card">
          <div className="metric-icon-wrapper" style={{ background: 'rgba(37, 99, 235, 0.15)', color: 'var(--accent-secondary)' }}>📈</div>
          <div className="metric-info">
            <span className="metric-label">{userRole === 'Admin' ? 'Total Opportunities' : 'Your Opportunities'}</span>
            <span className="metric-value">{displaySummary.total_opportunities || 0}</span>
          </div>
        </div>

        <div className="paper-panel metrics-card">
          <div className="metric-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning-text)' }}>⚡</div>
          <div className="metric-info">
            <span className="metric-label">{userRole === 'Admin' ? 'Active Work Items' : 'Your Active Work Items'}</span>
            <span className="metric-value">{displaySummary.active_tasks || 0}</span>
          </div>
        </div>

      </div>

      {/* Critical Warnings Block (Target Submissions & Capacity Overloads) */}
      <div className="dashboard-grid-auto">
        
        {/* Timeline Alerts (Target Dates Approaching) */}
        <div className="paper-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>📅 Target Submission Deadlines (≤ 7 Days)</span>
            {displayTimelineAlerts.length > 0 && <span className="badge badge-warning">{displayTimelineAlerts.length}</span>}
          </h3>
          
          {displayTimelineAlerts.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No targets approaching in the next 7 days.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {displayTimelineAlerts.map((opp) => (
                <div key={opp.id} className="alert-banner alert-banner-warning" style={{ margin: 0, padding: '0.75rem 1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{opp.company} - {opp.opportunity_name}</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      Due in <strong>{opp.days_left} {opp.days_left === 1 ? 'day' : 'days'}</strong> ({opp.target_submission_date}) • Presales: @{opp.presales_owner}
                    </div>
                  </div>
                  <span className="badge badge-warning">{opp.stage_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overload Capacity Alerts */}
        <div className="paper-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>⚠️ Resource Capacity Overloads</span>
            {displayWorkload.filter(w => w.is_overloaded).length > 0 && <span className="badge badge-danger">{displayWorkload.filter(w => w.is_overloaded).length}</span>}
          </h3>
          
          {displayWorkload.filter(w => w.is_overloaded).length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {userRole === 'Admin' ? 'All team members are within their weekly capacities.' : 'Your workload is within your weekly capacity.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {displayWorkload.filter(w => w.is_overloaded).map((w, idx) => (
                <div key={idx} className="alert-banner alert-banner-danger" style={{ margin: 0, padding: '0.75rem 1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>@{w.username} ({w.role_name})</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      Workload is <strong>{w.active_hours} hrs</strong> (Capacity: {w.weekly_capacity_hours} hrs)
                    </div>
                  </div>
                  <span className="badge badge-danger">{w.utilization_pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Tasks Banner List */}
      {displayOverdueTasks.length > 0 && (
        <div className="paper-panel alert-banner alert-banner-danger" style={{ padding: '1.5rem', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--color-danger-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🚨 Overdue Tasks Alert ({displayOverdueTasks.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            {displayOverdueTasks.map((task) => (
              <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <span style={{ fontSize: '0.9rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{task.title}</strong> on <span style={{ color: 'var(--text-secondary)' }}>{task.company} - {task.opportunity_name}</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-danger-text)', fontWeight: 600 }}>Due: {task.due_date}</span>
                  <span className="badge badge-danger">@{task.assigned_to}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Status Distribution Card */}
      <div className="paper-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Task Status Distribution</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {displayTasksByStatus.map((st, idx) => {
            const statusColor = st.status_color || getOptionColor('task_status', st.status_name) || '#3B82F6';
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(226, 232, 240, 0.35)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: statusColor }}></span>
                  {st.status_name}
                </span>
                <span className="badge" style={getOptionBadgeStyle('task_status', st.status_name)}>{st.count}</span>
              </div>
            );
          })}
          {displayTasksByStatus.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem 0' }}>No tasks found.</p>
          )}
        </div>
      </div>

      {/* Rework Hotspots and Team Capacity Table */}
      <div className="dashboard-grid-auto">
        
        {/* Team Workload */}
        <div className="paper-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            {userRole === 'Admin' ? 'Resource Capacity & Allocation' : 'Your Workload & Capacity'}
          </h3>
          <div className="table-container">
            <table className="custom-table" style={{ fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Role</th>
                  <th>Load / Cap</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {displayWorkload.map((res, idx) => (
                  <tr key={idx}>
                    <td><strong style={{ color: 'var(--text-primary)' }}>@{res.username}</strong></td>
                    <td><span className="badge" style={getOptionBadgeStyle('role', res.role_name)}>{res.role_name || 'N/A'}</span></td>
                    <td>{res.active_hours} / {res.weekly_capacity_hours} hrs</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: res.is_overloaded ? 'var(--color-danger-text)' : 'var(--text-primary)' }}>{res.utilization_pct}%</span>
                        <div style={{ width: '60px', height: '6px', background: 'rgba(226, 232, 240, 0.6)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(res.utilization_pct, 100)}%`,
                              backgroundColor: res.is_overloaded ? 'var(--color-danger)' : 'var(--color-success)'
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rework Hotspots */}
        <div className="paper-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔄 Rework & Revision Hotspots (Risk Flag)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {displayReworkHotspots.map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'var(--color-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{h.company} - {h.opportunity_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Presales Owner: @{h.presales_owner}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <span className="badge badge-danger">{h.revision_counter} Revisions</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Commercial: {h.commercial_revision_counter}</span>
                </div>
              </div>
            ))}
            {displayReworkHotspots.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
                No opportunities exceed the revision risk threshold (Threshold: {data.revision_threshold} revisions).
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
