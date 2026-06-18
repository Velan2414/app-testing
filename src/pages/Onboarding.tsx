import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();

  const [showInfoModal, setShowInfoModal] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15000); // 15 seconds in milliseconds

  useEffect(() => {
    if (!showInfoModal) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 50) {
          clearInterval(interval);
          setShowInfoModal(false);
          return 0;
        }
        return prev - 50;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [showInfoModal]);

  const handleAccept = async () => {
    await completeOnboarding();
    navigate('/dashboard');
  };

  const secondsLeft = Math.ceil(timeLeft / 1000);

  return (
    <>
      {/* Centered Welcome & Safety Check Overlay Modal */}
      {showInfoModal && (
        <div 
          onClick={() => setShowInfoModal(false)}
          className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer transition-opacity duration-300"
        >
          <div 
            className="bg-white/80 backdrop-blur-xl rounded-[28px] border border-slate-100/50 p-6 sm:p-8 max-w-sm w-full shadow-[0_24px_60px_rgba(0,102,204,0.15)] text-center flex flex-col items-center relative transform transition-transform duration-300 scale-100 cursor-pointer"
          >
            {/* Close icon in top right */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowInfoModal(false);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {/* Animated medical shield icon */}
            <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-4 relative overflow-hidden shadow-sm">
              <span className="material-symbols-outlined text-[36px] text-primary filled-icon animate-pulse">health_and_safety</span>
            </div>

            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-bold tracking-tight mb-2">Welcome to MediQR</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 leading-relaxed px-2">
              Your secure digital medical identity has been initialized successfully.
            </p>

            <div className="w-full border-t border-dashed border-slate-200 my-3" />

            <h3 className="font-label-caps text-label-caps text-slate-400 tracking-wider mb-4">Core Safety Checks & Features</h3>
            
            <div className="w-full flex flex-col gap-3.5 mb-6 text-left pl-3 pr-2">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] filled-icon">verified_user</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">Verified Clinical Dossier</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] filled-icon">lock</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">Privacy Lock & Gateways</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] filled-icon">emergency</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">Instant Emergency ICE Alerts</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] filled-icon">gpp_maybe</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">Secure CA SSL & Verification</span>
              </div>
            </div>

            {/* Auto-closing Countdown Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-4">
              <div 
                style={{ width: `${(timeLeft / 15000) * 100}%` }}
                className="bg-primary h-full transition-all duration-[50ms] ease-linear"
              />
            </div>

            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {timeLeft > 0 ? `Auto-closing in ${secondsLeft}s...` : 'Closing...'}
            </p>
            <span className="text-[9px] text-primary/80 mt-1.5 hover:underline font-medium">Tap anywhere to close now</span>
          </div>
        </div>
      )}

      <div className="bg-white min-h-screen relative font-sans antialiased text-slate-900 flex flex-col justify-center items-center">
        {/* Ambient Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[40vw] h-[40vw] rounded-full opacity-[0.03] blur-[100px] top-[-10%] left-[-10%]"
            style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 75%)' }} />
        </div>

        <main className="relative z-10 flex-grow flex flex-col justify-center items-center px-container-padding-mobile md:px-container-padding-desktop py-12 w-full max-w-md mx-auto">
          {/* Header / Logo Area */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm mb-4">
              <span className="material-symbols-outlined text-primary text-3xl filled-icon">
                health_and_safety
              </span>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-bold tracking-tight mb-2">MediQR</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Your Health. Your Control.</p>
          </div>

        {/* Consent Card */}
        <GlassCard className="w-full mb-8">
          <h2 className="font-title-md text-title-md text-on-surface mb-6">Data Privacy &amp; Sharing</h2>
          <div className="flex flex-col gap-6">
            {/* Point 1 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">
                  qr_code
                </span>
              </div>
              <div>
                <h3 className="font-body-lg text-body-lg text-on-surface font-semibold mb-1">Secure QR Sharing</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Your medical profile is accessed only when you present your personal QR code to a verified provider.</p>
              </div>
            </div>
            {/* Point 2 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">
                  encrypted
                </span>
              </div>
              <div>
                <h3 className="font-body-lg text-body-lg text-on-surface font-semibold mb-1">End-to-End Encryption</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">All health records are encrypted at rest and in transit. MediQR cannot read your sensitive medical data.</p>
              </div>
            </div>
            {/* Point 3 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">
                  manage_accounts
                </span>
              </div>
              <div>
                <h3 className="font-body-lg text-body-lg text-on-surface font-semibold mb-1">Complete Ownership</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">You decide what information is shared. Revoke access to any provider at any time from your settings.</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Action Area */}
        <div className="w-full flex flex-col items-center gap-4 mt-auto">
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center px-4">
            By continuing, you agree to our{' '}
            <a className="text-primary font-medium hover:underline transition-all" href="#">Terms of Service</a> and acknowledge the{' '}
            <a className="text-primary font-medium hover:underline transition-all" href="#">Privacy Policy</a>.
          </p>
          
          <Button
            variant="primary"
            onClick={handleAccept}
            className="w-full py-4 text-center justify-center"
            icon="arrow_forward"
          >
            Accept and Continue
          </Button>
        </div>
      </main>
    </div>
    </>
  );
};
