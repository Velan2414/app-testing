import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchUserActivities, formatRelativeTime, ActivityItem } from '../lib/activityService';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [showAllModal, setShowAllModal] = useState(false);
  const [allActivities, setAllActivities] = useState<ActivityItem[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (user) {
      fetchUserActivities(10).then((data) => {
        if (isMounted) {
          setActivities(data);
          setLoadingActivities(false);
        }
      });
    } else {
      setLoadingActivities(false);
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleOpenViewAll = async () => {
    setShowAllModal(true);
    setLoadingAll(true);
    const data = await fetchUserActivities(50);
    setAllActivities(data);
    setLoadingAll(false);
  };

  if (!user) return null;

  const allergies = user.patientRecord?.allergies || [];
  const medications = user.patientRecord?.medications || [];
  const contacts = user.patientRecord?.contacts || [];

  const allergySummary = allergies.length > 0 
    ? (allergies.length === 1 ? allergies[0].name : `${allergies.length} Items`) 
    : 'None';

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'profile_update':
      case 'profile_created':
        return 'person';
      case 'qr_scan':
        return 'qr_code_scanner';
      case 'document_upload':
      case 'document_delete':
        return 'description';
      case 'medication':
        return 'medication';
      case 'allergy':
        return 'allergies';
      case 'condition':
        return 'medical_services';
      case 'contact':
        return 'contacts';
      case 'settings':
        return 'settings';
      default:
        return 'history';
    }
  };

  return (
    <div className="space-y-6">
      {/* Active QR Status Card */}
      <div 
        onClick={() => navigate('/qr/my-code')}
        className="bg-gradient-to-r from-emerald-400/10 to-green-600/10 backdrop-blur-[12px] border border-emerald-500/40 shadow-[0_8px_32px_rgba(34,197,94,0.15)] rounded-[24px] p-6 flex items-center justify-between cursor-pointer hover:shadow-[0_12px_40px_rgba(34,197,94,0.25)] active:scale-[0.99] transition-all duration-300 relative overflow-hidden"
      >
        <div className="absolute inset-0 border border-emerald-400/20 rounded-[24px] pointer-events-none m-[2px]" />
        
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 filled-icon">verified_user</span>
            <span className="font-title-md text-emerald-700 font-semibold">Status: Active</span>
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
        <div className="flex items-center justify-between">
          <h2 className="font-title-md text-title-md text-on-surface font-semibold">Recent Activity</h2>
          {activities.length > 0 && (
            <button
              onClick={handleOpenViewAll}
              className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-all"
            >
              View All History
            </button>
          )}
        </div>
        
        {loadingActivities ? (
          <div className="glass-panel rounded-[24px] p-8 text-center border border-white/60 shadow-sm text-on-surface-variant text-sm">
            Loading recent activity...
          </div>
        ) : activities.length === 0 ? (
          <div className="glass-panel rounded-[24px] p-8 text-center space-y-2 border border-white/60 shadow-sm">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl mb-1">history</span>
            <h3 className="font-title-md text-on-surface font-semibold">No recent activity yet.</h3>
            <p className="font-body-sm text-on-surface-variant/80 text-sm max-w-md mx-auto">
              Your medical activities will appear here once you start using MediQR.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => (
              <div 
                key={act.id} 
                className="glass-panel rounded-[24px] p-5 flex items-center gap-4 hover:bg-white/90 transition-all duration-200 border border-white/60 shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined">{getActivityIcon(act.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-body-lg text-on-surface font-semibold text-sm truncate">{act.title}</h3>
                  {act.description && (
                    <p className="font-body-sm text-on-surface-variant text-xs truncate">{act.description}</p>
                  )}
                </div>
                <span className="text-xs text-on-surface-variant/70 whitespace-nowrap flex-shrink-0">
                  {formatRelativeTime(act.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* View All History Modal */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-outline-variant/30">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                <h3 className="font-title-md text-lg font-bold text-on-surface">Activity History</h3>
              </div>
              <button
                onClick={() => setShowAllModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {loadingAll ? (
                <div className="text-center py-8 text-slate-500 text-sm">Loading activity logs...</div>
              ) : allActivities.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No activity history found.</div>
              ) : (
                allActivities.map((act) => (
                  <div key={act.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <span className="material-symbols-outlined text-lg">{getActivityIcon(act.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-slate-800 truncate">{act.title}</h4>
                      {act.description && <p className="text-xs text-slate-500 truncate">{act.description}</p>}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{formatRelativeTime(act.createdAt)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setShowAllModal(false)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
