import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { key: 'state_admin', label: 'State Admin', desc: 'Full access, all districts, system config', icon: '🏛️', color: 'from-purple-500/20 to-purple-900/20 border-purple-500/30' },
  { key: 'district_admin', label: 'District Admin', desc: 'Scoped to Karnal district centers', icon: '🏢', color: 'from-blue-500/20 to-blue-900/20 border-blue-500/30' },
  { key: 'auditor', label: 'Department Auditor', desc: 'Read-only analytics & reports', icon: '📊', color: 'from-emerald-500/20 to-emerald-900/20 border-emerald-500/30' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleLogin = (key) => {
    setSelected(key);
    setTimeout(() => {
      login(key);
      navigate('/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple mx-auto mb-4 flex items-center justify-center text-2xl font-bold shadow-lg shadow-accent-blue/20">
            G
          </div>
          <h1 className="text-2xl font-bold text-text-primary">AgroProcure</h1>
          <p className="text-sm text-text-muted mt-1">Government Command Center</p>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mt-6" />
        </div>

        {/* Role cards */}
        <div className="space-y-3">
          <p className="text-xs text-text-muted uppercase tracking-wider text-center mb-4">Select your role to continue</p>
          {ROLES.map((role, i) => (
            <motion.button
              key={role.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleLogin(role.key)}
              className={`w-full text-left p-4 rounded-xl border bg-gradient-to-r transition-all duration-300 ${role.color} ${
                selected === role.key ? 'ring-2 ring-accent-blue shadow-lg shadow-accent-blue/20' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{role.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-text-primary">{role.label}</div>
                  <div className="text-xs text-text-secondary mt-0.5">{role.desc}</div>
                </div>
                {selected === role.key && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto w-6 h-6 rounded-full bg-accent-blue flex items-center justify-center text-white text-xs"
                  >
                    ✓
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        <p className="text-[11px] text-text-muted text-center mt-8">
          Demo mode — select any role to explore the portal
        </p>
      </motion.div>
    </div>
  );
}
