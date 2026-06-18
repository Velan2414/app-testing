import React, { useState, useEffect } from 'react';

interface UserRecord {
  user_id: string;
  email: string;
  phone: string;
  onboarding_complete: boolean;
  patient_record: {
    name?: string;
    bloodGroup?: string;
    dob?: string;
    gender?: string;
    allergies?: Array<{ name: string; severity: string; notes?: string }>;
    conditions?: Array<{ name: string; severity: string; notes?: string }>;
    medications?: Array<{ name: string; dosage: string; frequency: string }>;
    contacts?: Array<{ name: string; relationship: string; phone: string }>;
    qrId?: string;
  };
}

export const AdminDashboard: React.FC = () => {
  const [adminSecret, setAdminSecret] = useState<string>(() => {
    return localStorage.getItem('admin_secret') || '';
  });
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  const fetchAdminData = async (secretToUse: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secret: secretToUse }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to authorize/fetch data');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setIsAuthorized(true);
      localStorage.setItem('admin_secret', secretToUse);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminSecret) {
      fetchAdminData(adminSecret);
    }
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSecret.trim()) {
      fetchAdminData(adminSecret.trim());
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_secret');
    setAdminSecret('');
    setIsAuthorized(false);
    setUsers([]);
    setSelectedUser(null);
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const emailMatch = u.email?.toLowerCase().includes(term);
    const nameMatch = u.patient_record?.name?.toLowerCase().includes(term);
    const phoneMatch = u.phone?.includes(term);
    const qrMatch = u.patient_record?.qrId?.toLowerCase().includes(term);
    const bloodMatch = u.patient_record?.bloodGroup?.toLowerCase().includes(term);
    return emailMatch || nameMatch || phoneMatch || qrMatch || bloodMatch;
  });

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="glass-panel max-w-md w-full p-8 rounded-[32px] border border-white/60 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
            <span className="material-symbols-outlined text-4xl">admin_panel_settings</span>
          </div>
          <div>
            <h1 className="font-title-lg text-2xl font-bold text-on-surface">Admin Access Portal</h1>
            <p className="text-on-surface-variant text-sm mt-1">Please enter the Admin Secret Key to view database records.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter Admin Secret Key"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center bg-surface-container/50"
                required
              />
            </div>
            {error && (
              <p className="text-error text-xs font-semibold bg-error-container/20 py-2 rounded-lg">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-on-primary font-semibold py-3 px-4 rounded-xl transition duration-200 shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Access Database'}
              <span className="material-symbols-outlined text-sm">login</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-title-lg text-3xl font-bold text-on-surface">Admin System Dashboard</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Viewing {filteredUsers.length} of {users.length} total database records.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-error/10 hover:bg-error/20 text-error border border-error/30 hover:border-error/50 rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition duration-200"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Exit Portal
        </button>
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/70">
            search
          </span>
          <input
            type="text"
            placeholder="Search by Name, Email, Phone, Blood Group or QR ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-[20px] border border-outline bg-white/70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
          />
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users list panel */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-title-md text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined">group</span>
            Database Users
          </h2>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {filteredUsers.length === 0 ? (
              <div className="glass-panel text-center py-12 rounded-[24px]">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/50">person_off</span>
                <p className="text-on-surface-variant mt-2">No matching user records found.</p>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const blood = u.patient_record?.bloodGroup;
                const qrId = u.patient_record?.qrId;

                return (
                  <div
                    key={u.user_id}
                    onClick={() => setSelectedUser(u)}
                    className={`glass-panel p-4 rounded-[24px] border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      selectedUser?.user_id === u.user_id
                        ? 'border-primary bg-primary/5 shadow-md scale-[1.01]'
                        : 'border-white/60 hover:bg-white/90 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {u.patient_record?.name ? u.patient_record.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-on-surface text-base">
                          {u.patient_record?.name || <span className="italic text-on-surface-variant/60">Not Onboarded</span>}
                        </h3>
                        <p className="text-xs text-on-surface-variant/80 font-mono">{u.email}</p>
                        {u.phone && <p className="text-xs text-on-surface-variant/60 mt-0.5">{u.phone}</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-start sm:justify-end gap-3 flex-wrap">
                      {blood && (
                        <span className="bg-primary-container/20 text-primary border border-primary/20 text-xs px-2.5 py-1 rounded-full font-bold">
                          Blood: {blood}
                        </span>
                      )}
                      {qrId ? (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold font-mono">
                          QR: {qrId}
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full font-semibold">
                          No QR
                        </span>
                      )}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          u.onboarding_complete
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.onboarding_complete ? 'Complete' : 'Incomplete'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* User details inspection panel */}
        <div className="space-y-3">
          <h2 className="font-title-md text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined">analytics</span>
            Medical Profile Inspector
          </h2>

          {selectedUser ? (
            <div className="glass-panel p-6 rounded-[28px] border border-white/60 shadow-md space-y-6 bg-white/80">
              {/* Profile Card Header */}
              <div className="text-center space-y-2 border-b border-outline-variant/30 pb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl mx-auto shadow-sm">
                  {selectedUser.patient_record?.name ? selectedUser.patient_record.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-lg">
                    {selectedUser.patient_record?.name || 'Incomplete Profile'}
                  </h3>
                  <p className="text-xs text-on-surface-variant/80 font-mono break-all">{selectedUser.email}</p>
                </div>

                {selectedUser.patient_record?.qrId && (
                  <div className="pt-2 flex justify-center gap-2">
                    <a
                      href={`/emergency/${selectedUser.patient_record.qrId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition duration-150"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      Public Emergency Page
                    </a>
                  </div>
                )}
              </div>

              {/* Personal Details */}
              <div className="space-y-2.5 text-sm">
                <h4 className="font-bold text-on-surface border-l-4 border-primary pl-2 mb-2">Personal Data</h4>
                <div className="flex justify-between py-1 border-b border-outline-variant/10">
                  <span className="text-on-surface-variant">Blood Group:</span>
                  <span className="font-bold text-on-surface">{selectedUser.patient_record?.bloodGroup || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-outline-variant/10">
                  <span className="text-on-surface-variant">Gender:</span>
                  <span className="font-semibold text-on-surface">{selectedUser.patient_record?.gender || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-outline-variant/10">
                  <span className="text-on-surface-variant">Date of Birth:</span>
                  <span className="font-semibold text-on-surface">{selectedUser.patient_record?.dob || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-on-surface-variant">Phone Number:</span>
                  <span className="font-semibold text-on-surface">{selectedUser.phone || 'N/A'}</span>
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="space-y-2.5 text-sm">
                <h4 className="font-bold text-on-surface border-l-4 border-primary pl-2 mb-2">
                  Emergency Contacts ({selectedUser.patient_record?.contacts?.length || 0})
                </h4>
                {selectedUser.patient_record?.contacts && selectedUser.patient_record.contacts.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.patient_record.contacts.map((c, i) => (
                      <div key={i} className="bg-surface-container/50 p-2.5 rounded-xl border border-outline-variant/20 flex flex-col gap-0.5">
                        <span className="font-semibold text-on-surface">{c.name} ({c.relationship})</span>
                        <a href={`tel:${c.phone}`} className="text-xs text-primary font-medium hover:underline flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[12px]">call</span>
                          {c.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant/60 italic">No emergency contacts saved.</p>
                )}
              </div>

              {/* Conditions & Allergies */}
              <div className="space-y-2.5 text-sm">
                <h4 className="font-bold text-on-surface border-l-4 border-primary pl-2 mb-2">Conditions & Allergies</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Allergies:</span>
                    <span className="font-semibold text-on-surface">
                      {selectedUser.patient_record?.allergies?.map(a => a.name).join(', ') || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Conditions:</span>
                    <span className="font-semibold text-on-surface">
                      {selectedUser.patient_record?.conditions?.map(c => c.name).join(', ') || 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Medications */}
              <div className="space-y-2.5 text-sm">
                <h4 className="font-bold text-on-surface border-l-4 border-primary pl-2 mb-2">
                  Active Medications ({selectedUser.patient_record?.medications?.length || 0})
                </h4>
                {selectedUser.patient_record?.medications && selectedUser.patient_record.medications.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.patient_record.medications.map((m, i) => (
                      <div key={i} className="bg-surface-container/50 p-2 rounded-xl border border-outline-variant/20 flex justify-between items-center text-xs">
                        <span className="font-semibold text-on-surface">{m.name}</span>
                        <span className="text-on-surface-variant">{m.dosage} - {m.frequency}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant/60 italic">No medications recorded.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 rounded-[28px] border border-white/60 text-center py-20 text-on-surface-variant/60">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/40">info</span>
              <p className="mt-2 text-sm">Select a user from the list to view their complete emergency medical profile details here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
