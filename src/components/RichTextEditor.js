'use client';

import React, { useRef } from 'react';
import { useApp } from '@/context/AppContext';

export default function RichTextEditor({ value, onChange, placeholder = 'Write details here...' }) {
  const textareaRef = useRef(null);
  const { showPrompt } = useApp();

  const insertFormat = (tagOpen, tagClose = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const replacement = tagClose 
      ? `${tagOpen}${selected}${tagClose}`
      : `${tagOpen}${selected}`;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(newValue);

    // Focus and select the newly formatted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selected.length);
    }, 0);
  };

  const handleLinkClick = async () => {
    const url = await showPrompt({ title: 'Insert Link', message: 'Enter target web address URL:' });
    if (url) insertFormat(`[`, `](${url})`);
  };

  return (
    <div className="rich-text-editor-container">
      <div className="rich-text-toolbar">
        <button 
          type="button" 
          className="rich-text-btn" 
          onClick={() => insertFormat('**', '**')}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button 
          type="button" 
          className="rich-text-btn" 
          onClick={() => insertFormat('*', '*')}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button 
          type="button" 
          className="rich-text-btn" 
          onClick={() => insertFormat('__', '__')}
          title="Underline"
        >
          <u>U</u>
        </button>
        <button 
          type="button" 
          className="rich-text-btn" 
          onClick={() => insertFormat('\n- ')}
          title="Bullet List"
        >
          • List
        </button>
        <button 
          type="button" 
          className="rich-text-btn" 
          onClick={() => insertFormat('\n1. ')}
          title="Numbered List"
        >
          1. List
        </button>
        <button 
          type="button" 
          className="rich-text-btn" 
          onClick={handleLinkClick}
          title="Link"
        >
          Link
        </button>
        <button 
          type="button" 
          className="rich-text-btn" 
          onClick={() => onChange('')}
          title="Clear"
          style={{ marginLeft: 'auto', fontSize: '0.75rem' }}
        >
          Clear
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="rich-text-content-area form-control form-textarea"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
      />
    </div>
  );
}
