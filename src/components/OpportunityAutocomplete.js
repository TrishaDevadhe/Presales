'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Briefcase, Check } from 'lucide-react';
import { isOpportunityClosed, isOpportunityLockedForWork } from '@/lib/opportunityUtils';

export default function OpportunityAutocomplete({
  opportunities = [],
  value, // opportunity_id (number or string)
  onChange, // function receiving e or (val, opp)
  label = 'Linked Opportunity',
  placeholder = 'Type to search and select opportunity...',
  disabled = false,
  required = true
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Find currently selected opportunity object
  const selectedOpp = opportunities.find(o => String(o.id) === String(value)) || null;

  // Format display text for an opportunity
  const formatOppText = (opp) => {
    if (!opp) return '';
    return `${opp.company} - ${opp.opportunity_name}`;
  };

  // Sync input value with selected opportunity when value or opportunities change
  useEffect(() => {
    if (selectedOpp) {
      setSearchTerm(formatOppText(selectedOpp));
    } else {
      setSearchTerm('');
    }
  }, [value, selectedOpp]);

  // Filter recommendations based on search input, sorting eligible open opportunities first
  const getRecommendations = () => {
    const trimmed = searchTerm.trim().toLowerCase();
    const currentFormatted = selectedOpp ? formatOppText(selectedOpp).toLowerCase() : '';

    let list = opportunities;
    if (trimmed && (!selectedOpp || trimmed !== currentFormatted)) {
      list = opportunities.filter(opp => {
        const name = (opp.opportunity_name || '').toLowerCase();
        const company = (opp.company || '').toLowerCase();
        const stage = (opp.deal_stage_name || '').toLowerCase();
        return name.includes(trimmed) || company.includes(trimmed) || stage.includes(trimmed);
      });
    }

    return list
      .slice()
      .sort((a, b) => {
        const aLocked = isOpportunityLockedForWork(a.deal_stage_name);
        const bLocked = isOpportunityLockedForWork(b.deal_stage_name);
        if (aLocked && !bLocked) return 1;
        if (!aLocked && bLocked) return -1;
        return 0;
      })
      .slice(0, 15); // Limit to top 15 results for performance
  };

  const recommendations = getRecommendations();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Reset search term back to current selection text
        if (selectedOpp) {
          setSearchTerm(formatOppText(selectedOpp));
        } else {
          setSearchTerm('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOpp]);

  const handleSelect = (opp) => {
    if (!opp) return; // Opportunity can never be empty or none
    if (isOpportunityLockedForWork(opp.deal_stage_name)) {
      return; // Cannot make work items for Won, Lost, or Dropped opportunities
    }
    setSearchTerm(formatOppText(opp));
    if (onChange) {
      // Support standard event signature or direct value
      onChange({
        target: { name: 'opportunity_id', value: String(opp.id) }
      }, opp);
    }
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  return (
    <div
      ref={containerRef}
      className={`form-group autocomplete-container ${isOpen ? 'active' : ''}`}
      style={{ position: 'relative', width: '100%' }}
    >
      {label && (
        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {label} {required && <span className="required">*</span>}
          </span>
          {selectedOpp && (
            <span style={{ fontSize: '0.74rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>
              Linked
            </span>
          )}
        </label>
      )}

      {/* Input container with icons */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          className="form-control"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          disabled={disabled}
          required={required && !value}
          style={{
            paddingLeft: '2.1rem',
            paddingRight: '0.85rem',
            borderColor: isOpen ? 'var(--accent-secondary)' : undefined
          }}
        />

        {/* Left Search/Briefcase Icon */}
        <div style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          {selectedOpp ? <Briefcase size={15} style={{ color: 'var(--accent-secondary)' }} /> : <Search size={15} />}
        </div>
      </div>

      {/* Recommendations Dropdown */}
      {isOpen && !disabled && (
        <div
          className="autocomplete-dropdown"
          style={{
            maxHeight: '260px',
            overflowY: 'auto',
            zIndex: 999999,
            boxShadow: '0 15px 35px rgba(0,0,0,0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem'
          }}
        >

          {/* Filtered Opportunity Recommendations */}
          {recommendations.length > 0 ? (
            recommendations.map(opp => {
              const isSelected = String(opp.id) === String(value);
              const isLocked = isOpportunityLockedForWork(opp.deal_stage_name);

              return (
                <div
                  key={opp.id}
                  className={`autocomplete-option ${isLocked ? 'locked-option' : ''}`}
                  onClick={() => {
                    if (!isLocked) {
                      handleSelect(opp);
                    }
                  }}
                  title={isLocked ? `Cannot create work items for ${opp.deal_stage_name} opportunities` : `Select ${opp.opportunity_name}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.1)' : undefined,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked ? 0.5 : 1
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', overflow: 'hidden' }}>
                    <div style={{
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontSize: '0.86rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {opp.opportunity_name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      🏢 {opp.company}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                    {opp.deal_stage_name && (
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.12rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: isLocked ? 'rgba(239, 68, 68, 0.12)' : 'rgba(37, 99, 235, 0.1)',
                          color: isLocked ? '#dc2626' : 'var(--accent-secondary)'
                        }}
                      >
                        {opp.deal_stage_name} {isLocked ? '(Closed for work)' : ''}
                      </span>
                    )}
                    {isSelected && <Check size={14} style={{ color: 'var(--accent-secondary)' }} />}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '0.85rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No opportunities match &quot;{searchTerm}&quot;
            </div>
          )}

          {/* Count summary footer */}
          <div style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            paddingTop: '0.35rem',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: '0.2rem'
          }}>
            Showing top {recommendations.length} of {opportunities.length} opportunities
          </div>
        </div>
      )}
    </div>
  );
}
