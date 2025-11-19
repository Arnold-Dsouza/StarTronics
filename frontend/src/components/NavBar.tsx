import { Link, useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export const NavBar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const [pendingBills, setPendingBills] = useState<number>(0);

  const navItems = [
    { href: '/', label: 'Home' },
    ...(user ? [
      { href: '/dashboard', label: 'Dashboard' },
      // Customer navigation (quotes tab removed; access via cart icon only if pending bills)
      ...(userProfile?.role === 'customer' ? [
        { href: '/repairs', label: 'Repairs' },
        { href: '/payments', label: 'Payments' }
      ] : []),
      // Technician navigation (use Dashboard link which redirects to /technician; remove duplicate assignments tab)
      ...(userProfile?.role === 'technician' ? [
        { href: '/payments', label: 'Payment Status' }
      ] : []),
      // Admin
      ...(userProfile?.role === 'admin' ? [{ href: '/admin', label: 'Admin Panel' }] : [])
    ] : [])
  ];

  // Debug: log user role
  useEffect(() => {
    if (userProfile) {
      console.log('Current user role:', userProfile.role);
    }
  }, [userProfile]);

  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark';
    setDark(saved);
    document.documentElement.classList.toggle('dark', saved);
  }, []);

  // Close account dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    if (accountOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [accountOpen]);

  // Load count of pending bills (quotes with status 'sent' for this user)
  useEffect(() => {
    async function loadPendingBills() {
      if (!user) { setPendingBills(0); return; }
      // 1) Get this user's repair request IDs (optionally only those marked completed)
      const { data: reqs } = await supabase
        .from('repair_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const ids = (reqs || []).map(r => r.id);
      if (!ids.length) { setPendingBills(0); return; }

      // 2) Count quotes in 'sent' status for those requests
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id, repair_request_id, status')
        .in('repair_request_id', ids)
        .eq('status', 'sent');

      setPendingBills((quotes || []).length);
    }
    loadPendingBills();
  }, [user]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="md:hidden nav-link" aria-label="Open menu" onClick={() => setOpen(v => !v)}>☰</button>
          <Link to="/" className="font-bold text-2xl gradient-text flex items-center gap-2">
            <span className="text-3xl">⚡</span>
            StarTronics
          </Link>
        </div>
        <nav className="hidden md:flex gap-1">
          {navItems.map(item => (
            <Link key={item.href} to={item.href} className="nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="nav-link text-xl" aria-label="Toggle dark mode">
            {dark ? '🌙' : '🌞'}
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              {userProfile?.role === 'customer' && pendingBills > 0 && (
                <Link
                  to="/quotes"
                  className="nav-link text-xl relative"
                  aria-label="Cart / Quotes"
                  title="Your Bills"
                >
                  🛒
                  <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-xs font-bold shadow-md">
                    {pendingBills}
                  </span>
                </Link>
              )}
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen(o => !o)}
                  className="flex items-center justify-center w-10 h-10 rounded-full ring-2 ring-white/30 overflow-hidden bg-gradient-to-br from-brand-400 to-accent-500 shadow hover:shadow-md transition"
                  aria-haspopup="true"
                  aria-expanded={accountOpen}
                  title={user.email}
                >
                  {userProfile?.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt="Account"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-sm">
                      {(user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
                {accountOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-lg shadow-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 py-2 animate-fade-in">
                    <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                      {userProfile?.role ? `Role: ${userProfile.role}` : 'Account'}
                    </div>
                    {userProfile?.role === 'customer' && (
                      <>
                        <Link
                          to="/payments"
                          onClick={() => setAccountOpen(false)}
                          className="block px-4 py-2 text-sm hover:bg-white/30 dark:hover:bg-slate-700/40"
                        >
                          Payment History
                        </Link>
                        <Link
                          to="/cards"
                          onClick={() => setAccountOpen(false)}
                          className="block px-4 py-2 text-sm hover:bg-white/30 dark:hover:bg-slate-700/40"
                        >
                          Saved Cards
                        </Link>
                      </>
                    )}
                    {userProfile?.role === 'technician' && (
                      <Link
                        to="/payments"
                        onClick={() => setAccountOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-white/30 dark:hover:bg-slate-700/40"
                      >
                        Payment Status
                      </Link>
                    )}
                    <button
                      onClick={async () => {
                        await signOut();
                        setAccountOpen(false);
                        navigate('/');
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-white/30 dark:hover:bg-slate-700/40"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link to="/auth/login" className="btn btn-outline text-sm px-5 py-2">Login</Link>
              <Link to="/auth/register" className="btn btn-primary text-sm px-5 py-2">Sign Up</Link>
            </>
          )}
        </div>
      </div>
      {open && (
        <div className="md:hidden px-6 pb-4 glass border-t border-white/20">
          <nav className="flex flex-col gap-1">
            {navItems.map(item => (
              <Link key={item.href} to={item.href} className="nav-link" onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};
