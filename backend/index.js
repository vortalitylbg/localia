const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');
const db = require('./database');
const multer = require('multer');

const app = express();
const PORT = 5000;
const MUSIC_DIR = path.join(__dirname, '../music');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });
        cb(null, MUSIC_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const ext = file.originalname.toLowerCase().split('.').pop();
        if (['mp3', 'flac', 'm4a'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files allowed'), false);
        }
    }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const fileName = req.file.originalname;
    const filePath = path.join(MUSIC_DIR, fileName);
    
    if (fs.existsSync(filePath)) {
        return res.status(409).json({ error: 'File already exists', fileName });
    }
    
    const tracks = await scanMusic();
    const newTrack = tracks.find(t => t.fileName === fileName);
    res.json(newTrack || { fileName, title: fileName });
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

// Profiles Endpoint - Returns all users without passwords
app.get('/api/profiles', (req, res) => {
    const users = db.prepare('SELECT id, username, group_id, is_admin FROM users').all();
    res.json(users);
});

// Function to scan music directory
async function scanMusic() {
    if (!fs.existsSync(MUSIC_DIR)) return [];
    const files = fs.readdirSync(MUSIC_DIR);
    const musicFiles = files.filter(file => 
        file.endsWith('.mp3') || file.endsWith('.flac') || file.endsWith('.m4a')
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

// User & Group Endpoints
app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT id, username, group_id, is_admin, pin IS NOT NULL as hasPin FROM users').all();
    res.json(users);
});

app.post('/api/verify-pin', (req, res) => {
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

app.post('/api/register', async (req, res) => {
    const { username, pin, groupName, groupInvite } = req.body;
    
    if (!username) return res.status(400).json({ error: "Username is required" });
    
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

        const info = db.prepare('INSERT INTO users (username, pin, group_id) VALUES (?, ?, ?)').run(username, pin || null, groupId);
        res.json({ id: info.lastInsertRowid, username, hasPin: !!pin });
    } catch (e) {
        console.error("Registration Error:", e);
        res.status(400).json({ error: e.message || "Registration failed" });
    }
});

app.get('/api/groups/:id', (req, res) => {
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
    res.json(group);
});

// User Management Endpoints
app.put('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const { username } = req.body;
    
    if (!username) return res.status(400).json({ error: "Username is required" });
    
    const info = db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, userId);
    if (info.changes === 0) return res.status(404).json({ error: "User not found" });
    
    res.json({ success: true, username });
});

app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    
    // Check if user has playlists
    const playlists = db.prepare('SELECT id FROM playlists WHERE owner_id = ?').all(userId);
    if (playlists.length > 0) {
        // Delete user's playlists and playlist tracks
        db.prepare('DELETE FROM playlist_tracks WHERE playlist_id IN (SELECT id FROM playlists WHERE owner_id = ?)').run(userId);
        db.prepare('DELETE FROM playlists WHERE owner_id = ?').run(userId);
    }
    
    const info = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    if (info.changes === 0) return res.status(404).json({ error: "User not found" });
    
    res.json({ success: true });
});

// Playlist Endpoints
app.get('/api/playlists/:userId', (req, res) => {
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

app.post('/api/playlists', (req, res) => {
    const { name, userId, isGroupShared } = req.body;
    const user = db.prepare('SELECT group_id FROM users WHERE id = ?').get(userId);
    
    const info = db.prepare(`
        INSERT INTO playlists (name, owner_id, is_group_shared, group_id) 
        VALUES (?, ?, ?, ?)
    `).run(name, userId, isGroupShared ? 1 : 0, isGroupShared ? user.group_id : null);
    
    const newPlaylist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(info.lastInsertRowid);
    res.json(newPlaylist);
});

app.delete('/api/playlists/:id', (req, res) => {
    const playlistId = req.params.id;
    db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?').run(playlistId);
    const info = db.prepare('DELETE FROM playlists WHERE id = ?').run(playlistId);
    if (info.changes === 0) return res.status(404).json({ error: "Playlist not found" });
    res.json({ success: true });
});

app.delete('/api/playlists/:id/tracks/:trackId', (req, res) => {
    const playlistId = req.params.id;
    const trackId = req.params.trackId;
    db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?').run(playlistId, trackId);
    res.json({ success: true });
});

app.put('/api/playlists/:id', (req, res) => {
    const playlistId = req.params.id;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    db.prepare('UPDATE playlists SET name = ? WHERE id = ?').run(name, playlistId);
    res.json({ success: true });
});

app.post('/api/playlists/:id/tracks', (req, res) => {
    const playlistId = req.params.id;
    const { trackId } = req.body;
    try {
        db.prepare('INSERT INTO playlist_tracks (playlist_id, track_id) VALUES (?, ?)').run(playlistId, trackId);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: "Already in playlist" });
    }
});

app.delete('/api/tracks/:fileName', (req, res) => {
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

app.get('/api/playlists/:id/tracks', async (req, res) => {
    const playlistId = req.params.id;
    const trackIds = db.prepare('SELECT track_id FROM playlist_tracks WHERE playlist_id = ?').all(playlistId);
    const allTracks = await scanMusic();
    const tracksInPlaylist = allTracks.filter(t => trackIds.some(pt => pt.track_id === t.id));
    res.json(tracksInPlaylist);
});

app.get('/api/tracks', async (req, res) => {
    try {
        const tracks = await scanMusic();
        res.json(tracks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stream/:fileName', (req, res) => {
    const fileName = req.params.fileName;
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

app.get('/api/cover/:fileName', async (req, res) => {
    const fileName = req.params.fileName;
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

app.listen(PORT, () => {
    console.log(`Localify backend running at http://localhost:${PORT}`);
    if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR);
});
