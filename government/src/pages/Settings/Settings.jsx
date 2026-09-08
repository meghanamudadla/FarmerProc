import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { CROPS } from '../../data/mockData';

const TABS = [
  { key: 'crops', label: '🌾 Crop Config', icon: '🌾' },
  { key: 'rules', label: '📏 Procurement Rules', icon: '📏' },
  { key: 'thresholds', label: '⚡ Thresholds', icon: '⚡' },
  { key: 'users', label: '👤 User Roles', icon: '👤' },
];

const QUALITY_RULES = [
  { param: 'Moisture %', wheat: '≤12.0', paddy: '≤14.0' },
  { param: 'Foreign Matter %', wheat: '≤0.75', paddy: '≤2.0' },
  { param: 'Damaged Grains %', wheat: '≤2.0', paddy: '≤5.0' },
  { param: 'Slightly Damaged %', wheat: '≤4.0', paddy: '≤5.0' },
  { param: 'Shrivelled/Broken %', wheat: '≤6.0', paddy: '≤5.0' },
  { param: 'Other Grains %', wheat: '≤2.0', paddy: '≤3.0' },
  { param: 'Weevilled Grains %', wheat: '≤1.0', paddy: '≤1.0' },
];

const THRESHOLDS = [
  { name: 'Queue Congestion', value: 40, unit: 'farmers', desc: 'Queue length to trigger congestion alert' },
  { name: 'Wait Time Warning', value: 90, unit: 'minutes', desc: 'Wait time to trigger warning alert' },
  { name: 'Storage Capacity', value: 85, unit: '%', desc: 'Storage threshold for capacity alert' },
  { name: 'Rejection Rate', value: 10, unit: '%', desc: 'Max rejection rate before alert triggers' },
  { name: 'Payment Delay', value: 24, unit: 'hours', desc: 'Hours after which pending payment triggers alert' },
  { name: 'Auto-Escalation', value: 30, unit: 'minutes', desc: 'Unacknowledged critical alert escalation time' },
];

const USERS = [
  { name: 'Rajesh Mehta', email: 'rajesh.m@gov.in', role: 'State Admin', status: 'active' },
  { name: 'Priya Sharma', email: 'priya.s@gov.in', role: 'District Admin (Karnal)', status: 'active' },
  { name: 'Anand Rao', email: 'anand.r@gov.in', role: 'District Admin (Krishna)', status: 'active' },
  { name: 'Meena K.', email: 'meena.k@gov.in', role: 'Department Auditor', status: 'active' },
  { name: 'Vikram Singh', email: 'vikram.s@gov.in', role: 'State Admin', status: 'active' },
];

export default function Settings() {
  const { canConfigure } = useAuth();
  const [activeTab, setActiveTab] = useState('crops');

  if (!canConfigure) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="text-4xl">🔒</span>
          <p className="text-text-muted mt-2">Settings are restricted to State Admin role</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">🛠️ System Configuration</h1>
        <p className="text-xs text-text-muted mt-0.5">Manage crops, rules, thresholds, and user access</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-accent-blue text-white' : 'text-text-secondary hover:bg-bg-hover'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Crop Config */}
      {activeTab === 'crops' && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Crop Types & MSP Rates</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-2 text-xs text-text-muted uppercase">Crop</th>
                  <th className="text-left px-4 py-2 text-xs text-text-muted uppercase">ID</th>
                  <th className="text-right px-4 py-2 text-xs text-text-muted uppercase">MSP (₹/qtl)</th>
                </tr>
              </thead>
              <tbody>
                {CROPS.map(c => (
                  <tr key={c.id} className="border-b border-gray-800/50 hover:bg-bg-hover">
                    <td className="px-4 py-2 text-text-primary">{c.name}</td>
                    <td className="px-4 py-2 text-text-muted font-tabular">{c.id}</td>
                    <td className="px-4 py-2 text-right font-tabular font-bold text-text-primary">₹{c.msp.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Procurement Rules */}
      {activeTab === 'rules' && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Quality Parameter Limits</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-2 text-xs text-text-muted uppercase">Parameter</th>
                <th className="text-center px-4 py-2 text-xs text-text-muted uppercase">Wheat Limit</th>
                <th className="text-center px-4 py-2 text-xs text-text-muted uppercase">Paddy Limit</th>
              </tr>
            </thead>
            <tbody>
              {QUALITY_RULES.map(r => (
                <tr key={r.param} className="border-b border-gray-800/50 hover:bg-bg-hover">
                  <td className="px-4 py-2 text-text-primary">{r.param}</td>
                  <td className="px-4 py-2 text-center font-tabular">{r.wheat}</td>
                  <td className="px-4 py-2 text-center font-tabular">{r.paddy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Thresholds */}
      {activeTab === 'thresholds' && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Alert & Operational Thresholds</h3>
          <div className="space-y-3">
            {THRESHOLDS.map(t => (
              <div key={t.name} className="flex items-center justify-between p-3 rounded-lg bg-bg-primary border border-gray-800">
                <div>
                  <div className="text-sm text-text-primary">{t.name}</div>
                  <div className="text-xs text-text-muted">{t.desc}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" defaultValue={t.value}
                    className="w-20 bg-bg-card border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-text-primary font-tabular text-center focus:outline-none focus:border-accent-blue" />
                  <span className="text-xs text-text-muted">{t.unit}</span>
                </div>
              </div>
            ))}
            <button className="mt-4 bg-accent-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-blue/80">Save Changes</button>
          </div>
        </motion.div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">User & Role Management</h3>
          <div className="space-y-2">
            {USERS.map(u => (
              <div key={u.email} className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-hover">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue/30 to-accent-purple/30 flex items-center justify-center text-xs font-bold text-text-primary">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm text-text-primary">{u.name}</div>
                    <div className="text-xs text-text-muted">{u.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    u.role.includes('State') ? 'bg-accent-purple/15 text-accent-purple' :
                    u.role.includes('District') ? 'bg-accent-blue/15 text-accent-blue' :
                    'bg-accent-emerald/15 text-accent-emerald'
                  }`}>{u.role}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-status-normal/15 text-status-normal">Active</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
