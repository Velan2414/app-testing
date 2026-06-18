import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Splash: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, authLoading, onboardingComplete } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigate(onboardingComplete ? '/dashboard' : '/onboarding', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated, authLoading, onboardingComplete]);

  return (
    <div className="bg-white overflow-hidden w-screen h-screen flex items-center justify-center relative font-sans antialiased text-slate-900">
      {/* Premium subtle light background pulses for white theme */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="absolute w-[80vw] h-[80vw] md:w-[40vw] md:h-[40vw] rounded-full bg-primary/5 blur-[80px] animate-slow-pulse-1 top-[-10%] left-[-10%]" />
        <div className="absolute w-[60vw] h-[60vw] md:w-[30vw] md:h-[30vw] rounded-full bg-tertiary/5 blur-[60px] animate-slow-pulse-2 bottom-[-10%] right-[-10%]" />
        <div className="absolute w-[50vw] h-[50vw] rounded-full bg-slate-50/50 blur-[100px]" />
      </div>

      {/* Main Content Container */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6">
        {/* Premium Floating Glass Logo Container - styled light & crisp */}
        <div className="animate-float flex flex-col items-center justify-center p-12 rounded-[40px] backdrop-blur-[24px] bg-white/80 border border-slate-100 shadow-[0_16px_50px_rgba(0,102,204,0.06)] relative">
          <div className="absolute inset-0 rounded-[40px] border border-white/40 pointer-events-none m-[2px]" />
          
          {/* Icon with glowing pulse background */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full animate-pulse" />
            <span className="material-symbols-outlined text-[80px] text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary-container relative z-10 filled-icon animate-qr-pulse">
              qr_code_scanner
            </span>
          </div>

          {/* Brand Typography */}
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-primary-container text-gradient tracking-tight mb-2">
            MediQR
          </h1>
          
          <p className="text-xs font-semibold text-slate-400 tracking-widest uppercase">
            Clinical Clarity
          </p>

          {/* Old Style pulsing Loading Indicator at the bottom of the card */}
          <div className="absolute bottom-[-40px] flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '0s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </main>
    </div>
  );
};
