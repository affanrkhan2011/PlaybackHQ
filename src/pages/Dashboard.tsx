import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Users, Plus, LogOut } from 'lucide-react';
import Header from '@/components/Header';

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, [user]);

  const fetchTeams = async () => {
    // In a real app with proper relational queries, we'd query teams where user is a member
    // Here we query all for simplicity of the MVP
    const q = query(collection(db, 'teams'));
    const snapshot = await getDocs(q);
    setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !profile) return;

    try {
      const docRef = await addDoc(collection(db, 'teams'), {
        name: newTeamName,
        organizationId: 'demo-org', // Hardcoded for MVP
        coachId: user?.uid,
        createdAt: serverTimestamp()
      });
      
      // Add user as a member
      await setDoc(doc(db, `teams/${docRef.id}/members`, user!.uid), {
        userId: user!.uid,
        role: profile.role,
        joinedAt: serverTimestamp()
      });

      setNewTeamName('');
      setIsOpen(false);
      fetchTeams();
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="mx-auto max-w-5xl p-6 flex-1 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-semibold tracking-tight">Your Teams</h2>
          {profile?.role !== 'player' && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger className={buttonVariants()}>
                <Plus className="mr-2 h-4 w-4" /> Create Team
              </DialogTrigger>
              <DialogContent className="bg-card text-foreground border-border">
                <DialogHeader>
                  <DialogTitle>Create a New Team</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTeam} className="space-y-4 pt-4">
                  <div>
                    <Input
                      className="bg-background border-border text-foreground"
                      placeholder="e.g. U14 Boys Elite"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full">Create Team</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl border-border text-muted-foreground">
            No teams found. {profile?.role !== 'player' && 'Create one to get started.'}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Link key={team.id} to={`/teams/${team.id}`}>
                <Card className="hover:border-accent transition-colors cursor-pointer h-full bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">{team.name}</CardTitle>
                    <CardDescription className="text-muted-foreground">Coach ID: {team.coachId?.substring(0,6)}...</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
