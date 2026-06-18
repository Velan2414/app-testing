import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';

export const MyQR: React.FC = () => {
  const { user, regenerateQrData } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [shareSuccess, setShareSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [localIp, setLocalIp] = useState<string>('localhost');

  useEffect(() => {
    fetch('/api/network-ip')
      .then(res => res.json())
      .then(data => {
        if (data && data.ip) {
          setLocalIp(data.ip);
        }
      })
      .catch(err => console.error('Failed to fetch local IP:', err));
  }, []);

  const getQrCodeUrl = () => {
    let origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      origin = origin.replace('localhost', localIp).replace('127.0.0.1', localIp);
    }
    return `${origin}/emergency/${user?.patientRecord?.qrId || ''}`;
  };

  const getDirectReportCardUrl = () => {
    return `${window.location.origin}/emergency/${user?.patientRecord?.qrId || ''}`;
  };

  const qrCodeUrl = user ? getQrCodeUrl() : '';
  const directReportCardUrl = user ? getDirectReportCardUrl() : '';

  useEffect(() => {
    if (canvasRef.current && user?.patientRecord?.qrId) {
      QRCode.toCanvas(
        canvasRef.current,
        qrCodeUrl,
        {
          width: 240,
          margin: 1,
          color: {
            dark: '#181c1e',
            light: '#ffffff'
          }
        },
        (err) => {
          if (err) console.error('Error generating QR Code', err);
        }
      );
    }
  }, [user?.patientRecord?.qrId, qrCodeUrl]);

  if (!user) return null;

  const record = user.patientRecord;
  const isNameValid = !!record.name.trim();
  const isBloodValid = !!record.bloodGroup;
  const isContactsValid = record.contacts.length > 0;

  const handleDownload = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `mediqr-${record.name.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${record.name}'s MediQR Health ID`,
        text: `Securely access emergency health data for ${record.name}.`,
        url: qrCodeUrl
      }).catch((err) => console.log('Error sharing', err));
    } else {
      navigator.clipboard.writeText(qrCodeUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  const handleRegenerate = () => {
    regenerateQrData();
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 2000);
  };

  // Always generate QR — show soft warning for incomplete fields
  const missingFields: { label: string; path: string }[] = [];
  if (!isNameValid) missingFields.push({ label: 'Full Name', path: '/profile/setup' });
  if (!isBloodValid) missingFields.push({ label: 'Blood Group', path: '/profile/setup' });
  if (!isContactsValid) missingFields.push({ label: 'Emergency Contact', path: '/profile/emergency-contacts' });

  // 2. Active Valid QR Code State
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="text-center max-w-md mx-auto space-y-1">
        <h2 className="font-headline-lg-mobile md:font-headline-lg text-primary font-bold">Your Health ID</h2>
        <p className="text-xs text-on-surface-variant">
          {missingFields.length === 0
            ? 'Present this secure code to authorized providers.'
            : 'Your QR code is ready — complete your profile for full emergency data.'}
        </p>
      </div>

      {/* Soft warning banner for incomplete profile */}
      {missingFields.length > 0 && (
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3">
            <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">warning</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800 mb-2">Complete your profile for better emergency care</p>
              <div className="flex flex-wrap gap-2">
                {missingFields.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => navigate(f.path)}
                    className="text-[11px] text-amber-700 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full hover:bg-amber-500/25 transition-colors cursor-pointer font-medium"
                  >
                    + Add {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-4xl mx-auto">
        {/* QR Code Focus Area */}
        <div className="md:col-span-6 flex flex-col items-center justify-center gap-4">
          {/* Premium Gold Framed QR */}
          <div className="bg-gradient-to-br from-amber-400/5 to-amber-600/10 backdrop-blur-[16px] border-2 border-amber-500/30 shadow-[0_8px_32px_rgba(203,167,47,0.15)] rounded-[2rem] p-6 flex flex-col items-center relative w-full max-w-[300px] mx-auto group">
            {/* Decorative corner markers */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-amber-500/50" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-amber-500/50" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-amber-500/50" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-amber-500/50" />
            
            {/* QR Canvas Container */}
            <div className="bg-white p-4 rounded-xl shadow-inner w-full aspect-square flex items-center justify-center mb-4 relative overflow-hidden">
              <canvas ref={canvasRef} className="max-w-full rounded" />
            </div>

            <div className="flex items-center gap-2 text-amber-700 bg-amber-500/10 px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="material-symbols-outlined text-[18px] filled-icon">verified_user</span>
              <span className="font-label-caps text-[10px]">Secured by MediQR</span>
            </div>
          </div>

          {/* Sync status */}
          {syncSuccess && (
            <div className="text-xs text-teal-700 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full animate-fade-in flex items-center gap-1 font-semibold">
              <span className="material-symbols-outlined text-xs">done</span>
              Data synced successfully
            </div>
          )}

          {/* Primary Actions */}
          <div className="flex flex-col w-full max-w-[300px] gap-3">
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={handleDownload}
                icon="download"
                iconPosition="left"
                className="flex-1 py-3 justify-center"
              >
                Save Image
              </Button>
              <Button
                variant="secondary"
                onClick={handleShare}
                icon="share"
                iconPosition="left"
                className="flex-1 py-3 text-center justify-center"
              >
                {shareSuccess ? 'Copied Link' : 'Share Link'}
              </Button>
            </div>
            
            <Button
              variant="primary"
              onClick={() => window.open(directReportCardUrl, '_blank')}
              icon="launch"
              iconPosition="left"
              className="w-full py-3 justify-center bg-gradient-to-r from-primary to-primary-container"
            >
              Get Report Card
            </Button>

            <Button
              variant="secondary"
              onClick={handleRegenerate}
              icon="sync"
              iconPosition="left"
              className="w-full py-3 justify-center"
            >
              Regenerate QR Key
            </Button>
          </div>
        </div>

        {/* Data Summary Panel */}
        <div className="md:col-span-6">
          <GlassCard className="flex flex-col gap-6 w-full h-full justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                <h3 className="font-title-md text-on-surface font-semibold">Live Scanner Preview</h3>
                <span className="material-symbols-outlined text-primary">visibility</span>
              </div>

              {/* Get Report Card Direct Link Banner */}
              <div 
                onClick={() => window.open(directReportCardUrl, '_blank')}
                className="bg-gradient-to-r from-teal-500/10 to-primary/10 border border-teal-500/20 rounded-xl p-3.5 flex items-center justify-between hover:shadow-md active:scale-[0.99] transition-all cursor-pointer group shadow-sm"
                title="Open Emergency Report Card in a new tab"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-teal-500/10 text-teal-600 rounded-lg flex items-center justify-center border border-teal-500/20 shrink-0">
                    <span className="material-symbols-outlined text-[18px] animate-pulse">launch</span>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Get Report Card</p>
                    <p className="text-[9px] text-on-surface-variant truncate">Click to view/print your emergency report card directly.</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-teal-600 text-[14px] group-hover:translate-x-1 transition-transform shrink-0">arrow_forward_ios</span>
              </div>

              {/* Data List */}
              <div className="flex flex-col gap-4 text-xs">
                {/* Vitals */}
                <div className="bg-white/40 border border-white/60 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center font-semibold text-on-surface">
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-primary">person</span>
                      Vitals &amp; Demographic Data
                    </span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-label-caps text-[9px] border border-primary/20">
                      {user.privacySettings.showVitals ? 'PUBLIC' : 'HIDDEN'}
                    </span>
                  </div>
                  {user.privacySettings.showVitals ? (
                    <div className="text-on-surface-variant pl-6 space-y-1">
                      <p><strong>Name:</strong> {record.name}</p>
                      <p><strong>Age/Gender:</strong> {record.age}y / {record.gender}</p>
                      <p><strong>Blood Group:</strong> {record.bloodGroup}</p>
                      <p><strong>Height/Weight:</strong> {record.height}cm / {record.weight}kg</p>
                    </div>
                  ) : (
                    <p className="text-outline pl-6 italic">Hidden from public scanner.</p>
                  )}
                </div>

                {/* Allergies */}
                <div className="bg-white/40 border border-white/60 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center font-semibold text-on-surface">
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-error">coronavirus</span>
                      Allergies Alert
                    </span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-label-caps text-[9px] border border-primary/20">
                      {user.privacySettings.showAllergies ? 'PUBLIC' : 'HIDDEN'}
                    </span>
                  </div>
                  {user.privacySettings.showAllergies ? (
                    <div className="text-on-surface-variant pl-6">
                      {record.allergies.length > 0 ? (
                        <p>{record.allergies.map(a => `${a.name} (${a.severity})`).join(', ')}</p>
                      ) : (
                        <p className="italic">No allergies listed.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-outline pl-6 italic">Hidden from public scanner.</p>
                  )}
                </div>

                {/* Conditions */}
                <div className="bg-white/40 border border-white/60 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center font-semibold text-on-surface">
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-primary">monitor_heart</span>
                      Chronic Conditions
                    </span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-label-caps text-[9px] border border-primary/20">
                      {user.privacySettings.showConditions ? 'PUBLIC' : 'HIDDEN'}
                    </span>
                  </div>
                  {user.privacySettings.showConditions ? (
                    <div className="text-on-surface-variant pl-6">
                      {record.conditions.length > 0 ? (
                        <p>{record.conditions.map(c => c.name).join(', ')}</p>
                      ) : (
                        <p className="italic">No chronic conditions listed.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-outline pl-6 italic">Hidden from public scanner.</p>
                  )}
                </div>

                {/* Medications */}
                <div className="bg-white/40 border border-white/60 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center font-semibold text-on-surface">
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-primary">pill</span>
                      Active Medications
                    </span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-label-caps text-[9px] border border-primary/20">
                      {user.privacySettings.showMedications ? 'PUBLIC' : 'HIDDEN'}
                    </span>
                  </div>
                  {user.privacySettings.showMedications ? (
                    <div className="text-on-surface-variant pl-6">
                      {record.medications.length > 0 ? (
                        <p>{record.medications.map(m => `${m.name} (${m.dosage})`).join(', ')}</p>
                      ) : (
                        <p className="italic">No medications listed.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-outline pl-6 italic">Hidden from public scanner.</p>
                  )}
                </div>

                {/* Contacts */}
                <div className="bg-white/40 border border-white/60 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center font-semibold text-on-surface">
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-error">emergency</span>
                      Emergency Contacts
                    </span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-label-caps text-[9px] border border-primary/20">
                      {user.privacySettings.showContacts ? 'PUBLIC' : 'HIDDEN'}
                    </span>
                  </div>
                  {user.privacySettings.showContacts ? (
                    <div className="text-on-surface-variant pl-6 space-y-1">
                      {record.contacts.map((c, i) => (
                        <p key={i}><strong>{c.name}:</strong> {c.phone} ({c.relationship})</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-outline pl-6 italic">Hidden from public scanner.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low p-4 rounded-lg flex gap-3 border border-outline-variant/20 mt-4">
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">info</span>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Toggles in your settings will immediately alter what emergency services or doctors see when they scan your physical QR key.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
