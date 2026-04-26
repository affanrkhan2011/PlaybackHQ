import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Calendar, MapPin, Edit2, Link as LinkIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Header from '@/components/Header';

export default function TeamDetails() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Specific dialogs states
  const [isMatchOpen, setIsMatchOpen] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Form States
  const [opponent, setOpponent] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [location, setLocation] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('player');

  useEffect(() => {
    if (!teamId) return;
    fetchTeamData();
  }, [teamId]);

  const fetchTeamData = async () => {
    try {
      const teamDoc = await getDoc(doc(db, 'teams', teamId!));
      if (teamDoc.exists()) setTeam({ id: teamDoc.id, ...teamDoc.data() });

      const q = query(collection(db, 'matches'), where('teamId', '==', teamId));
      const snapshot = await getDocs(q);
      const fetchedMatches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as any);
      fetchedMatches.sort((a, b) => b.matchDate - a.matchDate);
      setMatches(fetchedMatches);

      const mQ = collection(db, 'teams', teamId!, 'members');
      const mSnap = await getDocs(mQ);
      setMembers(mSnap.docs.map(d => ({ id: d.id, ...d.data() }) as any));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent || !matchDate) return;
    try {
      await addDoc(collection(db, 'matches'), {
        teamId, opponent, location, matchDate: new Date(matchDate).getTime(), createdAt: serverTimestamp()
      });
      setIsMatchOpen(false);
      setOpponent(''); setMatchDate(''); setLocation('');
      fetchTeamData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditTeamName = async () => {
    if (!newTeamName.trim()) return;
    try {
      await updateDoc(doc(db, 'teams', teamId!), { name: newTeamName });
      setIsEditNameOpen(false);
      fetchTeamData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    try {
      await addDoc(collection(db, `teams/${teamId}/members`), {
        userId: `guest_${Date.now()}`,
        name: newMemberName,
        role: newMemberRole,
        isGuest: true,
        joinedAt: serverTimestamp()
      });
      setIsAddMemberOpen(false);
      setNewMemberName('');
      fetchTeamData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await deleteDoc(doc(db, `teams/${teamId}/members`, memberId));
      fetchTeamData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditMemberRole = async (memberId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, `teams/${teamId}/members`, memberId), { role: newRole });
      fetchTeamData();
    } catch (error) {
      console.error(error);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/teams/${teamId}/join`;
    navigator.clipboard.writeText(link);
    alert('Invite link copied to clipboard!');
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!team) return <div className="p-8 text-center text-destructive">Team not found</div>;

  const isAdmin = profile?.role === 'admin' || profile?.role === 'coach';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <div className="max-w-5xl mx-auto p-6 flex-1 w-full">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6 -ml-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>

        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold tracking-tight">{team.name}</h1>
              {isAdmin && (
                <Dialog open={isEditNameOpen} onOpenChange={(open) => { setIsEditNameOpen(open); if(open) setNewTeamName(team.name); }}>
                  <DialogTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </DialogTrigger>
                  <DialogContent className="bg-card text-foreground border-border">
                    <DialogHeader>
                      <DialogTitle>Edit Team Name</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Input className="bg-background border-border" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                      <Button onClick={handleEditTeamName} className="w-full">Save Name</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <p className="text-muted-foreground">Coach ID: {team.coachId}</p>
          </div>
        </header>

        <Tabs defaultValue="matches" className="w-full">
          <TabsList className="mb-6 bg-card border border-border">
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
          </TabsList>
          
          <TabsContent value="matches">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Matches</h2>
              {isAdmin && (
                <Dialog open={isMatchOpen} onOpenChange={setIsMatchOpen}>
                  <DialogTrigger className={buttonVariants()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Match
                  </DialogTrigger>
                  <DialogContent className="bg-card text-foreground border-border">
                    <DialogHeader>
                      <DialogTitle>Add a New Match</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateMatch} className="space-y-4 pt-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Opponent</label>
                        <Input className="bg-background border-border" placeholder="e.g. Coquitlam FC" value={opponent} onChange={(e) => setOpponent(e.target.value)} required />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Date</label>
                        <Input className="bg-background border-border" type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Location (Optional)</label>
                        <Input className="bg-background border-border" placeholder="e.g. Burnaby Lake" value={location} onChange={(e) => setLocation(e.target.value)} />
                      </div>
                      <Button type="submit" className="w-full">Create Match</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {matches.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl border-border text-muted-foreground">
                No matches found.
              </div>
            ) : (
              <div className="grid gap-4">
                {matches.map((match) => (
                  <Link key={match.id} to={`/matches/${match.id}`}>
                    <Card className="hover:border-accent transition-colors cursor-pointer bg-card">
                      <CardHeader className="flex flex-row items-center justify-between py-4">
                        <div>
                          <CardTitle className="text-xl text-foreground">vs {match.opponent}</CardTitle>
                          <CardDescription className="flex items-center mt-2 space-x-4 text-muted-foreground">
                            <span className="flex items-center"><Calendar className="mr-1 h-3 w-3"/> {format(new Date(match.matchDate), 'MMM d, yyyy')}</span>
                            {match.location && <span className="flex items-center"><MapPin className="mr-1 h-3 w-3"/> {match.location}</span>}
                          </CardDescription>
                        </div>
                        <Button variant="outline" className="text-foreground border-border">View Videos</Button>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="roster">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Roster</h2>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={copyInviteLink} className="border-border">
                    <LinkIcon className="mr-2 h-4 w-4" /> Invite Link
                  </Button>
                  <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                    <DialogTrigger className={buttonVariants()}>
                      <Plus className="mr-2 h-4 w-4" /> Add Person
                    </DialogTrigger>
                    <DialogContent className="bg-card text-foreground border-border">
                      <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddMember} className="space-y-4 pt-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Name</label>
                          <Input className="bg-background border-border" placeholder="e.g. John Doe" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} required />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Role</label>
                          <select 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={newMemberRole} 
                            onChange={(e) => setNewMemberRole(e.target.value)}
                          >
                            <option value="player">Player</option>
                            <option value="coach">Coach</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <Button type="submit" className="w-full">Add Member</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            <div className="border border-border rounded-xl bg-card overflow-hidden">
              {members.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No members yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-background/50 border-b border-border">
                    <tr>
                      <th className="text-left font-medium p-4 text-muted-foreground">Name</th>
                      <th className="text-left font-medium p-4 text-muted-foreground">Role</th>
                      {isAdmin && <th className="text-right font-medium p-4 text-muted-foreground">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members.map(member => (
                      <tr key={member.id} className="hover:bg-background/50 transition-colors">
                        <td className="p-4 font-medium">{member.name || 'Unnamed'} {member.isGuest && <span className="text-xs text-muted-foreground ml-2">(Guest)</span>}</td>
                        <td className="p-4">
                          {isAdmin ? (
                            <select 
                              className="bg-transparent border-none text-sm focus:ring-0 p-0 cursor-pointer capitalize w-full"
                              value={member.role}
                              onChange={(e) => handleEditMemberRole(member.id, e.target.value)}
                            >
                              <option value="player">Player</option>
                              <option value="coach">Coach</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className="capitalize">{member.role}</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="p-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleKickMember(member.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
