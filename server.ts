import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import multer from 'multer';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('database.sqlite');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid()}${ext}`);
  }
});
const upload = multer({ storage });

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    role TEXT
  );

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS team_members (
    team_id TEXT,
    user_id TEXT,
    role TEXT,
    PRIMARY KEY (team_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    team_id TEXT,
    opponent TEXT,
    date TEXT,
    location TEXT,
    type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    match_id TEXT,
    title TEXT,
    url TEXT,
    type TEXT,
    category TEXT,
    duration TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    video_id TEXT,
    user_id TEXT,
    text TEXT,
    type TEXT,
    timestamp_seconds REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed data if empty
const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams').get() as any;
if (teamCount.count === 0) {
  const teamId = nanoid();
  const userId = 'demo_user';
  db.prepare('INSERT INTO users (uid, email, name, role) VALUES (?, ?, ?, ?)').run(userId, 'demo@example.com', 'Demo Coach', 'coach');
  db.prepare('INSERT INTO teams (id, name) VALUES (?, ?)').run(teamId, 'Wildcats FC');
  db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)').run(teamId, userId, 'coach');
  
  const matchId = nanoid();
  db.prepare('INSERT INTO matches (id, team_id, opponent, date, location, type) VALUES (?, ?, ?, ?, ?, ?)').run(
    matchId, teamId, 'Dragons FC', '2024-05-15', 'Eagle Park Stadium', 'League'
  );

  const videoId = nanoid();
  db.prepare('INSERT INTO videos (id, match_id, title, url, type, category, duration) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    videoId, matchId, 'Match Highlights', 'https://www.w3schools.com/html/mov_bbb.mp4', 'link', 'Highlights', '0:10'
  );

  db.prepare('INSERT INTO comments (id, video_id, user_id, text, type, timestamp_seconds) VALUES (?, ?, ?, ?, ?, ?)').run(
    nanoid(), videoId, userId, 'Great start to the game!', 'general', 1.0
  );
  db.prepare('INSERT INTO comments (id, video_id, user_id, text, type, timestamp_seconds) VALUES (?, ?, ?, ?, ?, ?)').run(
    nanoid(), videoId, userId, 'Watch the positioning here.', 'tactical', 4.5
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/upload', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // Auth / Users
  app.post('/api/auth/login', (req, res) => {
    const { email, name } = req.body;
    let user = db.prepare('SELECT uid, email, name, role FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      user = { uid: nanoid(), email, name, role: 'coach' };
      db.prepare('INSERT INTO users (uid, email, name, role) VALUES (?, ?, ?, ?)').run(user.uid, user.email, user.name, user.role);
    }
    res.json(user);
  });

  app.patch('/api/users/:uid', (req, res) => {
    const { name } = req.body;
    db.prepare('UPDATE users SET name = ? WHERE uid = ?').run(name, req.params.uid);
    res.json({ success: true });
  });

  // Teams
  app.get('/api/teams', (req, res) => {
    const teams = db.prepare('SELECT id, name, created_at as createdAt FROM teams').all();
    res.json(teams);
  });

  app.get('/api/teams/:id', (req, res) => {
    const team = db.prepare('SELECT id, name, created_at as createdAt FROM teams WHERE id = ?').get(req.params.id);
    res.json(team);
  });

  app.post('/api/teams', (req, res) => {
    const { name, creatorId } = req.body;
    const id = nanoid();
    db.prepare('INSERT INTO teams (id, name) VALUES (?, ?)').run(id, name);
    db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)').run(id, creatorId, 'coach');
    res.json({ id });
  });

  app.patch('/api/teams/:id', (req, res) => {
    const { name } = req.body;
    db.prepare('UPDATE teams SET name = ? WHERE id = ?').run(name, req.params.id);
    res.json({ success: true });
  });

  // Members
  app.get('/api/teams/:id/members', (req, res) => {
    const members = db.prepare(`
      SELECT u.uid, u.email, u.name, tm.role 
      FROM team_members tm 
      JOIN users u ON tm.user_id = u.uid 
      WHERE tm.team_id = ?
    `).all(req.params.id);
    res.json(members);
  });

  app.post('/api/teams/:id/members', (req, res) => {
    const { email, name, role } = req.body;
    let user = db.prepare('SELECT uid, email, name, role FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      user = { uid: nanoid(), email, name, role: 'player' };
      db.prepare('INSERT INTO users (uid, email, name, role) VALUES (?, ?, ?, ?)').run(user.uid, user.email, user.name, user.role);
    }
    db.prepare('INSERT OR REPLACE INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)').run(req.params.id, user.uid, role);
    res.json(user);
  });

  app.delete('/api/teams/:id/members/:userId', (req, res) => {
    db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
    res.json({ success: true });
  });

  // Matches
  app.get('/api/teams/:id/matches', (req, res) => {
    const matches = db.prepare('SELECT id, team_id as teamId, opponent, date as matchDate, location, type, created_at as createdAt FROM matches WHERE team_id = ? ORDER BY date DESC').all(req.params.id);
    res.json(matches);
  });

  app.get('/api/matches/:id', (req, res) => {
    const match = db.prepare('SELECT id, team_id as teamId, opponent, date as matchDate, location, type, created_at as createdAt FROM matches WHERE id = ?').get(req.params.id);
    res.json(match);
  });

  app.post('/api/matches', (req, res) => {
    const { teamId, opponent, date, location, type } = req.body;
    const id = nanoid();
    db.prepare('INSERT INTO matches (id, team_id, opponent, date, location, type) VALUES (?, ?, ?, ?, ?, ?)').run(id, teamId, opponent, date, location, type);
    res.json({ id });
  });

  // Videos
  app.get('/api/matches/:id/videos', (req, res) => {
    const videos = db.prepare('SELECT id, match_id as matchId, title, url, type, category, duration, created_at as createdAt FROM videos WHERE match_id = ?').all(req.params.id);
    res.json(videos);
  });

  app.get('/api/videos/:id', (req, res) => {
    const video = db.prepare('SELECT id, match_id as matchId, title, url, type, category, duration, created_at as createdAt FROM videos WHERE id = ?').get(req.params.id);
    res.json(video);
  });

  app.post('/api/videos', (req, res) => {
    const { matchId, title, url, type, category, duration } = req.body;
    const id = nanoid();
    db.prepare('INSERT INTO videos (id, match_id, title, url, type, category, duration) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, matchId, title, url, type, category, duration);
    res.json({ id });
  });

  app.patch('/api/videos/:id', (req, res) => {
    const { title } = req.body;
    db.prepare('UPDATE videos SET title = ? WHERE id = ?').run(title, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/videos/:id', (req, res) => {
    db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM comments WHERE video_id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Comments
  app.get('/api/videos/:id/comments', (req, res) => {
    const comments = db.prepare(`
      SELECT c.id, c.video_id as videoId, c.user_id as userId, c.text, c.type, c.timestamp_seconds, c.created_at as createdAt, u.name as user_name 
      FROM comments c 
      JOIN users u ON c.user_id = u.uid 
      WHERE c.video_id = ? 
      ORDER BY timestamp_seconds ASC
    `).all(req.params.id);
    res.json(comments);
  });

  app.post('/api/videos/:id/comments', (req, res) => {
    const { userId, text, type, timestamp } = req.body;
    const commentId = nanoid();
    db.prepare('INSERT INTO comments (id, video_id, user_id, text, type, timestamp_seconds) VALUES (?, ?, ?, ?, ?, ?)').run(commentId, req.params.id, userId, text, type, timestamp);
    res.json({ id: commentId });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
