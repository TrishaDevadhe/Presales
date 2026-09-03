'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
    { username: 'admin', name: 'Adhesh(admin)', role: 'Admin' },
    { username: 'jane_doe', name: 'Jane Doe', role: 'Presales Owner' },
    { username: 'trisha_devadhe', name: 'Trisha Devadhe', role: 'Team Member' },
    { username: 'john_smith', name: 'John Smith', role: 'Sales Owner' },
    { username: 'vartika_jadon', name: 'Vartika Jadon', role: 'Team Member' },
    { username: 'alice_williams', name: 'Alice Williams', role: 'Team Member' },
    { username: 'vikrant_dhuriya', name: 'Vikrant Dhuriya', role: 'Team Member' },
    { username: 'divyam_malliwal', name: 'Divyam Malliwal', role: 'Team Member' }
  ];

  const capitalizeOptionName = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => {
      if (!word) return '';
      if (word === word.toUpperCase() && word.length > 1) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  // Fetch dropdowns
  const fetchDropdowns = async () => {
    try {
      const res = await fetch('/api/dropdowns?activeOnly=false');
      const data = await res.json();
      const formatted = (data || []).map(opt => ({
        ...opt,
        option_name: capitalizeOptionName(opt.option_name)
      }));
      setDropdownOptions(formatted);
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

  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity limit

  const saveSession = (username, role) => {
    try {
      const sessionData = {
        username,
        role,
        lastActiveTimestamp: Date.now()
      };
      localStorage.setItem('presales_session', JSON.stringify(sessionData));
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  };

  const updateLastActive = () => {
    try {
      const stored = localStorage.getItem('presales_session');
      if (stored) {
        const sessionData = JSON.parse(stored);
        sessionData.lastActiveTimestamp = Date.now();
        localStorage.setItem('presales_session', JSON.stringify(sessionData));
      }
    } catch (err) {
      console.error('Failed to update last active timestamp:', err);
    }
  };

  const clearSession = () => {
    try {
      localStorage.removeItem('presales_session');
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const profilesPromise = fetchResourceProfiles();
      const dropdownsPromise = fetchDropdowns();
      await Promise.all([dropdownsPromise, profilesPromise]);

      // Check persistent session in localStorage
      try {
        const stored = localStorage.getItem('presales_session');
        if (stored) {
          const session = JSON.parse(stored);
          const now = Date.now();
          if (session.username && (now - session.lastActiveTimestamp < INACTIVITY_TIMEOUT_MS)) {
            setCurrentUser(session.username);
            setUserRole(session.role);
            setIsLoggedIn(true);
            updateLastActive();
          } else {
            clearSession();
            setCurrentUser(null);
            setUserRole(null);
            setIsLoggedIn(false);
          }
        } else {
          setCurrentUser(null);
          setUserRole(null);
          setIsLoggedIn(false);
        }
      } catch (err) {
        clearSession();
        setCurrentUser(null);
        setUserRole(null);
        setIsLoggedIn(false);
      }

      setLoading(false);
    };
    init();
  }, []);

  // Inactivity and session check listener
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleUserActivity = () => {
      updateLastActive();
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    let throttleTimeout = null;

    const throttledHandler = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          handleUserActivity();
          throttleTimeout = null;
        }, 10000); // Throttle update to once every 10 seconds
      }
    };

    events.forEach(evt => window.addEventListener(evt, throttledHandler));

    // Periodic check for inactivity timeout (every 30 seconds)
    const timer = setInterval(() => {
      try {
        const stored = localStorage.getItem('presales_session');
        if (stored) {
          const session = JSON.parse(stored);
          if (Date.now() - session.lastActiveTimestamp > INACTIVITY_TIMEOUT_MS) {
            logout('inactivity');
          }
        }
      } catch (err) {
        console.error('Error checking inactivity:', err);
      }
    }, 30000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, throttledHandler));
      clearInterval(timer);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [isLoggedIn]);

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

  const login = (username) => {
    const found = users.find(u => u.username === username);
    let role = 'Team Member';
    if (found) {
      role = found.role;
    } else {
      const prof = resourceProfiles.find(p => p.username === username);
      if (prof) {
        role = prof.role_name || 'Team Member';
      }
    }
    setCurrentUser(username);
    setUserRole(role);
    setIsLoggedIn(true);
    saveSession(username, role);
    showToast(`Successfully authenticated as @${username} (${role})`);
  };

  const formatUserName = (username) => {
    if (!username || typeof username !== 'string') return username || '';
    const str = username.trim();
    if (str.toLowerCase() === 'admin' || str === 'admin') {
      return 'Adhesh(admin)';
    }
    const prof = resourceProfiles.find(p => p.username && p.username.toLowerCase() === str.toLowerCase());
    if (prof && prof.name) return prof.name;
    const mock = users.find(u => u.username && u.username.toLowerCase() === str.toLowerCase());
    if (mock && mock.name) return mock.name;
    return str;
  };

  const logout = (reason = 'manual') => {
    clearSession();
    setCurrentUser(null);
    setUserRole(null);
    setIsLoggedIn(false);
    if (reason === 'inactivity') {
      showAlert('Your session has expired due to inactivity. Please log in again.', 'Session Expired', 'warning');
    } else {
      showToast('Logged out of session');
    }
  };

  // Title Case Option Text Helper
  const formatOptionLabel = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/_/g, ' ')
      .trim()
      .split(/\s+/)
      .map(word => {
        if (!word) return '';
        if (word.length <= 4 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Filter dropdowns helper
  const getOptions = (category) => {
    return dropdownOptions
      .filter(o => {
        if (o.category !== category || o.active !== true) return false;
        if (category === 'deliverable_type' && o.option_name.toLowerCase().includes('pdf')) return false;
        if (category === 'deal_stage' && ['proposal', 'qualification', 'internal review'].includes(o.option_name.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.option_name.localeCompare(b.option_name))
      .map(o => ({
        ...o,
        option_name: formatOptionLabel(o.option_name)
      }));
  };

  // Include inactive for edits
  const getAllOptions = (category) => {
    return dropdownOptions
      .filter(o => {
        if (o.category !== category) return false;
        if (category === 'deliverable_type' && o.option_name.toLowerCase().includes('pdf')) return false;
        if (category === 'deal_stage' && ['proposal', 'qualification', 'internal review'].includes(o.option_name.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.option_name.localeCompare(b.option_name))
      .map(o => ({
        ...o,
        option_name: formatOptionLabel(o.option_name)
      }));
  };

  // Color Coding Helpers for Dropdown Picklist Options
  const hexToRgba = (colorStr, alpha = 0.15) => {
    if (!colorStr) return null;
    if (colorStr.startsWith('#')) {
      let hex = colorStr.replace('#', '');
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
    if (colorStr.startsWith('hsl')) {
      return colorStr.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
    }
    return colorStr;
  };

  const getOptionColor = (category, valueOrName) => {
    if (!valueOrName || !dropdownOptions.length) return null;
    const match = dropdownOptions.find(o => 
      o.category === category && (
        o.option_name.toLowerCase() === valueOrName.toString().toLowerCase() ||
        o.id.toString() === valueOrName.toString()
      )
    );
    return match ? match.color : null;
  };

  const getOptionBadgeStyle = (category, valueOrName, fallbackColor = '#3b82f6') => {
    const color = getOptionColor(category, valueOrName) || fallbackColor;
    return {
      backgroundColor: hexToRgba(color, 0.14) || 'rgba(59, 130, 246, 0.14)',
      color: color,
      border: `1px solid ${hexToRgba(color, 0.35) || 'rgba(59, 130, 246, 0.35)'}`,
      whiteSpace: 'nowrap',
      wordBreak: 'keep-all',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    };
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
        isLoggedIn,
        login,
        logout,
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
        getOptionColor,
        getOptionBadgeStyle,
        formatOptionLabel,
        formatUserName,
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
          <div className="modal-content paper-panel" style={{ maxWidth: '550px', textAlign: 'center', padding: '1.75rem' }}>
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
          <div className="modal-content paper-panel" style={{ maxWidth: '550px', padding: '1.75rem' }}>
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
          <div className="modal-content paper-panel" style={{ maxWidth: '550px', padding: '1.75rem' }}>
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
