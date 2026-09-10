import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const DEFAULT_USER = {
  id: 'STAFF-8842',
  name: 'Rajesh Sharma',
  role: 'Center Manager',
  roleKey: 'manager',
  centerId: 'CN-KAR-01',
  centerName: 'Karnal Main Mandi Center',
  district: 'Karnal',
  email: 'rajesh.sharma@agroprocure.gov.in',
  avatar: '👨‍💼',
};

export const ROLE_PROFILES = [
  {
    key: 'manager',
    label: 'Center Manager',
    title: 'Procurement Center Supervisor',
    desc: 'Full operational control over live queue, capacity, & exceptions',
    icon: '👨‍💼',
    defaultName: 'Rajesh Sharma',
    badgeClass: 'badge-manager',
  },
  {
    key: 'weighbridge',
    label: 'Weighing Officer',
    title: 'Weighbridge Operations Officer',
    desc: 'Gross weight & tare weight verification at incoming bay',
    icon: '⚖️',
    defaultName: 'Amit Kumar',
    badgeClass: 'badge-weighbridge',
  },
  {
    key: 'quality',
    label: 'Quality Inspector',
    title: 'Crop Grade & Quality Assessor',
    desc: 'Moisture, foreign matter, & MSP quality grading station',
    icon: '🔬',
    defaultName: 'Dr. Sunita Verma',
    badgeClass: 'badge-quality',
  },
  {
    key: 'cashier',
    label: 'Accounts Officer',
    title: 'Disbursal & Payment Clearance',
    desc: 'Direct Bank Transfer (DBT) verification & payment release',
    icon: '💳',
    defaultName: 'Vikram Mehta',
    badgeClass: 'badge-cashier',
  },
];

export const CENTERS = [
  { id: 'CN-KAR-01', name: 'Karnal Main Mandi Center', district: 'Karnal', state: 'Haryana' },
  { id: 'CN-PAN-02', name: 'Panipat Grain Hub', district: 'Panipat', state: 'Haryana' },
  { id: 'CN-AMB-03', name: 'Ambala Procurement Center', district: 'Ambala', state: 'Haryana' },
  { id: 'CN-HIS-04', name: 'Hisar Mandi Terminal', district: 'Hisar', state: 'Haryana' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('center_app_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved auth user:', e);
    }
    // Default logged in user for seamless demo if needed, or set to null
    return DEFAULT_USER;
  });

  const [center, setCenter] = useState(() => {
    try {
      const saved = localStorage.getItem('center_app_info');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse center info:', e);
    }
    return CENTERS[0];
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('center_app_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('center_app_user');
    }
  }, [user]);

  useEffect(() => {
    if (center) {
      localStorage.setItem('center_app_info', JSON.stringify(center));
    }
  }, [center]);

  const quickLogin = (roleKey, customCenterId = null) => {
    const profile = ROLE_PROFILES.find((r) => r.key === roleKey) || ROLE_PROFILES[0];
    const selectedCenter = CENTERS.find((c) => c.id === customCenterId) || center || CENTERS[0];

    const newUser = {
      id: `STAFF-${Math.floor(1000 + Math.random() * 9000)}`,
      name: profile.defaultName,
      role: profile.label,
      roleKey: profile.key,
      centerId: selectedCenter.id,
      centerName: selectedCenter.name,
      district: selectedCenter.district,
      email: `${profile.key}@agroprocure.gov.in`,
      avatar: profile.icon,
      loggedAt: new Date().toISOString(),
    };

    setUser(newUser);
    setCenter(selectedCenter);
    return true;
  };

  const loginWithCredentials = ({ staffId, password, roleKey, centerId }) => {
    const profile = ROLE_PROFILES.find((r) => r.key === roleKey) || ROLE_PROFILES[0];
    const selectedCenter = CENTERS.find((c) => c.id === centerId) || CENTERS[0];

    const nameFromId = staffId.includes('@')
      ? staffId.split('@')[0].replace('.', ' ').toUpperCase()
      : `Officer ${staffId.toUpperCase()}`;

    const newUser = {
      id: staffId.toUpperCase(),
      name: nameFromId,
      role: profile.label,
      roleKey: profile.key,
      centerId: selectedCenter.id,
      centerName: selectedCenter.name,
      district: selectedCenter.district,
      email: staffId.includes('@') ? staffId : `${staffId.toLowerCase()}@agroprocure.gov.in`,
      avatar: profile.icon,
      loggedAt: new Date().toISOString(),
    };

    setUser(newUser);
    setCenter(selectedCenter);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('center_app_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        center,
        isAuthenticated: !!user,
        quickLogin,
        loginWithCredentials,
        logout,
        setCenter,
        ROLE_PROFILES,
        CENTERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
