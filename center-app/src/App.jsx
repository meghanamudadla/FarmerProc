import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { QueueProvider, useQueue } from './context/QueueContext';
import Dashboard from './pages/Dashboard';
import Queue from './pages/Queue';
import Capacity from './pages/Capacity';
import FarmerProcessing from './pages/FarmerProcessing';
import Weighing from './pages/Weighing';
import QualityCheck from './pages/QualityCheck';
import Payment from './pages/Payment';
import { LayoutDashboard, ListOrdered, Building2, Sprout } from 'lucide-react';
import './App.css';

function AppHeader() {
  const { tokens } = useQueue();
  const activeCount = tokens.filter((t) => t.stage !== 'PAYMENT_COMPLETED' && t.stage !== 'REJECTED').length;

  return (
    <header className="app-header glass-header">
      <div className="brand">
        <div className="brand-logo-icon">
          <Sprout size={22} />
        </div>
        <div className="brand-text">
          <span className="brand-title">AgroProcure</span>
          <span className="brand-subtitle">Procurement Center Console</span>
        </div>
      </div>

      <div className="header-right">
        <div className="pulse-status-badge">
          <span className="pulse-dot"></span>
          <span>{activeCount} Active Tokens</span>
        </div>

        <nav className="app-nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/queue" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <ListOrdered size={17} />
            <span>Live Queue</span>
          </NavLink>
          <NavLink to="/capacity" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <Building2 size={17} />
            <span>Capacity</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <QueueProvider>
      <BrowserRouter>
        <div className="app-shell">
          <AppHeader />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/queue" element={<Queue />} />
              <Route path="/capacity" element={<Capacity />} />
              <Route path="/tokens/:tokenNumber" element={<FarmerProcessing />} />
              <Route path="/tokens/:tokenNumber/weighing" element={<Weighing />} />
              <Route path="/tokens/:tokenNumber/quality" element={<QualityCheck />} />
              <Route path="/tokens/:tokenNumber/payment" element={<Payment />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueueProvider>
  );
}
