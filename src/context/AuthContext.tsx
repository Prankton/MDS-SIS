import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { Role, UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile;
  role: Role;
  setRole: (role: Role) => void;
  setMdName: (name: string) => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => void;
  isOnline: boolean;
  simulateOffline: boolean;
  setSimulateOffline: (val: boolean) => void;
  hasAcknowledgedMdsNotice: boolean;
  acknowledgeMdsNotice: () => void;
  resetMdsNotice: () => void;
}

const DEFAULT_MD_PROFILE: UserProfile = {
  uid: 'md-user-01',
  email: 'md.field@mdsys.internal',
  displayName: 'Budi Santoso',
  role: 'merchandiser',
  mdCode: 'MD-01'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>(() => {
    return (localStorage.getItem('mdsys_role') as Role) || 'merchandiser';
  });
  
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('mdsys_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_MD_PROFILE;
      }
    }
    return DEFAULT_MD_PROFILE;
  });

  const [hasAcknowledgedMdsNotice, setHasAcknowledgedMdsNotice] = useState<boolean>(() => {
    return sessionStorage.getItem('mdsys_notice_acked') === 'true';
  });

  // Network online status
  const [realOnline, setRealOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulateOffline, setSimulateOfflineState] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setRealOnline(true);
    const handleOffline = () => setRealOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const isAdminEmail = user.email === 'SukaMulyaPtk@gmail.com' || user.email?.includes('admin');
        const assignedRole: Role = isAdminEmail ? 'admin' : role;
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          role: assignedRole,
          mdCode: assignedRole === 'merchandiser' ? 'MD-01' : undefined
        };
        setUserProfile(profile);
        setRoleState(assignedRole);
        localStorage.setItem('mdsys_profile', JSON.stringify(profile));
        localStorage.setItem('mdsys_role', assignedRole);
      }
    });

    return () => unsubscribe();
  }, [role]);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem('mdsys_role', newRole);
    setUserProfile(prev => {
      const updated = {
        ...prev,
        role: newRole,
        displayName: newRole === 'admin' ? (prev.displayName || 'Administrator') : (prev.displayName || 'Budi Santoso (MD)')
      };
      localStorage.setItem('mdsys_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const setMdName = (name: string) => {
    setUserProfile(prev => {
      const updated = { ...prev, displayName: name };
      localStorage.setItem('mdsys_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.warn('Google sign in canceled or error:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Signout error:', e);
    }
    setCurrentUser(null);
    setUserProfile(DEFAULT_MD_PROFILE);
    setRole('merchandiser');
  };

  const acknowledgeMdsNotice = () => {
    setHasAcknowledgedMdsNotice(true);
    sessionStorage.setItem('mdsys_notice_acked', 'true');
  };

  const resetMdsNotice = () => {
    setHasAcknowledgedMdsNotice(false);
    sessionStorage.removeItem('mdsys_notice_acked');
  };

  const isOnline = realOnline && !simulateOffline;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role,
        setRole,
        setMdName,
        signInWithGoogle,
        logout,
        isOnline,
        simulateOffline,
        setSimulateOffline: setSimulateOfflineState,
        hasAcknowledgedMdsNotice,
        acknowledgeMdsNotice,
        resetMdsNotice
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
