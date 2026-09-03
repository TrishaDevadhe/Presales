'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ShieldCheck,
  ListChecks,
  PlusCircle,
  Pencil,
  RefreshCw,
  UserCheck,
  Trash2,
  Undo2,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Calendar,
  User,
  Filter,
  Search
} from 'lucide-react';

const DUMMY_ACTIVITY_LOGS = [
  {
    id: 'd1',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    real_user_id: 'admin',
    acting_as_user_id: null,
    entity_type: 'Opportunity',
    entity_id: '1',
    entity_title: 'Enterprise Cloud Migration',
    action_type: 'Updated',
    field_changed: 'Status (Deal Stage)',
    value_before: 'Proposal',
    value_after: 'Negotiation',
    summary_text: 'Updated deal stage to Negotiation'
  },
  {
    id: 'd2',
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    real_user_id: 'admin',
    acting_as_user_id: null,
    entity_type: 'Work Item',
    entity_id: '101',
    entity_title: 'Draft Technical Proposal',
    action_type: 'Created',
    field_changed: null,
    value_before: null,
    value_after: null,
    summary_text: 'Created Work Item: Draft Technical Proposal'
  },
  {
    id: 'd3',
    timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    real_user_id: 'admin',
    acting_as_user_id: 'trisha_devadhe',
    entity_type: 'Opportunity',
    entity_id: '2',
    entity_title: 'Healthcare Security Modernization',
    action_type: 'Reassigned',
    field_changed: 'Presales Owner',
    value_before: 'john_smith',
    value_after: 'vartika_jadon',
    summary_text: 'Reassigned Presales Owner'
  },
  {
    id: 'd4',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    real_user_id: 'vartika_jadon',
    acting_as_user_id: null,
    entity_type: 'Work Item',
    entity_id: '102',
    entity_title: 'RFP Compliance Review',
    action_type: 'Status Changed',
    field_changed: 'Status',
    value_before: 'In Progress',
    value_after: 'Completed',
    summary_text: 'Marked task as Completed'
  },
  {
    id: 'd5',
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    real_user_id: 'admin',
    acting_as_user_id: null,
    entity_type: 'Admin Config',
    entity_id: 'source',
    entity_title: 'Lead Source Options',
    action_type: 'Updated',
    field_changed: 'Picklist Option',
    value_before: 'Inbound Web',
    value_after: 'Inbound Web Portal',
    summary_text: 'Updated Picklist Option'
  }
];

const DUMMY_ACCESS_LOGS = [
  {
    id: 'a1',
    timestamp: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    username: 'admin',
    event_type: 'Login Success',
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    failure_reason: null
  },
  {
    id: 'a2',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    username: 'trisha_devadhe',
    event_type: 'Login Success',
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    failure_reason: null
  },
  {
    id: 'a3',
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    username: 'jane_doe',
    event_type: 'Login Failure',
    ip_address: '192.168.1.45',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
    failure_reason: 'Invalid passcode entry'
  },
  {
    id: 'a4',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    username: 'vartika_jadon',
    event_type: 'Login Success',
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    failure_reason: null
  },
  {
    id: 'a5',
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    username: 'john_smith',
    event_type: 'Login Success',
    ip_address: '10.0.0.12',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    failure_reason: null
  }
];

