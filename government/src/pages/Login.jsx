import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { key: 'state_admin', label: 'State Admin', desc: 'Full access, all districts, system configuration', icon: '🏛️', color: 'from-purple-500/20 to-purple-900/20 border-purple-500/30' },
  { key: 'district_admin', label: 'District Admin', desc: 'Scoped access to Karnal district procurement centers', icon: '🏢', color: 'from-blue-500/20 to-blue-900/20 border-blue-500/30' },
  { key: 'auditor', label: 'Department Auditor', desc: 'Read-only access for compliance, analytics & reports', icon: '📊', color: 'from-emerald-500/20 to-emerald-900/20 border-emerald-500/30' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('quick'); // 'quick' | 'credentials'
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form state for official login
  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  const [roleSelect, setRoleSelect] = useState('state_admin');

  const handleQuickLogin = (key) => {
    setSelectedRole(key);
    setLoading(true);
    setErrorMessage('');
    setTimeout(() => {
      const success = login(key);
      if (success) {
        navigate('/dashboard');
      } else {
        setErrorMessage('Failed to authenticate role session.');
        setLoading(false);
      }
    }, 350);
  };

  const handleCredentialsLogin = (e) => {
    e.preventDefault();
    if (!officerId.trim() || !password.trim()) {
      setErrorMessage('Please enter both Officer ID/Email and password.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setTimeout(() => {
      const roleObj = ROLES.find(r => r.key === roleSelect);
      const success = login(null, {
        officerId: officerId.trim(),
        role: roleObj ? roleObj.label : 'District Admin',
        email: officerId.includes('@') ? officerId.trim() : `${officerId.trim()}@gov.in`,
      });
      if (success) {
        navigate('/dashboard');
      } else {
        setErrorMessage('Authentication failed. Please check credentials.');
        setLoading(false);
      }
    }, 450);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Subtle Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-blue/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue via-indigo-600 to-accent-purple mx-auto mb-4 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl shadow-accent-blue/25 border border-white/10">
            🏛️
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">FarmerProc</h1>
          <p className="text-xs uppercase tracking-widest font-semibold text-accent-blue mt-1">Government Command Center</p>
          <p className="text-xs text-text-muted mt-1">Procurement Monitoring & Operations Portal</p>
        </div>

        {/* Card Box */}
        <div className="bg-bg-secondary/90 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 shadow-2xl">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-bg-primary p-1 rounded-xl border border-gray-800/80 mb-6">
            <button
              type="button"
              onClick={() => { setTab('quick'); setErrorMessage(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'quick'
                  ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              ⚡ Quick Role Access
            </button>
            <button
              type="button"
              onClick={() => { setTab('credentials'); setErrorMessage(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'credentials'
                  ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              🔐 Officer ID Login
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 bg-severity-critical/10 border border-severity-critical/30 text-severity-critical text-xs rounded-xl text-center font-medium"
            >
              ⚠️ {errorMessage}
            </motion.div>
          )}

          {/* Tab 1: Quick Role Selection */}
          {tab === 'quick' && (
            <div className="space-y-3">
              <p className="text-[11px] text-text-muted uppercase tracking-wider text-center mb-3">
                Select Designation Profile
              </p>
              {ROLES.map((role, i) => (
                <motion.button
                  key={role.key}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  disabled={loading}
                  onClick={() => handleQuickLogin(role.key)}
                  className={`w-full text-left p-3.5 rounded-xl border bg-gradient-to-r transition-all duration-200 ${role.color} ${
                    selectedRole === role.key ? 'ring-2 ring-accent-blue shadow-lg shadow-accent-blue/20' : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl flex-shrink-0">{role.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text-primary flex items-center justify-between">
                        <span>{role.label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-text-secondary border border-white/5 font-mono">
                          {role.key}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted truncate mt-0.5">{role.desc}</div>
                    </div>
                    {selectedRole === role.key && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-accent-blue flex items-center justify-center text-white text-xs font-bold"
                      >
                        ✓
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Tab 2: Credentials Login */}
          {tab === 'credentials' && (
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Officer ID / Govt Email *</label>
                <input
                  type="text"
                  required
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  placeholder="e.g. GOV-KR-8421 or rajesh.m@gov.in"
                  className="w-full px-3.5 py-2.5 bg-bg-primary border border-gray-800 rounded-xl text-sm text-text-primary placeholder:text-gray-600 focus:outline-none focus:border-accent-blue transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Password / Passcode *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-bg-primary border border-gray-800 rounded-xl text-sm text-text-primary placeholder:text-gray-600 focus:outline-none focus:border-accent-blue transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Assigned Designation Scope</label>
                <select
                  value={roleSelect}
                  onChange={(e) => setRoleSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-primary border border-gray-800 rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                >
                  <option value="state_admin">🏛️ State Admin (Full Scope)</option>
                  <option value="district_admin">🏢 District Admin (District Scope)</option>
                  <option value="auditor">📊 Department Auditor (Read-only Compliance)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold text-sm rounded-xl shadow-lg shadow-accent-blue/20 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Authenticating Session...
                  </>
                ) : (
                  <>
                    Sign In to Portal →
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Security Badges */}
          <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
              AgriStack Auth Service
            </span>
            <span>NIC SSL Secured</span>
          </div>
        </div>

        {/* Demo note */}
        <p className="text-[11px] text-text-muted text-center mt-6">
          FarmerProc Government Portal — Protected State Level Procurement Console
        </p>
      </motion.div>
    </div>
  );
}

