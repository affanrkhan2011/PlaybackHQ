import { useState } from 'react';
import { useAuth } from '../src/lib/auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export default function Header() {
  const { profile, signOut, signIn } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newName, setNewName] = useState(profile?.name || '');

  const handleSaveSettings = async () => {
    if (!profile) return;
    try {
      const resp = await fetch(`/api/users/${profile.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (resp.ok) {
        // Simple way to refresh: just re-login current user email
        await signIn(profile.email, newName);
        setSettingsOpen(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <header className="border-b bg-sidebar border-border px-6 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 flex items-center justify-center bg-accent rounded">
          <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-accent">PlaybackHQ</h1>
      </div>
      <div className="flex items-center space-x-4">
        
        <Dialog open={settingsOpen} onOpenChange={(open) => { setSettingsOpen(open); if(open) setNewName(profile?.name || ''); }}>
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "ghost" }) + " text-sm font-medium text-muted-foreground hover:text-foreground"}>
              {profile?.name} ({profile?.role})
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer text-foreground focus:bg-accent focus:text-accent-foreground">
                <Settings className="w-4 h-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DialogContent className="bg-card text-foreground border-border">
            <DialogHeader>
              <DialogTitle>Account Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Display Name</label>
                <Input 
                  className="bg-background border-border text-foreground"
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                />
              </div>
              <Button onClick={handleSaveSettings} className="w-full bg-accent text-accent-foreground hover:opacity-90">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </header>
  );
}