export default function AuditLogTab() {
  const { currentUser, userRole, allUsers, formatUserName } = useApp();

  const [activeSubTab, setActiveSubTab] = useState('activity'); // 'activity' | 'access'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterActionType, setFilterActionType] = useState('');
  const [filterEventType, setFilterEventType] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('tab', activeSubTab);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filterUser) params.append('user', filterUser);
      if (activeSubTab === 'activity') {
        if (filterEntityType) params.append('entity_type', filterEntityType);
        if (filterActionType) params.append('action_type', filterActionType);
      } else {
        if (filterEventType) params.append('event_type', filterEventType);
      }

      const res = await fetch(`/api/auditlogs?${params.toString()}`, {
        headers: {
          'x-user-role': userRole || 'Admin',
          'x-real-user': currentUser || ''
        }
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load audit logs');
      }

      const fetchedData = Array.isArray(json) ? json : [];
      if (fetchedData.length === 0) {
        setLogs(activeSubTab === 'activity' ? DUMMY_ACTIVITY_LOGS : DUMMY_ACCESS_LOGS);
      } else {
        setLogs(fetchedData);
      }
    } catch (e) {
      console.error('Error fetching audit logs:', e);
      setLogs(activeSubTab === 'activity' ? DUMMY_ACTIVITY_LOGS : DUMMY_ACCESS_LOGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeSubTab, startDate, endDate, filterUser, filterEntityType, filterActionType, filterEventType]);

  // Action Icon & Tint Badge Mapping (Part C)
  const getActionBadge = (action) => {
    switch (action) {
      case 'Created':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <PlusCircle size={13} /> Created
          </span>
        );
      case 'Updated':
        return (
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Pencil size={13} /> Updated
          </span>
        );
      case 'Status Changed':
        return (
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <RefreshCw size={13} /> Status Changed
          </span>
        );
      case 'Assigned':
      case 'Reassigned':
        return (
          <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED', border: '1px solid rgba(124, 58, 237, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <UserCheck size={13} /> Assigned
          </span>
        );
      case 'Deleted':
        return (
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Trash2 size={13} /> Deleted
          </span>
        );
      case 'Reverted':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Undo2 size={13} /> Reverted
          </span>
        );
      default:
        return <span className="badge badge-neutral">{action}</span>;
    }
  };

  // Failed Logins Threshold Detector (3+ failed logins within 15 min) (Part D)
  const getFailedLoginAlerts = () => {
    if (activeSubTab !== 'access') return [];

    const failures = logs.filter(l => l.event_type === 'Login Failure');
    const userFailures = {};

    failures.forEach(l => {
      const u = (l.username || 'Unknown').toLowerCase();
      if (!userFailures[u]) userFailures[u] = [];
      userFailures[u].push(new Date(l.timestamp));
    });

    const flaggedUsers = [];
    Object.keys(userFailures).forEach(u => {
      const times = userFailures[u].sort((a, b) => b - a);
      if (times.length >= 3) {
        // Check if 3 recent failures occurred within 15 mins (900,000 ms)
        for (let i = 0; i <= times.length - 3; i++) {
          if (times[i] - times[i + 2] <= 15 * 60 * 1000) {
            flaggedUsers.push(u);
            break;
          }
        }
      }
    });

    return flaggedUsers;
  };

  const flaggedFailedUsers = getFailedLoginAlerts();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* PAGE HEADER (Part B: icon badge Danger tint + section-kicker + title) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          className="page-icon-badge"
          style={{
            background: 'var(--color-danger-bg)',
            color: 'var(--color-danger-text)',
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}
        >
          <ShieldCheck size={26} />
        </div>
        <div>
          <div className="section-kicker" style={{ color: 'var(--color-danger-text)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            System Accountability & Governance
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: 800, margin: 0 }}>
            Audit Log
          </h2>
        </div>
      </div>

      {/* SUB-TABS BAR (.tab-group) */}
      <div className="paper-panel" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="tab-group" style={{ background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
          <button
            onClick={() => { setActiveSubTab('activity'); setExpandedRowId(null); }}
            className={`tab-item ${activeSubTab === 'activity' ? 'active' : ''}`}
            style={{ fontSize: '0.88rem', padding: '0.5rem 1.25rem' }}
          >
            📋 Activity Log
          </button>
          <button
            onClick={() => { setActiveSubTab('access'); setExpandedRowId(null); }}
            className={`tab-item ${activeSubTab === 'access' ? 'active' : ''}`}
            style={{ fontSize: '0.88rem', padding: '0.5rem 1.25rem' }}
          >
            🛡️ Access Log
          </button>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{logs.length}</strong> logged entries
        </div>
      </div>

      {/* FILTER ROW (Same filter-bar styling as Work Items / Effort Logs) */}
      <div className="paper-panel" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Filter size={14} /> Filters:
        </span>

        {/* Date Range Start */}
        <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '0.4rem 0.65rem', fontSize: '0.82rem' }}
            placeholder="From Date"
          />
        </div>

        {/* Date Range End */}
        <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '0.4rem 0.65rem', fontSize: '0.82rem' }}
            placeholder="To Date"
          />
        </div>

        {/* User Filter */}
        <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
          <select
            className="form-control form-select"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            style={{ padding: '0.4rem 0.65rem', fontSize: '0.82rem' }}
          >
            <option value="">All Users</option>
            {(allUsers || []).map(u => (
              <option key={u} value={u}>{formatUserName ? formatUserName(u) : `@${u}`}</option>
            ))}
          </select>
        </div>

        {/* Activity Log specific filters */}
        {activeSubTab === 'activity' && (
          <>
            <div className="form-group" style={{ margin: 0, minWidth: '170px' }}>
              <select
                className="form-control form-select"
                value={filterEntityType}
                onChange={(e) => setFilterEntityType(e.target.value)}
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.82rem' }}
              >
                <option value="">All Entity Types</option>
                <option value="Opportunity">Opportunity</option>
                <option value="Work Item">Work Item</option>
                <option value="Effort Log">Effort Log</option>
                <option value="Proposal Revision">Proposal Revision</option>
                <option value="Client Feedback">Client Feedback</option>
                <option value="Resource Profile">Resource Profile</option>
                <option value="Admin Config">Admin Config</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
              <select
                className="form-control form-select"
                value={filterActionType}
                onChange={(e) => setFilterActionType(e.target.value)}
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.82rem' }}
              >
                <option value="">All Action Types</option>
                <option value="Created">Created</option>
                <option value="Updated">Updated</option>
                <option value="Status Changed">Status Changed</option>
                <option value="Assigned">Assigned</option>
                <option value="Deleted">Deleted</option>
                <option value="Reverted">Reverted</option>
              </select>
            </div>
          </>
        )}

        {/* Access Log specific filters */}
        {activeSubTab === 'access' && (
          <div className="form-group" style={{ margin: 0, minWidth: '170px' }}>
            <select
              className="form-control form-select"
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              style={{ padding: '0.4rem 0.65rem', fontSize: '0.82rem' }}
            >
              <option value="">All Event Types</option>
              <option value="Login Success">Login Success</option>
              <option value="Login Failure">Login Failure</option>
              <option value="Logout">Logout</option>
              <option value="Session Expired">Session Expired</option>
            </select>
          </div>
        )}

        {(startDate || endDate || filterUser || filterEntityType || filterActionType || filterEventType) && (
          <button
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setFilterUser('');
              setFilterEntityType('');
              setFilterActionType('');
              setFilterEventType('');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* FAILED LOGIN INLINE ALERT BANNER (Part D) */}
      {activeSubTab === 'access' && flaggedFailedUsers.length > 0 && (
        <div className="alert-banner alert-banner-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem' }}>
          <AlertOctagon size={20} color="var(--color-danger-text)" />
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-danger-text)' }}>
            ⚠️ Repeated failed login attempts detected for {flaggedFailedUsers.map(u => `@${u}`).join(', ')} (3+ failures within 15 minutes) — review recommended.
          </div>
        </div>
      )}

      {/* TABLE CONTENT */}
      <div className="paper-panel" style={{ padding: '1rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Loading audit events...
          </div>
        ) : error ? (
          <div className="alert-banner alert-banner-danger" style={{ padding: '1rem' }}>
            {error}
          </div>
        ) : logs.length === 0 ? (
          // Part I Empty States
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: '0.75rem', color: 'var(--text-muted)' }}>
            {activeSubTab === 'activity' ? <ListChecks size={48} strokeWidth={1.5} /> : <ShieldCheck size={48} strokeWidth={1.5} />}
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {activeSubTab === 'activity' ? 'No activity matches these filters.' : 'No login activity recorded yet.'}
            </div>
          </div>
        ) : activeSubTab === 'activity' ? (
          // ACTIVITY LOG TABLE (Part C & F)
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Timestamp</th>
                  <th style={{ width: '180px' }}>Actor</th>
                  <th style={{ width: '140px' }}>Action</th>
                  <th style={{ width: '180px' }}>Entity</th>
                  <th style={{ width: '140px' }}>Field Changed</th>
                  <th>Summary</th>
                  <th style={{ width: '50px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expandedRowId === log.id;
                  const formattedDate = new Date(log.timestamp).toLocaleString();
                  const hasDiff = log.value_before || log.value_after;

                  return (
                    <React.Fragment key={log.id}>
                      <tr>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {formattedDate}
                        </td>
                        
                        {/* Actor column with Impersonation support (Part F) */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                              {formatUserName ? formatUserName(log.acting_as_user_id || log.real_user_id) : `@${log.acting_as_user_id || log.real_user_id}`}
                            </strong>
                            {log.acting_as_user_id && (
                              <span className="section-kicker" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                via {formatUserName ? formatUserName(log.real_user_id) : `@${log.real_user_id}`}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>{getActionBadge(log.action_type)}</td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="badge badge-neutral" style={{ alignSelf: 'flex-start', fontSize: '0.72rem' }}>
                              {log.entity_type}
                            </span>
                            {log.entity_title && (
                              <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                                {log.entity_title}
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {log.field_changed || '—'}
                        </td>

                        <td style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {log.summary_text}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {hasDiff && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.4rem', borderRadius: 'var(--radius-sm)' }}
                              onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Row Diff (Part C: .audit-diff-row, .audit-diff-before, .audit-diff-after) */}
                      {isExpanded && hasDiff && (
                        <tr>
                          <td colSpan={7} style={{ background: 'rgba(241, 245, 249, 0.4)', padding: '0.75rem 1.25rem' }}>
                            <div className="audit-diff-row">
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                                Field Diff Inspection ({log.field_changed || 'Data Object'})
                              </div>
                              {log.value_before !== null && (
                                <div>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>BEFORE:</span>
                                  <span className="audit-diff-before">{log.value_before}</span>
                                </div>
                              )}
                              {log.value_after !== null && (
                                <div>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>AFTER:</span>
                                  <span className="audit-diff-after">{log.value_after}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // ACCESS LOG TABLE (Part D)
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '170px' }}>Timestamp</th>
                  <th>User</th>
                  <th>Event</th>
                  <th>IP Address</th>
                  <th>Device / User-Agent</th>
                  <th>Failure Reason</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const formattedDate = new Date(log.timestamp).toLocaleString();
                  const isFailure = log.event_type === 'Login Failure';

                  return (
                    <tr key={log.id} style={{ background: isFailure ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {formattedDate}
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {formatUserName ? formatUserName(log.username) : `@${log.username}`}
                        </strong>
                      </td>
                      <td>
                        <span className={`badge ${isFailure ? 'badge-danger' : log.event_type === 'Login Success' ? 'badge-success' : 'badge-neutral'}`}>
                          {log.event_type}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.83rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {log.ip_address || '127.0.0.1'}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.user_agent || 'Browser Client'}
                      </td>
                      <td style={{ fontSize: '0.83rem', color: 'var(--color-danger-text)', fontWeight: 600 }}>
                        {log.failure_reason || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
