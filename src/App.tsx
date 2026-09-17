/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Sidebar, MobileNav } from './components/Navigation';
import { Feed } from './pages/Feed';
import { PostDetails } from './pages/PostDetails';
import { Publish } from './pages/Publish';
import { Profile } from './pages/Profile';
import { Explore } from './pages/Explore';
import { Login } from './pages/Login';
import { AppSettings } from './pages/AppSettings';
import { DownloadApp } from './pages/DownloadApp';
import { MembersManagement } from './pages/MembersManagement';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { GuestAuthBanner } from './components/GuestAuthBanner';
import { Header } from './components/Header';
import { PageTransition } from './components/PageTransition';
import { Loader2 } from 'lucide-react';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<PageTransition><Feed /></PageTransition>} />
        <Route path="/explore" element={<PageTransition><Explore /></PageTransition>} />
        <Route path="/download" element={<DownloadApp />} />
        <Route path="/post/:id" element={<PageTransition><PostDetails /></PageTransition>} />
        <Route path="/profile/:userIdOrUsername" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/u/:userIdOrUsername" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><AppSettings /></PageTransition>} />
        <Route path="/members" element={<PageTransition><MembersManagement /></PageTransition>} />
        <Route path="/admin/members" element={<PageTransition><MembersManagement /></PageTransition>} />

        {/* Actions requiring an account */}
        <Route path="/publish" element={
          <RequireAuth>
            <PageTransition><Publish /></PageTransition>
          </RequireAuth>
        } />
        <Route path="/profile" element={
          <RequireAuth>
            <PageTransition><Profile /></PageTransition>
          </RequireAuth>
        } />
      </Routes>
    </AnimatePresence>
  );
}

function MainLayout() {
  return (
    <div className="flex min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 bg-dot-pattern transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <AnimatedRoutes />
        </main>
      </div>
      <GuestAuthBanner />
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<MainLayout />} />
          </Routes>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}
