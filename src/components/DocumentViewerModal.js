'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function DocumentViewerModal({ isOpen, file, onClose }) {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [excelSheets, setExcelSheets] = useState([]);
  const [textContent, setTextContent] = useState('');
  const [parseError, setParseError] = useState(null);

  useEffect(() => {
    if (!file || !file.data) {
      setExcelSheets([]);
      setTextContent('');
      setParseError(null);
      return;
    }

    const fileName = (file.name || '').toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');
    const isText = fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.json') || fileName.endsWith('.md') || fileName.endsWith('.log') || (file.type && file.type.startsWith('text/'));

    if (isExcel) {
      try {
        setParseError(null);
        let base64 = file.data;
        if (base64.includes(',')) {
          base64 = base64.split(',')[1];
        }
        const workbook = XLSX.read(base64, { type: 'base64' });
        const sheets = workbook.SheetNames.map(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          return {
            name: sheetName,
            data: rawData
          };
        });
        setExcelSheets(sheets);
        setActiveSheetIndex(0);
      } catch (err) {
        console.error('Error parsing Excel attachment:', err);
        setParseError('Unable to parse spreadsheet contents. You can still download and view the original file.');
      }
    } else if (isText) {
      try {
        setParseError(null);
        let base64 = file.data;
        if (base64.includes(',')) {
          base64 = base64.split(',')[1];
        }
        const decoded = decodeURIComponent(escape(atob(base64)));
        setTextContent(decoded);
      } catch (err) {
        try {
          let base64 = file.data.includes(',') ? file.data.split(',')[1] : file.data;
          setTextContent(atob(base64));
        } catch (e2) {
          setTextContent('');
        }
      }
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const fileName = file.name || 'Document';
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  const isPdf = fileExt === 'pdf' || (file.type && file.type.includes('pdf'));
  const isExcel = fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv';
  const isWord = fileExt === 'doc' || fileExt === 'docx' || (file.type && file.type.includes('word'));
  const isPpt = fileExt === 'ppt' || fileExt === 'pptx';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExt) || (file.type && file.type.startsWith('image/'));
  const isText = ['txt', 'json', 'md', 'log'].includes(fileExt);

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const b = parseInt(bytes, 10);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = () => {
    if (isPdf) return '📕';
    if (isExcel) return '📊';
    if (isWord) return '📄';
    if (isPpt) return '📽️';
    if (isImage) return '🖼️';
    return '📁';
  };

  const handleDownload = () => {
    if (!file.data) return;
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      <div 
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* MODAL HEADER */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
            <span style={{ fontSize: '1.6rem' }}>{getFileIcon()}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '1.05rem', color: '#0f172a', wordBreak: 'break-all' }}>
                  {fileName}
                </strong>
                <span className="badge badge-neutral" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  {fileExt || 'File'}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  • {formatFileSize(file.size)}
                </span>
              </div>
              {file.uploaded_at && (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                  Uploaded on {new Date(file.uploaded_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDownload}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.82rem' }}
            >
              <span>⬇️</span> Download File
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '8px',
                width: '34px',
                height: '34px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                color: '#475569',
                fontWeight: 700,
                transition: 'all 0.15s ease'
              }}
              title="Close Viewer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MODAL BODY / DOCUMENT VIEWER */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#f1f5f9',
          minHeight: '400px',
          maxHeight: '74vh',
          display: 'flex',
          flexDirection: 'column'
        }}>

          {/* 1. PDF VIEWER */}
          {isPdf && (
            <div style={{ flex: 1, width: '100%', height: '70vh', minHeight: '500px' }}>
              <iframe
                src={file.data}
                title={fileName}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
          )}

          {/* 2. EXCEL / SPREADSHEET VIEWER */}
          {isExcel && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '1rem', gap: '0.75rem' }}>
              {parseError ? (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', color: '#b45309' }}>
                  <p style={{ fontWeight: 600, fontSize: '1rem', margin: '0 0 0.5rem 0' }}>⚠️ Spreadsheet Preview</p>
                  <p style={{ fontSize: '0.88rem', margin: 0 }}>{parseError}</p>
                </div>
              ) : excelSheets.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading spreadsheet data...
                </div>
              ) : (
                <>
                  {/* Sheet Tabs */}
                  {excelSheets.length > 1 && (
                    <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                      {excelSheets.map((sh, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveSheetIndex(idx)}
                          style={{
                            padding: '0.4rem 0.9rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: activeSheetIndex === idx ? '#2563eb' : '#ffffff',
                            color: activeSheetIndex === idx ? '#ffffff' : '#334155',
                            fontWeight: activeSheetIndex === idx ? 700 : 500,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          📊 {sh.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Rendered Table */}
                  {(() => {
                    const currentSheet = excelSheets[activeSheetIndex] || excelSheets[0];
                    const rows = currentSheet?.data || [];
                    if (rows.length === 0) {
                      return (
                        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', color: '#64748b' }}>
                          This sheet is empty.
                        </div>
                      );
                    }
                    const headers = rows[0] || [];
                    const dataRows = rows.slice(1);

                    return (
                      <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        overflow: 'auto',
                        maxHeight: '62vh'
                      }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '0.82rem',
                          textAlign: 'left'
                        }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1', position: 'sticky', top: 0, zIndex: 10 }}>
                              <th style={{ padding: '0.6rem 0.75rem', color: '#64748b', fontWeight: 700, width: '45px', borderRight: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>#</th>
                              {headers.map((h, i) => (
                                <th key={i} style={{ padding: '0.6rem 0.85rem', color: '#0f172a', fontWeight: 700, borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                  {h !== undefined && h !== null && String(h) !== '' ? String(h) : `Col ${i + 1}`}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {dataRows.map((row, rIdx) => (
                              <tr key={rIdx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                <td style={{ padding: '0.5rem 0.75rem', color: '#94a3b8', fontSize: '0.75rem', borderRight: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: 600 }}>
                                  {rIdx + 1}
                                </td>
                                {headers.map((_, cIdx) => (
                                  <td key={cIdx} style={{ padding: '0.5rem 0.85rem', color: '#334155', borderRight: '1px solid #e2e8f0', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* 3. IMAGE VIEWER */}
          {isImage && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backgroundColor: '#0f172a' }}>
              <img
                src={file.data}
                alt={fileName}
                style={{
                  maxWidth: '100%',
                  maxHeight: '68vh',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}
              />
            </div>
          )}

          {/* 4. TEXT / MARKDOWN / CODE VIEWER */}
          {isText && (
            <div style={{ padding: '1.25rem', flex: 1 }}>
              <pre style={{
                margin: 0,
                padding: '1.25rem',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#0f172a',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '65vh',
                overflowY: 'auto'
              }}>
                {textContent || 'Empty document contents.'}
              </pre>
            </div>
          )}

          {/* 5. WORD (.doc / .docx) OR OTHER BINARY FORMATS */}
          {(isWord || isPpt || (!isPdf && !isExcel && !isImage && !isText)) && (
            <div style={{ padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center' }}>
              <div style={{
                width: '75px',
                height: '75px',
                borderRadius: '50%',
                backgroundColor: isWord ? '#e0e7ff' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.2rem',
                marginBottom: '1rem',
                border: isWord ? '2px solid #818cf8' : '2px solid #cbd5e1'
              }}>
                {getFileIcon()}
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: 700 }}>
                {fileName}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '480px', margin: '0 0 1.5rem 0' }}>
                {isWord 
                  ? 'This Word document is saved with the opportunity. Click below to download and read or edit it in Microsoft Word / Office.' 
                  : isPpt
                  ? 'This presentation is saved with the opportunity. Click below to download and view the slide deck.'
                  : 'This file is attached and saved with the opportunity. Click below to download and open it in your system viewer.'}
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownload}
                style={{
                  padding: '0.75rem 1.75rem',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#2563eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(37,99,235,0.3)'
                }}
              >
                <span>⬇️</span> Download & Read {fileExt.toUpperCase()} Document
              </button>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '0.85rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Attached Opportunity Document • <strong>{fileName}</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{ fontWeight: 600, padding: '0.45rem 1.25rem' }}
            >
              Close Window
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
