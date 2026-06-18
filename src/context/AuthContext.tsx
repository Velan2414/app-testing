import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  upsertProfile,
  fetchProfile,
  getOnboardingComplete,
  setOnboardingComplete,
} from '../lib/profileService';
import type {
  ConditionAllergyItem,
  Medication,
  EmergencyContact,
  PrivacySettings,
  PatientRecord,
  UserProfile,
  AuthUser,
  MedicalDocument,
} from '../types';
import {
  DEFAULT_PRIVACY_SETTINGS,
  createEmptyPatientRecord,
} from '../types';



interface AuthContextType {
  isAuthenticated: boolean;
  authLoading: boolean;
  onboardingComplete: boolean;
  user: UserProfile | null;
  authUser: AuthUser | null;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  resendVerificationEmail: () => Promise<{ error: string | null }>;
  checkEmailVerificationStatus: () => Promise<boolean>;
  verifyOtp: (email: string, otp: string) => Promise<{ error: string | null }>;
  resendOtp: (email: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  sendResetOtp: (email: string) => Promise<{ error: string | null }>;
  resetPasswordLogin: (email: string, otp: string, newPassword?: string) => Promise<{ error: string | null }>;
  completeOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
  updatePatientRecord: (record: Partial<PatientRecord>) => void;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  addMedication: (med: Medication) => void;
  removeMedication: (index: number) => void;
  addContact: (contact: EmergencyContact) => void;
  removeContact: (index: number) => void;
  addCondition: (cond: ConditionAllergyItem) => void;
  removeCondition: (name: string) => void;
  addAllergy: (allergy: ConditionAllergyItem) => void;
  removeAllergy: (name: string) => void;
  addDocument: (doc: Omit<MedicalDocument, 'id' | 'date'>) => void;
  removeDocument: (id: string) => void;
  markNotificationsAsRead: () => void;
  regenerateQrData: () => void;
}



const syncRecordToDb = async (qrId: string, record: PatientRecord, settings: PrivacySettings) => {
  if (!qrId) return;
  try {
    const response = await fetch(`/api/records/${qrId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientRecord: record, privacySettings: settings }),
    });
    if (!response.ok) {
      console.error('Failed to sync record to backend');
    }
  } catch (err) {
    console.error('Error syncing record to backend API', err);
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onboardingComplete, setOnboardingCompleteState] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  
  const [, setPendingVerificationEmail] = useState<string | null>(() => {
    return localStorage.getItem('pending_verification_email');
  });

  const shouldSyncRef = useRef(false);
  const profileSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setAuthUser(null);
        setIsAuthenticated(false);
        setUser(null);
        setOnboardingCompleteState(false);
        setAuthLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            const loggedUser: AuthUser = { uid: data.user.id, email: data.user.email };
            setAuthUser(loggedUser);
            setIsAuthenticated(true);
            
            let fetchedProfile = await fetchProfile(loggedUser.uid);
            if (!fetchedProfile) {
              fetchedProfile = {
                email: loggedUser.email,
                phone: '',
                patientRecord: createEmptyPatientRecord(loggedUser.uid),
                privacySettings: DEFAULT_PRIVACY_SETTINGS,
                notifications: []
              };
            }
            setUser(fetchedProfile);

            const completed = await getOnboardingComplete(loggedUser.uid);
            setOnboardingCompleteState(completed);
          } else {
            throw new Error("Invalid session");
          }
        } else {
          throw new Error("Invalid session");
        }
      } catch {
        localStorage.removeItem('auth_token');
        setAuthUser(null);
        setIsAuthenticated(false);
        setUser(null);
        setOnboardingCompleteState(false);
      } finally {
        setAuthLoading(false);
      }
    };

    verifySession();
  }, []);

  useEffect(() => {
    if (!user || !authUser) return;

    if (shouldSyncRef.current) {
      shouldSyncRef.current = false;
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/emergency/')) {
        syncRecordToDb(user.patientRecord.qrId, user.patientRecord, user.privacySettings);
      }
    }

    if (profileSaveTimerRef.current) {
      clearTimeout(profileSaveTimerRef.current);
    }

    profileSaveTimerRef.current = setTimeout(() => {
      upsertProfile(authUser.uid, authUser.email || user.email, user);
    }, 800);

    return () => {
      if (profileSaveTimerRef.current) {
        clearTimeout(profileSaveTimerRef.current);
      }
    };
  }, [user, authUser]);

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Server returned an invalid response. Please try again later.' };
      }
      
      if (!response.ok) {
        return { error: data.error || 'Signup connection error' };
      }
      
      const cleanEmail = email.trim().toLowerCase();
      setPendingVerificationEmail(cleanEmail);
      localStorage.setItem('pending_verification_email', cleanEmail);
      
      return { error: null };
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { error: err.message || 'Signup connection error' };
      }
      return { error: 'Signup connection error' };
    }
  };

  const resendVerificationEmail = async (): Promise<{ error: string | null }> => {
    try {
      const email = localStorage.getItem('pending_verification_email') || (authUser ? authUser.email : null);
      if (!email) {
        return { error: 'No email found to resend verification' };
      }

      const response = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Server returned an invalid response. Please try again later.' };
      }
      
      if (!response.ok) {
        return { error: data.error || 'Resend link error' };
      }
      return { error: null };
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { error: err.message || 'Resend link error' };
      }
      return { error: 'Resend link error' };
    }
  };

  const checkEmailVerificationStatus = async (): Promise<boolean> => {
    try {
      const email = localStorage.getItem('pending_verification_email') || (authUser ? authUser.email : null);
      if (!email) return false;

      const response = await fetch(`/api/auth/status?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.isVerified) {
          setPendingVerificationEmail(null);
          localStorage.removeItem('pending_verification_email');
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const verifyOtp = async (email: string, otp: string): Promise<{ error: string | null }> => {
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Server returned an invalid response. Please try again later.' };
      }
      
      if (!response.ok) {
        return { error: data.error || 'Verification failed' };
      }
      
      setPendingVerificationEmail(null);
      localStorage.removeItem('pending_verification_email');
      
      return { error: null };
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { error: err.message || 'Verification connection error' };
      }
      return { error: 'Verification connection error' };
    }
  };

