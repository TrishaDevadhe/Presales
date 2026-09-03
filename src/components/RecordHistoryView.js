'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ListChecks,
  PlusCircle,
  Pencil,
  RefreshCw,
  UserCheck,
  Trash2,
  Undo2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function RecordHistoryView({ entityType, entityId }) {
  const { formatUserName } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRowId, setExpandedRowId] = useState(null);

  useEffect(() => {
    if (!entityType || !entityId) return;

    const fetchRecordHistory = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/auditlogs?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data);
        }
      } catch (err) {
        console.error('Failed to fetch record history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecordHistory();
  }, [entityType, entityId]);

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

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
        Loading history...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <ListChecks size={40} strokeWidth={1.5} />
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          No audit history logged for this record yet.
        </div>
      </div>
    );
  }

  return (
    <div className="table-container" style={{ marginTop: '0.5rem' }}>
      <table className="custom-table">
        <thead>
          <tr>
            <th style={{ width: '160px' }}>Timestamp</th>
            <th style={{ width: '180px' }}>Actor</th>
            <th style={{ width: '140px' }}>Action</th>
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

                {isExpanded && hasDiff && (
                  <tr>
                    <td colSpan={6} style={{ background: 'rgba(241, 245, 249, 0.4)', padding: '0.75rem 1.25rem' }}>
                      <div className="audit-diff-row">
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                          Field Diff Inspection ({log.field_changed || 'Data Record'})
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
  );
}
