import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/centers', label: 'Centers', icon: '🏢' },
  { path: '/map', label: 'Map View', icon: '🗺️' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
  { path: '/forecast', label: 'Congestion Trends', icon: '📈' },
  { path: '/alerts', label: 'Alerts', icon: '🚨' },
  { path: '/farmers', label: 'Farmers', icon: '👨‍🌾' },
  { path: '/center-management', label: 'Center Mgmt', icon: '⚙️', controlOnly: true },
  { path: '/payments', label: 'Payments', icon: '💰' },
  { path: '/reports', label: 'Reports', icon: '📄' },
  { path: '/grievances', label: 'Grievances', icon: '📋' },
  { path: '/audit-log', label: 'Audit Log', icon: '🔒' },
  { path: '/settings', label: 'Settings', icon: '🛠️', adminOnly: true },
];

export default function Layout({ children }) {
  const { user, logout, canControl, canConfigure } = useAuth();
  const { unreadCount, markRead } = useNotifications();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = NAV_ITEMS.filter(item => {
    if (item.adminOnly && !canConfigure) return false;
    if (item.controlOnly && !canControl) return false;
    return true;
  });

  const handleLogout = () => { logout(); navigate('/login'); };

  const roleBadgeColor = {
    'State Admin': 'bg-accent-purple',
    'District Admin': 'bg-accent-blue',
    'Department Auditor': 'bg-accent-emerald',
  }[user?.role] || 'bg-gray-600';

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        className="flex flex-col bg-bg-secondary border-r border-gray-800 h-full flex-shrink-0 overflow-hidden"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-sm font-bold flex-shrink-0">
            G
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
              <div className="text-sm font-semibold text-text-primary whitespace-nowrap">FarmerProc</div>
              <div className="text-[10px] text-text-muted whitespace-nowrap">Government Command Center</div>
            </motion.div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {filteredNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/20'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-transparent'
                }`
              }
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-2 mb-2 p-2 rounded-lg text-text-muted hover:bg-bg-hover hover:text-text-primary text-xs text-center transition-colors"
        >
          {collapsed ? '→' : '← Collapse'}
        </button>
      </motion.aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-bg-secondary border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-status-normal animate-pulse-dot" />
            <span className="text-xs text-text-muted">SYSTEM ONLINE</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button onClick={markRead} className="relative p-2 rounded-lg hover:bg-bg-hover transition-colors">
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-severity-critical text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-text-primary">{user?.name}</div>
                <div className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full text-white ${roleBadgeColor}`}>
                  {user?.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-text-muted hover:text-severity-critical px-2 py-1 rounded hover:bg-bg-hover transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
