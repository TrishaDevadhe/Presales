'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function CompanyAutocomplete({ label = 'Company Name', required = true, value, onChange, opportunities = [] }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  // Get unique list of companies
  const companies = Array.from(
    new Set(
      opportunities
        .map(o => o.company)
        .filter(c => c && c.trim())
    )
  ).sort();

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = companies.filter(c =>
      c.toLowerCase().includes(inputValue.toLowerCase())
    );
    setSuggestions(filtered);
  }, [inputValue, opportunities]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (companyName) => {
    setInputValue(companyName);
    onChange(companyName);
    setShowSuggestions(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val); // Trigger change so the field gets updated in real-time
    setShowSuggestions(true);
  };

  return (
    <div
      ref={containerRef}
      className={`form-group autocomplete-container ${showSuggestions ? 'active' : ''}`}
      style={{ position: 'relative', zIndex: showSuggestions ? 9999 : 'auto' }}
    >
      {label && (
        <label className="form-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      <input
        type="text"
        className="form-control"
        placeholder="Search or enter company..."
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        required={required}
      />
      {showSuggestions && (inputValue.trim() !== '' || companies.length > 0) && (
        <div className="autocomplete-dropdown" style={{ zIndex: 99999 }}>
          {suggestions.map((comp, idx) => (
            <div
              key={idx}
              className="autocomplete-option"
              onClick={() => handleSelect(comp)}
            >
              {comp}
            </div>
          ))}
          {inputValue.trim() !== '' && !companies.some(c => c.toLowerCase() === inputValue.toLowerCase()) && (
            <div
              className="autocomplete-option autocomplete-create"
              onClick={() => handleSelect(inputValue.trim())}
            >
              + Use inline new company: &quot;{inputValue}&quot;
            </div>
          )}
          {inputValue.trim() === '' && companies.map((comp, idx) => (
            <div
              key={idx}
              className="autocomplete-option"
              onClick={() => handleSelect(comp)}
            >
              {comp}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
