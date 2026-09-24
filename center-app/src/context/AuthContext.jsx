import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:8000";

const DEFAULT_USER = {
  id: 'STAFF-8842',
  name: 'Mandi Console Operator',
  role: 'Center Manager',
  roleKey: 'manager',
  centerId: 1,
  centerName: 'Kakinada APMC Mandi Center',
  district: 'East Godavari',
  email: 'operator@agroprocure.gov.in',
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
  { id: 1, name: 'Kakinada APMC Mandi Center', district: 'East Godavari', state: 'Andhra Pradesh' },
  { id: 2, name: 'Godavari Green Centre', district: 'East Godavari', state: 'Andhra Pradesh' },
  { id: 3, name: 'Krishna Delta Purchase Point', district: 'NTR District', state: 'Andhra Pradesh' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('center_app_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved auth user:', e);
    }
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

  // Acquire real JWT access token from FastAPI backend
  const fetchOperatorToken = async (phone = "9000000001", password = "password123") => {
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/+$/, "")}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem("access_token", data.access_token);
          sessionStorage.setItem("access_token", data.access_token);
          return data.access_token;
        }
      }
    } catch (err) {
      console.warn("Could not acquire JWT token for center console:", err);
    }
    return null;
  };

  // Ensure valid token exists if user is authenticated
  useEffect(() => {
    const existingToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (user && !existingToken) {
      fetchOperatorToken();
    }
  }, [user]);

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

  const quickLogin = async (roleKey, customCenterId = null) => {
    const profile = ROLE_PROFILES.find((r) => r.key === roleKey) || ROLE_PROFILES[0];
    const selectedCenter = CENTERS.find((c) => c.id === customCenterId) || center || CENTERS[0];

    // Authenticate with center operator credentials to obtain valid JWT
    await fetchOperatorToken("9000000001", "password123");

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

  const loginWithCredentials = async ({ staffId, password, roleKey, centerId }) => {
    const profile = ROLE_PROFILES.find((r) => r.key === roleKey) || ROLE_PROFILES[0];
    const selectedCenter = CENTERS.find((c) => c.id === centerId) || CENTERS[0];

    // If staffId is phone number, use it; otherwise use the center operator account
    const phoneToUse = /^\d{10}$/.test(staffId) ? staffId : "9000000001";
    const passToUse = password || "password123";
    await fetchOperatorToken(phoneToUse, passToUse);

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
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
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
