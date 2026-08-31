'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState('admin');
  const [userRole, setUserRole] = useState('Admin');
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [resourceProfiles, setResourceProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // App-Themed Toast & Modal Dialog States
  const [toast, setToast] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onClose: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', danger: true, onConfirm: null, onCancel: null });
  const [promptModal, setPromptModal] = useState({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null, onCancel: null });
  const [promptInputValue, setPromptInputValue] = useState('');

  // Available mock users and roles
  const users = [
    { username: 'admin', role: 'Admin' },
    { username: 'jane_doe', role: 'Presales Owner' },
    { username: 'john_smith', role: 'Sales Owner' },
    { username: 'bob_jones', role: 'Team Member' },
    { username: 'alice_williams', role: 'Team Member' }
  ];

  // Fetch dropdowns
  const fetchDropdowns = async () => {
    try {
      const res = await fetch('/api/dropdowns?activeOnly=false');
      const data = await res.json();
      setDropdownOptions(data);
    } catch (error) {
      console.error('Error fetching dropdowns:', error);
    }
  };

  // Fetch resource profiles (users)
  const fetchResourceProfiles = async () => {
    try {
      const res = await fetch('/api/resourceprofiles');
      const data = await res.json();
      setResourceProfiles(data);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchDropdowns(), fetchResourceProfiles()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleUserChange = (username) => {
    const found = users.find(u => u.username === username);
    if (found) {
      setCurrentUser(found.username);
      setUserRole(found.role);
    } else {
      const prof = resourceProfiles.find(p => p.username === username);
      if (prof) {
        setCurrentUser(prof.username);
        setUserRole(prof.role_name || 'Team Member');
      } else {
        setCurrentUser(username);
        setUserRole('Team Member');
      }
    }
  };

  // Filter dropdowns helper
  const getOptions = (category) => {
    return dropdownOptions
      .filter(o => o.category === category && o.active === true)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.option_name.localeCompare(b.option_name));
  };

  // Include inactive for edits
  const getAllOptions = (category) => {
    return dropdownOptions
      .filter(o => o.category === category)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.option_name.localeCompare(b.option_name));
  };

  // App-Themed Toast Trigger
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // App-Themed Alert Trigger
  const showAlert = (message, title = 'Notification', type = 'info') => {
    return new Promise((resolve) => {
      setAlertModal({
        isOpen: true,
        title,
        message,
        type,
        onClose: () => {
          setAlertModal(prev => ({ ...prev, isOpen: false }));
          resolve();
        }
      });
    });
  };

  // App-Themed Confirmation Trigger
  const showConfirm = ({ title = 'Confirm Action', message, confirmText = 'Confirm', cancelText = 'Cancel', danger = true }) => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        danger,
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  // App-Themed Prompt Trigger
  const showPrompt = ({ title = 'Enter Details', message = '', defaultValue = '' }) => {
    setPromptInputValue(defaultValue);
    return new Promise((resolve) => {
      setPromptModal({
        isOpen: true,
        title,
        message,
        defaultValue,
        onConfirm: (val) => {
          setPromptModal(prev => ({ ...prev, isOpen: false }));
          resolve(val);
        },
        onCancel: () => {
          setPromptModal(prev => ({ ...prev, isOpen: false }));
          resolve(null);
        }
      });
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        userRole,
        usersList: users,
        allUsers: resourceProfiles.length > 0 ? resourceProfiles.map(p => p.username) : users.map(u => u.username),
        dropdownOptions,
        resourceProfiles,
        loading,
        handleUserChange,
        refreshDropdowns: fetchDropdowns,
        refreshProfiles: fetchResourceProfiles,
        getOptions,
        getAllOptions,
        showToast,
        showAlert,
        showConfirm,
        showPrompt
      }}
    >
      {children}

      {/* Global App-Themed Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            backgroundColor: toast.type === 'danger' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : 'var(--accent-primary, #6366f1)',
            color: '#ffffff',
            padding: '0.85rem 1.4rem',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <span>{toast.type === 'danger' ? '⚠️' : toast.type === 'warning' ? '⚡' : '✓'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Global App-Themed Alert Modal */}
      {alertModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={(e) => { if (e.target === e.currentTarget) alertModal.onClose(); }}>
          <div className="modal-content paper-panel" style={{ maxWidth: '420px', textAlign: 'center', padding: '1.75rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
              {alertModal.type === 'warning' ? '⚠️' : alertModal.type === 'danger' ? '❌' : 'ℹ️'}
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              {alertModal.title}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {alertModal.message}
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.6rem' }}
              onClick={alertModal.onClose}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Global App-Themed Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={(e) => { if (e.target === e.currentTarget) confirmModal.onCancel(); }}>
          <div className="modal-content paper-panel" style={{ maxWidth: '440px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              {confirmModal.title}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={confirmModal.onCancel}
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                className={confirmModal.danger ? 'btn btn-danger' : 'btn btn-primary'}
                onClick={confirmModal.onConfirm}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global App-Themed Prompt Modal */}
      {promptModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={(e) => { if (e.target === e.currentTarget) promptModal.onCancel(); }}>
          <div className="modal-content paper-panel" style={{ maxWidth: '440px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              {promptModal.title}
            </h3>
            {promptModal.message && (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {promptModal.message}
              </p>
            )}
            <input
              type="text"
              className="form-control"
              value={promptInputValue}
              onChange={(e) => setPromptInputValue(e.target.value)}
              autoFocus
              style={{ marginBottom: '1.5rem' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') promptModal.onConfirm(promptInputValue);
                if (e.key === 'Escape') promptModal.onCancel();
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={promptModal.onCancel}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => promptModal.onConfirm(promptInputValue)}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
