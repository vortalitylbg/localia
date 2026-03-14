const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');
const db = require('./database');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const MUSIC_DIR = path.join(__dirname, '../music');
const JWT_SECRET = process.env.JWT_SECRET || 'localify-dev-secret-change-in-production';
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000;

const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.') || origin.startsWith('http://10.') || origin.startsWith('http://172.')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const optionalAuth = (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    token = req.query.token;
  }
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  const tokenRecord = db.prepare(`
    SELECT auth_tokens.user_id, auth_tokens.expires_at 
    FROM auth_tokens WHERE token = ?
  `).get(token);

  if (!tokenRecord || new Date(tokenRecord.expires_at) < new Date()) {
    req.user = null;
    return next();
  }

  const user = db.prepare('SELECT id, username, group_id, is_admin FROM users WHERE id = ?').get(tokenRecord.user_id);
  req.user = user || null;
  next();
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  
  const tokenRecord = db.prepare(`
    SELECT auth_tokens.user_id, auth_tokens.expires_at 
    FROM auth_tokens WHERE token = ?
  `).get(token);

  if (!tokenRecord) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(token);
    return res.status(401).json({ error: 'Token expired' });
  }

  const user = db.prepare('SELECT id, username, group_id, is_admin FROM users WHERE id = ?').get(tokenRecord.user_id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });
        cb(null, MUSIC_DIR);
    },
    filename: (req, file, cb) => {
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, sanitized);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = file.originalname.toLowerCase().split('.').pop();
        if (['mp3', 'flac', 'm4a', 'wav', 'ogg'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files allowed'), false);
        }
    }
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

app.get('/api/ping', (req, res) => res.json({ status: 'ok' }));

app.post('/api/login', async (req, res) => {
  const { username, pin } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.pin) {
    if (!pin) {
      return res.status(401).json({ error: 'PIN required for this user' });
    }
    const isHashed = user.pin.length === 60 && user.pin.startsWith('$2');
    let pinMatch = false;
    if (isHashed) {
      pinMatch = await bcrypt.compare(pin, user.pin);
    } else {
      pinMatch = user.pin === pin;
      if (pinMatch) {
        const hashedPin = await bcrypt.hash(pin, 10);
        db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(hashedPin, user.id);
      }
    }
    if (!pinMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY).toISOString();
  
  db.prepare('INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

  res.json({
    token,
    user: { id: user.id, username: user.username, group_id: user.group_id, is_admin: user.is_admin }
  });
});

app.post('/api/logout', authenticate, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];
  db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(token);
  res.json({ success: true });
});

app.get('/api/profiles', optionalAuth, (req, res) => {
    const users = db.prepare('SELECT id, username, group_id, is_admin FROM users').all();
    res.json(users);
});

app.get('/api/users', optionalAuth, (req, res) => {
    const users = db.prepare('SELECT id, username, group_id, is_admin, pin IS NOT NULL as hasPin FROM users').all();
    res.json(users);
});

async function scanMusic() {
    if (!fs.existsSync(MUSIC_DIR)) return [];
    const files = fs.readdirSync(MUSIC_DIR);
    const musicFiles = files.filter(file => 
        file.endsWith('.mp3') || file.endsWith('.flac') || file.endsWith('.m4a') || file.endsWith('.wav') || file.endsWith('.ogg')
    );

    const tracks = [];
    for (const file of musicFiles) {
        const filePath = path.join(MUSIC_DIR, file);
        try {
            const metadata = await mm.parseFile(filePath);
            tracks.push({
                id: Buffer.from(file).toString('base64'),
                title: metadata.common.title || file,
                artist: metadata.common.artist || 'Unknown Artist',
                album: metadata.common.album || 'Unknown Album',
                duration: metadata.format.duration,
                fileName: file,
                hasPicture: !!metadata.common.picture && metadata.common.picture.length > 0
            });
        } catch (err) {
            tracks.push({
                id: Buffer.from(file).toString('base64'),
                title: file,
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                fileName: file
            });
        }
    }
    return tracks;
}

app.get('/api/users', authenticate, (req, res) => {
    const users = db.prepare('SELECT id, username, group_id, is_admin, pin IS NOT NULL as hasPin FROM users').all();
    res.json(users);
});

