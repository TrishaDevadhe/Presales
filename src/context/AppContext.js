'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState('admin');
  const [userRole, setUserRole] = useState('Admin');
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [resourceProfiles, setResourceProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

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
      // Fallback if custom user created in resource profile
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
        getAllOptions
      }}
    >
      {children}
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
