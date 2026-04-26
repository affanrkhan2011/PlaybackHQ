import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../lib/auth';
import { Button } from '@/components/ui/button';

export default function Landing() {
  const { user, signIn, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-accent">PlaybackHQ</h1>
        </div>
        <p className="mx-auto max-w-lg text-lg text-muted-foreground mb-8">
          The dedicated platform for youth sports teams to organize, share, and collaboratively review match footage.
        </p>
        <Button onClick={signIn} size="lg" className="bg-accent hover:opacity-90 text-white px-8 py-6 text-lg rounded-full">
          Sign In with Google
        </Button>
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} PlaybackHQ. All rights reserved.
      </footer>
    </div>
  );
}
