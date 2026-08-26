'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function DashboardTab() {
  const { currentUser, userRole } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
        Loading dashboard metrics...
      </div>
    );
  }

  if (!data) return <div>Failed to load dashboard data.</div>;

  const { summary, opps_by_stage, tasks_by_status, overdue_tasks, workload, timeline_alerts, rework_hotspots } = data;

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Level Metrics Cards */}
      <div className="dashboard-grid">
        <div className="glass-panel metrics-card glass-card-glow">
          <div className="metric-icon-wrapper">💼</div>
          <div className="metric-info">
            <span className="metric-label">Pipeline Value</span>
            <span className="metric-value">{formatCurrency(summary.pipeline_value || 0)}</span>
          </div>
        </div>

        <div className="glass-panel metrics-card glass-card-glow" style={{ '--accent-primary': 'var(--accent-secondary)' }}>
          <div className="metric-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-secondary)' }}>📈</div>
          <div className="metric-info">
            <span className="metric-label">Total Opportunities</span>
            <span className="metric-value">{summary.total_opportunities || 0}</span>
          </div>
        </div>

        <div className="glass-panel metrics-card glass-card-glow" style={{ '--accent-primary': 'var(--accent-purple)' }}>
          <div className="metric-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}>⚡</div>
          <div className="metric-info">
            <span className="metric-label">Active Work Items</span>
            <span className="metric-value">{summary.active_tasks || 0}</span>
          </div>
        </div>
      </div>

      {/* Critical Warnings Block (Overdue Tasks & Capacity Overloads) */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        
        {/* Timeline Alerts (Target Dates Approaching) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📅 Target Submission Deadlines (≤ 7 Days)
            {timeline_alerts.length > 0 && <span className="badge" style={{ background: 'var(--color-danger)', color: '#fff' }}>{timeline_alerts.length}</span>}
          </h3>
          
          {timeline_alerts.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No targets approaching in the next 7 days.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {timeline_alerts.map((opp) => (
                <div key={opp.id} className="alert-banner alert-banner-warning" style={{ margin: 0, padding: '0.75rem 1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{opp.company} - {opp.opportunity_name}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.2rem' }}>
                      Due in <strong style={{ color: '#fff' }}>{opp.days_left} {opp.days_left === 1 ? 'day' : 'days'}</strong> ({opp.target_submission_date}) • Presales: {opp.presales_owner}
                    </div>
                  </div>
                  <span className="badge" style={{ backgroundColor: opp.stage_color || 'var(--bg-tertiary)', color: '#fff' }}>{opp.stage_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overload Capacity Alerts */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚠️ Resource Overloads
            {workload.filter(w => w.is_overloaded).length > 0 && <span className="badge" style={{ background: 'var(--color-danger)', color: '#fff' }}>{workload.filter(w => w.is_overloaded).length}</span>}
          </h3>
          
          {workload.filter(w => w.is_overloaded).length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>All team members are within their weekly capacities.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {workload.filter(w => w.is_overloaded).map((w, idx) => (
                <div key={idx} className="alert-banner alert-banner-danger" style={{ margin: 0, padding: '0.75rem 1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>@{w.username} ({w.role_name})</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.2rem' }}>
                      Workload is <strong style={{ color: '#fff' }}>{w.active_hours} hrs</strong> (Capacity: {w.weekly_capacity_hours} hrs)
                    </div>
                  </div>
                  <span className="badge" style={{ background: 'var(--color-danger)', color: '#white', fontWeight: 'bold' }}>{w.utilization_pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Tasks Banner list */}
      {overdue_tasks.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-danger)' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--color-danger)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🚨 Overdue Tasks Alert ({overdue_tasks.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {overdue_tasks.map((task) => (
              <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '0.9rem' }}>
                  <strong style={{ color: '#fff' }}>{task.title}</strong> on <span style={{ color: 'var(--text-secondary)' }}>{task.company} - {task.opportunity_name}</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>Due: {task.due_date}</span>
                  <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>@{task.assigned_to}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Middle Block: Opportunities by Stage & Task Status Visual representation */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        
        {/* Opps by Stage list */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: '#fff' }}>Pipeline by Stage</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {opps_by_stage.map((stage, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: stage.stage_color || '#fff' }}></span>
                    {stage.stage_name} ({stage.count})
                  </span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(stage.total_value)}</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
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

        {/* Tasks by Status list */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: '#fff' }}>Task Status Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {tasks_by_status.map((st, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: st.status_color || '#fff' }}></span>
                  {st.status_name}
                </span>
                <span className="badge" style={{ background: st.status_color || 'var(--bg-tertiary)', color: '#fff', fontSize: '0.8rem' }}>{st.count}</span>
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
        
        {/* Team Workload list */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#fff' }}>Resource Capacity & Allocation</h3>
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
                    <td><strong style={{ color: '#fff' }}>@{res.username}</strong></td>
                    <td>{res.role_name || 'N/A'}</td>
                    <td>{res.active_hours} / {res.weekly_capacity_hours} hrs</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: res.is_overloaded ? 'var(--color-danger)' : 'var(--text-primary)' }}>{res.utilization_pct}%</span>
                        <div style={{ width: '60px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
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

        {/* Rework Hotspots list */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔄 Rework & Revision Hotspots (Risk Flag)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rework_hotspots.map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{h.company} - {h.opportunity_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Presales Owner: @{h.presales_owner}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <span className="badge" style={{ background: 'var(--color-danger)', color: '#fff', fontWeight: 'bold' }}>{h.revision_counter} Revisions</span>
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
