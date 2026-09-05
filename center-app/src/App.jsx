import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { QueueProvider } from './context/QueueContext';
import Dashboard from './pages/Dashboard';
import Queue from './pages/Queue';
import Capacity from './pages/Capacity';
import FarmerProcessing from './pages/FarmerProcessing';
import Weighing from './pages/Weighing';
import QualityCheck from './pages/QualityCheck';
import Payment from './pages/Payment';
import './App.css';

export default function App() {
  return (
    <QueueProvider>
      <BrowserRouter>
        <div className="app-shell">
          <header className="app-header">
            <div className="brand">
              <span className="brand-title">AgroProcure Center Console</span>
            </div>
            <nav className="app-nav">
              <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                Dashboard
              </NavLink>
              <NavLink to="/queue" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                Queue
              </NavLink>
              <NavLink to="/capacity" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                Capacity
              </NavLink>
            </nav>
          </header>

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
