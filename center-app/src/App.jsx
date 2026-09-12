import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { QueueProvider, useQueue } from './context/QueueContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Dashboard from './pages/Dashboard';
import Queue from './pages/Queue';
import Capacity from './pages/Capacity';
import Centers from './pages/Centers';
import FarmerProcessing from './pages/FarmerProcessing';
import Weighing from './pages/Weighing';
import QualityCheck from './pages/QualityCheck';
import Payment from './pages/Payment';
import Login from './pages/Login';

<<<<<<< HEAD
import { LayoutDashboard, ListOrdered, Building2, Sprout, LogOut, MapPin } from 'lucide-react';
=======
import { LayoutDashboard, ListOrdered, Building2, MapPinned, Sprout } from 'lucide-react';
>>>>>>> 01d9a59ab6c541c76d9c353e9788e009e17ddb4d

import './App.css';
import { testBackend } from './api/testapi';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AppHeader() {
  const { tokens } = useQueue();
  const { user, center, logout } = useAuth();
  const navigate = useNavigate();

  const activeCount = tokens.filter(
    (t) => t.stage !== 'PAYMENT_COMPLETED' && t.stage !== 'REJECTED'
  ).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
        {center && (
          <div className="center-badge" title={center.name}>
            <MapPin size={14} className="text-emerald-600" />
            <span>{center.district} Mandi</span>
          </div>
        )}

        <div className="pulse-status-badge">
          <span className="pulse-dot"></span>
          <span>{activeCount} Active Tokens</span>
        </div>

        <nav className="app-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/queue"
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <ListOrdered size={17} />
            <span>Live Queue</span>
          </NavLink>

          <NavLink
            to="/capacity"
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <Building2 size={17} />
            <span>Capacity</span>
          </NavLink>
<<<<<<< HEAD
=======

          <NavLink
            to="/centers"
            className={({ isActive }) =>
              isActive ? 'nav-item active' : 'nav-item'
            }
          >
            <MapPinned size={17} />
            <span>Centres</span>
          </NavLink>

>>>>>>> 01d9a59ab6c541c76d9c353e9788e009e17ddb4d
        </nav>

        {user && (
          <div className="user-profile-badge">
            <span className="user-avatar-icon">{user.avatar || '👨‍💼'}</span>
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-role-title">{user.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="user-logout-btn"
              title="Sign Out of Station Console"
            >
              <LogOut size={15} />
              <span>Exit</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function MainLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/queue"
            element={
              <ProtectedRoute>
                <Queue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/capacity"
            element={
              <ProtectedRoute>
                <Capacity />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tokens/:tokenNumber"
            element={
              <ProtectedRoute>
                <FarmerProcessing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tokens/:tokenNumber/weighing"
            element={
              <ProtectedRoute>
                <Weighing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tokens/:tokenNumber/quality"
            element={
              <ProtectedRoute>
                <QualityCheck />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tokens/:tokenNumber/payment"
            element={
              <ProtectedRoute>
                <Payment />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  // TEST BACKEND CONNECTION
  useEffect(() => {
    testBackend()
      .then((data) => {
        console.log('Backend connected:', data);
      })
      .catch((error) => {
        console.error('Backend connection failed:', error);
      });
  }, []);

  return (
<<<<<<< HEAD
    <AuthProvider>
      <QueueProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<MainLayout />} />
          </Routes>
        </BrowserRouter>
      </QueueProvider>
    </AuthProvider>
=======
    <QueueProvider>
      <BrowserRouter>

        <div className="app-shell">

          <AppHeader />

          <main className="app-main">

            <Routes>

              <Route
                path="/"
                element={<Navigate to="/dashboard" replace />}
              />

              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              <Route
                path="/queue"
                element={<Queue />}
              />

              <Route
                path="/capacity"
                element={<Capacity />}
              />

              <Route
                path="/centers"
                element={<Centers />}
              />

              <Route
                path="/tokens/:tokenNumber"
                element={<FarmerProcessing />}
              />

              <Route
                path="/tokens/:tokenNumber/weighing"
                element={<Weighing />}
              />

              <Route
                path="/tokens/:tokenNumber/quality"
                element={<QualityCheck />}
              />

              <Route
                path="/tokens/:tokenNumber/payment"
                element={<Payment />}
              />

            </Routes>

          </main>

        </div>

      </BrowserRouter>
    </QueueProvider>
>>>>>>> 01d9a59ab6c541c76d9c353e9788e009e17ddb4d
  );
}