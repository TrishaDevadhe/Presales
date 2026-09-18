'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

export default function OpportunityImportModal({ isOpen, onClose, onSuccess, dropdownOptions = [], users = [] }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Import settings
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [generateTasks, setGenerateTasks] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Generate and download sample Excel template
  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sample Header + Rows
      const headers = [
        'Opportunity Name',
        'Company',
        'Opportunity Type',
        'Deliverable Type',
        'Deal Stage',
        'Project Type',
        'Delivery Team',
        'Primary Sales Owner',
        'Presales Owner',
        'TCV Amount',
        'Currency',
        'Contract Tenure (Months)',
        'Win Probability (%)',
        'Finance Status',
        'Received Date',
        'Target Submission Date',
        'Priority',
        'Complexity',
        'Summary'
      ];

      const sampleRows = [
        [
          'Global Cloud Migration Initiative',
          'Acme Corp',
          'Change Request',
          'Non RFP Response',
          'Won',
          'Lumenore Licence',
          'Vikrant Dhuriya',
          'John Smith',
          'Jane Doe',
          125000,
          'USD',
          12,
          85,
          'Approved',
          '2023-03-15',
          '2023-04-30',
          'High',
          'Medium',
          'Historical enterprise deal successfully delivered prior to portal launch.'
        ],
        [
          'Analytics Platform Implementation',
          'Apex Financial Group',
          'New Business',
          'Proposal',
          'Won',
          'Netlink Services',
          'Divyam Malliwal',
          'John Smith',
          'Jane Doe',
          240000,
          'USD',
          24,
          100,
          'Approved',
          '2023-06-01',
          '2023-07-15',
          'Critical',
          'High',
          'Historical analytics setup across corporate banking divisions.'
        ],
        [
          'Managed Professional Services Support',
          'Omni Retailers Ltd',
          'Proactive Proposal',
          'Presentation Deck',
          'Won',
          'Lumenore Professional Services',
          'Alice Williams',
          'John Smith',
          'Jane Doe',
          75000,
          'USD',
          12,
          90,
          'Approved',
          '2023-09-10',
          '2023-10-20',
          'Medium',
          'Low',
          'Legacy multi-month consulting engagement.'
        ]
      ];

      const wsData = [headers, ...sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Auto-fit column widths
      const colWidths = headers.map((h, i) => {
        let maxLen = h.length;
        sampleRows.forEach(r => {
          const val = r[i] !== undefined ? String(r[i]) : '';
          if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: Math.min(maxLen + 4, 38) };
      });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Opportunities');

      // Reference Reference sheet with accepted values
      const refData = [
        ['Field', 'Accepted Values / Suggestions'],
        ['Opportunity Type', 'RFP Response, Change Request, New Business, Proactive Proposal, Client Presentation, POC / Demo, Renewal, QBR / Strategy'],
        ['Deliverable Type', 'RFP Response, Non RFP Response, Proposal, Presentation Deck, Brochure'],
        ['Deal Stage', 'Won, Lost, POC(Proof Of Concept), Proposal Preparation, Discovery, Submitted to Client, Dropped'],
        ['Project Type', 'Lumenore Licence, Netlink Services, Lumenore Professional Services, (or custom text)'],
        ['Delivery Team', users.map(u => u.name || u.username).join(', ') || 'Select from org users'],
        ['Primary Sales Owner', 'Sales owner username or full name (e.g. John Smith, john_smith)'],
        ['Presales Owner', 'Presales owner username or full name (e.g. Jane Doe, jane_doe)'],
        ['Currency', 'USD, EUR, GBP, INR, AUD, CAD, SGD'],
        ['Finance Status', 'Approved, Rejected, Pending (Auto-resolved if omitted: Approved for Won, Rejected for Lost/Dropped)'],
        ['Date Format', 'YYYY-MM-DD (e.g. 2023-05-15) or standard Excel date cell']
      ];
      const wsRef = XLSX.utils.aoa_to_sheet(refData);
      wsRef['!cols'] = [{ wch: 25 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsRef, 'Reference Guide');

      XLSX.writeFile(wb, 'opportunities_import_template.xlsx');
    } catch (err) {
      console.error('Error downloading template:', err);
      setErrorMessage('Failed to generate template: ' + err.message);
    }
  };

  // Handle parsing selected file
  const processFile = (selectedFile) => {
    if (!selectedFile) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = selectedFile.name.toLowerCase();
    const isValidExt = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isValidExt) {
      setErrorMessage('Please select a valid Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setErrorMessage('');
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setIsValidating(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with raw values
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          setErrorMessage('The uploaded sheet is empty. Please check the file and try again.');
          setParsedRows([]);
          setIsValidating(false);
          return;
        }

        // Validate rows
        const processed = rows.map((r, idx) => {
          const oppName = String(r['Opportunity Name'] || r['opportunity_name'] || r['Opportunity'] || r['Deal Name'] || '').trim();
          const company = String(r['Company'] || r['company'] || r['Account'] || r['Client'] || '').trim();
          const oppType = String(r['Opportunity Type'] || r['opportunity_type'] || 'RFP Response').trim();
          const deliverableType = String(r['Deliverable Type'] || r['deliverable_type'] || '').trim();
          const stage = String(r['Deal Stage'] || r['deal_stage'] || r['Stage'] || r['Status'] || 'Won').trim();
          const projectType = String(r['Project Type'] || r['project_type'] || '').trim();
          const deliveryTeam = String(r['Delivery Team'] || r['delivery_team'] || '').trim();
          const salesOwner = String(r['Primary Sales Owner'] || r['primary_sales_owner'] || r['Sales Owner'] || '').trim();
          const presalesOwner = String(r['Presales Owner'] || r['presales_owner'] || '').trim();
          const tcv = r['TCV Amount'] || r['tcv_amount'] || r['TCV'] || r['Value'] || 0;
          const currency = String(r['Currency'] || r['tcv_currency'] || 'USD').trim() || 'USD';
          const finStatus = String(r['Finance Status'] || r['finance_status'] || r['Finance'] || r['Financial Status'] || r['Approval Status'] || r['Finance Approval'] || '').trim();
          const recDate = r['Received Date'] || r['received_date'] || '';
          const targetDate = r['Target Submission Date'] || r['target_submission_date'] || r['Due Date'] || '';

          const isValid = Boolean(oppName && company);
          const errors = [];
          if (!oppName) errors.push('Missing Opportunity Name');
          if (!company) errors.push('Missing Company');

          return {
            _index: idx + 1,
            _isValid: isValid,
            _errors: errors,
            _raw: r,
            opportunity_name: oppName,
            company,
            opportunity_type: oppType,
            deliverable_type: deliverableType,
            deal_stage: stage,
            project_type: projectType,
            delivery_team: deliveryTeam,
            primary_sales_owner: salesOwner,
            presales_owner: presalesOwner,
            tcv_amount: tcv,
            tcv_currency: currency,
            finance_status: finStatus,
            received_date: recDate,
            target_submission_date: targetDate,
            summary: String(r['Summary'] || r['summary'] || r['Description'] || '').trim()
          };
        });

        setParsedRows(processed);
      } catch (err) {
        console.error('Error parsing sheet:', err);
        setErrorMessage('Failed to read Excel file: ' + err.message);
        setParsedRows([]);
      } finally {
        setIsValidating(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read the file.');
      setIsValidating(false);
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  // Drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Reset file selection
  const handleReset = () => {
    setFile(null);
    setFileName('');
    setParsedRows([]);
    setErrorMessage('');
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Confirm and run batch import
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r._isValid);
    if (validRows.length === 0) {
      setErrorMessage('No valid rows found to import.');
      return;
    }

    setIsImporting(true);
    setErrorMessage('');

    try {
      // Map rows for backend consumption
      const payload = {
        skipDuplicates,
        generateTasks,
        opportunities: validRows.map(r => ({
          ...r._raw,
          opportunity_name: r.opportunity_name,
          company: r.company,
          opportunity_type: r.opportunity_type,
          deliverable_type: r.deliverable_type,
          deal_stage: r.deal_stage,
          project_type: r.project_type,
          delivery_team: r.delivery_team,
          primary_sales_owner: r.primary_sales_owner,
          presales_owner: r.presales_owner,
          tcv_amount: r.tcv_amount,
          tcv_currency: r.tcv_currency,
          finance_status: r.finance_status,
          received_date: r.received_date,
          target_submission_date: r.target_submission_date,
          summary: r.summary
        }))
      };

      const res = await fetch('/api/opportunities/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Batch import failed');
      }

      setImportResult(data);

      if (data.importedCount > 0 && onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      console.error('Import error:', err);
      setErrorMessage(err.message || 'An error occurred during import.');
    } finally {
      setIsImporting(false);
    }
  };

  const validRowCount = parsedRows.filter(r => r._isValid).length;
  const invalidRowCount = parsedRows.filter(r => !r._isValid).length;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isImporting) onClose(); }}>
      <div 
        className="modal-content paper-panel" 
        style={{ 
          maxWidth: '1200px', 
          width: '95%', 
          maxHeight: '92vh', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.6rem' }}>📥</span>
              <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
                Import Opportunities from Excel / CSV
              </h3>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Bulk onboard past opportunities and previous organizational engagements directly into your pipeline.
            </p>
          </div>
          <button 
            className="modal-close" 
            onClick={onClose}
            disabled={isImporting}
            style={{ fontSize: '1.5rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ×
          </button>
        </div>

        {/* Template Download Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(37, 99, 235, 0.08) 100%)',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          borderRadius: 'var(--radius-md, 10px)',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>📋</span>
            <div>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                Need the standard spreadsheet format?
              </strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Download our formatted Excel template containing sample historical records, dropdown options, and user guide.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleDownloadTemplate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.84rem',
              fontWeight: 600,
              padding: '0.45rem 0.95rem',
              borderColor: 'var(--accent-secondary)',
              color: 'var(--accent-secondary)',
              background: '#ffffff'
            }}
          >
            <span>⬇️</span> Download Sample Template (.xlsx)
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-banner alert-banner-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem' }}>
            <span>⚠️</span>
            <div style={{ fontSize: '0.88rem' }}>{errorMessage}</div>
          </div>
        )}

        {/* Import Results Banner */}
        {importResult && (
          <div style={{
            background: importResult.importedCount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1.5px solid ${importResult.importedCount > 0 ? '#10b981' : '#f59e0b'}`,
            borderRadius: 'var(--radius-md, 10px)',
            padding: '1.1rem 1.3rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700, color: importResult.importedCount > 0 ? '#047857' : '#b45309' }}>
                <span>{importResult.importedCount > 0 ? '🎉' : 'ℹ️'}</span>
                <span>
                  {importResult.importedCount > 0 
                    ? `Successfully imported ${importResult.importedCount} opportunities!`
                    : 'Import completed with no new records created.'}
                </span>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={onClose}
                style={{ fontSize: '0.82rem', padding: '0.25rem 0.75rem' }}
              >
                Close & View Pipeline
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <span>✅ <strong>{importResult.importedCount}</strong> Created</span>
              <span>⏭️ <strong>{importResult.skippedCount}</strong> Skipped (Already Existed)</span>
              <span>⚠️ <strong>{importResult.errorCount}</strong> Errors</span>
            </div>

            {importResult.skipped && importResult.skipped.length > 0 && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', maxHeight: '90px', overflowY: 'auto' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Skipped duplicates:</div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                  {importResult.skipped.map((s, i) => (
                    <li key={i}>{s.name} ({s.company}) — {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Upload Zone (shown when no file is parsed yet or user wants to change file) */}
        {!parsedRows.length && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--accent-secondary, #2563eb)' : 'var(--border-subtle, #cbd5e1)'}`,
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '3rem 2rem',
              textAlign: 'center',
              backgroundColor: dragActive ? 'rgba(37, 99, 235, 0.04)' : 'var(--bg-secondary, #f8fafc)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📁</div>
            <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: '0 0 0.35rem 0', fontWeight: 600 }}>
              {isValidating ? 'Analyzing spreadsheet...' : 'Drag & drop your Excel or CSV file here'}
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ pointerEvents: 'none', fontSize: '0.86rem' }}
            >
              Browse Local Files
            </button>
          </div>
        )}

        {/* Parsed Data Preview & Settings */}
        {parsedRows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* File info bar */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: 'var(--bg-secondary, #f1f5f9)', 
              padding: '0.65rem 1rem', 
              borderRadius: '8px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
                <span>📄</span>
                <strong>{fileName}</strong>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: 'var(--color-success, #059669)', fontWeight: 600 }}>{validRowCount} valid</span>
                {invalidRowCount > 0 && (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ color: 'var(--color-danger, #dc2626)', fontWeight: 600 }}>{invalidRowCount} with missing fields</span>
                  </>
                )}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleReset}
                disabled={isImporting}
                style={{ fontSize: '0.8rem' }}
              >
                🔄 Choose Different File
              </button>
            </div>

            {/* Import Settings Checkboxes */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.5rem',
              padding: '0.85rem 1rem',
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  disabled={isImporting}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                />
                <span><strong>Skip duplicates</strong> (safely ignores records where Company + Opportunity Name already exists)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={generateTasks}
                  onChange={(e) => setGenerateTasks(e.target.checked)}
                  disabled={isImporting}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                />
                <span><strong>Generate standard template tasks</strong> (leave unchecked for historical past deals)</span>
              </label>
            </div>

            {/* Interactive Data Preview Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Data Preview ({parsedRows.length} total rows detected)
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Showing first {Math.min(parsedRows.length, 10)} rows
                </span>
              </div>

              <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Status</th>
                      <th>Opportunity Name</th>
                      <th>Company</th>
                      <th>Type</th>
                      <th>Deliverable</th>
                      <th>Stage</th>
                      <th>Finance Status</th>
                      <th>Project Type</th>
                      <th>Delivery Team</th>
                      <th>TCV</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 10).map((r, i) => (
                      <tr key={i} style={{ opacity: r._isValid ? 1 : 0.65 }}>
                        <td>
                          {r._isValid ? (
                            <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>
                              ✓ Ready
                            </span>
                          ) : (
                            <span className="badge" title={r._errors.join(', ')} style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444', fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>
                              ⚠️ Missing Info
                            </span>
                          )}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-primary)' }}>{r.opportunity_name || '(Empty)'}</strong>
                        </td>
                        <td>{r.company || '(Empty)'}</td>
                        <td>{r.opportunity_type || 'RFP Response'}</td>
                        <td>{r.deliverable_type || '—'}</td>
                        <td>
                          <span className="badge badge-categorical">
                            {r.deal_stage || 'Won'}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ 
                            fontSize: '0.72rem',
                            backgroundColor: String(r.finance_status || '').toLowerCase().includes('app') ? 'rgba(16, 185, 129, 0.15)' : (String(r.finance_status || '').toLowerCase().includes('rej') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                            color: String(r.finance_status || '').toLowerCase().includes('app') ? '#10b981' : (String(r.finance_status || '').toLowerCase().includes('rej') ? '#ef4444' : '#f59e0b'),
                            border: `1px solid ${String(r.finance_status || '').toLowerCase().includes('app') ? '#10b981' : (String(r.finance_status || '').toLowerCase().includes('rej') ? '#ef4444' : '#f59e0b')}`
                          }}>
                            {r.finance_status || (!generateTasks ? (String(r.deal_stage || '').toLowerCase().includes('won') ? 'Approved' : (['lost', 'drop'].some(s => String(r.deal_stage || '').toLowerCase().includes(s)) ? 'Rejected' : 'Approved')) : 'Pending')}
                          </span>
                        </td>
                        <td>{r.project_type || '—'}</td>
                        <td>{r.delivery_team || '—'}</td>
                        <td>
                          {r.tcv_amount ? `${r.tcv_currency || 'USD'} $${Number(r.tcv_amount).toLocaleString()}` : '—'}
                        </td>
                        <td>{r.target_submission_date ? String(r.target_submission_date).split('T')[0] : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 10 && (
                <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  +{parsedRows.length - 10} more rows will be imported
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              alignItems: 'center', 
              gap: '0.75rem', 
              paddingTop: '0.75rem', 
              borderTop: '1px solid var(--border-subtle)' 
            }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmImport}
                disabled={isImporting || validRowCount === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.4rem',
                  fontWeight: 700
                }}
              >
                {isImporting ? (
                  <>
                    <span className="spinner" style={{ width: '14px', height: '14px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    <span>Importing {validRowCount} Opportunities...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Confirm & Import {validRowCount} {validRowCount === 1 ? 'Opportunity' : 'Opportunities'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
