'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { User, AlertTriangle, Clock, Users, ChevronDown, ChevronUp, Search, Briefcase, ExternalLink, Shield, CheckCircle2 } from 'lucide-react';
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
import { getUserOpportunityAlerts } from '@/lib/opportunityAlerts.js';

function getWeekBounds(refDate = new Date()) {
  const d = new Date(refDate);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const toDateStr = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dayNum = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  };

  return {
    startDate: toDateStr(monday),
    endDate: toDateStr(sunday)
  };
}

function getMonthBounds(refDate = new Date()) {
  const d = new Date(refDate);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const toDateStr = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dayNum = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  };
  return {
    startDate: toDateStr(start),
    endDate: toDateStr(end)
  };
}

function getYearBounds(refDate = new Date()) {
  const d = new Date(refDate);
  const start = new Date(d.getFullYear(), 0, 1);
  const end = new Date(d.getFullYear(), 11, 31);
  const toDateStr = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dayNum = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  };
  return {
    startDate: toDateStr(start),
    endDate: toDateStr(end)
  };
}

export default function DashboardTab({ onNavigateToOpp }) {
  const { currentUser, userRole, getOptionColor, getOptionBadgeStyle, formatUserName, globalSearchQuery } = useApp();

  // Raw fetched datasets
  const [opportunities, setOpportunities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [efforts, setEfforts] = useState([]);
  const [versions, setVersions] = useState([]);
  const [profiles, setProfiles] = useState([]);

  // Time scope filter: 'week' (Default: Current Active Week) | 'month' | 'year' | 'all'
  const [timeScope, setTimeScope] = useState('week');

  // Admin exclusive section filters & expanded states
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminStageFilter, setAdminStageFilter] = useState('all'); // 'all' | 'with_deals' | 'no_deals'
  const [adminYearFilter, setAdminYearFilter] = useState('all'); // 'all' | '2026' | '2025' | '2024' ...
  const [expandedUsers, setExpandedUsers] = useState({});

  const toggleExpandUser = (username) => {
    setExpandedUsers(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

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
  const userDisplayName = activeProfile.name || (currentUser ? formatUserName(currentUser) : 'User');

  // Compute Active Period Date Bounds
  const weekBounds = getWeekBounds();
  const monthBounds = getMonthBounds();
  const yearBounds = getYearBounds();

  // 1. My Tasks & Active Tasks
  const myTasks = tasks.filter(t => (t.assigned_to || '').toLowerCase() === userLower);
  const myActiveTasks = myTasks.filter(t => t.status_name !== 'Completed' && t.status_name !== 'Blocked' && t.status_name !== 'Cancelled');
  const mySortedActiveTasks = [...myActiveTasks].sort((a, b) => new Date(a.due_date || '9999-12-31') - new Date(b.due_date || '9999-12-31'));

  // 2. Overdue Tasks
  const todayStr = new Date().toISOString().split('T')[0];
  const myOverdueTasks = myActiveTasks.filter(t => t.due_date && t.due_date < todayStr);

  // 3. My Efforts Partitioned by Timeframes
  const myAllEfforts = efforts.filter(e => (e.person || '').toLowerCase() === userLower);
  const myAllTimeLoggedHours = myAllEfforts.reduce((sum, e) => sum + parseFloat(e.hours_logged || 0), 0);

  const myThisWeekEfforts = myAllEfforts.filter(e => {
    const d = String(e.date || '').split('T')[0];
    return d >= weekBounds.startDate && d <= weekBounds.endDate;
  });
  const myThisWeekLoggedHours = myThisWeekEfforts.reduce((sum, e) => sum + parseFloat(e.hours_logged || 0), 0);

  const myThisMonthEfforts = myAllEfforts.filter(e => {
    const d = String(e.date || '').split('T')[0];
    return d >= monthBounds.startDate && d <= monthBounds.endDate;
  });
  const myThisMonthLoggedHours = myThisMonthEfforts.reduce((sum, e) => sum + parseFloat(e.hours_logged || 0), 0);

  const myThisYearEfforts = myAllEfforts.filter(e => {
    const d = String(e.date || '').split('T')[0];
    return d >= yearBounds.startDate && d <= yearBounds.endDate;
  });
  const myThisYearLoggedHours = myThisYearEfforts.reduce((sum, e) => sum + parseFloat(e.hours_logged || 0), 0);

  // Active Scoped Dataset (Default: Current Week)
  let myScopedEfforts = myThisWeekEfforts;
  let scopeTitle = 'This Week';
  let scopeDateSubtext = `Week of ${weekBounds.startDate} – ${weekBounds.endDate}`;

  if (timeScope === 'month') {
    myScopedEfforts = myThisMonthEfforts;
    scopeTitle = 'This Month';
    scopeDateSubtext = `${monthBounds.startDate} – ${monthBounds.endDate}`;
  } else if (timeScope === 'year') {
    myScopedEfforts = myThisYearEfforts;
    scopeTitle = 'This Year';
    scopeDateSubtext = `${yearBounds.startDate} – ${yearBounds.endDate}`;
  } else if (timeScope === 'all') {
    myScopedEfforts = myAllEfforts;
    scopeTitle = 'All-Time';
    scopeDateSubtext = 'Entire Lifetime History';
  }

  const myScopedLoggedHours = myScopedEfforts.reduce((sum, e) => sum + parseFloat(e.hours_logged || 0), 0);

  // 4. Weekly Capacity & Utilization (Refreshes every new week)
  const myWeeklyCapacity = parseFloat(activeProfile.weekly_capacity_hours || 40);
  const myWeeklyUtilizationPct = myWeeklyCapacity > 0 ? Math.round((myThisWeekLoggedHours / myWeeklyCapacity) * 100) : 0;
  const myWeeklyHoursRemaining = Math.max(0, myWeeklyCapacity - myThisWeekLoggedHours);
  const myCommittedHours = myActiveTasks.reduce((sum, t) => sum + parseFloat(t.estimated_hours || 0), 0);

  // Effort Logged by Activity Type for Scoped Timeframe (Chart Data 1)
  const myEffortMap = {};
  myScopedEfforts.forEach(e => {
    const act = e.activity_type_name || e.effort_type_name || 'General Presales';
    myEffortMap[act] = (myEffortMap[act] || 0) + parseFloat(e.hours_logged || 0);
  });
  const myEffortChartData = Object.keys(myEffortMap).map(act => ({
    name: act,
    value: parseFloat(myEffortMap[act].toFixed(1))
  }));

  // 5. GENUINE ESTIMATE ACCURACY COMPUTATION & ACTUAL FIGURES
  // Map total actual logged hours across all users/efforts for each task
  const taskActualHoursMap = {};
  efforts.forEach(e => {
    const taskId = parseInt(e.work_item_id, 10);
    if (taskId) {
      taskActualHoursMap[taskId] = (taskActualHoursMap[taskId] || 0) + parseFloat(e.hours_logged || 0);
    }
  });

  // Map scoped actual logged hours for tasks worked on within the active timeframe
  const taskScopedHoursMap = {};
  myScopedEfforts.forEach(e => {
    const taskId = parseInt(e.work_item_id, 10);
    if (taskId) {
      taskScopedHoursMap[taskId] = (taskScopedHoursMap[taskId] || 0) + parseFloat(e.hours_logged || 0);
    }
  });

  // Gather all tasks relevant to the user (assigned or worked on)
  const userRelevantTaskMap = new Map();
  tasks.forEach(t => {
    const isAssigned = (t.assigned_to || '').toLowerCase() === userLower;
    const hasEffortInScope = (taskScopedHoursMap[t.id] || 0) > 0;
    const hasAnyEffort = (taskActualHoursMap[t.id] || 0) > 0;
    
    if (isAssigned || hasEffortInScope || (timeScope === 'all' && hasAnyEffort)) {
      userRelevantTaskMap.set(t.id, t);
    }
  });

  // Filter tasks based on time scope:
  // If in a specific time filter (week/month/year), prioritize tasks with effort logged in that period
  let evaluatedTasks = Array.from(userRelevantTaskMap.values()).filter(t => {
    if (timeScope === 'all') {
      return (taskActualHoursMap[t.id] || 0) > 0 && parseFloat(t.estimated_hours || 0) > 0;
    }
    // For week/month/year, check if effort was logged in this scope
    return (taskScopedHoursMap[t.id] || 0) > 0 && parseFloat(t.estimated_hours || 0) > 0;
  });

  // If no effort has been logged yet in the selected week/month, fallback to user's tasks with logged effort & estimates so realistic data is shown
  if (evaluatedTasks.length === 0) {
    evaluatedTasks = Array.from(userRelevantTaskMap.values()).filter(t => 
      (taskActualHoursMap[t.id] || 0) > 0 && parseFloat(t.estimated_hours || 0) > 0
    );
  }

  // Calculate True Mathematical Accuracy & Variance
  let totalEstimatedOnEvaluated = 0;
  let totalActualOnEvaluated = 0;
  let totalAbsoluteDeviation = 0;

  evaluatedTasks.forEach(t => {
    const est = parseFloat(t.estimated_hours || 0);
    const act = taskActualHoursMap[t.id] || 0;
    totalEstimatedOnEvaluated += est;
    totalActualOnEvaluated += act;
    totalAbsoluteDeviation += Math.abs(act - est);
  });

  const hasAccuracyData = evaluatedTasks.length > 0 && totalEstimatedOnEvaluated > 0;
  const myEstimateAccuracyPct = hasAccuracyData
    ? Math.max(0, Math.round(100 - (totalAbsoluteDeviation / totalEstimatedOnEvaluated) * 100))
    : null;

  const totalVarianceHours = totalActualOnEvaluated - totalEstimatedOnEvaluated;
  const totalVariancePct = totalEstimatedOnEvaluated > 0 
    ? ((totalVarianceHours / totalEstimatedOnEvaluated) * 100).toFixed(1)
    : '0.0';

  // Estimate vs Actual Chart Data (Top 8 tasks with real actual logged hours and estimates)
  const sortedAccuracyTasks = [...evaluatedTasks].sort((a, b) => {
    const actA = taskActualHoursMap[a.id] || 0;
    const actB = taskActualHoursMap[b.id] || 0;
    return actB - actA;
  }).slice(0, 8);

  const myAccuracyChartData = sortedAccuracyTasks.map(t => {
    const est = parseFloat(t.estimated_hours || 0);
    const act = taskActualHoursMap[t.id] || 0;
    const diff = act - est;
    const taskAcc = est > 0 ? Math.max(0, Math.round(100 - (Math.abs(diff) / est) * 100)) : 100;

    return {
      id: t.id,
      name: t.title.length > 16 ? t.title.substring(0, 16) + '...' : t.title,
      fullTitle: t.title,
      opportunityName: t.opportunity_name || '',
      Estimated: est,
      Actual: parseFloat(act.toFixed(1)),
      variance: parseFloat(diff.toFixed(1)),
      accuracy: taskAcc
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
    (o.supporting_presales_members || '').toLowerCase().includes(userLower) ||
    (o.delivery_team || '').toLowerCase() === userLower ||
    (o.delivery_team || '').toLowerCase().includes(userLower)
  );

  const userAlerts = getUserOpportunityAlerts(opportunities, currentUser);

  // ----------------------------------------------------
  // 9. ADMIN ONLY: TEAM OPPORTUNITY ALLOCATIONS & STAGES
  // ----------------------------------------------------
  const isAdmin = userLower === 'admin' || (userRole || '').toLowerCase() === 'admin' || (activeProfile.role_name || '').toLowerCase() === 'admin';

  // Extract unique available years from opportunities dataset
  const availableOppYears = Array.from(
    new Set(
      opportunities.map(o => {
        const d = o.target_submission_date || o.received_date || o.created_at;
        if (!d) return null;
        const yr = new Date(d).getFullYear();
        return !isNaN(yr) ? yr : null;
      }).filter(Boolean)
    )
  ).sort((a, b) => b - a);

  // Filter opportunities by selected year (if specific year selected)
  const oppsInYearScope = adminYearFilter === 'all'
    ? opportunities
    : opportunities.filter(o => {
        const d = o.target_submission_date || o.received_date || o.created_at;
        if (!d) return false;
        const yr = new Date(d).getFullYear();
        return !isNaN(yr) && yr.toString() === adminYearFilter.toString();
      });

  const teamOpportunityAllocations = profiles.map(profile => {
    const u = (profile.username || '').toLowerCase();
    
    // Find all opportunities in the selected year scope where this user is linked (Presales Lead, Sales Owner, Supporting Team, or Delivery Team)
    const linkedOpps = oppsInYearScope.filter(o => {
      const pOwner = (o.presales_owner || '').toLowerCase();
      const sOwner = (o.primary_sales_owner || '').toLowerCase();
      const supporting = (o.supporting_presales_members || '').toLowerCase();
      const delivery = (o.delivery_team || '').toLowerCase();

      return pOwner === u || sOwner === u || supporting.includes(u) || delivery.includes(u);
    });

    // Compute stage counts & details
    const stageMap = {};
    linkedOpps.forEach(o => {
      const stageName = (o.deal_stage_name || 'Unassigned Stage').trim();
      if (!stageMap[stageName]) {
        stageMap[stageName] = {
          name: stageName,
          count: 0,
          color: o.deal_stage_color || '#3b82f6',
          opportunities: []
        };
      }
      stageMap[stageName].count += 1;
      stageMap[stageName].opportunities.push(o);
    });

    const stagesList = Object.values(stageMap).sort((a, b) => b.count - a.count);

    return {
      profile,
      username: profile.username,
      displayName: profile.name || formatUserName(profile.username),
      role: profile.role_name || 'Team Member',
      roleColor: profile.role_color || '#3b82f6',
      department: profile.department_name || 'Presales Solutions',
      totalOpportunities: linkedOpps.length,
      opportunities: linkedOpps,
      stages: stagesList
    };
  }).sort((a, b) => b.totalOpportunities - a.totalOpportunities);

  const filteredTeamAllocations = teamOpportunityAllocations.filter(item => {
    if (adminStageFilter === 'with_deals' && item.totalOpportunities === 0) return false;
    if (adminStageFilter === 'no_deals' && item.totalOpportunities > 0) return false;
    if (adminUserSearch.trim()) {
      const q = adminUserSearch.toLowerCase().trim();
      const matchName = item.displayName.toLowerCase().includes(q);
      const matchUser = item.username.toLowerCase().includes(q);
      const matchRole = item.role.toLowerCase().includes(q);
      const matchStage = item.stages.some(s => s.name.toLowerCase().includes(q));
      return matchName || matchUser || matchRole || matchStage;
    }
    return true;
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Action controls row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="badge badge-categorical">
            Role: {activeProfile.role_name || 'Team Member'}
          </span>
          <span className="badge badge-neutral" style={{ fontSize: '0.78rem' }}>
            Weekly Capacity: <strong>{myWeeklyCapacity} hrs/wk</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchAllData}>
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: ⚡ ACTIVE OPERATIONAL STATUS & WORKLOAD (Unaffected by Filter) */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-subtle, #e2e8f0)', paddingBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚡</span> Active Workload & Current Capacity
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Real-time operational queue, active task commitments, and weekly capacity tracking
            </p>
          </div>
        </div>

        {/* 3 Live KPI Cards */}
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
              <strong>{myCommittedHours.toFixed(1)} hrs</strong> in ongoing queue
            </div>
          </div>

          {/* KPI 2: Capacity Utilization (Weekly) */}
          <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Weekly Capacity Used
              </span>
              <span style={{ fontSize: '1.2rem' }}>📊</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: myWeeklyUtilizationPct > 100 ? '#ef4444' : 'var(--text-primary)', lineHeight: 1 }}>
              {myWeeklyUtilizationPct}%
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, myWeeklyUtilizationPct)}%`,
                height: '100%',
                background: myWeeklyUtilizationPct > 100 ? '#ef4444' : myWeeklyUtilizationPct > 80 ? '#f59e0b' : '#10b981',
                borderRadius: '3px'
              }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <strong>{myThisWeekLoggedHours.toFixed(1)}</strong> / {myWeeklyCapacity} hrs logged this week ({myWeeklyHoursRemaining.toFixed(1)} hrs left)
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
                Overdue / At-Risk Tasks
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
              <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>Task Title</th>
                      <th>Opportunity</th>
                      <th>Priority</th>
                      <th className="num-col">Est. Hrs</th>
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
                          <td className="num-col" style={{ fontWeight: 600 }}>{t.estimated_hours}h</td>
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
                <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No deliverables pending your technical sign-off.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '115px', overflowY: 'auto' }}>
                  {myReviewQueue.map(t => (
                    <div key={t.id} style={{ padding: '0.55rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>{t.title}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Assigned: {formatUserName(t.assigned_to)} | Opp: {t.opportunity_name || '—'}</div>
                      </div>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Sign-off Needed</span>
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
                <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  You are not currently linked to any active opportunities.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '115px', overflowY: 'auto' }}>
                  {myOpportunities.map(o => (
                    <div key={o.id} style={{ padding: '0.55rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>{o.opportunity_name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{o.company} | Due: {o.target_submission_date || '—'}</div>
                      </div>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {o.deal_stage_name || 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Live Work Items by Priority Chart */}
        <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              📌 Current Active Work Items by Priority
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Ongoing active task distribution categorized by priority level
            </p>
          </div>

          <div style={{ width: '100%', height: '220px' }}>
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

      {/* ========================================================================= */}
      {/* SECTION 2: ⏱️ LOGGED EFFORT & ACCURACY ANALYTICS (Time-Scope Filtered)   */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
        
        {/* TIME-SCOPE SELECTOR & LIVE ACTIVE WEEK INDICATOR */}
        <div style={{
          background: 'var(--surface-card, #ffffff)',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: 'var(--radius-md, 12px)',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.35rem' }}>⏱️</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                  Effort & Accuracy Scope: {scopeTitle}
                </strong>
                {timeScope === 'week' ? (
                  <span className="badge" style={{ fontSize: '0.72rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid #10b981', fontWeight: 700 }}>
                    ● Current Active Week
                  </span>
                ) : (
                  <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                    {scopeTitle} History
                  </span>
                )}
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {scopeDateSubtext} • Metrics and charts below update based on this time filter
              </p>
            </div>
          </div>

          {/* Time Scope Toggle Tabs */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-secondary, #f1f5f9)',
            borderRadius: '8px',
            padding: '3px',
            gap: '3px'
          }}>
            <button
              type="button"
              onClick={() => setTimeScope('week')}
              style={{
                padding: '0.38rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: timeScope === 'week' ? '#2563eb' : 'transparent',
                color: timeScope === 'week' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: timeScope === 'week' ? 700 : 500,
                cursor: 'pointer',
                fontSize: '0.82rem',
                transition: 'all 0.15s ease',
                boxShadow: timeScope === 'week' ? '0 1px 3px rgba(37,99,235,0.3)' : 'none'
              }}
            >
              📅 Current Week
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('month')}
              style={{
                padding: '0.38rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: timeScope === 'month' ? '#2563eb' : 'transparent',
                color: timeScope === 'month' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: timeScope === 'month' ? 700 : 500,
                cursor: 'pointer',
                fontSize: '0.82rem',
                transition: 'all 0.15s ease',
                boxShadow: timeScope === 'month' ? '0 1px 3px rgba(37,99,235,0.3)' : 'none'
              }}
            >
              🗓️ This Month
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('year')}
              style={{
                padding: '0.38rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: timeScope === 'year' ? '#2563eb' : 'transparent',
                color: timeScope === 'year' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: timeScope === 'year' ? 700 : 500,
                cursor: 'pointer',
                fontSize: '0.82rem',
                transition: 'all 0.15s ease',
                boxShadow: timeScope === 'year' ? '0 1px 3px rgba(37,99,235,0.3)' : 'none'
              }}
            >
              📆 This Year
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('all')}
              style={{
                padding: '0.38rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: timeScope === 'all' ? '#2563eb' : 'transparent',
                color: timeScope === 'all' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: timeScope === 'all' ? 700 : 500,
                cursor: 'pointer',
                fontSize: '0.82rem',
                transition: 'all 0.15s ease',
                boxShadow: timeScope === 'all' ? '0 1px 3px rgba(37,99,235,0.3)' : 'none'
              }}
            >
              ♾️ All Time
            </button>
          </div>
        </div>

        {/* 2 Filter-Scoped KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          
          {/* KPI: Hours Logged (Scoped to Active Timeframe) */}
          <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Hours Logged ({scopeTitle})
              </span>
              <span style={{ fontSize: '1.2rem' }}>⏱️</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {myScopedLoggedHours.toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 600 }}>hrs</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Across <strong>{myScopedEfforts.length}</strong> logged entries • {timeScope === 'week' ? 'Refreshes every week' : scopeTitle}
            </div>
          </div>

          {/* KPI: Estimate Accuracy */}
          <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Estimate Accuracy ({scopeTitle})
              </span>
              <span style={{ fontSize: '1.2rem' }}>🎯</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
              <span style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: myEstimateAccuracyPct !== null 
                  ? (myEstimateAccuracyPct >= 85 ? '#10b981' : myEstimateAccuracyPct >= 70 ? '#f59e0b' : '#ef4444')
                  : 'var(--text-secondary)',
                lineHeight: 1
              }}>
                {myEstimateAccuracyPct !== null ? `${myEstimateAccuracyPct}%` : '—'}
              </span>
              {hasAccuracyData && (
                <span className={`badge ${parseFloat(totalVariancePct) > 10 ? 'badge-warning' : parseFloat(totalVariancePct) < -10 ? 'badge-info' : 'badge-success'}`} style={{ fontSize: '0.72rem' }}>
                  {totalVarianceHours > 0 ? `+${totalVarianceHours.toFixed(1)}h overrun` : totalVarianceHours < 0 ? `${Math.abs(totalVarianceHours).toFixed(1)}h under` : 'On Target'}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {hasAccuracyData ? (
                <>
                  <strong>{totalActualOnEvaluated.toFixed(1)} hrs</strong> actual vs <strong>{totalEstimatedOnEvaluated.toFixed(1)} hrs</strong> est. ({evaluatedTasks.length} tasks)
                </>
              ) : (
                'No logged effort against estimates in this period'
              )}
            </div>
          </div>

        </div>

        {/* 2 Filter-Scoped Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          
          {/* Chart 1: Effort Logged by Activity Type */}
          <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                ⏱️ Time Spent by Activity Type ({scopeTitle})
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Effort distribution for {scopeTitle.toLowerCase()} (RFP writing, POC, Solution Design, Client Calls)
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
                  No effort entries logged in {scopeTitle.toLowerCase()}
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Estimate vs Actual Hours Accuracy */}
          <div className="paper-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                🎯 Estimate vs. Actual Hours ({scopeTitle})
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Actual hours logged compared directly against estimated hours per task
              </p>
            </div>

            <div style={{ width: '100%', height: '240px' }}>
              {isMounted && myAccuracyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={myAccuracyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      const variance = item.Actual - item.Estimated;
                      return (
                        <div style={{
                          background: 'var(--surface-card, #ffffff)',
                          border: '1px solid var(--border-subtle, #e2e8f0)',
                          borderRadius: '8px',
                          padding: '0.65rem 0.85rem',
                          fontSize: '0.78rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{item.fullTitle}</div>
                          {item.opportunityName && <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginBottom: '0.4rem' }}>Opp: {item.opportunityName}</div>}
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#2563eb' }}>
                            <span>Estimated:</span>
                            <strong>{item.Estimated}h</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#10b981' }}>
                            <span>Actual Logged:</span>
                            <strong>{item.Actual}h</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border-subtle, #e2e8f0)' }}>
                            <span>Variance:</span>
                            <strong style={{ color: variance > 0 ? '#ef4444' : variance < 0 ? '#10b981' : 'var(--text-secondary)' }}>
                              {variance > 0 ? `+${variance.toFixed(1)}h (Overrun)` : variance < 0 ? `${variance.toFixed(1)}h (Under)` : 'Exact Match'}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: 'var(--text-primary)' }}>
                            <span>Task Accuracy:</span>
                            <strong>{item.accuracy}%</strong>
                          </div>
                        </div>
                      );
                    }} />
                    <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                    <Bar dataKey="Estimated" name="Estimated Hours" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" name="Actual Hours" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No logged task estimates to display in {scopeTitle.toLowerCase()}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: 👑 TEAM OPPORTUNITY ALLOCATIONS & STAGE BREAKDOWN (Admin Only) */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.75rem' }}>
          
          {/* Section 3 Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-subtle, #e2e8f0)', paddingBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>👑</span> Team Opportunity Allocations & Stage Breakdown
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Active pipeline opportunities linked to each team member with granular deal stage counts
              </p>
            </div>
          </div>

          {/* Admin Toolbar & Filters */}
          <div style={{
            background: 'var(--surface-card, #ffffff)',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 220px', maxWidth: '320px' }}>
              <Search size={16} color="var(--text-secondary)" />
              <input
                type="text"
                className="input-field"
                placeholder="Search team member, role, or stage..."
                value={adminUserSearch}
                onChange={(e) => setAdminUserSearch(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', width: '100%' }}
              />
            </div>

            {/* Year Filter Dropdown Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                📅 Year:
              </span>
              <select
                className="input-field"
                value={adminYearFilter}
                onChange={(e) => setAdminYearFilter(e.target.value)}
                style={{
                  fontSize: '0.8rem',
                  padding: '0.38rem 0.75rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: adminYearFilter === 'all' ? 'var(--text-primary)' : '#2563eb',
                  backgroundColor: 'var(--bg-secondary, #f1f5f9)',
                  border: '1px solid var(--border-subtle, #e2e8f0)'
                }}
              >
                <option value="all">All Years (Lifetime)</option>
                {availableOppYears.map(yr => (
                  <option key={yr} value={yr.toString()}>Year {yr}</option>
                ))}
              </select>
            </div>

            {/* Stage filter pills */}
            <div style={{
              display: 'inline-flex',
              background: 'var(--bg-secondary, #f1f5f9)',
              borderRadius: '8px',
              padding: '3px',
              gap: '3px'
            }}>
              <button
                type="button"
                onClick={() => setAdminStageFilter('all')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: adminStageFilter === 'all' ? '#2563eb' : 'transparent',
                  color: adminStageFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: adminStageFilter === 'all' ? 700 : 500,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                All Members ({teamOpportunityAllocations.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminStageFilter('with_deals')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: adminStageFilter === 'with_deals' ? '#2563eb' : 'transparent',
                  color: adminStageFilter === 'with_deals' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: adminStageFilter === 'with_deals' ? 700 : 500,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                With Active Deals ({teamOpportunityAllocations.filter(u => u.totalOpportunities > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setAdminStageFilter('no_deals')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: adminStageFilter === 'no_deals' ? '#2563eb' : 'transparent',
                  color: adminStageFilter === 'no_deals' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: adminStageFilter === 'no_deals' ? 700 : 500,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Available / No Deals ({teamOpportunityAllocations.filter(u => u.totalOpportunities === 0).length})
              </button>
            </div>
          </div>

          {/* Team Members List View */}
          <div className="paper-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
            {filteredTeamAllocations.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No team members match your search criteria.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* List Header Bar */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 1.4fr) minmax(110px, 0.8fr) minmax(280px, 2.2fr) minmax(130px, 1fr) 100px',
                  padding: '0.75rem 1.25rem',
                  backgroundColor: 'var(--bg-secondary, #f8fafc)',
                  borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div>Team Member</div>
                  <div>Linked Deals</div>
                  <div>Stage Breakdown & Counts</div>
                  <div>Proportion</div>
                  <div style={{ textAlign: 'right' }}>Actions</div>
                </div>

                {/* List Items */}
                {filteredTeamAllocations.map((member, idx) => {
                  const isExpanded = !!expandedUsers[member.username];
                  const isLast = idx === filteredTeamAllocations.length - 1;

                  return (
                    <div
                      key={member.username}
                      style={{
                        borderBottom: isLast && !isExpanded ? 'none' : '1px solid var(--border-subtle, #f1f5f9)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Main Row Content */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(220px, 1.4fr) minmax(110px, 0.8fr) minmax(280px, 2.2fr) minmax(130px, 1fr) 100px',
                          padding: '0.9rem 1.25rem',
                          alignItems: 'center',
                          gap: '1rem',
                          backgroundColor: isExpanded ? 'rgba(59, 130, 246, 0.03)' : 'transparent'
                        }}
                      >
                        {/* Column 1: Member Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: member.roleColor ? `${member.roleColor}22` : 'rgba(59, 130, 246, 0.15)',
                              color: member.roleColor || '#3b82f6',
                              border: `1.5px solid ${member.roleColor || '#3b82f6'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              flexShrink: 0
                            }}
                          >
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                {member.displayName}
                              </strong>
                              <span className="badge badge-neutral" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                                @{member.username}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                              {member.role} • {member.department}
                            </div>
                          </div>
                        </div>

                        {/* Column 2: Total Opportunities */}
                        <div>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              backgroundColor: member.totalOpportunities > 0 ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-secondary)',
                              color: member.totalOpportunities > 0 ? '#1d4ed8' : 'var(--text-muted)',
                              border: member.totalOpportunities > 0 ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid var(--border-subtle)',
                              padding: '0.2rem 0.55rem'
                            }}
                          >
                            {member.totalOpportunities} {member.totalOpportunities === 1 ? 'Deal' : 'Deals'}
                          </span>
                        </div>

                        {/* Column 3: Stage Breakdown Pills */}
                        <div>
                          {member.totalOpportunities === 0 ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              No active deals linked
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {member.stages.map(st => (
                                <span
                                  key={st.name}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    backgroundColor: st.color ? `${st.color}15` : 'rgba(59, 130, 246, 0.1)',
                                    color: st.color || '#2563eb',
                                    border: `1px solid ${st.color ? `${st.color}35` : 'rgba(59, 130, 246, 0.25)'}`
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: st.color || '#2563eb' }} />
                                  <span>{st.name}</span>
                                  <strong style={{
                                    backgroundColor: st.color ? st.color : '#2563eb',
                                    color: '#ffffff',
                                    borderRadius: '10px',
                                    padding: '0.02rem 0.35rem',
                                    fontSize: '0.68rem',
                                    marginLeft: '0.1rem'
                                  }}>
                                    {st.count}
                                  </strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Column 4: Distribution Bar */}
                        <div>
                          {member.totalOpportunities > 0 ? (
                            <div style={{ width: '100%', height: '7px', background: 'var(--bg-secondary)', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
                              {member.stages.map(st => (
                                <div
                                  key={st.name}
                                  title={`${st.name}: ${st.count} (${Math.round((st.count / member.totalOpportunities) * 100)}%)`}
                                  style={{
                                    width: `${(st.count / member.totalOpportunities) * 100}%`,
                                    height: '100%',
                                    backgroundColor: st.color || '#3b82f6'
                                  }}
                                />
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>—</span>
                          )}
                        </div>

                        {/* Column 5: Action */}
                        <div style={{ textAlign: 'right' }}>
                          {member.totalOpportunities > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleExpandUser(member.username)}
                              style={{
                                background: isExpanded ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-secondary)',
                                border: '1px solid var(--border-subtle, #e2e8f0)',
                                color: isExpanded ? '#2563eb' : 'var(--text-secondary)',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <span>{isExpanded ? 'Hide' : 'View'}</span>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>—</span>
                          )}
                        </div>
                      </div>

                      {/* Expandable Sub-List of Deals */}
                      {isExpanded && member.totalOpportunities > 0 && (
                        <div
                          style={{
                            padding: '0.75rem 1.25rem 1rem 3.75rem',
                            backgroundColor: 'rgba(248, 250, 252, 0.85)',
                            borderTop: '1px solid var(--border-subtle, #f1f5f9)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Linked Opportunities ({member.opportunities.length}):
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem' }}>
                            {member.opportunities.map(opp => (
                              <div
                                key={opp.id}
                                onClick={() => onNavigateToOpp && onNavigateToOpp(opp)}
                                style={{
                                  padding: '0.55rem 0.75rem',
                                  borderRadius: '6px',
                                  backgroundColor: 'var(--surface-card, #ffffff)',
                                  border: '1px solid var(--border-subtle, #e2e8f0)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.5rem',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = '#3b82f6';
                                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.04)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = 'var(--border-subtle, #e2e8f0)';
                                  e.currentTarget.style.backgroundColor = 'var(--surface-card, #ffffff)';
                                }}
                              >
                                <div style={{ overflow: 'hidden', flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {opp.opportunity_name}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    🏢 {opp.company} • Due: {opp.target_submission_date || '—'}
                                  </div>
                                </div>
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '4px',
                                    backgroundColor: opp.deal_stage_color ? `${opp.deal_stage_color}18` : 'rgba(59, 130, 246, 0.1)',
                                    color: opp.deal_stage_color || '#2563eb',
                                    border: `1px solid ${opp.deal_stage_color ? `${opp.deal_stage_color}40` : 'rgba(59, 130, 246, 0.3)'}`,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {opp.deal_stage_name || 'Unassigned'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
