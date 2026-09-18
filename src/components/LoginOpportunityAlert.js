'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getUserOpportunityAlerts } from '@/lib/opportunityAlerts.js';
import { AlertTriangle, Clock, X, ArrowRight, Building2, Calendar, ShieldAlert } from 'lucide-react';

export default function LoginOpportunityAlert({
  opportunities = [],
  currentUser,
  userRole,
  isLoggedIn,
  onNavigateToOpp
}) {
  const { formatUserName } = useApp();
  const [isVisible, setIsVisible] = useState(false);
  const [lastNotifiedUser, setLastNotifiedUser] = useState(null);

  // Trigger whenever user logs in or switches account
  useEffect(() => {
    if (!isLoggedIn || !currentUser) {
      setIsVisible(false);
      return;
    }

    if (currentUser !== lastNotifiedUser && opportunities.length > 0) {
      const alerts = getUserOpportunityAlerts(opportunities, currentUser, userRole);
      if (alerts && alerts.totalCount > 0) {
        setIsVisible(true);
        setLastNotifiedUser(currentUser);
      }
    }
  }, [isLoggedIn, currentUser, userRole, opportunities, lastNotifiedUser]);

  if (!isVisible || !isLoggedIn || !currentUser) return null;

  const alerts = getUserOpportunityAlerts(opportunities, currentUser, userRole);
  if (!alerts || alerts.totalCount === 0) return null;

  const overdueCount = alerts.overdueCount || 0;
  const approachingCount = alerts.approachingCount || 0;
  const userDisplayName = formatUserName(currentUser);
  const isCritical = overdueCount > 0;

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleGoToOpp = (opp = null) => {
    setIsVisible(false);
    if (onNavigateToOpp) {
      onNavigateToOpp(opp);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
      onClick={handleDismiss}
    >
      {/* Center Screen Modal Box */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: 'var(--surface-card, #ffffff)',
          borderRadius: '16px',
          border: `1.5px solid ${isCritical ? '#ef4444' : '#f59e0b'}`,
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 40px)'
        }}
      >
        {/* Top Attention Banner Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: isCritical ? '#dc2626' : '#d97706',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                flexShrink: 0
              }}
            >
              {isCritical ? <ShieldAlert size={26} color="#ffffff" /> : <AlertTriangle size={26} color="#ffffff" />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                {isCritical ? '⚠️ Urgent: Opportunity Deadlines Overdue' : '⏳ Opportunity Deadlines Approaching'}
              </h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                Action required for user <strong>@{currentUser}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; }}
            title="Close alert"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem', overflowY: 'auto' }}>
          
          {/* Greeting & Summary Note */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: isCritical ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
              borderRadius: '10px',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              lineHeight: 1.45
            }}
          >
            Welcome back, <strong>{userDisplayName}</strong>. You have{' '}
            {overdueCount > 0 && (
              <strong style={{ color: '#dc2626' }}>
                {overdueCount} {overdueCount === 1 ? 'opportunity overdue' : 'opportunities overdue'}
              </strong>
            )}
            {overdueCount > 0 && approachingCount > 0 && ' and '}
            {approachingCount > 0 && (
              <strong style={{ color: '#d97706' }}>
                {approachingCount} approaching deadline{approachingCount > 1 ? 's' : ''} (within 7 days)
              </strong>
            )}{' '}
            that require your immediate attention and follow-up.
          </div>

          {/* List of Affected Opportunities */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.6rem' }}>
              Pending Attention List ({alerts.allAlerts.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
              {alerts.allAlerts.map((item) => {
                const isItemOverdue = item.type === 'overdue';
                return (
                  <div
                    key={item.opportunityId}
                    onClick={() => handleGoToOpp(item.rawOpp)}
                    style={{
                      padding: '0.8rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-secondary, #f8fafc)',
                      border: `1px solid ${isItemOverdue ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isItemOverdue ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #f8fafc)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.opportunityName}
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span>🏢 {item.company}</span>
                        <span>📅 Target: <strong>{item.targetDate}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '0.22rem 0.55rem',
                          borderRadius: '6px',
                          backgroundColor: isItemOverdue ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.18)',
                          color: isItemOverdue ? '#dc2626' : '#b45309',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.badgeText}
                      </span>
                      <ArrowRight size={15} color="var(--text-secondary)" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Actions Bar */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            borderTop: '1px solid var(--border-subtle, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDismiss}
            style={{ fontSize: '0.86rem', padding: '0.5rem 1.1rem' }}
          >
            Acknowledge & Close
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleGoToOpp(null)}
            style={{
              fontSize: '0.86rem',
              fontWeight: 700,
              padding: '0.5rem 1.3rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: isCritical ? '#dc2626' : '#d97706',
              borderColor: isCritical ? '#dc2626' : '#d97706',
              boxShadow: isCritical ? '0 4px 12px rgba(220, 38, 38, 0.3)' : '0 4px 12px rgba(217, 119, 6, 0.3)'
            }}
          >
            Review Pipeline Now <ArrowRight size={15} />
          </button>
        </div>

      </div>
    </div>
  );
}