app.post('/api/verify-pin', authenticate, (req, res) => {
    const { userId, pin } = req.body;
    if (!userId || !pin) return res.status(400).json({ error: "Missing userId or pin" });
    
    const user = db.prepare('SELECT pin FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    if (user.pin === pin) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: "Invalid PIN" });
    }
});

app.post('/api/register', optionalAuth, async (req, res) => {
    const { username, pin, groupName, groupInvite } = req.body;
    
    if (!username || username.trim().length < 2 || username.length > 20) {
      return res.status(400).json({ error: "Username must be 2-20 characters" });
    }
    
    if (pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
        return res.status(400).json({ error: "PIN must be exactly 4 digits" });
    }
    
    try {
        let groupId = null;

        if (groupName) {
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const groupInfo = db.prepare('INSERT INTO groups (name, invite_code) VALUES (?, ?)').run(groupName, inviteCode);
            groupId = groupInfo.lastInsertRowid;
        } else if (groupInvite) {
            const group = db.prepare('SELECT id FROM groups WHERE invite_code = ?').get(groupInvite.toUpperCase());
            if (!group) return res.status(404).json({ error: "Invalid invite code" });
            groupId = group.id;
        }

        const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;
        const info = db.prepare('INSERT INTO users (username, pin, group_id) VALUES (?, ?, ?)').run(username.trim(), hashedPin, groupId);
        res.json({ id: info.lastInsertRowid, username: username.trim(), hasPin: !!pin });
    } catch (e) {
        console.error("Registration Error:", e);
        if (e.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: "Username already exists" });
        }
        res.status(400).json({ error: e.message || "Registration failed" });
    }
});

app.get('/api/groups/:id', authenticate, (req, res) => {
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
    res.json(group);
});

app.put('/api/users/:id', authenticate, (req, res) => {
    const userId = req.params.id;
    const { username } = req.body;
    
    if (req.user.id !== parseInt(userId) && !req.user.is_admin) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: "Username is required" });
    }
    
    try {
      const info = db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username.trim(), userId);
      if (info.changes === 0) return res.status(404).json({ error: "User not found" });
      res.json({ success: true, username: username.trim() });
    } catch (e) {
      if (e.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: "Username already exists" });
      }
      res.status(400).json({ error: e.message });
    }
});

app.delete('/api/users/:id', authenticate, (req, res) => {
    const userId = req.params.id;
    
    if (req.user.id !== parseInt(userId) && !req.user.is_admin) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const playlists = db.prepare('SELECT id FROM playlists WHERE owner_id = ?').all(userId);
    if (playlists.length > 0) {
        db.prepare('DELETE FROM playlist_tracks WHERE playlist_id IN (SELECT id FROM playlists WHERE owner_id = ?)').run(userId);
        db.prepare('DELETE FROM playlists WHERE owner_id = ?').run(userId);
    }
    
    db.prepare('DELETE FROM auth_tokens WHERE user_id = ?').run(userId);
    const info = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    if (info.changes === 0) return res.status(404).json({ error: "User not found" });
    
    res.json({ success: true });
});

app.get('/api/playlists/:userId', authenticate, (req, res) => {
    const userId = req.params.userId;
    const user = db.prepare('SELECT group_id FROM users WHERE id = ?').get(userId);
    
    let playlists;
    if (user && user.group_id) {
        playlists = db.prepare(`
            SELECT * FROM playlists 
            WHERE owner_id = ? 
            OR (is_group_shared = 1 AND group_id = ?)
        `).all(userId, user.group_id);
    } else {
        playlists = db.prepare('SELECT * FROM playlists WHERE owner_id = ?').all(userId);
    }
    res.json(playlists);
});

app.post('/api/playlists', authenticate, (req, res) => {
    const { name, userId, isGroupShared } = req.body;
    
    if (!name || name.trim().length < 1) {
      return res.status(400).json({ error: "Playlist name is required" });
    }
    
    const user = db.prepare('SELECT group_id FROM users WHERE id = ?').get(userId);
    
    const info = db.prepare(`
        INSERT INTO playlists (name, owner_id, is_group_shared, group_id) 
        VALUES (?, ?, ?, ?)
    `).run(name.trim(), userId, isGroupShared ? 1 : 0, isGroupShared ? user?.group_id : null);
    
    const newPlaylist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(info.lastInsertRowid);
    res.json(newPlaylist);
});

