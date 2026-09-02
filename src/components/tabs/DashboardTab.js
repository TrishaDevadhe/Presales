'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function DashboardTab() {
  const { currentUser, userRole, getOptionColor, getOptionBadgeStyle } = useApp();
  
  // Dashboard Tier State: 'tier1' (My Work) | 'tier2' (Team & Pipeline) | 'tier3' (System Analytics)
  const [activeTier, setActiveTier] = useState('tier1');

  // Raw fetched datasets
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [efforts, setEfforts] = useState([]);
  const [versions, setVersions] = useState([]);
  const [profiles, setProfiles] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, oppsRes, tasksRes, effortsRes, versionsRes, profilesRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/opportunities'),
        fetch('/api/workitems'),
        fetch('/api/efforts'),
        fetch('/api/versions'),
        fetch('/api/resourceprofiles')
      ]);

      const dashJson = await dashRes.json();
      const oppsJson = await oppsRes.json();
      const tasksJson = await tasksRes.json();
      const effortsJson = await effortsRes.json();
      const versionsJson = await versionsRes.json();
      const profilesJson = await profilesRes.json();

      if (!dashRes.ok) throw new Error(dashJson.error || 'Failed to load dashboard data');

      setDashboardSummary(dashJson);
      setOpportunities(Array.isArray(oppsJson) ? oppsJson : []);
      setTasks(Array.isArray(tasksJson) ? tasksJson : []);
      setEfforts(Array.isArray(effortsJson) ? effortsJson : []);
      setVersions(Array.isArray(versionsJson) ? versionsJson : []);
      setProfiles(Array.isArray(profilesJson) ? profilesJson : []);
    } catch (e) {
      console.error('Error fetching tier dashboard data:', e);
      setError(e.message || 'Failed to connect to system database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem', color: 'var(--text-secondary)', fontWeight: 600, gap: '0.75rem' }}>
        <span>📊 Initializing Three-Tier Presales Intelligence...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-banner alert-banner-danger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.1rem' }}>
          ⚠️ Dashboard Data Error
        </div>
        <p style={{ fontSize: '0.92rem' }}>{error}</p>
        <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={fetchAllData}>
          🔄 Retry Data Sync
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // TIER 1 COMPUTATIONS: "My Work" (Self-Facing)
  // ----------------------------------------------------
  const userLower = (currentUser || '').toLowerCase();
  
  // 1. Active tasks for currentUser
  const myTasks = tasks.filter(t => (t.assigned_to || '').toLowerCase() === userLower);
  const myActiveTasks = myTasks.filter(t => t.status_name !== 'Completed' && t.status_name !== 'Blocked' && t.status_name !== 'Cancelled');
  
  // Sort active tasks by urgency (days to deadline)
  const mySortedActiveTasks = [...myActiveTasks].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  
  // 2. Overdue / At-risk tasks for currentUser
  const todayStr = new Date().toISOString().split('T')[0];
  const myOverdueTasks = myActiveTasks.filter(t => t.due_date && t.due_date < todayStr);

  // 3. Capacity calculation for currentUser
  const myProfile = profiles.find(p => (p.username || '').toLowerCase() === userLower) || {};
  const myWeeklyCapacity = parseFloat(myProfile.weekly_capacity_hours || 40);
  const myCommittedHours = myActiveTasks.reduce((sum, t) => sum + parseFloat(t.estimated_hours || 0), 0);
  const myFreeHours = Math.max(0, myWeeklyCapacity - myCommittedHours);
  const myUtilizationPct = myWeeklyCapacity > 0 ? Math.round((myCommittedHours / myWeeklyCapacity) * 100) : 0;

  // 4. Effort logged by activity type for currentUser
  const myEfforts = efforts.filter(e => (e.person || '').toLowerCase() === userLower);
  const myEffortMap = {};
  myEfforts.forEach(e => {
    const act = e.activity_type_name || e.effort_type_name || 'General Presales';
    myEffortMap[act] = (myEffortMap[act] || 0) + parseFloat(e.hours_logged || 0);
  });
  const myEffortChartData = Object.keys(myEffortMap).map(act => ({
    name: act,
    hours: parseFloat(myEffortMap[act].toFixed(1))
  }));

  // 5. Estimate accuracy trend on closed tasks for currentUser
  const myCompletedTasks = myTasks.filter(t => t.status_name === 'Completed');
  const myEstimateAccuracyData = myCompletedTasks.slice(0, 6).map(t => {
    const taskEfforts = myEfforts.filter(e => parseInt(e.work_item_id, 10) === parseInt(t.id, 10));
    const actualLogged = taskEfforts.reduce((sum, e) => sum + parseFloat(e.hours_logged || 0), 0);
    return {
      title: t.title.length > 16 ? t.title.substring(0, 16) + '...' : t.title,
      Estimated: parseFloat(t.estimated_hours || 0),
      Actual: parseFloat(actualLogged.toFixed(1))
    };
  });

  // 6. Review queue for currentUser as designated technical reviewer
  const myReviewQueue = tasks.filter(t => 
    (t.reviewer || '').toLowerCase() === userLower &&
    t.status_name !== 'Completed' && t.status_name !== 'Cancelled'
  ).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));


  // ----------------------------------------------------
  // TIER 2 COMPUTATIONS: "Team & Pipeline" (Managers / Tech Leads)
  // ----------------------------------------------------
  
  // 1. Capacity Heatmap (all team members)
  const capacityHeatmap = profiles.map(p => {
    const pName = p.username || 'Unknown';
    const pCap = parseFloat(p.weekly_capacity_hours || 40);
    const pActiveTasks = tasks.filter(t => 
      (t.assigned_to || '').toLowerCase() === pName.toLowerCase() &&
      t.status_name !== 'Completed' && t.status_name !== 'Blocked' && t.status_name !== 'Cancelled'
    );
    const pCommitted = pActiveTasks.reduce((sum, t) => sum + parseFloat(t.estimated_hours || 0), 0);
    const pFree = Math.max(0, pCap - pCommitted);
    const pUtil = pCap > 0 ? Math.round((pCommitted / pCap) * 100) : 0;
    return {
      username: `@${pName}`,
      rawUser: pName,
      role: p.role_name || 'Team Member',
      capacity: pCap,
      committed: pCommitted,
      free: pFree,
      utilization: pUtil,
      isOverloaded: pCommitted > pCap
    };
  });

  // 2. Pipeline Funnel (Stage counts)
  const stageMap = {};
  opportunities.forEach(o => {
    const sName = o.deal_stage_name || o.stage_name || 'Intake / Identified';
    stageMap[sName] = (stageMap[sName] || 0) + 1;
  });
  const pipelineFunnelData = Object.keys(stageMap).map(s => ({
    stage_name: s,
    count: stageMap[s]
  }));

  // 3. Deadline Risk Board (Upcoming target dates where task workload exceeds days left)
  const deadlineRisks = opportunities.filter(o => {
    if (!o.target_submission_date) return false;
    const daysLeft = Math.ceil((new Date(o.target_submission_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 10 && o.deal_stage_name !== 'Won' && o.deal_stage_name !== 'Lost';
  }).map(o => {
    const oppTasks = tasks.filter(t => parseInt(t.opportunity_id, 10) === parseInt(o.id, 10) && t.status_name !== 'Completed');
    const remainingWorkHours = oppTasks.reduce((sum, t) => sum + parseFloat(t.estimated_hours || 0), 0);
    const daysLeft = Math.ceil((new Date(o.target_submission_date) - new Date()) / (1000 * 60 * 60 * 24));
    return {
      ...o,
      daysLeft,
      remainingWorkHours,
      riskLevel: remainingWorkHours > (daysLeft * 8) ? 'High Risk' : 'Moderate'
    };
  });

  // 4. Estimation Accuracy by Task Type / Engineer
  const categoryVarianceMap = {};
  tasks.filter(t => t.status_name === 'Completed').forEach(t => {
    const cat = t.work_category_name || t.deliverable_type_name || 'General';
    const taskEfforts = efforts.filter(e => parseInt(e.work_item_id, 10) === parseInt(t.id, 10));
    const actual = taskEfforts.reduce((sum, e) => sum + parseFloat(e.hours_logged || 0), 0);
    const est = parseFloat(t.estimated_hours || 0);

    if (!categoryVarianceMap[cat]) {
      categoryVarianceMap[cat] = { category: cat, estimated: 0, actual: 0 };
    }
    categoryVarianceMap[cat].estimated += est;
    categoryVarianceMap[cat].actual += actual;
  });
  const estimationVarianceData = Object.values(categoryVarianceMap);

  // 5. Revision Frequency & Scope Creep
  const revisionHotspots = opportunities.filter(o => (parseInt(o.revision_counter, 10) || 0) > 0)
    .sort((a, b) => b.revision_counter - a.revision_counter)
    .slice(0, 5);

  // 6. Reviewer Turnaround Bottlenecks
  const pendingReviewTasks = tasks.filter(t => 
    t.reviewer && 
    t.status_name !== 'Completed' && t.status_name !== 'Cancelled'
  );

  // 7. Skill Demand vs Supply
  const skillCountMap = {};
  profiles.forEach(p => {
    if (p.skills) {
      p.skills.split(',').forEach(sk => {
        const cleaned = sk.trim();
        if (cleaned) {
          skillCountMap[cleaned] = (skillCountMap[cleaned] || 0) + 1;
        }
      });
    }
  });
  const skillSupplyData = Object.keys(skillCountMap).map(sk => ({
    skill: sk,
    count: skillCountMap[sk]
  }));


  // ----------------------------------------------------
  // TIER 3 COMPUTATIONS: "System Analytics" (Admin Only)
  // ----------------------------------------------------
  const totalProfilesCount = profiles.length;
  const adminProfilesCount = profiles.filter(p => (p.role_name || '').toLowerCase().includes('admin')).length;
  const totalWorkItemsCount = tasks.length;
  const completedWorkItemsCount = tasks.filter(t => t.status_name === 'Completed').length;
  const totalEffortHoursLogged = efforts.reduce((sum, e) => sum + parseFloat(e.hours_logged || 0), 0);
  const totalVersionsLogged = versions.length;

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* TIER SELECTION TAB BAR */}
      <div className="paper-panel" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🎯</span>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Presales Performance Workspace
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Role-tailored intelligence tier model (@{currentUser})
            </p>
          </div>
        </div>

        {/* Tier Buttons */}
        <div className="tab-group" style={{ background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
          <button
            onClick={() => setActiveTier('tier1')}
            className={`tab-item ${activeTier === 'tier1' ? 'active' : ''}`}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
          >
            👤 Tier 1: My Work
          </button>
          <button
            onClick={() => setActiveTier('tier2')}
            className={`tab-item ${activeTier === 'tier2' ? 'active' : ''}`}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
          >
            👥 Tier 2: Team & Pipeline
          </button>
          {userRole === 'Admin' && (
            <button
              onClick={() => setActiveTier('tier3')}
              className={`tab-item ${activeTier === 'tier3' ? 'active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
            >
              ⚙️ Tier 3: System Analytics 👑
            </button>
          )}
        </div>
      </div>


      {/* ========================================================================= */}
      {/* TIER 1 VIEW: "MY WORK" (Self-Facing, Personal Dashboard)                   */}
      {/* ========================================================================= */}
      {activeTier === 'tier1' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Personal Top Summary Cards */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            
            {/* Active Tasks Card */}
            <div className="paper-panel metrics-card">
              <div className="metric-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>⚡</div>
              <div className="metric-info">
                <span className="metric-label">My Active Tasks</span>
                <span className="metric-value">{myActiveTasks.length}</span>
              </div>
            </div>

            {/* Capacity Meter Card */}
            <div className="paper-panel metrics-card">
              <div className="metric-icon-wrapper" style={{ background: myUtilizationPct > 100 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: myUtilizationPct > 100 ? '#EF4444' : '#10B981' }}>⏱️</div>
              <div className="metric-info">
                <span className="metric-label">My Weekly Capacity Used</span>
                <span className="metric-value" style={{ color: myUtilizationPct > 100 ? '#EF4444' : 'inherit' }}>
                  {myCommittedHours} / {myWeeklyCapacity} <small style={{ fontSize: '0.8rem' }}>hrs ({myUtilizationPct}%)</small>
                </span>
              </div>
            </div>

            {/* Overdue Card */}
            <div className="paper-panel metrics-card">
              <div className="metric-icon-wrapper" style={{ background: myOverdueTasks.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)', color: myOverdueTasks.length > 0 ? '#EF4444' : '#64748B' }}>🚨</div>
              <div className="metric-info">
                <span className="metric-label">My Overdue / At-Risk</span>
                <span className="metric-value" style={{ color: myOverdueTasks.length > 0 ? '#EF4444' : 'inherit' }}>{myOverdueTasks.length}</span>
              </div>
            </div>

            {/* Review Queue Card */}
            <div className="paper-panel metrics-card">
              <div className="metric-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}>🔍</div>
              <div className="metric-info">
                <span className="metric-label">Pending My Tech Review</span>
                <span className="metric-value">{myReviewQueue.length}</span>
              </div>
            </div>

          </div>

          {/* Tier 1 Grid Section 1 */}
          <div className="dashboard-grid-auto">
            
            {/* My Active Tasks by Priority & Days to Deadline */}
            <div className="paper-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                  📌 My Active Work Items (By Urgency)
                </h3>
                <span className="badge badge-info">{mySortedActiveTasks.length} Assigned</span>
              </div>

              {mySortedActiveTasks.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>
                  🎉 You currently have zero active pending tasks!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {mySortedActiveTasks.map((t) => {
                    const daysLeft = t.due_date ? Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                    const isOverdue = daysLeft !== null && daysLeft < 0;
                    return (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.9rem', background: isOverdue ? 'rgba(239, 68, 68, 0.06)' : 'var(--bg-secondary)', border: isOverdue ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{t.title}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            {t.company} - {t.opportunity_name} • Est: {t.estimated_hours} hrs
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {daysLeft !== null && (
                            <span className={`badge ${isOverdue ? 'badge-danger' : daysLeft <= 2 ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.75rem' }}>
                              {isOverdue ? `Overdue (${Math.abs(daysLeft)}d)` : `${daysLeft}d left`}
                            </span>
                          )}
                          <span className="badge" style={getOptionBadgeStyle('priority', t.priority_name)}>{t.priority_name || 'Normal'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* My Review Queue */}
            <div className="paper-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                  🔍 My Technical Review Queue (Oldest First)
                </h3>
                <span className="badge badge-warning">{myReviewQueue.length} Pending Sign-off</span>
              </div>

              {myReviewQueue.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>
                  ✅ No tasks currently awaiting your technical review sign-off.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {myReviewQueue.map((t) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.9rem', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{t.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Assigned to: <strong>@{t.assigned_to}</strong> • Due: {t.due_date}
                        </div>
                      </div>
                      <span className="badge badge-warning">Review Pending</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Tier 1 Charts Section */}
          {isMounted && (
            <div className="analytics-charts-grid">
              
              {/* My Effort Logged by Activity Type */}
              <div className="paper-panel chart-card">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">
                    <span>⏱️ My Effort Breakdown by Activity Type</span>
                  </h3>
                  <span className="badge badge-neutral">{myEfforts.length} Logs</span>
                </div>
                <div style={{ width: '100%', height: 260 }}>
                  {myEffortChartData.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'center', paddingTop: '3rem' }}>No effort hours logged yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={myEffortChartData} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="hours" name="Logged Hours" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* My Estimate Accuracy Trend */}
              <div className="paper-panel chart-card">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">
                    <span>🎯 My Estimation Accuracy (Actual vs Estimated)</span>
                  </h3>
                  <span className="badge badge-neutral">{myCompletedTasks.length} Completed Tasks</span>
                </div>
                <div style={{ width: '100%', height: 260 }}>
                  {myEstimateAccuracyData.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'center', paddingTop: '3rem' }}>Complete tasks to see accuracy trends.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={myEstimateAccuracyData} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                        <XAxis dataKey="title" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                        <Bar dataKey="Estimated" name="Estimated Hrs" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Actual" name="Actual Logged Hrs" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      )}


      {/* ========================================================================= */}
      {/* TIER 2 VIEW: "TEAM & PIPELINE" (Presales Managers / Tech Leads)             */}
      {/* ========================================================================= */}
      {activeTier === 'tier2' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Capacity Heatmap Table */}
          <div className="paper-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                  🔥 Team Capacity Heatmap (Weekly Commitment vs Headroom)
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Identifies overloaded team members vs available capacity headroom for workload rebalancing
                </p>
              </div>
              <span className="badge badge-info">{capacityHeatmap.length} Members</span>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Committed Hours</th>
                    <th>Weekly Capacity</th>
                    <th>Capacity Headroom</th>
                    <th>Utilization</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {capacityHeatmap.map((m, idx) => (
                    <tr key={idx}>
                      <td><strong style={{ color: 'var(--text-primary)' }}>{m.username}</strong></td>
                      <td><span className="badge badge-neutral">{m.role}</span></td>
                      <td style={{ fontWeight: 600 }}>{m.committed} hrs</td>
                      <td>{m.capacity} hrs</td>
                      <td style={{ fontWeight: 600, color: m.free > 0 ? '#10B981' : '#EF4444' }}>
                        {m.free > 0 ? `+${m.free} hrs free` : '0 hrs free'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: m.isOverloaded ? '#EF4444' : 'var(--text-primary)' }}>{m.utilization}%</span>
                          <div style={{ width: '70px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(m.utilization, 100)}%`, backgroundColor: m.isOverloaded ? '#EF4444' : '#10B981' }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        {m.isOverloaded ? (
                          <span className="badge badge-danger">⚠️ Overloaded</span>
                        ) : (
                          <span className="badge badge-success">Available Headroom</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tier 2 Charts: Pipeline Funnel & Estimation Accuracy Variance */}
          {isMounted && (
            <div className="analytics-charts-grid">
              
              {/* Pipeline Funnel Stage Distribution */}
              <div className="paper-panel chart-card">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">
                    <span>📊 Pipeline Funnel Stage Distribution</span>
                  </h3>
                  <span className="badge badge-info">{opportunities.length} Total Opportunities</span>
                </div>
                <div style={{ width: '100%', height: 270 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineFunnelData} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis dataKey="stage_name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Opportunity Volume" fill="#10B981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Estimation Accuracy Variance by Category */}
              <div className="paper-panel chart-card">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">
                    <span>⚖️ Estimation Accuracy Variance by Category</span>
                  </h3>
                  <span className="badge badge-neutral">Actual vs Estimated</span>
                </div>
                <div style={{ width: '100%', height: 270 }}>
                  {estimationVarianceData.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'center', paddingTop: '3rem' }}>No completed task variance data.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={estimationVarianceData} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                        <XAxis dataKey="category" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                        <Bar dataKey="estimated" name="Est. Hours" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="actual" name="Actual Hours Logged" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Tier 2 Section: Deadline Risks & Revision Frequency */}
          <div className="dashboard-grid-auto">
            
            {/* Deadline Risk Board */}
            <div className="paper-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                  📅 Target Deadline Risk Board (Submission ≤ 10 Days)
                </h3>
                <span className="badge badge-warning">{deadlineRisks.length} Risk Flagged</span>
              </div>

              {deadlineRisks.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  ✅ No upcoming proposal submission deadlines at risk.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {deadlineRisks.map((o) => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.9rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{o.company} - {o.opportunity_name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Due in <strong>{o.daysLeft} days</strong> ({o.target_submission_date}) • Presales Lead: @{o.presales_owner}
                        </div>
                      </div>
                      <span className="badge badge-danger">Remaining Work: {o.remainingWorkHours} hrs</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revision Frequency & Scope Creep Proxy */}
            <div className="paper-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                  🔄 Proposal Revision Frequency (Scope Creep Proxy)
                </h3>
                <span className="badge badge-warning">Hotspots</span>
              </div>

              {revisionHotspots.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  Zero proposals with active revision loops.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {revisionHotspots.map((o) => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.9rem', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{o.company} - {o.opportunity_name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Owner: @{o.presales_owner}
                        </div>
                      </div>
                      <span className="badge badge-warning">{o.revision_counter} Revisions</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Skill Supply Catalog Matrix */}
          <div className="paper-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.85rem', fontWeight: 700 }}>
              🛠️ Presales Team Skill Catalog Matrix
            </h3>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {skillSupplyData.map((sk, idx) => (
                <span key={idx} className="badge badge-neutral" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <strong>{sk.skill}</strong>
                  <span style={{ background: 'var(--accent-primary, #3b82f6)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '999px', fontSize: '0.72rem' }}>
                    {sk.count}
                  </span>
                </span>
              ))}
              {skillSupplyData.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>No technical skills recorded in resource profiles.</p>
              )}
            </div>
          </div>

        </div>
      )}


      {/* ========================================================================= */}
      {/* TIER 3 VIEW: "SYSTEM ANALYTICS" (Admin Only)                             */}
      {/* ========================================================================= */}
      {activeTier === 'tier3' && userRole === 'Admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Master System Rollup Cards */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            
            <div className="paper-panel metrics-card">
              <div className="metric-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>👥</div>
              <div className="metric-info">
                <span className="metric-label">User Profiles</span>
                <span className="metric-value">{totalProfilesCount} <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({adminProfilesCount} Admin)</small></span>
              </div>
            </div>

            <div className="paper-panel metrics-card">
              <div className="metric-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>⚡</div>
              <div className="metric-info">
                <span className="metric-label">Total Work Items</span>
                <span className="metric-value">{totalWorkItemsCount} <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({completedWorkItemsCount} Closed)</small></span>
              </div>
            </div>

            <div className="paper-panel metrics-card">
              <div className="metric-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}>⏱️</div>
              <div className="metric-info">
                <span className="metric-label">Logged Effort Hours</span>
                <span className="metric-value">{totalEffortHoursLogged.toFixed(0)} <small style={{ fontSize: '0.75rem' }}>hrs</small></span>
              </div>
            </div>

            <div className="paper-panel metrics-card">
              <div className="metric-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>🔄</div>
              <div className="metric-info">
                <span className="metric-label">Revision Audit Logs</span>
                <span className="metric-value">{totalVersionsLogged}</span>
              </div>
            </div>

          </div>

          {/* System Health Summary Table */}
          <div className="paper-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: 700 }}>
              🛡️ Master System Data & Governance Health Check
            </h3>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Status Check</th>
                    <th>Metric Value</th>
                    <th>Governance Note</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Resource Profiles Catalog</strong></td>
                    <td><span className="badge badge-success">Healthy</span></td>
                    <td>{totalProfilesCount} Active User Profiles</td>
                    <td>All user accounts registered in PostgreSQL database</td>
                  </tr>
                  <tr>
                    <td><strong>Work Item Execution Pipeline</strong></td>
                    <td><span className="badge badge-success">Active</span></td>
                    <td>{totalWorkItemsCount} Work Items ({tasks.filter(t => t.status_name !== 'Completed').length} Pending)</td>
                    <td>Status & priority constraints enforced</td>
                  </tr>
                  <tr>
                    <td><strong>Proposal Revision Log Audit</strong></td>
                    <td><span className="badge badge-info">Audited</span></td>
                    <td>{totalVersionsLogged} Revision Entries Recorded</td>
                    <td>Automatic superseding & version increment tracking active</td>
                  </tr>
                  <tr>
                    <td><strong>Effort Log Audit Trail</strong></td>
                    <td><span className="badge badge-success">Active</span></td>
                    <td>{efforts.length} Effort Records ({totalEffortHoursLogged.toFixed(1)} hrs total)</td>
                    <td>Categorized by activity and effort types</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
