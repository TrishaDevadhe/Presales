'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isOpportunityClosed } from '@/lib/opportunityUtils';
import DocumentViewerModal from './DocumentViewerModal';

export default function OpportunityDetailsView({ opportunity, isFinanceUser, onUpdateFinanceStatus, onBack }) {
  const { getOptions, formatUserName, getOptionBadgeStyle } = useApp();
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Document Viewer Modal state
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);

  useEffect(() => {
    const fetchWorkItems = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/workitems');
        const data = await res.json();
        // Filter tasks for this opportunity only
        const filteredTasks = Array.isArray(data) ? data.filter(t => t.opportunity_id === opportunity?.id) : [];
        setWorkItems(filteredTasks);
      } catch (err) {
        console.error("Failed to fetch work items", err);
        setWorkItems([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (opportunity?.id) {
      fetchWorkItems();
    }
  }, [opportunity?.id]);

  if (!opportunity) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back to Opportunities</button>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Opportunity details could not be loaded.</p>
      </div>
    );
  }

  // Parse attached documents
  let attachments = [];
  try {
    if (Array.isArray(opportunity.attachments)) {
      attachments = opportunity.attachments;
    } else if (typeof opportunity.attachments === 'string' && opportunity.attachments.trim() !== '') {
      attachments = JSON.parse(opportunity.attachments);
    }
  } catch (e) {
    console.error('Error parsing attachments in OpportunityDetailsView:', e);
    attachments = [];
  }
  if (!Array.isArray(attachments)) attachments = [];

  const handleOpenDocument = (file) => {
    setSelectedDocument(file);
    setIsDocViewerOpen(true);
  };

  const handleDownloadFile = (file, e) => {
    e.stopPropagation();
    if (!file.data) return;
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (fileName = '', mimeType = '') => {
    const fn = fileName.toLowerCase();
    if (fn.endsWith('.pdf') || mimeType.includes('pdf')) return '📕';
    if (fn.endsWith('.xlsx') || fn.endsWith('.xls') || fn.endsWith('.csv')) return '📊';
    if (fn.endsWith('.doc') || fn.endsWith('.docx') || mimeType.includes('word')) return '📄';
    if (fn.endsWith('.ppt') || fn.endsWith('.pptx')) return '📽️';
    if (fn.endsWith('.png') || fn.endsWith('.jpg') || fn.endsWith('.jpeg') || fn.endsWith('.webp')) return '🖼️';
    return '📁';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const b = parseInt(bytes, 10);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTCV = (amount, currency = 'USD') => {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) return '—';
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$', SGD: 'S$', JPY: '¥', AED: 'AED ' };
    const symbol = symbols[currency] || `${currency} `;
    return `${symbol}${num.toLocaleString()}`;
  };

  const completedOpt = (getOptions('task_status') || []).find(o => o.option_name === 'Completed');
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
  const isWon = stageName === 'won';
  const isLostOrDropped = stageName === 'lost' || stageName === 'dropped' || isOpportunityClosed(opportunity.deal_stage_name);

  const getOpportunityBarInfo = () => {
    if (isWon) {
      return { width: '100%', color: '#10b981', displayPercent: '100%' };
    }
    if (isLostOrDropped) {
      return { width: '100%', color: '#ef4444', displayPercent: '100%' };
    }
    return {
      width: totalWorkItems === 0 ? '0%' : `${completionPercentage}%`,
      color: '#10b981',
      displayPercent: `${completionPercentage}%`
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          ← Back to Opportunities
        </button>
      </div>

      {/* Finance Status Banner when not approved */}
      {finStatus !== 'Approved' && (
        <div style={{ padding: '1rem 1.25rem', backgroundColor: finStatus === 'Rejected' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)', border: `1px solid ${finStatus === 'Rejected' ? '#ef4444' : '#f59e0b'}`, borderRadius: '8px', color: finStatus === 'Rejected' ? '#991b1b' : '#b45309', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>{finStatus === 'Rejected' ? '❌' : '🔒'}</span>
          <div>
            <strong style={{ fontSize: '0.95rem', display: 'block', color: finStatus === 'Rejected' ? '#7f1d1d' : '#92400e' }}>
              {finStatus === 'Rejected' ? 'Finance Status: Rejected' : 'Finance Approval Pending'}
            </strong>
            <span style={{ fontSize: '0.85rem' }}>
              {finStatus === 'Rejected' 
                ? 'This opportunity was rejected during commercial review. Work items cannot be edited.' 
                : 'This opportunity requires finance approval before team members can work on assigned items.'}
            </span>
          </div>
        </div>
      )}

      {/* Opportunity Details Card */}
      <div className="paper-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>
            {opportunity.opportunity_name}
          </h3>
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
              {opportunity.target_submission_date ? String(opportunity.target_submission_date).split('T')[0] : 'N/A'}
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

      {/* PROPOSALS & ATTACHED OPPORTUNITY DOCUMENTS */}
      <div className="paper-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📁 Proposal & Opportunity Documents
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Uploaded proposals, spreadsheets, architecture diagrams, and review documents
            </p>
          </div>
          <span className="badge badge-neutral" style={{ fontSize: '0.78rem' }}>
            {attachments.length} {attachments.length === 1 ? 'Document' : 'Documents'}
          </span>
        </div>

        {attachments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary, #f8fafc)', borderRadius: '8px', border: '1px dashed var(--border-subtle, #cbd5e1)' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.4rem' }}>📄</span>
            <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>No Documents Attached</strong>
            <span style={{ fontSize: '0.82rem' }}>You can upload proposals (Excel, Docs, PDF) by editing this opportunity.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.85rem' }}>
            {attachments.map((file, idx) => {
              const icon = getFileIcon(file.name, file.type);
              const ext = (file.name || '').split('.').pop()?.toUpperCase() || 'FILE';
              return (
                <div
                  key={file.id || idx}
                  onClick={() => handleOpenDocument(file)}
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    backgroundColor: 'var(--surface-card, #ffffff)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle, #e2e8f0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{icon}</span>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <strong 
                        style={{ 
                          fontSize: '0.92rem', 
                          color: 'var(--text-primary)', 
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={file.name}
                      >
                        {file.name}
                      </strong>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>{ext}</span>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle, #f1f5f9)', paddingTop: '0.65rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : 'Attached'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => handleDownloadFile(file, e)}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.76rem' }}
                        title="Download file"
                      >
                        ⬇️
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenDocument(file)}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <span>👁️</span> Open & Read
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress Bar Section */}
      <div className="paper-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Work Item Completion
        </h3>
        
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading work items...</p>
        ) : (() => {
          const barInfo = getOpportunityBarInfo();
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: barInfo.color, lineHeight: 1 }}>
                  {barInfo.displayPercent}
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
                    width: barInfo.width, 
                    backgroundColor: barInfo.color,
                    transition: 'width 0.5s ease-in-out, background-color 0.5s ease-in-out'
                  }} 
                />
              </div>
            </div>
          );
        })()}
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
                      {task.due_date ? String(task.due_date).split('T')[0] : 'N/A'}
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

      {/* DOCUMENT VIEWER MODAL */}
      <DocumentViewerModal
        isOpen={isDocViewerOpen}
        file={selectedDocument}
        onClose={() => setIsDocViewerOpen(false)}
      />

    </div>
  );
}
