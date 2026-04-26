// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../lib/auth';
import ReactPlayer from 'react-player';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MessageSquarePlus, Play, Pause, Reply, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

const COMMENT_TYPES = {
  well_done: { label: '✅ Well Done', colorBg: 'bg-well-done', colorText: 'text-well-done', colorBorder: 'border-well-done', bgLight: 'bg-well-done/10' },
  needs_work: { label: '⚠️ Needs Work', colorBg: 'bg-needs-work', colorText: 'text-needs-work', colorBorder: 'border-needs-work', bgLight: '' },
  tactical: { label: '🔵 Tactical', colorBg: 'bg-tactical', colorText: 'text-tactical', colorBorder: 'border-tactical', bgLight: '' },
  key_moment: { label: '🔴 Key Moment', colorBg: 'bg-key-moment', colorText: 'text-key-moment', colorBorder: 'border-key-moment', bgLight: '' },
  general: { label: '📌 General', colorBg: 'bg-zinc-500', colorText: 'text-zinc-500', colorBorder: 'border-transparent', bgLight: '' },
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayer() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const playerRef = useRef<any>(null);
  
  const [video, setVideo] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Player state
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Comment Form state
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState('general');
  const [pendingTimestamp, setPendingTimestamp] = useState(0);

  // Video Edit state
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (!videoId) return;

    const fetchData = async () => {
      try {
        const vResp = await fetch(`/api/videos/${videoId}`);
        if (vResp.ok) setVideo(await vResp.json());

        const cResp = await fetch(`/api/videos/${videoId}/comments`);
        if (cResp.ok) setComments(await cResp.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [videoId]);

  const handleStartComment = () => {
    setPlaying(false);
    setPendingTimestamp(playerRef.current?.getCurrentTime() || 0);
    setIsAddingComment(true);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !profile) return;
    try {
      const resp = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.uid,
          text: commentText,
          type: commentType,
          timestamp: pendingTimestamp,
        }),
      });

      if (resp.ok) {
        setIsAddingComment(false);
        setCommentText('');
        setCommentType('general');
        // Refresh comments
        const cResp = await fetch(`/api/videos/${videoId}/comments`);
        if (cResp.ok) setComments(await cResp.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditVideoTitle = async () => {
    if (!editTitle.trim()) return;
    try {
      await fetch(`/api/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle }),
      });
      setVideo(prev => ({ ...prev, title: editTitle }));
      setIsEditingVideo(false);
    } catch (error) {
      console.error('Error editing video:', error);
    }
  };

  const handleDeleteVideo = async () => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
      navigate(-1);
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  const handleSeek = (time: number) => {
    playerRef.current?.seekTo(time, 'seconds');
    setPlaying(true);
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading player...</div>;
  if (!video) return <div className="p-8 text-center text-red-500">Video not found.</div>;

  return (
    <div className="flex h-screen bg-background text-foreground flex-col overflow-hidden">
      
      {/* Header matching breadcrumb structure from design */}
      <header className="h-16 border-b border-border flex items-center justify-between px-8 shrink-0">
        <div className="text-[13px] text-muted-foreground flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <span>/</span>
          <span className="text-foreground font-semibold">{video.title}</span>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_320px] overflow-hidden">
        
        {/* LEFT PANE - Player Section */}
        <div className="p-6 flex flex-col overflow-y-auto bg-background">
            <div className="bg-black aspect-video rounded-xl relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-center">
              {/* @ts-ignore */}
              <ReactPlayer
                ref={playerRef}
                url={video.url.startsWith('/') ? `${window.location.origin}${video.url}` : video.url}
                width="100%"
                height="100%"
                playing={playing}
                controls={true}
                config={{
                  file: {
                    attributes: {
                      controlsList: 'nodownload'
                    }
                  },
                  youtube: {
                    playerVars: { origin: window.location.origin, modestbranding: 1 }
                  }
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onProgress={(p: any) => {
                  setCurrentTime(p.playedSeconds);
                }}
                onReady={() => {
                  if (playerRef.current) {
                    setDuration(playerRef.current.getDuration());
                  }
                }}
                onError={(e) => console.error('ReactPlayer Error:', e)}
              />
            </div>

            {/* Troubleshooting / Direct Link for uploads */}
            {video.type === 'file' && (
              <div className="mt-2 text-right">
                <a 
                  href={video.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[11px] text-muted-foreground hover:text-accent flex items-center justify-end"
                >
                  Download or open video in new tab if it doesn't play
                </a>
              </div>
            )}

          {/* Timeline Area matching design */}
          <div className="mt-6 h-10 relative flex items-center">
            <div className="h-1.5 w-full bg-[#2D2D33] rounded-[3px] relative cursor-pointer"
                 onClick={(e) => {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const clickX = e.clientX - rect.left;
                   const clickPercent = clickX / rect.width;
                   handleSeek(clickPercent * duration);
                 }}>
              
              <div 
                className="h-full bg-accent rounded-[3px] pointer-events-none" 
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />

              {duration > 0 && comments.map(cmt => {
                const typeStyle = COMMENT_TYPES[cmt.type as keyof typeof COMMENT_TYPES] || COMMENT_TYPES['general'];
                return (
                  <div 
                    key={cmt.id}
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background cursor-pointer hover:scale-125 transition-transform ${typeStyle.colorBg}`}
                    style={{ left: `${(cmt.timestamp_seconds / duration) * 100}%` }}
                    title={cmt.text}
                    onClick={(e) => { e.stopPropagation(); handleSeek(cmt.timestamp_seconds); }}
                  />
                );
              })}
            </div>
          </div>

          <div className="mt-2 text-xs text-muted-foreground font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Match Info matching design */}
          <div className="py-4 mt-2 flex items-center justify-between">
            <div>
              <div className="text-[13px] text-muted-foreground mb-1">{video.category}</div>
              <h1 className="text-2xl font-bold">{video.title}</h1>
            </div>
            
            {profile?.role !== 'player' && (
              <div className="flex items-center gap-2">
                <Dialog open={isEditingVideo} onOpenChange={(open) => { setIsEditingVideo(open); if(open) setEditTitle(video.title); }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" }) + " text-muted-foreground"}>
                      <MoreVertical className="h-5 w-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem onClick={() => setIsEditingVideo(true)} className="cursor-pointer">
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit Title
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDeleteVideo} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Video
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DialogContent className="bg-card text-foreground border-border">
                    <DialogHeader>
                      <DialogTitle>Edit Video Title</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-background border-border" />
                      <Button onClick={handleEditVideoTitle} className="w-full">Save Changes</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE - Comments Sidebar matching design */}
        <div className="flex flex-col bg-sidebar border-l border-border overflow-hidden">
          <div className="p-5 border-b border-border font-semibold text-[14px] flex justify-between items-center">
            Match Notes
            <span className="text-[11px] text-accent font-normal">{comments.length} pins</span>
          </div>

          {isAddingComment && (
            <div className="p-4 border-b border-border bg-sidebar animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono bg-card px-2 py-1 rounded text-muted-foreground">
                  Adding at {formatTime(pendingTimestamp)}
                </span>
                <button className="text-muted-foreground hover:text-foreground text-xs" onClick={() => setIsAddingComment(false)}>Cancel</button>
              </div>
              
              <select 
                className="w-full bg-card border border-border rounded p-2 mb-3 text-sm text-foreground"
                value={commentType} 
                onChange={(e) => setCommentType(e.target.value)}
              >
                {Object.entries(COMMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              
              <Textarea 
                placeholder="Add your coaching point here..." 
                className="bg-card border-border mb-3 text-sm text-foreground resize-none"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSubmitComment} className="bg-accent text-accent-foreground hover:bg-accent/90">Save Note</Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {comments.map((cmt) => {
              const typeStyle = COMMENT_TYPES[cmt.type as keyof typeof COMMENT_TYPES] || COMMENT_TYPES['general'];
              
              return (
                <div 
                  key={cmt.id} 
                  className={`bg-card p-3 rounded-lg border border-transparent border-l-[3px] cursor-pointer transition-all ${typeStyle.bgLight || ''}`}
                  style={{ borderLeftColor: `var(--color-${cmt.type.replace('_', '-')})` }}
                  onClick={() => handleSeek(cmt.timestamp_seconds)}
                >
                  <div className="flex justify-between items-center mb-1.5 text-[12px]">
                    <span className="font-mono text-muted-foreground tracking-tight">
                      {formatTime(cmt.timestamp_seconds)}
                    </span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${typeStyle.colorText}`}>
                      {typeStyle.label.replace(/[^A-Za-z ]/g, '').trim()}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-foreground">{cmt.text}</p>
                </div>
              );
            })}

            {!isAddingComment && profile?.role !== 'player' && (
              <div className="pt-4 mt-2 border-t border-border">
                <Button onClick={handleStartComment} variant="outline" className="w-full bg-background border-border text-xs text-muted-foreground h-11 justify-start">
                  Click to add an annotation...
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
