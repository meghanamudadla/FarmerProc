import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const DEMO_USERS = {
  state_admin: { id: 'u1', name: 'Rajesh Mehta', role: 'State Admin', email: 'rajesh.m@gov.in', district: null },
  district_admin: { id: 'u2', name: 'Priya Sharma', role: 'District Admin', email: 'priya.s@gov.in', district: 'd1' },
  auditor: { id: 'u3', name: 'Meena K.', role: 'Department Auditor', email: 'meena.k@gov.in', district: null },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = useCallback((roleKey) => {
    const u = DEMO_USERS[roleKey];
    if (u) setUser(u);
    return !!u;
  }, []);

  const logout = useCallback(() => setUser(null), []);

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