app.delete('/api/playlists/:id', authenticate, (req, res) => {
    const playlistId = req.params.id;
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
    
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    if (playlist.owner_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?').run(playlistId);
    db.prepare('DELETE FROM playlists WHERE id = ?').run(playlistId);
    res.json({ success: true });
});

app.delete('/api/playlists/:id/tracks/:trackId', authenticate, (req, res) => {
    const playlistId = req.params.id;
    const trackId = req.params.trackId;
    db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?').run(playlistId, trackId);
    res.json({ success: true });
});

app.put('/api/playlists/:id', authenticate, (req, res) => {
    const playlistId = req.params.id;
    const { name } = req.body;
    
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    if (playlist.owner_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    if (!name || name.trim().length < 1) {
      return res.status(400).json({ error: "Name is required" });
    }
    
    db.prepare('UPDATE playlists SET name = ? WHERE id = ?').run(name.trim(), playlistId);
    res.json({ success: true });
});

app.post('/api/playlists/:id/tracks', authenticate, (req, res) => {
    const playlistId = req.params.id;
    const { trackId } = req.body;
    
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    if (playlist.owner_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    try {
        db.prepare('INSERT INTO playlist_tracks (playlist_id, track_id) VALUES (?, ?)').run(playlistId, trackId);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: "Already in playlist" });
    }
});

app.delete('/api/tracks/:fileName', authenticate, requireAdmin, (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(MUSIC_DIR, fileName);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }
    
    try {
        fs.unlinkSync(filePath);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Could not delete file" });
    }
});

app.get('/api/playlists/:id/tracks', authenticate, async (req, res) => {
    const playlistId = req.params.id;
    const trackIds = db.prepare('SELECT track_id FROM playlist_tracks WHERE playlist_id = ?').all(playlistId);
    const allTracks = await scanMusic();
    const tracksInPlaylist = allTracks.filter(t => trackIds.some(pt => pt.track_id === t.id));
    res.json(tracksInPlaylist);
});

app.get('/api/tracks', optionalAuth, async (req, res) => {
    try {
        const tracks = await scanMusic();
        res.json(tracks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stream/:fileName', optionalAuth, (req, res) => {
    const fileName = req.params.fileName;
    const token = req.query.token;
    
    if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ error: "Invalid filename" });
    }
    
    const filePath = path.join(MUSIC_DIR, fileName);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': fileName.endsWith('.flac') ? 'audio/flac' : 'audio/mpeg',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': fileName.endsWith('.flac') ? 'audio/flac' : 'audio/mpeg',
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
    }
});

app.get('/api/cover/:fileName', optionalAuth, async (req, res) => {
    const fileName = req.params.fileName;
    
    if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ error: "Invalid filename" });
    }
    
    const filePath = path.join(MUSIC_DIR, fileName);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

    try {
        const metadata = await mm.parseFile(filePath);
        if (metadata.common.picture && metadata.common.picture.length > 0) {
            const picture = metadata.common.picture[0];
            res.set('Content-Type', picture.format);
            res.send(picture.data);
        } else {
            res.status(404).send('No cover art');
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/upload', authenticate, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const fileName = req.file.filename;
    const filePath = path.join(MUSIC_DIR, fileName);
    
    if (!fs.existsSync(filePath)) {
        return res.status(400).json({ error: 'File was not saved properly' });
    }
    
    const tracks = await scanMusic();
    const track = tracks.find(t => t.fileName === fileName);
    
    if (track) {
        res.json({ id: track.id, title: track.title, artist: track.artist, album: track.album, hasPicture: track.hasPicture });
    } else {
        res.json({ id: Buffer.from(fileName).toString('base64'), title: fileName, artist: 'Unknown Artist', album: 'Unknown Album', hasPicture: false });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Localify backend running on http://0.0.0.0:${PORT}`);
    if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR);
});
