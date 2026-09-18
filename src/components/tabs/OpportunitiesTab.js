'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isUserAssociatedWithOpp } from '@/lib/userAssociation';
import RichTextEditor from '../RichTextEditor';
import CompanyAutocomplete from '../CompanyAutocomplete';
import StaffMultiSelect from '../StaffMultiSelect';

import RecordHistoryView from '../RecordHistoryView';
import OpportunityDetailsView from '../OpportunityDetailsView';
import OpportunityImportModal from '../OpportunityImportModal';
import DocumentViewerModal from '../DocumentViewerModal';
import { getOpportunityDeadlineInfo, getUserOpportunityAlerts } from '@/lib/opportunityAlerts.js';
import { isOpportunityClosed } from '@/lib/opportunityUtils';

export default function OpportunitiesTab({ targetOppFromNotification, onClearTargetOpp, onOpportunitiesUpdated }) {
  const { currentUser, userRole, allUsers, resourceProfiles, getOptions, getOptionBadgeStyle, formatUserName, showToast, showAlert, showConfirm, globalSearchQuery } = useApp();
  const [opportunities, setOpportunities] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View state
  const [selectedViewOpp, setSelectedViewOpp] = useState(null);

  // Hover Popover State for Opportunity Status / Completion Bar
  const [hoveredOppData, setHoveredOppData] = useState(null);

  // Document Viewer Modal State for previewing files inside Opportunity modal
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewDocOpen, setIsPreviewDocOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [modalSubTab, setModalSubTab] = useState('details'); // 'details' | 'history'
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [animatingClosedOppId, setAnimatingClosedOppId] = useState(null);

  const userAlerts = getUserOpportunityAlerts(opportunities, currentUser, userRole);

  // If navigated directly from notification center to a specific opportunity
  useEffect(() => {
    if (targetOppFromNotification) {
      const matched = opportunities.find(o => o.id === targetOppFromNotification.id) || targetOppFromNotification;
      setSelectedViewOpp(matched);
      if (onClearTargetOpp) onClearTargetOpp();
    }
  }, [targetOppFromNotification, opportunities, onClearTargetOpp]);

  const STANDARD_PROJECT_TYPES = [
    'Lumenore Licence',
    'Netlink Services',
    'Lumenore Professional Services'
  ];

  const [projectTypeSelect, setProjectTypeSelect] = useState('');
  const [customProjectType, setCustomProjectType] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    opportunity_name: '',
    company: '',
    opportunity_type_id: '',
    deliverable_type_id: '',
    primary_sales_owner: '',
    secondary_sales_owners: '',
    delivery_team: '',
    project_type: '',
    source_id: '',
    deal_stage_id: '',
    priority_id: '',
    contract_tenure: 0,
    win_probability: 0,
    complexity_id: '',
    received_date: new Date().toISOString().split('T')[0],
    target_submission_date: '',
    internal_review_date: '',
    presales_owner: '',
    supporting_presales_members: '',
    summary: '',
    risks: '',
    special_instructions: '',
    tcv_amount: 0,
    tcv_currency: 'USD',
    finance_status: 'Pending'
  });

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const [oppsRes, tasksRes] = await Promise.all([
        fetch('/api/opportunities'),
        fetch('/api/workitems')
      ]);
      const [oppsData, tasksData] = await Promise.all([
        oppsRes.json(),
        tasksRes.json()
      ]);
      setOpportunities(Array.isArray(oppsData) ? oppsData : []);
      setWorkItems(Array.isArray(tasksData) ? tasksData : []);
      if (onOpportunitiesUpdated) {
        onOpportunitiesUpdated();
      }
    } catch (e) {
      console.error('Error fetching opportunities or work items:', e);
      setError('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear hover tooltip on window scroll
  useEffect(() => {
    const handleScroll = () => {
      setHoveredOppData(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const getProgressColor = (percent) => {
    const p = Math.max(0, Math.min(100, percent));
    if (p < 25) return '#ef4444'; // Red
    if (p < 50) return '#f59e0b'; // Orange
    if (p < 75) return '#0ea5e9'; // Light Blue
    if (p < 90) return '#1e40af'; // Dark Blue
    return '#10b981'; // Green
  };

  const getOpportunityBarInfo = (dealStageName, completionPercent, totalWorkItems) => {
    const stage = (dealStageName || '').toLowerCase().trim();
    if (stage === 'won') {
      return {
        width: '100%',
        color: '#10b981', // Full green bar for completed won opportunity
        boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
        displayPercent: '100%'
      };
    }
    if (stage === 'lost' || stage === 'dropped' || isOpportunityClosed(dealStageName)) {
      return {
        width: '100%',
        color: '#ef4444', // Full red bar for lost and dropped opportunity
        boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
        displayPercent: '100%'
      };
    }
    // Progress-wise green bar for every other ongoing opportunity
    const width = totalWorkItems === 0 ? '0%' : `${completionPercent}%`;
    return {
      width,
      color: '#10b981', // Green bar
      boxShadow: completionPercent > 0 && totalWorkItems > 0 ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
      displayPercent: `${completionPercent}%`
    };
  };

  const getTooltipCoords = (data) => {
    if (!data || !data.anchorRect) return { top: 0, left: 0 };
    const tooltipWidth = 380;
    const tooltipHeight = 250;

    let left;
    if (data.clientX !== undefined && data.clientX !== null) {
      left = data.clientX - (tooltipWidth / 2);
    } else {
      left = data.anchorRect.left + (data.anchorRect.width / 2) - (tooltipWidth / 2);
    }

    if (left < 16) left = 16;
    if (typeof window !== 'undefined' && left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }

    let top = (data.clientY !== undefined && data.clientY !== null ? data.clientY : data.anchorRect.top) - tooltipHeight - 14;
    if (top < 16) {
      top = (data.anchorRect.bottom || data.clientY) + 14;
    }

    return { top, left };
  };

  const handleHoverTrigger = (opp, stats, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const stageName = (opp.deal_stage_name || '').toLowerCase().trim();
    const isWon = stageName === 'won';
    const isLostOrDropped = stageName === 'lost' || stageName === 'dropped' || isOpportunityClosed(opp.deal_stage_name);
    setHoveredOppData({
      opp,
      ...stats,
      isWon,
      isLostOrDropped,
      anchorRect: rect,
      clientX: e.clientX,
      clientY: e.clientY
    });
  };

  const handleMouseMove = (e) => {
    if (hoveredOppData) {
      setHoveredOppData(prev => prev ? ({ ...prev, clientX: e.clientX, clientY: e.clientY }) : null);
    }
  };

  // Filter Opportunity Types to "New Business", "Renewal", and "Change Request"
  const allowedOpportunityTypes = getOptions('opportunity_type').filter(opt => {
    const name = opt.option_name.toLowerCase().trim();
    return name === 'new business' || name === 'renewal' || name === 'change request';
  });

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedOpp(null);
    setModalSubTab('details');
    setProjectTypeSelect('');
    setCustomProjectType('');
    const defaultOppType = allowedOpportunityTypes[0]?.id || getOptions('opportunity_type')[0]?.id || '';
    setFormData({
      opportunity_name: '',
      company: '',
      opportunity_type_id: defaultOppType,
      deliverable_type_id: getOptions('deliverable_type').filter(o => !o.option_name.toLowerCase().includes('pdf'))[0]?.id || '',
      primary_sales_owner: allUsers[2] || allUsers[0] || '',
      secondary_sales_owners: '',
      delivery_team: '',
      project_type: '',
      source_id: '',
      deal_stage_id: getOptions('deal_stage').find(o => o.option_name === 'Discovery')?.id || getOptions('deal_stage')[0]?.id || '',
      priority_id: getOptions('priority').find(o => o.option_name === 'Medium')?.id || '',
      contract_tenure: 12,
      win_probability: 50,
      complexity_id: getOptions('complexity')[1]?.id || '',
      received_date: new Date().toISOString().split('T')[0],
      target_submission_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      internal_review_date: '',
      presales_owner: allUsers[1] || allUsers[0] || '',
      supporting_presales_members: '',
      summary: '',
      risks: '',
      special_instructions: '',
      tcv_amount: 0,
      tcv_currency: 'USD',
      finance_status: 'Pending',
      attachments: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (opp) => {
    setIsEditMode(true);
    setSelectedOpp(opp);
    setModalSubTab('details');
    const curProjType = opp.project_type || '';
    if (STANDARD_PROJECT_TYPES.includes(curProjType)) {
      setProjectTypeSelect(curProjType);
      setCustomProjectType('');
    } else if (curProjType) {
      setProjectTypeSelect('Other');
      setCustomProjectType(curProjType);
    } else {
      setProjectTypeSelect('');
      setCustomProjectType('');
    }

    let parsedAttachments = [];
    try {
      if (Array.isArray(opp.attachments)) {
        parsedAttachments = opp.attachments;
      } else if (typeof opp.attachments === 'string' && opp.attachments.trim() !== '') {
        parsedAttachments = JSON.parse(opp.attachments);
      }
    } catch (e) {
      console.error('Error parsing attachments in openEditModal:', e);
      parsedAttachments = [];
    }
    if (!Array.isArray(parsedAttachments)) parsedAttachments = [];

    setFormData({
      opportunity_name: opp.opportunity_name,
      company: opp.company,
      opportunity_type_id: opp.opportunity_type_id || '',
      deliverable_type_id: opp.deliverable_type_id || '',
      primary_sales_owner: opp.primary_sales_owner || '',
      secondary_sales_owners: opp.secondary_sales_owners || opp.secondary_sales_owner || '',
      delivery_team: opp.delivery_team || '',
      project_type: curProjType,
      source_id: opp.source_id || '',
      deal_stage_id: opp.deal_stage_id || '',
      priority_id: opp.priority_id || '',
      contract_tenure: opp.contract_tenure || 0,
      win_probability: opp.win_probability || 0,
      complexity_id: opp.complexity_id || '',
      received_date: opp.received_date ? opp.received_date.split('T')[0] : '',
      target_submission_date: opp.target_submission_date ? opp.target_submission_date.split('T')[0] : '',
      internal_review_date: opp.internal_review_date ? opp.internal_review_date.split('T')[0] : '',
      presales_owner: opp.presales_owner || '',
      supporting_presales_members: opp.supporting_presales_members || '',
      summary: opp.summary || '',
      risks: opp.risks || '',
      special_instructions: opp.special_instructions || '',
      tcv_amount: opp.tcv_amount !== undefined && opp.tcv_amount !== null ? opp.tcv_amount : (opp.estimated_deal_value || 0),
      tcv_currency: opp.tcv_currency || 'USD',
      finance_status: opp.finance_status || 'Pending',
      attachments: parsedAttachments
    });
    setIsModalOpen(true);
  };

  const handleImportSuccess = (result) => {
    fetchOpportunities();
    showToast(`✓ Successfully imported ${result.importedCount} opportunities!`, 'success');
  };

  const formatTCV = (amount, currency = 'USD') => {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) return '—';
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$', SGD: 'S$', JPY: '¥', AED: 'AED ' };
    const symbol = symbols[currency] || `${currency} `;
    return `${symbol}${num.toLocaleString()}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const b = parseInt(bytes, 10);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (fileName = '', mimeType = '') => {
    const fn = (fileName || '').toLowerCase();
    if (fn.endsWith('.pdf') || mimeType.includes('pdf')) return '📕';
    if (fn.endsWith('.xlsx') || fn.endsWith('.xls') || fn.endsWith('.csv')) return '📊';
    if (fn.endsWith('.doc') || fn.endsWith('.docx') || mimeType.includes('word')) return '📄';
    if (fn.endsWith('.ppt') || fn.endsWith('.pptx')) return '📽️';
    if (fn.endsWith('.png') || fn.endsWith('.jpg') || fn.endsWith('.jpeg') || fn.endsWith('.webp')) return '🖼️';
    return '📁';
  };

  // Upload handler for Excel, Doc, PDF, and other proposal files
  const handleFileUpload = (filesList) => {
    const files = Array.from(filesList || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Data = uploadEvent.target.result;
        const newAttachment = {
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          data: base64Data,
          uploaded_at: new Date().toISOString()
        };
        setFormData(prev => ({
          ...prev,
          attachments: [...(Array.isArray(prev.attachments) ? prev.attachments : []), newAttachment]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (attachmentId, e) => {
    e.stopPropagation();
    setFormData(prev => ({
      ...prev,
      attachments: (Array.isArray(prev.attachments) ? prev.attachments : []).filter(a => a.id !== attachmentId)
    }));
  };

  const handlePreviewAttachment = (file, e) => {
    e.stopPropagation();
    setPreviewDoc(file);
    setIsPreviewDocOpen(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProjectTypeSelectChange = (e) => {
    const val = e.target.value;
    setProjectTypeSelect(val);
    if (val === 'Other') {
      setFormData(prev => ({ ...prev, project_type: customProjectType }));
    } else {
      setFormData(prev => ({ ...prev, project_type: val }));
    }
  };

  const handleCustomProjectTypeChange = (e) => {
    const val = e.target.value;
    setCustomProjectType(val);
    setFormData(prev => ({ ...prev, project_type: val }));
  };

  const handleRichTextChange = (name, val) => {
    setFormData(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.opportunity_name || !formData.company || !formData.opportunity_type_id) {
      setError('Opportunity Name, Company Name, and Opportunity Type are required.');
      return;
    }

    try {
      const url = isEditMode ? `/api/opportunities/${selectedOpp.id}` : '/api/opportunities';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save opportunity');
      }

      const updatedOpp = await res.json();
      const oppName = formData.opportunity_name;
      setIsModalOpen(false);

      const savedStageOption = getOptions('deal_stage').find(o => o.id === updatedOpp.deal_stage_id);
      const isNowClosed = savedStageOption && isOpportunityClosed(savedStageOption.option_name);

      if (isNowClosed) {
        setAnimatingClosedOppId(updatedOpp.id);
        
        // Temporarily add it to state for animation if it wasn't there
        setOpportunities(prev => {
          const exists = prev.some(o => o.id === updatedOpp.id);
          if (!exists) return [{...updatedOpp, deal_stage_name: savedStageOption.option_name}, ...prev];
          return prev.map(o => o.id === updatedOpp.id ? {...updatedOpp, deal_stage_name: savedStageOption.option_name} : o);
        });

        setTimeout(() => {
          setAnimatingClosedOppId(null);
          fetchOpportunities();
        }, 2500);
      } else {
        fetchOpportunities();
      }

      showToast(`✓ Opportunity "${oppName}" registered successfully!`, 'success');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateFinanceStatus = async (oppId, newStatus) => {
    try {
      const res = await fetch(`/api/opportunities/${oppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finance_status: newStatus })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update finance approval status');
      }
      setOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, finance_status: newStatus } : o));
      if (selectedViewOpp && selectedViewOpp.id === oppId) {
        setSelectedViewOpp(prev => prev ? { ...prev, finance_status: newStatus } : null);
      }
      showToast(`✓ Finance status updated to "${newStatus}"`, 'success');
    } catch (err) {
      showToast(`Failed to update finance status: ${err.message}`, 'error');
    }
  };

  // Filter opportunities:
  // For Admin users: show all opportunities
  // For other users: show associated opportunities
  const userFilteredOpps = userRole === 'Admin'
    ? opportunities
    : opportunities.filter(opp => isUserAssociatedWithOpp(opp, currentUser));

  const displayOpportunities = userFilteredOpps.filter(opp => {
    if (showUrgentOnly) {
      const isUrgent = userAlerts.allAlerts.some(a => a.opportunityId === opp.id);
      if (!isUrgent) return false;
    }
    if (!globalSearchQuery) return true;
    const q = globalSearchQuery.toLowerCase();
    return (
      (opp.opportunity_name && opp.opportunity_name.toLowerCase().includes(q)) ||
      (opp.company && opp.company.toLowerCase().includes(q)) ||
      (opp.opportunity_type_name && opp.opportunity_type_name.toLowerCase().includes(q)) ||
      (opp.deliverable_type_name && opp.deliverable_type_name.toLowerCase().includes(q)) ||
      (opp.presales_owner && opp.presales_owner.toLowerCase().includes(q)) ||
      (opp.primary_sales_owner && opp.primary_sales_owner.toLowerCase().includes(q)) ||
      (opp.finance_status && opp.finance_status.toLowerCase().includes(q))
    );
  });



  const getFinanceStatusBadge = (status) => {
    const val = status || 'Pending';
    if (val === 'Approved') {
      return <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', fontWeight: 600 }}>✓ Approved</span>;
    }
    if (val === 'Rejected') {
      return <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444', fontWeight: 600 }}>✕ Rejected</span>;
    }
    return <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b', fontWeight: 600 }}>⏳ Pending</span>;
  };

  if (selectedViewOpp) {
    return (
      <OpportunityDetailsView 
        opportunity={selectedViewOpp} 
        onUpdateFinanceStatus={handleUpdateFinanceStatus}
        onBack={() => {
          setSelectedViewOpp(null);
          fetchOpportunities();
        }} 
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      
      {/* Urgent Opportunities Warning Banner for Directly Associated User */}
      {userAlerts.totalCount > 0 && (
        <div 
          className="opportunity-deadline-banner"
          style={{
            background: userAlerts.overdueCount > 0 
              ? 'var(--color-danger-bg)' 
              : 'var(--color-warning-bg)',
            border: `1.5px solid ${userAlerts.overdueCount > 0 ? '#ef4444' : '#f59e0b'}`,
            borderRadius: 'var(--radius-md, 10px)',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>{userAlerts.overdueCount > 0 ? '⚠️' : '⏳'}</span>
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem', display: 'block' }}>
                {userAlerts.overdueCount > 0 && userAlerts.approachingCount > 0
                  ? `Urgent Action Required: You have ${userAlerts.overdueCount} overdue and ${userAlerts.approachingCount} upcoming deadline opportunity(s)`
                  : userAlerts.overdueCount > 0
                  ? `Urgent Action Required: You have ${userAlerts.overdueCount} opportunity(s) that crossed their submission deadline!`
                  : `Deadline Approaching: You have ${userAlerts.approachingCount} opportunity(s) due soon!`}
              </strong>
              <span style={{ fontSize: '0.81rem', color: 'var(--text-secondary)' }}>
                These notifications apply exclusively to active opportunities where you are designated as the sales owner, presales lead, or delivery team.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowUrgentOnly(prev => !prev)}
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              border: `1.5px solid ${userAlerts.overdueCount > 0 ? '#ef4444' : '#f59e0b'}`,
              backgroundColor: showUrgentOnly 
                ? (userAlerts.overdueCount > 0 ? '#ef4444' : '#f59e0b') 
                : 'var(--surface-card, #ffffff)',
              color: showUrgentOnly 
                ? '#ffffff' 
                : (userAlerts.overdueCount > 0 ? 'var(--color-danger-text, #dc2626)' : 'var(--color-warning-text, #d97706)'),
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {showUrgentOnly ? '✕ Show All Pipeline' : `Filter to My Urgent Opportunities (${userAlerts.totalCount})`}
          </button>
        </div>
      )}

      {/* Top action controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
        <button 
          className="btn btn-outline" 
          onClick={() => setIsImportModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontWeight: 600
          }}
        >
          <span>📥</span>
          <span>Import Excel / CSV</span>
        </button>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Add Opportunity
        </button>
      </div>

      {/* Grid Table view */}
      <div className="paper-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading opportunities...</p>
        ) : displayOpportunities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💼</div>
            <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              No Associated Opportunities Found
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {userRole === 'Admin'
                ? 'No opportunities found. Click "+ Add Opportunity" to create one.'
                : 'You are currently not listed as a sales owner or presales member on any active opportunity.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Opportunity & Client</th>
                  <th>Type</th>
                  <th>Deliverable Type</th>
                  <th>Stage</th>
                  <th>Finance Status</th>
                  <th className="num-col">TCV</th>
                  <th>Due Date</th>
                  <th>Presales Owner</th>
                  <th className="num-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayOpportunities.map((opp) => {
                  const oppTasks = workItems.filter(t => t.opportunity_id === opp.id);
                  const totalWorkItems = oppTasks.length;
                  const completedWorkItems = oppTasks.filter(t => t.status_name === 'Completed').length;
                  const inProgressWorkItems = oppTasks.filter(t => t.status_name === 'In Progress').length;
                  const notStartedWorkItems = oppTasks.filter(t => t.status_name === 'Not Started').length;
                  const completionPercentage = totalWorkItems > 0 ? Math.round((completedWorkItems / totalWorkItems) * 100) : 0;
                  const oppStats = {
                    totalWorkItems,
                    completedWorkItems,
                    inProgressWorkItems,
                    notStartedWorkItems,
                    completionPercentage,
                    tasks: oppTasks
                  };

                  const stageName = (opp.deal_stage_name || '').toLowerCase().trim();
                  const isWon = stageName === 'won';
                  const isLostOrDropped = isOpportunityClosed(opp.deal_stage_name);
                  const isAnimating = opp.id === animatingClosedOppId;
                  const barInfo = getOpportunityBarInfo(opp.deal_stage_name, completionPercentage, totalWorkItems);

                  return (
                    <React.Fragment key={opp.id}>
                      <tr 
                        className={`opportunity-main-row ${isAnimating ? 'row-strikethrough-anim' : ''}`} 
                        onClick={() => setSelectedViewOpp(opp)} 
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isLostOrDropped ? 'rgba(239, 68, 68, 0.04)' : undefined
                        }}
                      >
                        <td>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{opp.opportunity_name}</strong>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            🏢 {opp.company}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-categorical" style={getOptionBadgeStyle('opportunity_type', opp.opportunity_type_name)}>
                            {opp.opportunity_type_name || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-categorical" style={getOptionBadgeStyle('deliverable_type', opp.deliverable_type_name)}>
                            {opp.deliverable_type_name || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span 
                            className="badge" 
                            style={{ 
                              ...getOptionBadgeStyle('deal_stage', opp.deal_stage_name),
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => handleHoverTrigger(opp, oppStats, e)}
                            onMouseLeave={() => setHoveredOppData(null)}
                            title="Hover to view Opportunity completion & status"
                          >
                            {opp.deal_stage_name || 'Proposal'}
                          </span>
                        </td>
                        <td>
                          {getFinanceStatusBadge(opp.finance_status)}
                        </td>
                        <td className="num-col" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {formatTCV(opp.tcv_amount || opp.estimated_deal_value, opp.tcv_currency)}
                        </td>
                        <td style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          <div>{opp.target_submission_date ? opp.target_submission_date.split('T')[0] : 'N/A'}</div>
                          {(() => {
                            const deadlineAlert = getOpportunityDeadlineInfo(opp);
                            if (!deadlineAlert) return null;
                            const isOverdue = deadlineAlert.type === 'overdue' || deadlineAlert.diffDays === 0;
                            return (
                              <div
                                style={{
                                  marginTop: '0.2rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: isOverdue ? 'var(--color-danger-text, #dc2626)' : 'var(--color-warning-text, #d97706)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  backgroundColor: isOverdue ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                                  border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                  padding: '0.12rem 0.45rem',
                                  borderRadius: '4px'
                                }}
                                title={deadlineAlert.message}
                              >
                                {deadlineAlert.badgeText}
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatUserName(opp.presales_owner) || 'Unassigned'}</strong>
                        </td>
                        <td className="num-col">
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEditModal(opp); }}>
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Partitioning status bar row */}
                      <tr 
                        className="opportunity-partition-row"
                        onClick={() => setSelectedViewOpp(opp)}
                        onMouseEnter={(e) => handleHoverTrigger(opp, oppStats, e)}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setHoveredOppData(null)}
                        style={isLostOrDropped ? { backgroundColor: 'rgba(239, 68, 68, 0.04)' } : {}}
                      >
                        <td colSpan={9}>
                          <div 
                            className="opportunity-partition-bar-container"
                            title={
                              isWon 
                                ? 'Won Opportunity (Completed): 100%' 
                                : isLostOrDropped 
                                  ? `Closed Opportunity (${opp.deal_stage_name || 'Lost/Dropped'})` 
                                  : `Work Item Completion: ${completionPercentage}% (${completedWorkItems} of ${totalWorkItems} completed)`
                            }
                          >
                            <div 
                              style={{
                                height: '100%',
                                width: barInfo.width,
                                backgroundColor: barInfo.color,
                                borderRadius: '0 2px 2px 0',
                                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease',
                                boxShadow: barInfo.boxShadow
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Opportunity Status Hover Card */}
      {hoveredOppData && (
        <div
          className="opportunity-status-hover-card"
          style={{
            position: 'fixed',
            left: `${getTooltipCoords(hoveredOppData).left}px`,
            top: `${getTooltipCoords(hoveredOppData).top}px`,
            width: '380px',
            backgroundColor: 'var(--bg-primary, #ffffff)',
            border: '1px solid var(--border-subtle, rgba(226, 232, 240, 0.85))',
            borderRadius: 'var(--radius-md, 14px)',
            boxShadow: '0 20px 35px -5px rgba(15, 23, 42, 0.25), 0 8px 16px -4px rgba(15, 23, 42, 0.12)',
            padding: '1.25rem',
            zIndex: 99999,
            pointerEvents: 'none',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}
        >
          {/* Card Header matching user screenshot */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Work Item Completion
            </span>
            {hoveredOppData.opp.deal_stage_name && (
              <span 
                className="badge" 
                style={{
                  ...getOptionBadgeStyle('deal_stage', hoveredOppData.opp.deal_stage_name),
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem'
                }}
              >
                {hoveredOppData.opp.deal_stage_name}
              </span>
            )}
          </div>

          {/* Metric and Subtitle */}
          {(() => {
            const hoverBarInfo = getOpportunityBarInfo(
              hoveredOppData.opp.deal_stage_name,
              hoveredOppData.completionPercentage,
              hoveredOppData.totalWorkItems
            );
            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.45rem' }}>
                  <div style={{ 
                    fontSize: '2.25rem', 
                    fontWeight: 800, 
                    color: hoverBarInfo.color, 
                    lineHeight: 1,
                    letterSpacing: '-0.03em'
                  }}>
                    {hoverBarInfo.displayPercent}
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {hoveredOppData.totalWorkItems === 0
                      ? 'No work items assigned'
                      : `${hoveredOppData.completedWorkItems} of ${hoveredOppData.totalWorkItems} completed`}
                  </div>
                </div>

                {/* Visual Progress Bar matching image */}
                <div style={{
                  width: '100%',
                  height: '10px',
                  backgroundColor: 'var(--border-subtle, #e2e8f0)',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    height: '100%',
                    width: hoverBarInfo.width,
                    backgroundColor: hoverBarInfo.color,
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            );
          })()}

          {/* Opportunity Details: Name, Company, Stage, Owner, Target Date */}
          <div style={{
            borderTop: '1px solid var(--border-subtle, rgba(226, 232, 240, 0.6))',
            paddingTop: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '230px' }}>
                💼 {hoveredOppData.opp.opportunity_name}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                🏢 {hoveredOppData.opp.company}
              </span>
            </div>

            {/* Task status breakdown badges */}
            {hoveredOppData.totalWorkItems > 0 ? (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                <span style={{ 
                  fontSize: '0.72rem', 
                  padding: '0.15rem 0.45rem', 
                  borderRadius: '4px', 
                  background: 'var(--color-success-bg, rgba(16, 185, 129, 0.12))', 
                  color: 'var(--color-success-text, #047857)',
                  fontWeight: 600
                }}>
                  ✓ {hoveredOppData.completedWorkItems} Completed
                </span>
                <span style={{ 
                  fontSize: '0.72rem', 
                  padding: '0.15rem 0.45rem', 
                  borderRadius: '4px', 
                  background: 'var(--color-info-bg, rgba(37, 99, 235, 0.12))', 
                  color: 'var(--color-info-text, #1e40af)',
                  fontWeight: 600
                }}>
                  ⏳ {hoveredOppData.inProgressWorkItems} In Progress
                </span>
                <span style={{ 
                  fontSize: '0.72rem', 
                  padding: '0.15rem 0.45rem', 
                  borderRadius: '4px', 
                  background: 'rgba(107, 114, 128, 0.12)', 
                  color: 'var(--text-secondary, #4b5563)',
                  fontWeight: 600
                }}>
                  ⏹ {hoveredOppData.notStartedWorkItems} Not Started
                </span>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.2rem' }}>
                No work items assigned to this opportunity yet.
              </div>
            )}

            {/* Tasks mini preview */}
            {hoveredOppData.tasks && hoveredOppData.tasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem', paddingTop: '0.35rem', borderTop: '1px dashed var(--border-subtle, rgba(226, 232, 240, 0.5))' }}>
                {hoveredOppData.tasks.slice(0, 3).map(task => (
                  <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                    <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '230px' }}>
                      {task.status_name === 'Completed' ? '✓ ' : '• '} {task.title}
                    </span>
                    <span style={{ 
                      color: task.status_name === 'Completed' ? 'var(--color-success, #10b981)' : task.status_name === 'In Progress' ? 'var(--color-info, #2563eb)' : 'var(--text-muted)', 
                      fontWeight: 600, 
                      fontSize: '0.7rem' 
                    }}>
                      {task.status_name}
                    </span>
                  </div>
                ))}
                {hoveredOppData.tasks.length > 3 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    +{hoveredOppData.tasks.length - 3} more work items
                  </div>
                )}
              </div>
            )}

            {/* Footer row: Presales Owner & Due Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: '0.25rem', borderTop: '1px solid var(--border-subtle, rgba(226, 232, 240, 0.5))', paddingTop: '0.4rem' }}>
              <span>👤 {formatUserName(hoveredOppData.opp.presales_owner) || 'Unassigned'}</span>
              <span>📅 Due: {hoveredOppData.opp.target_submission_date ? hoveredOppData.opp.target_submission_date.split('T')[0] : 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT OPPORTUNITY OVERLAY MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content paper-panel" style={{ maxWidth: '1400px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', paddingRight: '3.5rem' }}>
              <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
                {isEditMode ? 'Modify Opportunity' : 'Register New Opportunity'}
              </h3>
              {isEditMode && selectedOpp && (
                <div className="tab-group" style={{ background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: 'var(--radius-md)' }}>
                  <button
                    type="button"
                    className={`tab-item ${modalSubTab === 'details' ? 'active' : ''}`}
                    onClick={() => setModalSubTab('details')}
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}
                  >
                    📝 Details
                  </button>
                  <button
                    type="button"
                    className={`tab-item ${modalSubTab === 'history' ? 'active' : ''}`}
                    onClick={() => setModalSubTab('history')}
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}
                  >
                    📜 History
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
                <div>{error}</div>
              </div>
            )}

            {!isEditMode && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(6, 182, 212, 0.08) 100%)',
                border: '1px solid rgba(37, 99, 235, 0.22)',
                borderRadius: '8px',
                padding: '0.75rem 1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>📊</span>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>
                      Importing past opportunities dealt before this app?
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Instead of typing each record manually, upload your spreadsheet to import multiple entries at once.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsImportModalOpen(true);
                  }}
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.85rem',
                    background: '#ffffff',
                    whiteSpace: 'nowrap'
                  }}
                >
                  📥 Import from Excel
                </button>
              </div>
            )}

            {modalSubTab === 'history' && isEditMode && selectedOpp && (
              <RecordHistoryView entityType="Opportunity" entityId={selectedOpp.id} />
            )}

            <form onSubmit={handleSubmit} style={{ display: modalSubTab === 'details' ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Section 1: Basic Information & Team Roles */}
                <div className="form-section">
                  <div className="form-section-header">
                    <span className="form-section-title">
                      <span>💼</span> 1. Opportunity Overview & Team Assignments
                    </span>
                  </div>
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                    
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Opportunity Name <span className="required">*</span></label>
                      <input
                        type="text"
                        name="opportunity_name"
                        className="form-control"
                        placeholder="e.g. Enterprise Cloud Infrastructure Migration"
                        value={formData.opportunity_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <CompanyAutocomplete
                      label="Company Name"
                      value={formData.company}
                      onChange={(val) => setFormData(prev => ({ ...prev, company: val }))}
                      opportunities={opportunities}
                      required={true}
                    />

                    <div className="form-group">
                      <label className="form-label">Opportunity Type <span className="required">*</span></label>
                      <select
                        name="opportunity_type_id"
                        className="form-control form-select"
                        value={formData.opportunity_type_id}
                        onChange={handleInputChange}
                        required
                      >
                        {allowedOpportunityTypes.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Project Type */}
                    <div className="form-group">
                      <label className="form-label">Project Type</label>
                      <select
                        name="project_type_select"
                        className="form-control form-select"
                        value={projectTypeSelect}
                        onChange={handleProjectTypeSelectChange}
                      >
                        <option value="">Select Project Type</option>
                        {STANDARD_PROJECT_TYPES.map(pt => (
                          <option key={pt} value={pt}>{pt}</option>
                        ))}
                        <option value="Other">Other (Custom)</option>
                      </select>
                      {projectTypeSelect === 'Other' && (
                        <input
                          type="text"
                          name="custom_project_type"
                          className="form-control"
                          style={{ marginTop: '0.5rem' }}
                          placeholder="Enter custom project type..."
                          value={customProjectType}
                          onChange={handleCustomProjectTypeChange}
                        />
                      )}
                    </div>

                    {/* Deliverable Type option */}
                    <div className="form-group">
                      <label className="form-label">Deliverable Type <span className="required">*</span></label>
                      <select
                        name="deliverable_type_id"
                        className="form-control form-select"
                        value={formData.deliverable_type_id}
                        onChange={handleInputChange}
                        required
                      >
                        {getOptions('deliverable_type')
                          .filter(opt => !opt.option_name.toLowerCase().includes('pdf'))
                          .map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                          ))}
                      </select>
                    </div>

                    {/* Opportunity Status (Deal Stage) */}
                    <div className="form-group">
                      <label className="form-label">Status <span className="required">*</span></label>
                      <select
                        name="deal_stage_id"
                        className="form-control form-select"
                        value={formData.deal_stage_id}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Status</option>
                        {getOptions('deal_stage').map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Delivery Team */}
                    <div className="form-group">
                      <label className="form-label">Delivery Team</label>
                      <select
                        name="delivery_team"
                        className="form-control form-select"
                        value={formData.delivery_team || ''}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Delivery Team</option>
                        {allUsers.map(u => (
                          <option key={u} value={u}>{formatUserName(u)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Primary Sales Owner */}
                    <div className="form-group">
                      <label className="form-label">Primary Sales Owner <span className="required">*</span></label>
                      <select
                        name="primary_sales_owner"
                        className="form-control form-select"
                        value={formData.primary_sales_owner}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Primary Owner</option>
                        {allUsers.map(u => (
                          <option key={u} value={u}>{formatUserName(u)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Secondary Sales Owners Multi-Select */}
                    <StaffMultiSelect
                      label="Secondary Sales Owners"
                      allUsers={allUsers}
                      value={formData.secondary_sales_owners}
                      onChange={(updatedList) => setFormData(prev => ({ ...prev, secondary_sales_owners: Array.isArray(updatedList) ? updatedList.join(', ') : updatedList }))}
                      placeholder="Select additional sales owners..."
                    />

                    {/* Lead Source */}
                    <div className="form-group">
                      <label className="form-label">Lead Source</label>
                      <select
                        name="source_id"
                        className="form-control form-select"
                        value={formData.source_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Source</option>
                        {getOptions('source').map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Presales Owner */}
                    <div className="form-group">
                      <label className="form-label">Presales Owner <span className="required">*</span></label>
                      <select
                        name="presales_owner"
                        className="form-control form-select"
                        value={formData.presales_owner}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Presales Lead</option>
                        {allUsers.map(u => (
                          <option key={u} value={u}>{formatUserName(u)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Supporting Presales Team Multi-Select */}
                    <StaffMultiSelect
                      label="Supporting Presales Team"
                      allUsers={allUsers}
                      value={formData.supporting_presales_members}
                      onChange={(updatedList) => setFormData(prev => ({ ...prev, supporting_presales_members: Array.isArray(updatedList) ? updatedList.join(', ') : updatedList }))}
                      placeholder="Select supporting engineers & architects..."
                    />

                  </div>
                </div>

                {/* Section 2: Deal Sizing & Key Dates */}
                <div className="form-section">
                  <div className="form-section-header">
                    <span className="form-section-title">
                      <span>📊</span> 2. Commercial Terms, Metrics & Target Dates
                    </span>
                  </div>
                  <div className="form-grid-3">

                    {/* TCV (Total Contract Value) */}
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">TCV (Total Contract Value)</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          name="tcv_currency"
                          className="form-control form-select"
                          style={{ width: '115px', flexShrink: 0 }}
                          value={formData.tcv_currency || 'USD'}
                          onChange={handleInputChange}
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="INR">INR (₹)</option>
                          <option value="AUD">AUD ($)</option>
                          <option value="CAD">CAD ($)</option>
                          <option value="SGD">SGD ($)</option>
                          <option value="JPY">JPY (¥)</option>
                          <option value="AED">AED (AED)</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          name="tcv_amount"
                          className="form-control"
                          placeholder="Enter TCV amount (e.g. 150000)"
                          value={formData.tcv_amount || ''}
                          onChange={handleInputChange}
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Priority</label>
                      <select
                        name="priority_id"
                        className="form-control form-select"
                        value={formData.priority_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Priority</option>
                        {getOptions('priority').map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Solution Complexity</label>
                      <select
                        name="complexity_id"
                        className="form-control form-select"
                        value={formData.complexity_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Complexity</option>
                        {getOptions('complexity').map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Contract Tenure (Months)</label>
                      <input
                        type="number"
                        name="contract_tenure"
                        className="form-control"
                        value={formData.contract_tenure}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Win Probability (%)</label>
                      <input
                        type="number"
                        name="win_probability"
                        className="form-control"
                        value={formData.win_probability}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Received Date <span className="required">*</span></label>
                      <input
                        type="date"
                        name="received_date"
                        className="form-control"
                        value={formData.received_date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Target Submission Date <span className="required">*</span></label>
                      <input
                        type="date"
                        name="target_submission_date"
                        className="form-control"
                        value={formData.target_submission_date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Internal Review Date</label>
                      <input
                        type="date"
                        name="internal_review_date"
                        className="form-control"
                        value={formData.internal_review_date}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Finance Approval Status Selector */}
                    <div className="form-group" style={{ gridColumn: 'span 3', background: 'var(--bg-secondary, #f8fafc)', padding: '0.85rem 1.1rem', borderRadius: '8px', border: '1px solid var(--border-subtle, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.35rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.15rem' }}>💳</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Finance Approved
                          </strong>
                          <span className="badge" style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            backgroundColor: formData.finance_status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : (formData.finance_status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                            color: formData.finance_status === 'Approved' ? '#10b981' : (formData.finance_status === 'Rejected' ? '#ef4444' : '#d97706'),
                            border: `1px solid ${formData.finance_status === 'Approved' ? '#10b981' : (formData.finance_status === 'Rejected' ? '#ef4444' : '#f59e0b')}`
                          }}>
                            {formData.finance_status === 'Approved' ? '✓ Approved' : (formData.finance_status === 'Rejected' ? '✕ Rejected' : '⏳ Pending')}
                          </span>
                        </div>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          Mark commercial & finance approval status for this opportunity. Default is Pending.
                        </p>
                      </div>

                      <div style={{ display: 'inline-flex', background: '#ffffff', border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: '8px', padding: '3px', gap: '3px' }}>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, finance_status: 'Approved' }))}
                          style={{
                            padding: '0.45rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: formData.finance_status === 'Approved' ? '#10b981' : 'transparent',
                            color: formData.finance_status === 'Approved' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                            fontWeight: formData.finance_status === 'Approved' ? 700 : 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.84rem',
                            boxShadow: formData.finance_status === 'Approved' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                            transition: 'all 0.18s ease'
                          }}
                        >
                          <span>✓</span> Yes (Approved)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, finance_status: 'Rejected' }))}
                          style={{
                            padding: '0.45rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: formData.finance_status === 'Rejected' ? '#ef4444' : 'transparent',
                            color: formData.finance_status === 'Rejected' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                            fontWeight: formData.finance_status === 'Rejected' ? 700 : 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.84rem',
                            boxShadow: formData.finance_status === 'Rejected' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                            transition: 'all 0.18s ease'
                          }}
                        >
                          <span>✕</span> No (Rejected)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, finance_status: 'Pending' }))}
                          style={{
                            padding: '0.45rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: formData.finance_status === 'Pending' ? '#f59e0b' : 'transparent',
                            color: formData.finance_status === 'Pending' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                            fontWeight: formData.finance_status === 'Pending' ? 700 : 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.84rem',
                            boxShadow: formData.finance_status === 'Pending' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                            transition: 'all 0.18s ease'
                          }}
                        >
                          <span>⏳</span> Pending
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Section 3: Detailed Notes */}
                <div className="form-section">
                  <div className="form-section-header">
                    <span className="form-section-title">
                      <span>📝</span> 3. Solution Details, Scope & Key Risks
                    </span>
                  </div>

                  <div className="form-grid-3" style={{ alignItems: 'stretch' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <label className="form-label" style={{ minHeight: '2.2rem', display: 'flex', alignItems: 'flex-end', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Executive Summary & Scope Description
                      </label>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <RichTextEditor
                          value={formData.summary}
                          onChange={(val) => handleRichTextChange('summary', val)}
                          placeholder="Provide a high-level summary of the solution..."
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <label className="form-label" style={{ minHeight: '2.2rem', display: 'flex', alignItems: 'flex-end', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Identified Solution Risks & Dependencies
                      </label>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <RichTextEditor
                          value={formData.risks}
                          onChange={(val) => handleRichTextChange('risks', val)}
                          placeholder="Detail key risks, dependencies..."
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <label className="form-label" style={{ minHeight: '2.2rem', display: 'flex', alignItems: 'flex-end', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Special Instructions & Customer Preferences
                      </label>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <RichTextEditor
                          value={formData.special_instructions}
                          onChange={(val) => handleRichTextChange('special_instructions', val)}
                          placeholder="Special RFP formatting requirements..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Opportunity Files & Proposal Attachments */}
                <div className="form-section">
                  <div className="form-section-header">
                    <span className="form-section-title">
                      <span>📁</span> 4. Proposal & Opportunity Files (Excel, Word, PDF)
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      style={{
                        border: `2px dashed ${dragActive ? '#2563eb' : 'var(--border-subtle, #cbd5e1)'}`,
                        backgroundColor: dragActive ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-secondary, #f8fafc)',
                        borderRadius: '10px',
                        padding: '1.75rem 1.25rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.65rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => document.getElementById('opp-file-upload-input')?.click()}
                    >
                      <input
                        id="opp-file-upload-input"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.ppt,.pptx,image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e.target.files)}
                      />
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        color: '#2563eb'
                      }}>
                        📁
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.94rem', color: 'var(--text-primary)', display: 'block' }}>
                          Click to browse or drag & drop files here
                        </strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Upload Proposals, SOWs, Architecture docs, Cost sheets (PDF, Excel, Word, PPT, Images)
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('opp-file-upload-input')?.click();
                        }}
                      >
                        📂 Choose Files from Device
                      </button>
                    </div>

                    {/* Attached Files List */}
                    {Array.isArray(formData.attachments) && formData.attachments.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Attached Documents ({formData.attachments.length})</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Files will be saved with this opportunity</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.65rem' }}>
                          {formData.attachments.map((file, idx) => {
                            const icon = getFileIcon(file.name, file.type);
                            const ext = (file.name || '').split('.').pop()?.toUpperCase() || 'FILE';
                            return (
                              <div
                                key={file.id || idx}
                                style={{
                                  padding: '0.75rem 0.95rem',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-subtle, #e2e8f0)',
                                  backgroundColor: 'var(--surface-card, #ffffff)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.75rem',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden', flex: 1 }}>
                                  <span style={{ fontSize: '1.4rem' }}>{icon}</span>
                                  <div style={{ overflow: 'hidden' }}>
                                    <strong
                                      style={{
                                        fontSize: '0.86rem',
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
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                      {ext} • {formatFileSize(file.size)}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => handlePreviewAttachment(file, e)}
                                    style={{
                                      padding: '0.3rem 0.6rem',
                                      backgroundColor: '#eff6ff',
                                      color: '#2563eb',
                                      border: '1px solid #bfdbfe',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '0.76rem',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.2rem'
                                    }}
                                    title="Open and preview document"
                                  >
                                    👁️ Read
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleRemoveAttachment(file.id, e)}
                                    style={{
                                      padding: '0.3rem 0.5rem',
                                      backgroundColor: '#fef2f2',
                                      color: '#ef4444',
                                      border: '1px solid #fecaca',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '0.76rem'
                                    }}
                                    title="Remove file"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-pill-cobalt" style={{ padding: '0.65rem 1.75rem' }}>
                    ⚡ {isEditMode ? 'Save Opportunity Changes' : 'Submit Opportunity'}
                  </button>
                </div>

              </form>
          </div>
        </div>
      )}

      {/* DOCUMENT VIEWER MODAL */}
      <DocumentViewerModal
        isOpen={isPreviewDocOpen}
        file={previewDoc}
        onClose={() => setIsPreviewDocOpen(false)}
      />

      {/* BATCH IMPORT OPPORTUNITIES MODAL */}
      <OpportunityImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
        dropdownOptions={getOptions('opportunity_type')}
        users={resourceProfiles}
      />

    </div>
  );
}
