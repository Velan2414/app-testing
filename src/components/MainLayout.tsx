import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';

export const MainLayout: React.FC = () => {
  const { isAuthenticated, authLoading, onboardingComplete } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[28px] filled-icon animate-pulse">qr_code_scanner</span>
          </div>
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 tracking-widest font-semibold uppercase">MediQR Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden relative bg-white">
      {/* Premium subtle light background overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Soft, barely visible clean blue glow in top-left */}
        <div className="absolute w-[40vw] h-[40vw] rounded-full opacity-[0.03] blur-[100px] top-[-10%] left-[-10%]"
          style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 75%)' }} />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block relative z-10 shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Top Navbar */}
        <Navbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-container-padding-mobile md:px-container-padding-desktop py-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