  const resendOtp = async (email: string): Promise<{ error: string | null }> => {
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Server returned an invalid response. Please try again later.' };
      }
      
      if (!response.ok) {
        return { error: data.error || 'Failed to resend verification code' };
      }
      
      return { error: null };
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { error: err.message || 'Resend connection error' };
      }
      return { error: 'Resend connection error' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Server returned an invalid response. Please try again later.' };
      }

      if (!response.ok) {
        if (data.error === 'EMAIL_NOT_VERIFIED') {
          const cleanEmail = email.trim().toLowerCase();
          setPendingVerificationEmail(cleanEmail);
          localStorage.setItem('pending_verification_email', cleanEmail);
          return { error: 'EMAIL_NOT_VERIFIED' };
        }
        return { error: data.error || 'Invalid email or password' };
      }

      localStorage.setItem('auth_token', data.token);
      setPendingVerificationEmail(null);
      localStorage.removeItem('pending_verification_email');
      
      const loggedUser: AuthUser = { uid: data.user.id, email: data.user.email };
      setAuthUser(loggedUser);
      setIsAuthenticated(true);
      
      let fetchedProfile = await fetchProfile(loggedUser.uid);
      if (!fetchedProfile) {
        fetchedProfile = {
          email: loggedUser.email,
          phone: '',
          patientRecord: createEmptyPatientRecord(loggedUser.uid),
          privacySettings: DEFAULT_PRIVACY_SETTINGS,
          notifications: []
        };
      }
      setUser(fetchedProfile);

      const completed = await getOnboardingComplete(loggedUser.uid);
      setOnboardingCompleteState(completed);

      return { error: null };
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { error: err.message || 'Sign in connection error' };
      }
      return { error: 'Sign in connection error' };
    }
  };

  const sendResetOtp = async (email: string): Promise<{ error: string | null }> => {
    try {
      const response = await fetch('/api/auth/send-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Server returned an invalid response.' };
      }
      
      if (!response.ok) {
        return { error: data.error || 'Failed to send OTP code' };
      }
      return { error: null };
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { error: err.message || 'Connection error' };
      }
      return { error: 'Connection error' };
    }
  };

  const resetPasswordLogin = async (
    email: string,
    otp: string,
    newPassword?: string
  ): Promise<{ error: string | null }> => {
    try {
      const response = await fetch('/api/auth/reset-password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp,
          newPassword: newPassword ? newPassword : undefined
        }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Server returned an invalid response.' };
      }
      
      if (!response.ok) {
        return { error: data.error || 'Authentication failed' };
      }

      localStorage.setItem('auth_token', data.token);
      setPendingVerificationEmail(null);
      localStorage.removeItem('pending_verification_email');
      
      const loggedUser: AuthUser = { uid: data.user.id, email: data.user.email };
      setAuthUser(loggedUser);
      setIsAuthenticated(true);
      
      let fetchedProfile = await fetchProfile(loggedUser.uid);
      if (!fetchedProfile) {
        fetchedProfile = {
          email: loggedUser.email,
          phone: '',
          patientRecord: createEmptyPatientRecord(loggedUser.uid),
          privacySettings: DEFAULT_PRIVACY_SETTINGS,
          notifications: []
        };
      }
      setUser(fetchedProfile);

      const completed = await getOnboardingComplete(loggedUser.uid);
      setOnboardingCompleteState(completed);

      return { error: null };
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { error: err.message || 'Authentication error' };
      }
      return { error: 'Authentication error' };
    }
  };

  const completeOnboarding = async () => {
    if (authUser) {
      await setOnboardingComplete(authUser.uid);
      setOnboardingCompleteState(true);
    }
  };

  const logout = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('pending_verification_email');
    setAuthUser(null);
    setIsAuthenticated(false);
    setUser(null);
    setOnboardingCompleteState(false);
    setPendingVerificationEmail(null);
  };

  const updatePatientRecord = (record: Partial<PatientRecord>) => {
    shouldSyncRef.current = true;
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, patientRecord: { ...prev.patientRecord, ...record } };
    });
  };

  const updatePrivacySettings = (settings: Partial<PrivacySettings>) => {
    shouldSyncRef.current = true;
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, privacySettings: { ...prev.privacySettings, ...settings } };
    });
  };

  const addMedication = (med: Medication) => {
    shouldSyncRef.current = true;
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        patientRecord: {
          ...prev.patientRecord,
          medications: [...prev.patientRecord.medications, med],
        },
      };
    });
  };

  const removeMedication = (index: number) => {
    shouldSyncRef.current = true;
    setUser((prev) => {
      if (!prev) return null;
      const medications = [...prev.patientRecord.medications];
      medications.splice(index, 1);
      return { ...prev, patientRecord: { ...prev.patientRecord, medications } };
    });
  };

  const addContact = (contact: EmergencyContact) => {
    shouldSyncRef.current = true;
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        patientRecord: {
          ...prev.patientRecord,
          contacts: [...prev.patientRecord.contacts, contact],
        },
      };
    });
  };

  const removeContact = (index: number) => {
    shouldSyncRef.current = true;
    setUser((prev) => {
      if (!prev) return null;
      const contacts = [...prev.patientRecord.contacts];
      contacts.splice(index, 1);
      return { ...prev, patientRecord: { ...prev.patientRecord, contacts } };
    });
  };

  const addCondition = (cond: ConditionAllergyItem) => {
    shouldSyncRef.current = true;
    setUser((prev) => {
      if (!prev) return null;
      if (prev.patientRecord.conditions.some((c) => c.name.toLowerCase() === cond.name.toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        patientRecord: {
          ...prev.patientRecord,
          conditions: [...prev.patientRecord.conditions, cond],
        },
      };
    });
  };

  const removeCondition = (name: string) => {
    shouldSyncRef.current = true;
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        patientRecord: {
          ...prev.patientRecord,
          conditions: prev.patientRecord.conditions.filter((c) => c.name !== name),
        },
      };
    });
  };

  const addAllergy = (allergy: ConditionAllergyItem) => {
    shouldSyncRef.current = true;
    setUser((prev) => {
      if (!prev) return null;
      if (prev.patientRecord.allergies.some((a) => a.name.toLowerCase() === allergy.name.toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        patientRecord: {
          ...prev.patientRecord,
          allergies: [...prev.patientRecord.allergies, allergy],
        },
      };
    });
  };

  const removeAllergy = (name: string) => {
    shouldSyncRef.current = true;
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        patientRecord: {
          ...prev.patientRecord,
          allergies: prev.patientRecord.allergies.filter((a) => a.name !== name),
        },
      };
    });
  };

  const addDocument = (doc: Omit<MedicalDocument, 'id' | 'date'>) => {
    shouldSyncRef.current = true;
    setUser((prev) => {
      if (!prev) return null;
      const newDoc: MedicalDocument = {
        ...doc,
        id: `doc-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
      };
      return {
        ...prev,
        patientRecord: {
          ...prev.patientRecord,
          documents: [newDoc, ...prev.patientRecord.documents],
        },
      };
    });
  };

  const removeDocument = (id: string) => {
    shouldSyncRef.current = true;
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        patientRecord: {
          ...prev.patientRecord,
          documents: prev.patientRecord.documents.filter((d) => d.id !== id),
        },
      };
    });
  };

  const markNotificationsAsRead = () => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, unread: false })),
      };
    });
  };

  const regenerateQrData = () => {
    if (user?.patientRecord.qrId) {
      syncRecordToDb(user.patientRecord.qrId, user.patientRecord, user.privacySettings);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authLoading,
        onboardingComplete,
        user,
        authUser,
        signUp,
        resendVerificationEmail,
        checkEmailVerificationStatus,
        verifyOtp,
        resendOtp,
        signIn,
        sendResetOtp,
        resetPasswordLogin,
        completeOnboarding,
        logout,
        updatePatientRecord,
        updatePrivacySettings,
        addMedication,
        removeMedication,
        addContact,
        removeContact,
        addCondition,
        removeCondition,
        addAllergy,
        removeAllergy,
        addDocument,
        removeDocument,
        markNotificationsAsRead,
        regenerateQrData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
