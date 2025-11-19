import React from 'react';
import { NavBar } from './NavBar';

export const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 animate-slide-up">{children}</main>
      <footer className="glass border-t border-white/20 text-sm text-center py-6">
        <p className="text-slate-600">© {new Date().getFullYear()} StarTronics • Crafted with precision</p>
      </footer>
    </div>
  );
};
