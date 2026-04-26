import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../lib/auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Video, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function MatchDetails() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [match, setMatch] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // New Video Form State
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Full Match');

  useEffect(() => {
    if (!matchId) return;
    fetchMatchAndVideos();
  }, [matchId]);

  const fetchMatchAndVideos = async () => {
    try {
      const matchResp = await fetch(`/api/matches/${matchId}`);
      if (matchResp.ok) setMatch(await matchResp.json());

      const videosResp = await fetch(`/api/matches/${matchId}/videos`);
      if (videosResp.ok) setVideos(await videosResp.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || (!url && !file) || !profile) return;

    try {
      let finalUrl = url;
      if (file) {
        const formData = new FormData();
        formData.append('video', file);
        const uploadResp = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadResp.json();
        finalUrl = uploadData.url;
      }

      await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId, title, url: finalUrl, type: file ? 'file' : 'link', category, duration: '0:00'
        })
      });
      setIsOpen(false);
      setTitle('');
      setUrl('');
      setFile(null);
      setCategory('Full Match');
      fetchMatchAndVideos();
    } catch (error) {
      console.error('Error adding video:', error);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!match) return <div className="p-8 text-center text-destructive">Match not found</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(`/teams/${match.teamId}`)} className="mb-6 -ml-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Team
        </Button>

        <header className="mb-8 block">
          <h1 className="text-4xl font-bold tracking-tight mb-2">vs {match.opponent}</h1>
          <p className="text-muted-foreground">Played on {match.matchDate ? format(new Date(match.matchDate), 'MMMM do, yyyy') : 'No date'}</p>
        </header>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Match Videos</h2>
          {profile?.role !== 'player' && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger className={buttonVariants()}>
                <Plus className="mr-2 h-4 w-4" /> Add Video
              </DialogTrigger>
              <DialogContent className="bg-card text-foreground border-border">
                <DialogHeader>
                  <DialogTitle>Add a Video</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddVideo} className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Title</label>
                    <Input className="bg-background border-border" placeholder="e.g. First Half" value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Video Option</label>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Option A: Direct Upload</label>
                        <Input 
                          type="file" 
                          accept="video/*" 
                          className="bg-background border-border" 
                          onChange={(e) => {
                            if (e.target.files) {
                              setFile(e.target.files[0]);
                              setUrl('');
                            }
                          }} 
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="h-px flex-1 bg-border"></div>
                        <span className="text-[10px] uppercase text-muted-foreground">OR</span>
                        <div className="h-px flex-1 bg-border"></div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Option B: Video URL (YouTube, MP4 link)</label>
                        <Input 
                          className="bg-background border-border" 
                          placeholder="https://youtube.com/..." 
                          value={url} 
                          onChange={(e) => {
                            setUrl(e.target.value);
                            setFile(null);
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Category</label>
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option>Full Match</option>
                      <option>First Half</option>
                      <option>Second Half</option>
                      <option>Highlights</option>
                      <option>Training</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full">Add Video</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl border-border text-muted-foreground">
            <Video className="mx-auto h-12 w-12 text-muted mb-4" />
            No videos uploaded yet.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <Link key={video.id} to={`/videos/${video.id}`}>
                <Card className="hover:border-accent transition-colors overflow-hidden h-full flex flex-col bg-card border-border">
                  {/* Fake Thumbnail */}
                  <div className="aspect-video bg-background flex items-center justify-center relative group border-b border-border">
                    <PlayCircle className="h-12 w-12 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {video.category}
                    </div>
                  </div>
                  <CardHeader className="p-4 flex-1">
                    <CardTitle className="text-lg line-clamp-1 text-foreground">{video.title}</CardTitle>
                    <CardContent className="p-0 pt-2 text-xs text-muted-foreground">
                      Added {video.createdAt ? format(new Date(video.createdAt), 'MMM d, yyyy') : 'Recently'}
                    </CardContent>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
