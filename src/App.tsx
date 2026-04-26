/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './lib/auth';
import { Button } from '@/components/ui/button';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import TeamDetails from './pages/TeamDetails';
import MatchDetails from './pages/MatchDetails';
import VideoPlayer from './pages/VideoPlayer';
import JoinTeam from './pages/JoinTeam';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/teams/:teamId/join" element={<JoinTeam />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/teams/:teamId" 
          element={
            <ProtectedRoute>
              <TeamDetails />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/matches/:matchId" 
          element={
            <ProtectedRoute>
              <MatchDetails />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/videos/:videoId" 
          element={
            <ProtectedRoute>
              <VideoPlayer />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </AuthProvider>
  );
}
