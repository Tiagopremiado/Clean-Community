/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar, MobileNav } from './components/Navigation';
import { Feed } from './pages/Feed';
import { PostDetails } from './pages/PostDetails';
import { Publish } from './pages/Publish';
import { Profile } from './pages/Profile';
import { Explore } from './pages/Explore';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] bg-dot-pattern">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto overflow-x-hidden">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedLayout>
              <Routes>
                <Route path="/" element={<Feed />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/publish" element={<Publish />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/post/:id" element={<PostDetails />} />
              </Routes>
            </ProtectedLayout>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

