import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CenterList from './pages/Centers/CenterList';
import CenterDetail from './pages/Centers/CenterDetail';
import MapView from './pages/MapView';
import Analytics from './pages/Analytics';
import Forecast from './pages/Forecast';
import Alerts from './pages/Alerts';
import FarmerManagement from './pages/FarmerManagement';
import CenterManagement from './pages/CenterManagement';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Grievances from './pages/Grievances';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings/Settings';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/centers" element={<ProtectedRoute><CenterList /></ProtectedRoute>} />
      <Route path="/centers/:id" element={<ProtectedRoute><CenterDetail /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/congestion-trends" element={<ProtectedRoute><Forecast /></ProtectedRoute>} />
      <Route path="/forecast" element={<Navigate to="/congestion-trends" replace />} />
      <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
      <Route path="/farmers" element={<ProtectedRoute><FarmerManagement /></ProtectedRoute>} />
      <Route path="/center-management" element={<ProtectedRoute><CenterManagement /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/grievances" element={<ProtectedRoute><Grievances /></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
