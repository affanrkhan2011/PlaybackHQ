import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

export default function JoinTeam() {
  const { teamId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    getDoc(doc(db, 'teams', teamId)).then(snap => {
      if (snap.exists()) setTeam({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
  }, [teamId]);

  const handleJoin = async () => {
    if (!user || !profile || !teamId) return;
    try {
      await setDoc(doc(db, `teams/${teamId}/members`, user.uid), {
        userId: user.uid,
        name: profile.name,
        role: 'player', // Default role for joining via link
        joinedAt: serverTimestamp()
      });
      navigate(`/teams/${teamId}`);
    } catch (error) {
      console.error(error);
      alert('Error joining team. Please try again.');
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center p-8">Loading...</div>;

  if (!user || !profile) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-8">
        <div className="bg-card border border-border p-8 rounded-xl max-w-sm w-full text-center space-y-4">
          <h1 className="text-2xl font-bold">You've been invited!</h1>
          <p className="text-muted-foreground text-sm">Please log in to join {team ? team.name : 'this team'}.</p>
          <Button onClick={() => window.location.href = '/'} className="w-full">Go to Login</Button>
        </div>
      </div>
    );
  }

  if (!team) return <div className="p-8 text-center text-destructive">Team not found</div>;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-8">
      <div className="bg-card border border-border p-8 rounded-xl max-w-sm w-full text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Join Team</h1>
          <p className="text-muted-foreground">You've been invited to join <strong>{team.name}</strong></p>
        </div>
        <Button onClick={handleJoin} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          Accept Invite & Join
        </Button>
      </div>
    </div>
  );
}
