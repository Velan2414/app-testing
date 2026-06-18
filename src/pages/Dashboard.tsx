import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const allergies = user.patientRecord?.allergies || [];
  const medications = user.patientRecord?.medications || [];
  const contacts = user.patientRecord?.contacts || [];

  const allergySummary = allergies.length > 0 
    ? (allergies.length === 1 ? allergies[0].name : `${allergies.length} Items`) 
    : 'None';

  return (
    <div className="space-y-6">
      {/* Active QR Status Card */}
      <div 
        onClick={() => navigate('/qr/my-code')}
        className="bg-gradient-to-r from-amber-400/10 to-amber-600/10 backdrop-blur-[12px] border border-amber-500/40 shadow-[0_8px_32px_rgba(203,167,47,0.15)] rounded-[24px] p-6 flex items-center justify-between cursor-pointer hover:shadow-[0_12px_40px_rgba(203,167,47,0.2)] active:scale-[0.99] transition-all duration-300 relative overflow-hidden"
      >
        <div className="absolute inset-0 border border-amber-400/20 rounded-[24px] pointer-events-none m-[2px]" />
        
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 filled-icon">verified_user</span>
            <span className="font-title-md text-amber-700 font-semibold">Status: Active</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant/80">Your medical profile is ready for scanning.</p>
        </div>

        <div className="bg-white p-2 rounded-lg shadow-sm border border-outline-variant/30 flex-shrink-0">
          <div className="w-16 h-16 bg-surface-container flex items-center justify-center rounded">
            <span className="material-symbols-outlined text-primary text-3xl">qr_code_2</span>
          </div>
        </div>
      </div>

      {/* Health Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Blood Group */}
        <div 
          onClick={() => navigate('/profile/setup')}
          className="glass-panel rounded-[24px] p-6 flex flex-col items-center justify-center gap-2 bg-white/40 hover:bg-white hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-[0.97] transition-all duration-300 border border-white/60 shadow-sm group"
        >
          <span className="material-symbols-outlined text-primary text-3xl filled-icon group-hover:scale-110 transition-transform duration-300">bloodtype</span>
          <span className="font-label-caps text-on-surface-variant text-center text-[10px] font-bold tracking-wider uppercase">Blood Group</span>
          <span className="font-title-md text-on-surface text-xl group-hover:text-primary transition-colors duration-300">{user.patientRecord.bloodGroup || 'Not Set'}</span>
        </div>

        {/* Allergies */}
        <div 
          onClick={() => navigate('/profile/conditions')}
          className="glass-panel rounded-[24px] p-6 flex flex-col items-center justify-center gap-2 bg-white/40 hover:bg-white hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-[0.97] transition-all duration-300 border border-white/60 shadow-sm group"
        >
          <span className="material-symbols-outlined text-primary text-3xl filled-icon group-hover:scale-110 transition-transform duration-300">allergies</span>
          <span className="font-label-caps text-on-surface-variant text-center text-[10px] font-bold tracking-wider uppercase">Allergies</span>
          <span className="font-title-md text-on-surface text-xl truncate max-w-full group-hover:text-primary transition-colors duration-300">{allergySummary}</span>
        </div>

        {/* Medications */}
        <div 
          onClick={() => navigate('/profile/medications')}
          className="glass-panel rounded-[24px] p-6 flex flex-col items-center justify-center gap-2 bg-white/40 hover:bg-white hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-[0.97] transition-all duration-300 border border-white/60 shadow-sm group"
        >
          <span className="material-symbols-outlined text-primary text-3xl filled-icon group-hover:scale-110 transition-transform duration-300">medication</span>
          <span className="font-label-caps text-on-surface-variant text-center text-[10px] font-bold tracking-wider uppercase">Medications</span>
          <span className="font-title-md text-on-surface text-xl group-hover:text-primary transition-colors duration-300">{medications.length} Active</span>
        </div>

        {/* Emergency Contacts */}
        <div 
          onClick={() => navigate('/profile/emergency-contacts')}
          className="glass-panel rounded-[24px] p-6 flex flex-col items-center justify-center gap-2 bg-white/40 hover:bg-white hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-[0.97] transition-all duration-300 border border-white/60 shadow-sm group"
        >
          <span className="material-symbols-outlined text-primary text-3xl filled-icon group-hover:scale-110 transition-transform duration-300">contacts</span>
          <span className="font-label-caps text-on-surface-variant text-center text-[10px] font-bold tracking-wider uppercase">Emergency</span>
          <span className="font-title-md text-on-surface text-xl group-hover:text-primary transition-colors duration-300">{contacts.length} Contacts</span>
        </div>
      </section>

      {/* Recent Activity List */}
      <section className="space-y-4">
        <h2 className="font-title-md text-title-md text-on-surface font-semibold">Recent Activity</h2>
        
        <div className="glass-panel rounded-[24px] p-5 flex items-center gap-4 hover:bg-white/90 cursor-pointer active:scale-[0.99] transition-all duration-200 border border-white/60 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">qr_code_scanner</span>
          </div>
          <div className="flex-1">
            <h3 className="font-body-lg text-on-surface font-semibold text-sm">Profile Scanned</h3>
            <p className="font-body-sm text-on-surface-variant text-xs">City Hospital ER</p>
          </div>
          <span className="text-xs text-on-surface-variant/70">2h ago</span>
        </div>

        <div className="glass-panel rounded-[24px] p-5 flex items-center gap-4 hover:bg-white/90 cursor-pointer active:scale-[0.99] transition-all duration-200 border border-white/60 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">description</span>
          </div>
          <div className="flex-1">
            <h3 className="font-body-lg text-on-surface font-semibold text-sm">Document Uploaded</h3>
            <p className="font-body-sm text-on-surface-variant text-xs">Lab Results - CBC</p>
          </div>
          <span className="text-xs text-on-surface-variant/70">Yesterday</span>
        </div>
      </section>
    </div>
  );
};
