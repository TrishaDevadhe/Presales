'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function StaffMultiSelect({
  label,
  value,
  selectedValues,
  onChange,
  allUsers = [],
  options = [],
  placeholder = 'Select team members...'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const usersList = options.length > 0 ? options : allUsers;

  // Normalize selected items into an array of string usernames
  let selectedList = [];
  if (selectedValues !== undefined && selectedValues !== null) {
    selectedList = Array.isArray(selectedValues)
      ? selectedValues
      : String(selectedValues).split(',').map(s => s.trim()).filter(Boolean);
  } else if (value !== undefined && value !== null) {
    selectedList = Array.isArray(value)
      ? value
      : String(value).split(',').map(s => s.trim()).filter(Boolean);
  }

  const toggleUser = (user) => {
    let updated;
    if (selectedList.includes(user)) {
      updated = selectedList.filter(u => u !== user);
    } else {
      updated = [...selectedList, user];
    }
    onChange(updated);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="form-group" ref={containerRef} style={{ position: 'relative' }}>
      {label && <label className="form-label">{label}</label>}
      
      {/* Selected Items Box / Trigger */}
      <div
        className="form-control"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          minHeight: '42px',
          height: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
          alignItems: 'center',
          padding: '0.4rem 0.75rem',
          cursor: 'pointer',
          background: 'var(--paper-panel)',
          borderColor: isOpen ? 'var(--accent-primary)' : 'var(--border-subtle)'
        }}
      >
        {selectedList.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{placeholder}</span>
        ) : (
          selectedList.map(u => (
            <span
              key={u}
              className="badge badge-info"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.55rem',
                fontSize: '0.82rem',
                fontWeight: 600
              }}
            >
              @{u}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  toggleUser(u);
                }}
                style={{ cursor: 'pointer', fontWeight: 700, marginLeft: '0.15rem' }}
                title="Remove"
              >
                ×
              </span>
            </span>
          ))
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {/* Popover Dropdown List */}
      {isOpen && (
        <div
          className="paper-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '0.5rem',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--paper-panel)'
          }}
        >
          {usersList.length === 0 ? (
            <p style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No resources found</p>
          ) : (
            usersList.map(u => {
              const isSelected = selectedList.includes(u);
              return (
                <div
                  key={u}
                  onClick={() => toggleUser(u)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem',
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    background: isSelected ? 'var(--bg-secondary)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.2rem',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <span>@{u}</span>
                  {isSelected && <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>✓</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
