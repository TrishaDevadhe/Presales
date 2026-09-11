'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function OpportunityDetailsView({ opportunity, onBack }) {
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
    if (percent < 25) return 'var(--color-danger, #ef4444)';
    if (percent < 50) return 'var(--color-warning, #f59e0b)';
    if (percent < 75) return 'var(--color-info, #3b82f6)';
    if (percent < 100) return 'var(--accent-primary, #6366f1)';
    return 'var(--color-success, #10b981)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          ← Back to Opportunities
        </button>
      </div>

      {/* Opportunity Details Card */}
      <div className="paper-panel">
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
          {opportunity.opportunity_name}
        </h3>
        
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
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
      <div className="paper-panel">
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Work Item Completion
        </h3>
        
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading work items...</p>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: getProgressColor(completionPercentage), lineHeight: 1 }}>
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
                  backgroundColor: getProgressColor(completionPercentage),
                  transition: 'width 0.5s ease-in-out, background-color 0.5s ease-in-out'
                }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Work Items Table */}
      <div className="paper-panel" style={{ overflowX: 'auto' }}>
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
          <div className="table-container">
            <table className="custom-table">
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
