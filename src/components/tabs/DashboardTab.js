'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function DashboardTab() {
  const { currentUser, userRole } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP error! status: ${res.status}`);
      }
      setData(json);
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
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
        Loading dashboard metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-banner alert-banner-danger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.1rem' }}>
          ⚠️ Database Connection Alert
        </div>
        <p style={{ fontSize: '0.92rem' }}>{error}</p>
        <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={fetchDashboardData}>
          🔄 Retry Connection
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary = {}, opps_by_stage = [], tasks_by_status = [], overdue_tasks = [], workload = [], timeline_alerts = [], rework_hotspots = [] } = data;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Level Metrics Cards — Fold signature */}
      <div className="dashboard-grid">
        <div className="paper-panel metrics-card">
          <div className="metric-icon-wrapper">💼</div>
          <div className="metric-info">
            <span className="metric-label">Pipeline Value</span>
            <span className="metric-value">{formatCurrency(summary.pipeline_value || 0)}</span>
          </div>
        </div>

        <div className="paper-panel metrics-card">
          <div className="metric-icon-wrapper" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info-text)' }}>📈</div>
          <div className="metric-info">
            <span className="metric-label">Total Opportunities</span>
            <span className="metric-value">{summary.total_opportunities || 0}</span>
          </div>
        </div>

        <div className="paper-panel metrics-card">
          <div className="metric-icon-wrapper" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' }}>⚡</div>
          <div className="metric-info">
            <span className="metric-label">Active Work Items</span>
            <span className="metric-value">{summary.active_tasks || 0}</span>
          </div>
        </div>
      </div>

      {/* Critical Warnings Block (Overdue Tasks & Capacity Overloads) */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        
        {/* Timeline Alerts (Target Dates Approaching) */}
        <div className="paper-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>📅 Target Submission Deadlines (≤ 7 Days)</span>
            {timeline_alerts.length > 0 && <span className="badge badge-warning">{timeline_alerts.length}</span>}
          </h3>
          
          {timeline_alerts.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No targets approaching in the next 7 days.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {timeline_alerts.map((opp) => (
                <div key={opp.id} className="alert-banner alert-banner-warning" style={{ margin: 0, padding: '0.75rem 1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{opp.company} - {opp.opportunity_name}</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      Due in <strong>{opp.days_left} {opp.days_left === 1 ? 'day' : 'days'}</strong> ({opp.target_submission_date}) • Presales: {opp.presales_owner}
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
          <h3 style={{ fontSize: '1.15rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>⚠️ Resource Overloads</span>
            {workload.filter(w => w.is_overloaded).length > 0 && <span className="badge badge-danger">{workload.filter(w => w.is_overloaded).length}</span>}
          </h3>
          
          {workload.filter(w => w.is_overloaded).length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>All team members are within their weekly capacities.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {workload.filter(w => w.is_overloaded).map((w, idx) => (
                <div key={idx} className="alert-banner alert-banner-danger" style={{ margin: 0, padding: '0.75rem 1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>@{w.username} ({w.role_name})</div>
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

      {/* Overdue Tasks Banner list */}
      {overdue_tasks.length > 0 && (
        <div className="paper-panel alert-banner alert-banner-danger" style={{ padding: '1.5rem', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--color-danger-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🚨 Overdue Tasks Alert ({overdue_tasks.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            {overdue_tasks.map((task) => (
              <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.9rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{task.title}</strong> on <span style={{ color: 'var(--text-secondary)' }}>{task.company} - {task.opportunity_name}</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-danger-text)' }}>Due: {task.due_date}</span>
                  <span className="badge badge-danger">@{task.assigned_to}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Middle Block: Opportunities by Stage & Task Status */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        
        {/* Opps by Stage */}
        <div className="paper-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Pipeline by Stage</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {opps_by_stage.map((stage, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: stage.stage_color || 'var(--accent-primary)' }}></span>
                    {stage.stage_name} ({stage.count})
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(stage.total_value)}</span>
                </div>
                <div style={{ width: '100%', height: '7px', background: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${summary.pipeline_value > 0 ? (stage.total_value / summary.pipeline_value) * 100 : 0}%`,
                      backgroundColor: stage.stage_color || 'var(--accent-primary)',
                      borderRadius: '999px'
                    }}
                  />
                </div>
              </div>
            ))}
            {opps_by_stage.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem 0' }}>No opportunities in pipeline.</p>
            )}
          </div>
        </div>

        {/* Tasks by Status */}
        <div className="paper-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Task Status Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {tasks_by_status.map((st, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: st.status_color || 'var(--accent-primary)' }}></span>
                  {st.status_name}
                </span>
                <span className="badge badge-info">{st.count}</span>
              </div>
            ))}
            {tasks_by_status.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem 0' }}>No tasks found.</p>
            )}
          </div>
        </div>

      </div>

      {/* Rework Hotspots and Team Capacity Table */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        
        {/* Team Workload */}
        <div className="paper-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Resource Capacity & Allocation</h3>
          <div className="table-container">
            <table className="custom-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Role</th>
                  <th>Load / Cap</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((res, idx) => (
                  <tr key={idx}>
                    <td><strong style={{ color: 'var(--text-primary)' }}>@{res.username}</strong></td>
                    <td>{res.role_name || 'N/A'}</td>
                    <td>{res.active_hours} / {res.weekly_capacity_hours} hrs</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: res.is_overloaded ? 'var(--color-danger-text)' : 'var(--text-primary)' }}>{res.utilization_pct}%</span>
                        <div style={{ width: '60px', height: '6px', background: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
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
            {rework_hotspots.map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--color-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{h.company} - {h.opportunity_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Presales Owner: @{h.presales_owner}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <span className="badge badge-danger">{h.revision_counter} Revisions</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Commercial: {h.commercial_revision_counter}</span>
                </div>
              </div>
            ))}
            {rework_hotspots.length === 0 && (
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
