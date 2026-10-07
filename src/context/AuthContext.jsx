import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const isInitialized = useRef(false);

  const fetchProfile = async (userId) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Changed from .single() to avoid PGRST116 error
      
      if (data) {
        setProfile(data);
      } else {
        console.warn('AutoDev: No profile found in public.users for this ID.');
        setProfile(null);
      }
      
      if (error) console.error('AutoDev: Profile fetch error:', error);
    } catch (err) {
      console.error('AutoDev: Error fetching profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    console.log('AutoDev: Starting Auth Initialization...');

    const initialize = async () => {
      console.log('AutoDev: Checking for existing session...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('AutoDev: Session found:', session.user.id);
          setUser(session.user);
          // Fetch profile in background without blocking initialization
          fetchProfile(session.user.id);
        } else {
          console.log('AutoDev: No session found.');
        }
      } catch (err) {
        console.error('AutoDev: Session check failed:', err);
      } finally {
        console.log('AutoDev: Auth ready.');
        setLoading(false);
      }
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AutoDev: Auth Event:', event);
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email, password) => {
    const response = await supabase.auth.signInWithPassword({ email, password });
    if (response.data?.session) {
      setUser(response.data.session.user);
      fetchProfile(response.data.session.user.id);
    }
    return response;
  };

  const logout = async () => {
    console.log('AutoDev: Performing force logout...');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('AutoDev: signOut error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      // Hard refresh to the root to clear all state and return to login
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
