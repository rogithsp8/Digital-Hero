import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import HowItWorksPage from './pages/HowItWorksPage';
import CharitiesPage from './pages/CharitiesPage';
import CharityDetailPage from './pages/CharityDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SubscribePage from './pages/SubscribePage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboard from './pages/admin/AdminDashboard';

import './index.css';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/charities" element={<CharitiesPage />} />
            <Route path="/charities/:slug" element={<CharityDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Auth required */}
            <Route path="/subscribe" element={<ProtectedRoute><SubscribePage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute requireSub><DashboardPage /></ProtectedRoute>} />

            {/* Admin only */}
            <Route path="/admin/*" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
