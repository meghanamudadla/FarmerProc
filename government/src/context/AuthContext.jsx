import React, { createContext, useContext, useState, useCallback } from 'react';
import { loginRequest, setToken, getToken } from '../api/api';

const AuthContext = createContext(null);

// Quick-access role presets shown on the login screen. The backend only has a
// single seeded government account (phone 9000000002 / ADMIN role), which has
// super-user access to every role-gated endpoint. All three presets authenticate
// against that same account and receive a real JWT; the role label below only
// drives which parts of this UI are shown (State Admin sees everything,
// District Admin / Auditor are scoped views of the same underlying account).
const DEMO_USERS = {
  state_admin: { id: 'u1', name: 'Rajesh Mehta', role: 'State Admin', email: 'rajesh.m@gov.in', district: null },
  district_admin: { id: 'u2', name: 'Priya Sharma', role: 'District Admin', email: 'priya.s@gov.in', district: 'd1' },
  auditor: { id: 'u3', name: 'Meena K.', role: 'Department Auditor', email: 'meena.k@gov.in', district: null },
};

const DEMO_ADMIN_PHONE = '9000000002';
const DEMO_ADMIN_PASSWORD = 'password123';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('farmerproc_gov_user');
      // Only treat the session as logged in if we also still have a token.
      return saved && getToken() ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const persistUser = (u) => {
    setUser(u);
    try {
      localStorage.setItem('farmerproc_gov_user', JSON.stringify(u));
    } catch (e) {
      console.error('Failed to save auth state to localStorage:', e);
    }
  };

  // roleKey: one of the DEMO_USERS keys for "quick access" login.
  // customCredentials: { officerId, password, role, email } for the credentials form.
  const login = useCallback(async (roleKey, customCredentials = null) => {
    const phone = customCredentials?.officerId?.trim() || DEMO_ADMIN_PHONE;
    const password = customCredentials?.password || DEMO_ADMIN_PASSWORD;

    let tokenData;
    try {
      tokenData = await loginRequest(phone, password);
    } catch (err) {
      console.error('Login failed:', err.message);
      return { success: false, error: err.message || 'Authentication failed.' };
    }

    setToken(tokenData.access_token);

    let u = roleKey ? DEMO_USERS[roleKey] : null;
    if (!u) {
      u = {
        id: 'u_' + Date.now(),
        name: customCredentials?.name || customCredentials?.officerId || 'Government Official',
        role: customCredentials?.role || 'District Admin',
        email: customCredentials?.email || 'official@gov.in',
        district: customCredentials?.district || null,
      };
    }

    persistUser(u);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem('farmerproc_gov_user');
    } catch (e) {
      console.error('Failed to clear auth state from localStorage:', e);
    }
  }, []);

  const isStateAdmin = user?.role === 'State Admin';
  const isDistrictAdmin = user?.role === 'District Admin';
  const isAuditor = user?.role === 'Department Auditor';
  const canControl = isStateAdmin || isDistrictAdmin;
  const canConfigure = isStateAdmin;

  return (
    <AuthContext.Provider value={{ user, login, logout, isStateAdmin, isDistrictAdmin, isAuditor, canControl, canConfigure }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
