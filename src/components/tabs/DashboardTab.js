'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { User } from 'lucide-react';
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
  const { currentUser, getOptionColor, getOptionBadgeStyle, formatUserName } = useApp();

  // Raw fetched datasets
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
      const [oppsRes, tasksRes, effortsRes, versionsRes, profilesRes] = await Promise.all([
        fetch('/api/opportunities'),
        fetch('/api/workitems'),
        fetch('/api/efforts'),
        fetch('/api/versions'),
        fetch('/api/resourceprofiles')
      ]);

      const oppsJson = await oppsRes.json();
      const tasksJson = await tasksRes.json();
      const effortsJson = await effortsRes.json();
      const versionsJson = await versionsRes.json();
      const profilesJson = await profilesRes.json();

      setOpportunities(Array.isArray(oppsJson) ? oppsJson : []);
      setTasks(Array.isArray(tasksJson) ? tasksJson : []);
      setEfforts(Array.isArray(effortsJson) ? effortsJson : []);
      setVersions(Array.isArray(versionsJson) ? versionsJson : []);
      setProfiles(Array.isArray(profilesJson) ? profilesJson : []);
    } catch (e) {
      console.error('Error fetching personal dashboard data:', e);
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
        <span>📊 Loading Personal Dashboard Workspace...</span>
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
  // USER-SPECIFIC DATA COMPUTATIONS (Logged-In User Only)
  // ----------------------------------------------------
  const userLower = (currentUser || '').toLowerCase();
  const activeProfile = profiles.find(p => (p.username || '').toLowerCase() === userLower) || {};
  const userDisplayName = activeProfile.name || (currentUser === 'admin' ? 'Adhesh (Admin)' : (currentUser ? formatUserName(currentUser) : 'User'));

  // 1. My Tasks & Active Tasks
  const myTasks = tasks.filter(t => (t.assigned_to || '').toLowerCase() === userLower);
  const myActiveTasks = myTasks.filter(t => t.status_name !== 'Completed' && t.status_name !== 'Blocked' && t.status_name !== 'Cancelled');
  const mySortedActiveTasks = [...myActiveTasks].sort((a, b) => new Date(a.due_date || '9999-12-31') - new Date(b.due_date || '9999-12-31'));

  // 2. Overdue Tasks
  const todayStr = new Date().toISOString().split('T')[0];
  const myOverdueTasks = myActiveTasks.filter(t => t.due_date && t.due_date < todayStr);

  // 3. My Capacity & Utilization
  const myWeeklyCapacity = parseFloat(activeProfile.weekly_capacity_hours || 40);
  const myCommittedHours = myActiveTasks.reduce((sum, t) => sum + parseFloat(t.estimated_hours || 0), 0);
  const myFreeHours = Math.max(0, myWeeklyCapacity - myCommittedHours);
  const myUtilizationPct = myWeeklyCapacity > 0 ? Math.round((myCommittedHours / myWeeklyCapacity) * 100) : 0;

  // 4. My Efforts & Total Logged Hours
  const myEfforts = efforts.filter(e => (e.person || '').toLowerCase() === userLower);
  const myTotalLoggedHours = myEfforts.reduce((sum, e) => sum + parseFloat(e.hours_logged || 0), 0);

  // Effort Logged by Activity Type (Chart Data 1)
  const myEffortMap = {};
  myEfforts.forEach(e => {
    const act = e.activity_type_name || e.effort_type_name || 'General Presales';
    myEffortMap[act] = (myEffortMap[act] || 0) + parseFloat(e.hours_logged || 0);
  });
  const myEffortChartData = Object.keys(myEffortMap).map(act => ({
    name: act,
    value: parseFloat(myEffortMap[act].toFixed(1))
  }));

  // 5. Estimate Accuracy on Completed Tasks
  const myCompletedTasks = myTasks.filter(t => t.status_name === 'Completed');
  const totalEstimatedOnCompleted = myCompletedTasks.reduce((sum, t) => sum + parseFloat(t.estimated_hours || 0), 0);
  const completedTaskIds = new Set(myCompletedTasks.map(t => parseInt(t.id, 10)));
  const myCompletedEfforts = myEfforts.filter(e => completedTaskIds.has(parseInt(e.work_item_id, 10)));
  const totalActualOnCompleted = myCompletedEfforts.reduce((sum, e) => sum + parseFloat(e.hours_logged || 0), 0);

  const myEstimateAccuracyPct = totalEstimatedOnCompleted > 0 
    ? Math.round((totalActualOnCompleted / totalEstimatedOnCompleted) * 100)
    : 100;

  // Estimate Accuracy Chart Data (Chart Data 2)
  const myAccuracyChartData = myTasks.slice(0, 8).map(t => {
    const taskEfforts = myEfforts.filter(e => parseInt(e.work_item_id, 10) === parseInt(t.id, 10));
    const actualLogged = taskEfforts.reduce((sum, e) => sum + parseFloat(e.hours_logged || 0), 0);
    return {
      name: t.title.length > 14 ? t.title.substring(0, 14) + '...' : t.title,
      Estimated: parseFloat(t.estimated_hours || 0),
      Actual: parseFloat(actualLogged.toFixed(1))
    };
  });

  // 6. My Active Tasks by Priority (Chart Data 3)
  const priorityMap = {};
  myActiveTasks.forEach(t => {
    const pri = t.priority_name || 'Normal';
    priorityMap[pri] = (priorityMap[pri] || 0) + 1;
  });
  const myPriorityChartData = Object.keys(priorityMap).map(pri => ({
    priority: pri,
    count: priorityMap[pri]
  }));

  // 7. Review Queue (Items pending user's sign-off)
  const myReviewQueue = tasks.filter(t => 
    (t.reviewer || '').toLowerCase() === userLower &&
    t.status_name !== 'Completed' && t.status_name !== 'Cancelled'
  ).sort((a, b) => new Date(a.due_date || '9999-12-31') - new Date(b.due_date || '9999-12-31'));

  // 8. My Active Deals / Opportunities
  const myOpportunities = opportunities.filter(o => 
    (o.presales_owner || '').toLowerCase() === userLower ||
    (o.primary_sales_owner || '').toLowerCase() === userLower ||
    (o.supporting_presales_members || '').toLowerCase().includes(userLower)
  );

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* HEADER BANNER */}
      <div className="paper-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            flexShrink: 0
          }}>
            <User size={26} strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Welcome back, {userDisplayName}!
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Personal Workload, Capacity & Performance Analytics Overview
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge badge-info" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
            Role: {activeProfile.role_name || 'Team Member'}
          </span>
          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }} onClick={fetchAllData}>
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* 5 USER KPI METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        {/* KPI 1: Active Work Items */}
        <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              My Active Tasks
            </span>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {myActiveTasks.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>{myCommittedHours.toFixed(1)} hrs</strong> estimated workload
          </div>
        </div>

        {/* KPI 2: Capacity Utilization */}
        <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Weekly Capacity Used
            </span>
            <span style={{ fontSize: '1.2rem' }}>📊</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: myUtilizationPct > 100 ? '#ef4444' : 'var(--text-primary)', lineHeight: 1 }}>
            {myUtilizationPct}%
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, myUtilizationPct)}%`,
              height: '100%',
              background: myUtilizationPct > 100 ? '#ef4444' : myUtilizationPct > 80 ? '#f59e0b' : '#10b981',
              borderRadius: '3px'
            }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {myCommittedHours.toFixed(1)} / {myWeeklyCapacity} hrs ({myFreeHours.toFixed(1)} hrs free)
          </div>
        </div>

        {/* KPI 3: Overdue / At-Risk */}
        <div className="paper-panel" style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          border: myOverdueTasks.length > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--glass-border)',
          background: myOverdueTasks.length > 0 ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: myOverdueTasks.length > 0 ? '#ef4444' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Overdue / At-Risk
            </span>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: myOverdueTasks.length > 0 ? '#ef4444' : '#10b981', lineHeight: 1 }}>
            {myOverdueTasks.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {myOverdueTasks.length > 0 ? 'Tasks past target deadline' : 'All active tasks on schedule'}
          </div>
        </div>

        {/* KPI 4: Total Logged Effort */}
        <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Hours Logged
            </span>
            <span style={{ fontSize: '1.2rem' }}>⏱️</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {myTotalLoggedHours.toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 600 }}>hrs</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Across <strong>{myEfforts.length}</strong> logged effort entries
          </div>
        </div>

        {/* KPI 5: Estimate Accuracy */}
        <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Estimate Accuracy Ratio
            </span>
            <span style={{ fontSize: '1.2rem' }}>🎯</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {myEstimateAccuracyPct}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {totalActualOnCompleted.toFixed(1)} hrs actual / {totalEstimatedOnCompleted.toFixed(1)} hrs est.
          </div>
        </div>

      </div>

      {/* CHARTS SECTION (3 Meaningful Analytical Views) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Chart 1: Effort Logged by Activity Type */}
        <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              ⏱️ Time Spent by Activity Type
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Personal effort distribution (RFP writing, POC, Solution Design, Client Calls)
            </p>
          </div>

          <div style={{ width: '100%', height: '240px' }}>
            {isMounted && myEffortChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={myEffortChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {myEffortChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val} hrs`, 'Logged Effort']} />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No effort entries logged yet
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Estimate vs Actual Hours Accuracy */}
        <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              🎯 Estimate Accuracy (Estimated vs Actual)
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Comparison of estimated hours vs actual hours spent per task
            </p>
          </div>

          <div style={{ width: '100%', height: '240px' }}>
            {isMounted && myAccuracyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={myAccuracyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Bar dataKey="Estimated" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No task estimate history available
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: My Work Items by Priority */}
        <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              📌 Active Work Items by Priority
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Current task workload categorized by priority tier
            </p>
          </div>

          <div style={{ width: '100%', height: '240px' }}>
            {isMounted && myPriorityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={myPriorityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active tasks assigned
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ACTIONABLE WORKLOAD QUEUES (2 COLUMNS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>

        {/* COLUMN 1: My Priority Work Queue */}
        <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                📋 My Active Tasks (Sorted by Deadline)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                {myActiveTasks.length} pending work items assigned to you
              </p>
            </div>
            <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>
              {myActiveTasks.length} Active
            </span>
          </div>

          {mySortedActiveTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              🎉 You have no pending active work items!
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Task Title</th>
                    <th>Opportunity</th>
                    <th>Priority</th>
                    <th>Est. Hrs</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {mySortedActiveTasks.map(t => {
                    const daysLeft = t.due_date ? Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                    const isOverdue = daysLeft !== null && daysLeft < 0;

                    return (
                      <tr key={t.id}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)' }}>{t.title}</strong>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {t.opportunity_name || '—'}
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                            {t.priority_name || 'Normal'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{t.estimated_hours}h</td>
                        <td>
                          {t.due_date ? (
                            <span className={`badge ${isOverdue ? 'badge-danger' : daysLeft <= 2 ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                              {t.due_date} {daysLeft !== null && (isOverdue ? `(${Math.abs(daysLeft)}d overdue)` : `(${daysLeft}d left)`)}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* COLUMN 2: My Review Queue & My Assigned Opportunities */}
        <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Review Queue */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  🧐 Technical Review Queue
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Items assigned to you for technical sign-off & review
                </p>
              </div>
              <span className={`badge ${myReviewQueue.length > 0 ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.78rem' }}>
                {myReviewQueue.length} Pending
              </span>
            </div>

            {myReviewQueue.length === 0 ? (
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No deliverables pending your technical sign-off.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                {myReviewQueue.map(t => (
                  <div key={t.id} style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assigned: {formatUserName(t.assigned_to)} | Opp: {t.opportunity_name || '—'}</div>
                    </div>
                    <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>Sign-off Needed</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Opportunities Overview */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  💼 My Active Opportunities
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Deals where you are Presales Lead, Sales Owner, or Supporting Architect
                </p>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>
                {myOpportunities.length} Deals
              </span>
            </div>

            {myOpportunities.length === 0 ? (
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                You are not currently linked to any active opportunities.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                {myOpportunities.map(o => (
                  <div key={o.id} style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{o.opportunity_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{o.company} | Due: {o.target_submission_date || '—'}</div>
                    </div>
                    <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                      {o.deal_stage_name || 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
