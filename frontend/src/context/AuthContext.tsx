import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UserProfile {
  id: string;
  display_name?: string;
  role: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: any;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, role?: 'customer' | 'technician') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserProfile(userId: string, defaultRole?: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, display_name, role, avatar_url')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      // Profile exists, use it
      setUserProfile(data);
    } else if (defaultRole) {
      // Profile doesn't exist AND we have a role to set (during signup)
      const roleToUse = defaultRole;
      console.log('Creating/updating user profile with role:', roleToUse);
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .upsert({ id: userId, role: roleToUse }, { onConflict: 'id' })
        .select()
        .single();
      if (insertError) {
        console.error('Error creating/updating profile:', insertError);
      }
      if (newProfile) {
        console.log('Profile created/updated:', newProfile);
        setUserProfile(newProfile);
      }
    }
    // If no profile exists and no defaultRole provided, do nothing
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser.id);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser.id);
      } else {
        setUserProfile(null);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) setUser(data.user);
    return { error };
  }

  async function signUp(email: string, password: string, role: 'customer' | 'technician' = 'customer') {
    console.log('Signing up with role:', role);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.user) {
      setUser(data.user);
      // Create profile with selected role
      await fetchUserProfile(data.user.id, role);
    }
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!user) return <div className="max-w-md mx-auto card text-center">
    <h2 className="text-xl font-semibold mb-4">Please Login</h2>
    <p className="text-slate-600 dark:text-slate-300 mb-4">You must be logged in to view this content.</p>
    <a href="/auth/login" className="btn btn-primary">Go to Login</a>
  </div>;
  return <>{children}</>;
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!user) return <div className="max-w-md mx-auto card text-center">
    <h2 className="text-xl font-semibold mb-4">Please Login</h2>
    <p className="text-slate-600 dark:text-slate-300 mb-4">You must be logged in to view this content.</p>
    <a href="/auth/login" className="btn btn-primary">Go to Login</a>
  </div>;
  if (userProfile?.role !== 'admin') return <div className="max-w-md mx-auto card text-center">
    <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
    <p className="text-slate-600 dark:text-slate-300 mb-4">This page is only accessible to administrators.</p>
    <a href="/dashboard" className="btn btn-primary">Go to Dashboard</a>
  </div>;
  return <>{children}</>;
}