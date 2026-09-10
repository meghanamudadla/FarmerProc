import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Sprout,
  Building2,
  Lock,
  UserCheck,
  Scale,
  FlaskConical,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  MapPin,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import './Login.css';

export default function Login() {
  const { quickLogin, loginWithCredentials, ROLE_PROFILES, CENTERS, center, setCenter } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromPath = location.state?.from?.pathname || '/dashboard';

  const [tab, setTab] = useState('quick'); // 'quick' | 'credentials'
  const [selectedCenterId, setSelectedCenterId] = useState(center?.id || CENTERS[0].id);
  const [selectedRoleKey, setSelectedRoleKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Credentials form state
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [roleSelect, setRoleSelect] = useState('manager');

  const handleCenterChange = (e) => {
    const centerId = e.target.value;
    setSelectedCenterId(centerId);
    const found = CENTERS.find((c) => c.id === centerId);
    if (found) setCenter(found);
  };

  const handleQuickLogin = (roleKey) => {
    setSelectedRoleKey(roleKey);
    setLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      try {
        const success = quickLogin(roleKey, selectedCenterId);
        if (success) {
          navigate(fromPath, { replace: true });
        } else {
          setErrorMessage('Station authentication failed. Please try again.');
          setLoading(false);
        }
      } catch (err) {
        setErrorMessage(err.message || 'An error occurred during quick station login.');
        setLoading(false);
      }
    }, 400);
  };

  const handleCredentialsLogin = (e) => {
    e.preventDefault();
    if (!staffId.trim() || !password.trim()) {
      setErrorMessage('Please provide both Staff ID / Email and Password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      try {
        const success = loginWithCredentials({
          staffId: staffId.trim(),
          password: password.trim(),
          roleKey: roleSelect,
          centerId: selectedCenterId,
        });

        if (success) {
          navigate(fromPath, { replace: true });
        } else {
          setErrorMessage('Invalid Staff ID or Password.');
          setLoading(false);
        }
      } catch (err) {
        setErrorMessage(err.message || 'Authentication system error.');
        setLoading(false);
      }
    }, 500);
  };

  const getRoleIcon = (key) => {
    switch (key) {
      case 'manager':
        return <UserCheck size={20} className="text-emerald-400" />;
      case 'weighbridge':
        return <Scale size={20} className="text-blue-400" />;
      case 'quality':
        return <FlaskConical size={20} className="text-purple-400" />;
      case 'cashier':
        return <CreditCard size={20} className="text-amber-400" />;
      default:
        return <UserCheck size={20} />;
    }
  };

  return (
    <div className="login-container">
      {/* Glow Effects */}
      <div className="login-glow-1" />
      <div className="login-glow-2" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="login-card-wrapper"
      >
        {/* Header Logo & Title */}
        <div className="login-brand-header">
          <div className="login-brand-icon">
            <Sprout size={32} />
          </div>
          <h1 className="login-title">AgroProcure</h1>
          <span className="login-subtitle-tag">Center Operations Console</span>
          <p className="login-desc">Govt Procurement Center Staff & Weighbridge Portal</p>
        </div>

        {/* Login Main Card */}
        <div className="login-card">
          {/* Operating Mandi / Center Location Selector */}
          <div className="center-select-box">
            <div className="center-select-label">
              <MapPin size={12} />
              <span>Assigned Operating Procurement Center</span>
            </div>
            <select
              value={selectedCenterId}
              onChange={handleCenterChange}
              className="center-select-input"
            >
              {CENTERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id}) — {c.district}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="login-tabs">
            <button
              type="button"
              onClick={() => {
                setTab('quick');
                setErrorMessage('');
              }}
              className={`login-tab-btn ${tab === 'quick' ? 'active' : ''}`}
            >
              <UserCheck size={15} />
              <span>Station Quick Access</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('credentials');
                setErrorMessage('');
              }}
              className={`login-tab-btn ${tab === 'credentials' ? 'active' : ''}`}
            >
              <KeyRound size={15} />
              <span>Staff ID Login</span>
            </button>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="error-alert"
              >
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab 1: Quick Station Access */}
          {tab === 'quick' && (
            <div className="quick-roles-list">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider text-center mb-1">
                Select Station Operator Profile
              </p>

              {ROLE_PROFILES.map((profile, idx) => {
                const isSelected = selectedRoleKey === profile.key;
                return (
                  <motion.button
                    key={profile.key}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    disabled={loading}
                    onClick={() => handleQuickLogin(profile.key)}
                    className={`role-card-btn ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="role-icon-box">{profile.icon}</div>
                    <div className="role-info">
                      <div className="role-label-header">
                        <span className="role-title-text">{profile.label}</span>
                        <span className="role-key-badge">{profile.defaultName}</span>
                      </div>
                      <div className="role-desc-text">{profile.desc}</div>
                    </div>
                    {isSelected && loading ? (
                      <div className="spinner-icon" />
                    ) : isSelected ? (
                      <CheckCircle2 size={20} className="text-emerald-400" />
                    ) : (
                      <ArrowRight size={16} className="text-slate-500 opacity-60" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Tab 2: Staff Credentials Login */}
          {tab === 'credentials' && (
            <form onSubmit={handleCredentialsLogin} className="credentials-form">
              <div className="form-group">
                <label className="form-label">
                  <UserCheck size={14} />
                  Staff / Officer ID *
                </label>
                <div className="form-input-wrapper">
                  <UserCheck size={16} className="form-input-icon" />
                  <input
                    type="text"
                    required
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="e.g. CN-KAR-8842 or rajesh.s"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={14} />
                  Password *
                </label>
                <div className="form-input-wrapper">
                  <Lock size={16} className="form-input-icon" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Building2 size={14} />
                  Assigned Operator Role
                </label>
                <div className="form-input-wrapper">
                  <Building2 size={16} className="form-input-icon" />
                  <select
                    value={roleSelect}
                    onChange={(e) => setRoleSelect(e.target.value)}
                    className="form-input form-select"
                  >
                    {ROLE_PROFILES.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.icon} {p.label} — {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading} className="submit-login-btn">
                {loading ? (
                  <>
                    <div className="spinner-icon" />
                    <span>Authenticating Station Session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Station Console</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Security Badge */}
          <div className="login-footer-security">
            <div className="security-badge">
              <span className="online-dot" />
              <span>Center Auth Active</span>
            </div>
            <div className="security-badge">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>256-bit Encrypted Mandi Console</span>
            </div>
          </div>
        </div>

        <p className="login-demo-notice">
          AgroProcure Center Console • National Agriculture Market (eNAM) Integration
        </p>
      </motion.div>
    </div>
  );
}
