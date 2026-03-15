const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'localify.db'));

// Migration pour mettre à jour le type de colonnes si nécessaire
try {
  // Vérifier si track_plays existe et a le bon type de colonnes
  const trackPlaysInfo = db.prepare("PRAGMA table_info(track_plays)").all();
  if (trackPlaysInfo.length === 0) {
    // Recréer les tables si elles n'existent pas
    db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        invite_code TEXT UNIQUE
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        pin TEXT,
        group_id INTEGER,
        is_admin BOOLEAN DEFAULT 0,
        FOREIGN KEY (group_id) REFERENCES groups(id)
      );

      CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        owner_id INTEGER,
        is_group_shared BOOLEAN DEFAULT 0,
        group_id INTEGER,
        FOREIGN KEY (owner_id) REFERENCES users(id),
        FOREIGN KEY (group_id) REFERENCES groups(id)
      );

      CREATE TABLE IF NOT EXISTS playlist_tracks (
        playlist_id INTEGER,
        track_id TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (playlist_id, track_id),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id)
      );

      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT NOT NULL,
        fileName TEXT UNIQUE NOT NULL,
        duration INTEGER,
        hasPicture BOOLEAN DEFAULT 0,
        playCount INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS track_plays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trackId TEXT,
        userId INTEGER,
        duration INTEGER DEFAULT 0,
        playedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS user_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER UNIQUE,
        totalListenTime INTEGER DEFAULT 0,
        totalPlays INTEGER DEFAULT 0,
        lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS auth_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
  } else {
    // Migration: modifier le type de trackId si c'est un INTEGER
    const trackPlaysInfo = db.prepare("PRAGMA table_info(track_plays)").all();
    const trackIdColumn = trackPlaysInfo.find(c => c.name === 'trackId');
    if (trackIdColumn && trackIdColumn.type === 'INTEGER') {
      db.exec("ALTER TABLE track_plays RENAME TO track_plays_old");
      db.exec(`
        CREATE TABLE IF NOT EXISTS track_plays (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trackId TEXT,
          userId INTEGER,
          duration INTEGER DEFAULT 0,
          playedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        );
      `);
      // Copier les données si la table n'est pas vide
      const oldData = db.prepare("SELECT * FROM track_plays_old").all();
      if (oldData.length > 0) {
        const insert = db.prepare("INSERT INTO track_plays (trackId, userId, playedAt, duration) VALUES (?, ?, ?, 0)");
        for (const row of oldData) {
          insert.run(String(row.trackId), row.userId, row.playedAt);
        }
      }
      db.exec("DROP TABLE track_plays_old");
    } else {
      // Add duration column if it doesn't exist
      const durationCol = trackPlaysInfo.find(c => c.name === 'duration');
      if (!durationCol) {
        db.exec("ALTER TABLE track_plays ADD COLUMN duration INTEGER DEFAULT 0");
      }
    }
    
    // Migration: modifier le type de tracks.id si c'est un INTEGER
    const tracksInfo = db.prepare("PRAGMA table_info(tracks)").all();
    const idColumn = tracksInfo.find(c => c.name === 'id');
    if (idColumn && idColumn.type === 'INTEGER') {
      db.exec("ALTER TABLE tracks RENAME TO tracks_old");
      db.exec(`
        CREATE TABLE IF NOT EXISTS tracks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          album TEXT NOT NULL,
          fileName TEXT UNIQUE NOT NULL,
          duration INTEGER,
          hasPicture BOOLEAN DEFAULT 0,
          playCount INTEGER DEFAULT 0
        );
      `);
      // Copier les données
      const oldTracks = db.prepare("SELECT * FROM tracks_old").all();
      const insertTrack = db.prepare("INSERT OR IGNORE INTO tracks (id, title, artist, album, fileName, duration, hasPicture, playCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      for (const row of oldTracks) {
        const trackId = Buffer.from(row.fileName).toString('base64');
        insertTrack.run(trackId, row.title, row.artist, row.album, row.fileName, row.duration, row.hasPicture, row.playCount);
      }
      db.exec("DROP TABLE tracks_old");
    }
  }
} catch (e) {
  console.error("Migration error:", e);
}

module.exports = db;
