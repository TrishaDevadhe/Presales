'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function OpportunityDetailsView({ opportunity, isFinanceUser, onUpdateFinanceStatus, onBack }) {
  const { getOptions, formatUserName, getOptionBadgeStyle } = useApp();
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkItems = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/workitems');
        const data = await res.json();
        // Filter tasks for this opportunity only
        const filteredTasks = data.filter(t => t.opportunity_id === opportunity.id);
        setWorkItems(filteredTasks);
      } catch (err) {
        console.error("Failed to fetch work items", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (opportunity?.id) {
      fetchWorkItems();
    }
  }, [opportunity?.id]);

  const formatTCV = (amount, currency = 'USD') => {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) return '—';
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$', SGD: 'S$', JPY: '¥', AED: 'AED ' };
    const symbol = symbols[currency] || `${currency} `;
    return `${symbol}${num.toLocaleString()}`;
  };

  const completedOpt = getOptions('task_status').find(o => o.option_name === 'Completed');
  const completedId = completedOpt?.id;

  const totalWorkItems = workItems.length;
  const completedWorkItems = workItems.filter(t => t.status_id === completedId).length;
  
  let completionPercentage = 0;
  if (totalWorkItems > 0) {
    completionPercentage = Math.round((completedWorkItems / totalWorkItems) * 100);
  }

  const getProgressColor = (percent) => {
    const p = Math.max(0, Math.min(100, percent));
    if (p < 25) return '#ef4444'; // Red
    if (p < 50) return '#f59e0b'; // Orange
    if (p < 75) return '#0ea5e9'; // Light Blue
    if (p < 90) return '#1e40af'; // Dark Blue
    return '#10b981'; // Green
  };

  const finStatus = opportunity.finance_status || 'Pending';
  
  const stageName = (opportunity.deal_stage_name || '').toLowerCase().trim();
  const isLostOrDropped = stageName === 'lost' || stageName === 'dropped';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          ← Back to Opportunities
        </button>
      </div>

      {/* Finance Status Banner for Non-Finance Users */}
      {finStatus !== 'Approved' && !isFinanceUser && (
        <div style={{ padding: '1rem 1.25rem', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid #f59e0b', borderRadius: '8px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🔒</span>
          <div>
            <strong style={{ fontSize: '0.95rem', display: 'block', color: '#92400e' }}>Finance Approval Pending</strong>
            <span style={{ fontSize: '0.85rem' }}>This opportunity requires approval from the Finance department before team members can work on assigned items.</span>
          </div>
        </div>
      )}

      {/* Opportunity Details Card */}
      <div className="paper-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>
            {opportunity.opportunity_name}
          </h3>
          {isFinanceUser && onUpdateFinanceStatus && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '0.25rem' }}>Finance Decision:</span>
              <button
                className="btn btn-sm"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontWeight: 600,
                  backgroundColor: finStatus === 'Approved' ? '#10b981' : 'transparent',
                  color: finStatus === 'Approved' ? '#ffffff' : '#10b981',
                  border: '1.5px solid #10b981',
                  borderRadius: '6px'
                }}
                onClick={() => onUpdateFinanceStatus(opportunity.id, 'Approved')}
              >
                ✓ Approved
              </button>
              <button
                className="btn btn-sm"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontWeight: 600,
                  backgroundColor: finStatus === 'Rejected' ? '#ef4444' : 'transparent',
                  color: finStatus === 'Rejected' ? '#ffffff' : '#ef4444',
                  border: '1.5px solid #ef4444',
                  borderRadius: '6px'
                }}
                onClick={() => onUpdateFinanceStatus(opportunity.id, 'Rejected')}
              >
                ✕ Rejected
              </button>
            </div>
          )}
        </div>
        
        <div className="form-grid-4">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Client</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{opportunity.company || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Opportunity Type</div>
            <div>
              <span className="badge badge-categorical" style={getOptionBadgeStyle('opportunity_type', opportunity.opportunity_type_name)}>
                {opportunity.opportunity_type_name || 'N/A'}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Deliverable Type</div>
            <div>
              <span className="badge badge-categorical" style={getOptionBadgeStyle('deliverable_type', opportunity.deliverable_type_name)}>
                {opportunity.deliverable_type_name || 'N/A'}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Stage</div>
            <div>
              <span className="badge" style={getOptionBadgeStyle('deal_stage', opportunity.deal_stage_name)}>
                {opportunity.deal_stage_name || 'N/A'}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Finance Status</div>
            <div>
              {finStatus === 'Approved' ? (
                <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', fontWeight: 600 }}>✓ Approved</span>
              ) : finStatus === 'Rejected' ? (
                <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444', fontWeight: 600 }}>✕ Rejected</span>
              ) : (
                <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b', fontWeight: 600 }}>⏳ Pending Approval</span>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>TCV</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {formatTCV(opportunity.tcv_amount || opportunity.estimated_deal_value, opportunity.tcv_currency)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Due Date</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {opportunity.target_submission_date ? opportunity.target_submission_date.split('T')[0] : 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Presales Owner</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {formatUserName(opportunity.presales_owner) || 'Unassigned'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Sales Owner</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {formatUserName(opportunity.primary_sales_owner) || 'Unassigned'}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="paper-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Work Item Completion
        </h3>
        
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading work items...</p>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: isLostOrDropped ? 'var(--text-muted, #9ca3af)' : getProgressColor(completionPercentage), lineHeight: 1 }}>
                {completionPercentage}%
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {totalWorkItems === 0 ? (
                  'No work items assigned to this opportunity yet.'
                ) : (
                  `${completedWorkItems} of ${totalWorkItems} completed`
                )}
              </div>
            </div>
            
            <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--glass-border)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${completionPercentage}%`, 
                  backgroundColor: isLostOrDropped ? 'var(--text-muted, #9ca3af)' : getProgressColor(completionPercentage),
                  transition: 'width 0.5s ease-in-out, background-color 0.5s ease-in-out'
                }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Work Items Table */}
      <div className="paper-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Associated Work Items
        </h3>
        
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading work items...</p>
        ) : workItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
            No work items assigned to this opportunity yet.
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto', width: '100%' }}>
            <table className="custom-table" style={{ minWidth: '700px' }}>
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th>Category</th>
                  <th>Assignee</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th className="num-col">Est. Hours</th>
                </tr>
              </thead>
              <tbody>
                {workItems.map(task => (
                  <tr key={task.id}>
                    <td>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{task.title}</strong>
                    </td>
                    <td>
                      <span className="badge badge-categorical" style={getOptionBadgeStyle('work_category', task.work_category_name)}>
                        {task.work_category_name || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {formatUserName(task.assigned_to) || 'Unassigned'}
                      </strong>
                    </td>
                    <td>
                      <span className="badge" style={getOptionBadgeStyle('task_status', task.status_name)}>
                        {task.status_name || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {task.due_date ? task.due_date.split('T')[0] : 'N/A'}
                    </td>
                    <td className="num-col">
                      {task.estimated_hours ? `${task.estimated_hours} hrs` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
