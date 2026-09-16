'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Clock, X, ChevronRight, CheckCircle2 } from 'lucide-react';
import { getUserOpportunityAlerts } from '@/lib/opportunityAlerts.js';

export default function NotificationCenter({
  opportunities = [],
  currentUser,
  userRole,
  onNavigateToOpp
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'overdue' | 'approaching'
  const [dismissedOppIds, setDismissedOppIds] = useState(new Set());
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Compute alerts strictly for opportunities directly related to currentUser
  const alertsData = getUserOpportunityAlerts(opportunities, currentUser, userRole);

  // Filter out any individually dismissed opportunities for this session
  const activeAlerts = alertsData.allAlerts.filter(a => !dismissedOppIds.has(a.opportunityId));
  const activeOverdue = alertsData.overdue.filter(a => !dismissedOppIds.has(a.opportunityId));
  const activeApproaching = alertsData.approaching.filter(a => !dismissedOppIds.has(a.opportunityId));

  const totalActive = activeAlerts.length;
  const overdueCount = activeOverdue.length;
  const approachingCount = activeApproaching.length;

  const displayList = filterType === 'overdue'
    ? activeOverdue
    : filterType === 'approaching'
    ? activeApproaching
    : activeAlerts;

  const handleDismiss = (oppId, e) => {
    e.stopPropagation();
    setDismissedOppIds(prev => new Set([...prev, oppId]));
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    const allIds = activeAlerts.map(a => a.opportunityId);
    setDismissedOppIds(prev => new Set([...prev, ...allIds]));
  };

  const handleItemClick = (opp) => {
    setIsOpen(false);
    if (onNavigateToOpp) {
      onNavigateToOpp(opp);
    }
  };

  return (
    <div className="notification-center-wrap" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button with Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="top-theme-toggle-switch notification-bell-btn"
        title={totalActive > 0 ? `${totalActive} Opportunity deadline alert(s)` : 'Opportunity Notifications'}
        aria-label="Opportunity Notifications"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1px solid var(--border-subtle, rgba(226, 232, 240, 0.9))',
          backgroundColor: isOpen ? 'var(--bg-secondary, #f1f5f9)' : 'var(--surface-card, #ffffff)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          padding: 0
        }}
      >
        <Bell
          size={16}
          style={{
            color: totalActive > 0 ? (overdueCount > 0 ? 'var(--color-danger, #dc2626)' : 'var(--color-warning, #d97706)') : 'var(--text-secondary, #4b5563)',
            animation: overdueCount > 0 ? 'pulse 2s infinite' : 'none'
          }}
        />

        {/* Badge counter */}
        {totalActive > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              backgroundColor: overdueCount > 0 ? 'var(--color-danger, #dc2626)' : 'var(--color-warning, #d97706)',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 800,
              minWidth: '17px',
              height: '17px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              border: '2px solid var(--bg-primary, #ffffff)',
              lineHeight: 1
            }}
          >
            {totalActive}
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className="paper-panel notification-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '420px',
            maxWidth: '92vw',
            maxHeight: '520px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10000,
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--glass-border, rgba(226, 232, 240, 0.9))',
            boxShadow: 'var(--shadow-lg, 0 20px 35px -5px rgba(15, 23, 42, 0.2))',
            backgroundColor: 'var(--bg-secondary, #ffffff)',
            backdropFilter: 'blur(16px)',
            animation: 'fadeInOverlay 0.18s ease-out forwards'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem 1.15rem 0.75rem 1.15rem',
              borderBottom: '1px solid var(--border-subtle, rgba(226, 232, 240, 0.8))',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🔔</span>
                <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Opportunity Deadlines
                </span>
                {totalActive > 0 && (
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '12px',
                      backgroundColor: overdueCount > 0 ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                      color: overdueCount > 0 ? 'var(--color-danger-text)' : 'var(--color-warning-text)',
                      border: `1px solid ${overdueCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                    }}
                  >
                    {totalActive} urgent
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}
                title="Close notifications"
              >
                <X size={15} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
              Notifications for opportunities directly assigned to you
            </p>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.76rem',
                  fontWeight: filterType === 'all' ? 700 : 500,
                  borderRadius: '6px',
                  border: filterType === 'all' ? '1px solid var(--accent-secondary, #2563eb)' : '1px solid transparent',
                  backgroundColor: filterType === 'all' ? 'var(--color-info-bg, rgba(37, 99, 235, 0.1))' : 'transparent',
                  color: filterType === 'all' ? 'var(--accent-secondary, #2563eb)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                All ({totalActive})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('overdue')}
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.76rem',
                  fontWeight: filterType === 'overdue' ? 700 : 500,
                  borderRadius: '6px',
                  border: filterType === 'overdue' ? '1px solid var(--color-danger-text, #ef4444)' : '1px solid transparent',
                  backgroundColor: filterType === 'overdue' ? 'var(--color-danger-bg)' : 'transparent',
                  color: filterType === 'overdue' ? 'var(--color-danger-text, #dc2626)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                🔴 Overdue ({overdueCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('approaching')}
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.76rem',
                  fontWeight: filterType === 'approaching' ? 700 : 500,
                  borderRadius: '6px',
                  border: filterType === 'approaching' ? '1px solid var(--color-warning-text, #f59e0b)' : '1px solid transparent',
                  backgroundColor: filterType === 'approaching' ? 'var(--color-warning-bg)' : 'transparent',
                  color: filterType === 'approaching' ? 'var(--color-warning-text, #d97706)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                🟡 Due Soon ({approachingCount})
              </button>

              {totalActive > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                  title="Dismiss all for current session"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Alert Cards List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {displayList.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={38} style={{ color: 'var(--color-success, #059669)', margin: '0 auto 0.65rem auto', opacity: 0.85 }} />
                <h5 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 600 }}>
                  {filterType === 'all'
                    ? "You're all caught up!"
                    : filterType === 'overdue'
                    ? "No overdue opportunities!"
                    : "No opportunities approaching due dates!"}
                </h5>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  All your assigned opportunities are progressing smoothly.
                </p>
              </div>
            ) : (
              displayList.map(item => {
                const isOverdue = item.type === 'overdue';
                const borderColor = isOverdue ? '#ef4444' : '#f59e0b';
                const bgColor = isOverdue ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)';

                return (
                  <div
                    key={item.opportunityId}
                    className="notification-alert-card"
                    onClick={() => handleItemClick(item.rawOpp)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${borderColor}`,
                      borderTop: '1px solid var(--border-subtle, rgba(226, 232, 240, 0.7))',
                      borderRight: '1px solid var(--border-subtle, rgba(226, 232, 240, 0.7))',
                      borderBottom: '1px solid var(--border-subtle, rgba(226, 232, 240, 0.7))',
                      backgroundColor: bgColor,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(2px)';
                      e.currentTarget.style.filter = 'brightness(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.filter = 'none';
                    }}
                  >
                    {/* Top Row: Opportunity Name & Dismiss button */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.25 }}>
                          {item.opportunityName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          🏢 {item.company}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDismiss(item.opportunityId, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.15rem',
                          lineHeight: 1
                        }}
                        title="Dismiss notification"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Relevant Message */}
                    <div style={{
                      marginTop: '0.45rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: isOverdue ? 'var(--color-danger-text, #dc2626)' : 'var(--color-warning-text, #d97706)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      {isOverdue ? <AlertTriangle size={14} /> : <Clock size={14} />}
                      <span>{item.message}</span>
                    </div>

                    {/* Meta Pills: User role + Stage + Due Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: isOverdue ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                        color: isOverdue ? 'var(--color-danger-text, #dc2626)' : 'var(--color-warning-text, #d97706)',
                        border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                      }}>
                        {item.badgeText}
                      </span>

                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-tertiary, #1F2937)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        👤 Role: {item.userRoleInOpp}
                      </span>

                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-tertiary, #1F2937)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        Stage: {item.dealStageName}
                      </span>

                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '0.72rem',
                        color: 'var(--accent-secondary, #2563eb)',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}>
                        View <ChevronRight size={11} />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {totalActive > 0 && (
            <div
              style={{
                padding: '0.65rem 1.15rem',
                borderTop: '1px solid var(--border-subtle, rgba(226, 232, 240, 0.8))',
                background: 'var(--bg-primary, #0B0F19)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.76rem'
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                {overdueCount} overdue • {approachingCount} due soon
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setIsOpen(false);
                  if (onNavigateToOpp) onNavigateToOpp(null);
                }}
                style={{ fontSize: '0.76rem', padding: '0.2rem 0.5rem', fontWeight: 600, color: 'var(--accent-secondary, #2563eb)' }}
              >
                Go to Opportunities →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
