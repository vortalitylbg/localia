import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, Search as SearchIcon, Home, Library, PlusSquare, 
  Music, Settings, User as UserIcon, Plus, ArrowLeft, Shuffle, Repeat, Sliders, Disc, User, Heart, ListMusic, Upload, LogOut, Camera, X
} from 'lucide-react';
import clsx from 'clsx';

const API_BASE = 'http://127.0.0.1:5000/api';

const getStreamUrl = (fileName) => {
  const token = localStorage.getItem('localify_token');
  return `${API_BASE}/stream/${encodeURIComponent(fileName)}${token ? `?token=${token}` : ''}`;
};

const getCoverUrl = (fileName) => {
  const token = localStorage.getItem('localify_token');
  return `${API_BASE}/cover/${encodeURIComponent(fileName)}${token ? `?token=${token}` : ''}`;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('localify_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const apiFetch = async (url, options = {}) => {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('localify_token');
    localStorage.removeItem('localify_user');
    window.location.reload();
    return null;
  }
  return res;
};

function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  const sizeClasses = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />
      <div className={clsx("relative bg-[#181818] rounded-xl shadow-2xl w-full mx-4 animate-scale-in", sizeClasses[size])}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('localify_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [userAvatar, setUserAvatar] = useState(() => {
    try { return localStorage.getItem('localify_avatar') || null; } catch { return null; }
  });
  const [users, setUsers] = useState([]);
  const [view, setView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [pinForProfile, setPinForProfile] = useState(null);
  const [enteredPin, setEnteredPin] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0);
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('localify_language');
    if (saved) return saved;
    return navigator.language.split('-')[0] === 'fr' ? 'fr' : 'en';
  });
  const [favoritesPlaylist, setFavoritesPlaylist] = useState(null);
  const [currentPlayList, setCurrentPlayList] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  
  const audioRef = useRef(new Audio());
  const avatarInputRef = useRef(null);

  const equalizerPresets = {
    flat: { name: 'Flat', values: [0, 0, 0, 0, 0] },
    bass: { name: 'Bass', values: [6, 4, 2, 0, 0] },
    treble: { name: 'Treble', values: [0, 0, 2, 4, 6] },
    vocal: { name: 'Vocal', values: [-2, 0, 4, 2, 0] },
    rock: { name: 'Rock', values: [5, 3, -1, 2, 4] },
    electronic: { name: 'Electronic', values: [4, 2, 0, 3, 5] },
  };
  const [equalizerValues, setEqualizerValues] = useState([0, 0, 0, 0, 0]);
  const [equalizerPreset, setEqualizerPreset] = useState('flat');

  const t = (key) => {
    const trans = {
      en: { home: 'Home', search: 'Search', library: 'Library', playlists: 'Playlists', createPlaylist: 'Create playlist', favorites: 'Favorites', goodEvening: 'Good evening', songs: 'Songs', albums: 'Albums', artists: 'Artists', play: 'Play', settings: 'Settings', language: 'Language', equalizer: 'Equalizer', account: 'Account', searchPlaceholder: 'What do you want to listen to?' },
      fr: { home: 'Accueil', search: 'Rechercher', library: 'Bibliothèque', playlists: 'Playlists', createPlaylist: 'Créer une playlist', favorites: 'Favoris', goodEvening: 'Bonsoir', songs: 'Chansons', albums: 'Albums', artists: 'Artistes', play: 'Lire', settings: 'Paramètres', language: 'Langue', equalizer: 'Égaliseur', account: 'Compte', searchPlaceholder: 'Qu\'écouter ?' }
    };
    return trans[language]?.[key] || trans.en[key] || key;
  };

  useEffect(() => { localStorage.setItem('localify_language', language); }, [language]);

  useEffect(() => { 
    apiFetch('/users').then(r => r?.json()).then(setUsers).catch(() => {}); 
    apiFetch('/tracks').then(r => r?.json()).then(data => { if (data) { setTracks(data); setCurrentPlayList(data); } }).catch(() => {});
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('localify_user');
    const token = localStorage.getItem('localify_token');
    if (saved && token) {
      try {
        const user = JSON.parse(saved);
        apiFetch('/users').then(r => r?.json()).then(data => {
          if (data?.find(u => u.id === user.id)) setCurrentUser(user);
          else {
            localStorage.removeItem('localify_token');
            localStorage.removeItem('localify_user');
          }
        });
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('localify_user', JSON.stringify(currentUser));
      apiFetch(`/playlists/${currentUser.id}`).then(r => r?.json()).then(data => {
        if (data) {
          setPlaylists(data);
          const fav = data.find(p => p.name === 'Favorites');
          if (fav) setFavoritesPlaylist(fav);
        }
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const a = audioRef.current;
    const onTime = () => setCurrentTime(a.currentTime);
    const onLoad = () => setDuration(a.duration);
    const onEnd = () => handleNext();
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onLoad);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onLoad);
      a.removeEventListener('ended', onEnd);
    };
  }, [currentPlayList]);

  useEffect(() => { audioRef.current.volume = volume; }, [volume]);

  const playTrack = (track, list = null) => {
    const playlist = list || currentPlayList || tracks;
    setCurrentPlayList(playlist);
    
    if (currentTrack?.id === track.id) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(() => {});
      setIsPlaying(!isPlaying);
      return;
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    audioRef.current.src = `getStreamUrl${encodeURIComponent(track.fileName)}`;
    audioRef.current.play().catch(() => {});
    setRecentlyPlayed(prev => [track, ...prev.filter(t => t.id !== track.id)].slice(0, 20));
  };

  const handleNext = () => {
    const list = currentPlayList.length > 0 ? currentPlayList : tracks;
    if (list.length === 0) return;
    let nextIndex = isShuffle ? Math.floor(Math.random() * list.length) : list.findIndex(t => t.id === currentTrack?.id) + 1;
    if (nextIndex >= list.length) nextIndex = repeatMode === 'off' ? -1 : 0;
    if (nextIndex >= 0) playTrack(list[nextIndex], list);
    else setIsPlaying(false);
  };

  const handlePrev = () => {
    const list = currentPlayList.length > 0 ? currentPlayList : tracks;
    if (list.length === 0) return;
    if (audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    const idx = list.findIndex(t => t.id === currentTrack?.id);
    playTrack(list[idx > 0 ? idx - 1 : list.length - 1], list);
  };

  const toggleFavorite = async (track) => {
    if (!favoritesPlaylist) {
      const res = await apiFetch('/playlists', { method: 'POST', body: JSON.stringify({ name: 'Favorites', userId: currentUser.id }) });
      const newP = await res.json();
      setPlaylists(prev => [...prev, newP]);
      setFavoritesPlaylist(newP);
      await apiFetch(`/playlists/${newP.id}/tracks`, { method: 'POST', body: JSON.stringify({ trackId: track.id }) });
      return;
    }
    const isFav = playlistTracks.some(t => t.id === track.id);
    if (isFav) await apiFetch(`${favoritesPlaylist.id}/tracks/${encodeURIComponent(track.id)}`, { method: 'DELETE' });
    else await apiFetch(`${favoritesPlaylist.id}/tracks`, { method: 'POST', body: JSON.stringify({ trackId: track.id }) });
    const res = await apiFetch(`${favoritesPlaylist.id}/tracks`);
    setPlaylistTracks(await res.json());
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    apiFetch('/playlists', { method: 'POST', body: JSON.stringify({ name: newPlaylistName, userId: currentUser.id }) })
      .then(() => apiFetch(`/playlists/${currentUser.id}`).then(r => r?.json()).then(setPlaylists))
      .then(() => { setShowPlaylistModal(false); setNewPlaylistName(''); });
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setUserAvatar(ev.target.result); localStorage.setItem('localify_avatar', ev.target.result); };
    reader.readAsDataURL(file);
  };

  const getUniqueAlbums = () => {
    const map = new Map();
    tracks.forEach(t => { if (!map.has(t.album)) map.set(t.album, { name: t.album, artist: t.artist, cover: t.hasPicture ? t : null }); });
    return Array.from(map.values());
  };

  const getUniqueArtists = () => {
    const map = new Map();
    tracks.forEach(t => { if (!map.has(t.artist)) map.set(t.artist, { name: t.artist, cover: t.hasPicture ? t : null }); });
    return Array.from(map.values());
  };

  const getAlbumTracks = (albumName) => tracks.filter(t => t.album === albumName);
  const getArtistAlbums = (artistName) => {
    const map = new Map();
    tracks.filter(t => t.artist === artistName).forEach(t => { if (!map.has(t.album)) map.set(t.album, { name: t.album, artist: t.artist, cover: t.hasPicture ? t : null }); });
    return Array.from(map.values());
  };
  const getArtistTracks = (artistName) => tracks.filter(t => t.artist === artistName);

  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);

  const applyPreset = (key) => {
    const preset = equalizerPresets[key];
    if (preset) { setEqualizerPreset(key); setEqualizerValues(preset.values); }
  };

  if (!currentUser) {
    const handleSelect = async (user) => {
      if (user.hasPin) { setPinForProfile(user); setShowPinModal(true); setEnteredPin(['','','','']); setPinError(''); }
      else {
        const res = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ username: user.username, pin: '' }) });
        const d = await res.json();
        if (d.token) {
          localStorage.setItem('localify_token', d.token);
          setCurrentUser(d.user);
        }
      }
    };
    const handlePinSubmit = async () => {
      const pin = enteredPin.join('');
      if (pin.length !== 4) { setPinError('4 digits'); return; }
      const res = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ username: pinForProfile.username, pin }) });
      const d = await res.json();
      if (d.token) { 
        localStorage.setItem('localify_token', d.token);
        setShowPinModal(false); 
        setCurrentUser(d.user); 
      } else setPinError(d.error || 'Wrong PIN');
    };
    return (
      <div className="h-screen bg-gradient-to-b from-[#1a1625] to-[#0d0d12] flex flex-col overflow-hidden">
        <audio ref={audioRef} />
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center"><Music className="w-6 h-6 text-black" /></div>
            <span className="text-2xl font-black">Localify</span>
          </div>
          <button onClick={() => setShowRegister(!showRegister)} className="text-sm font-semibold text-white bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-full">{showRegister ? 'Sign In' : 'Create Account'}</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          {!showRegister ? (
            users.length === 0 ? (
              <div className="text-center"><p className="text-2xl font-bold text-white mb-2">No profiles</p><button onClick={() => setShowRegister(true)} className="bg-brand-primary text-black font-bold py-3 px-10 rounded-full">Create Account</button></div>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 text-sm uppercase tracking-widest mb-8">Who's listening?</p>
                <div className="flex items-center justify-center gap-6 mb-8">
                  {users.map((u, i) => (
                    <button key={u.id} onClick={() => handleSelect(u)} className={clsx("flex flex-col items-center gap-4 transition-all", i === selectedProfileIndex ? 'scale-100' : 'scale-75 opacity-50')}>
                      <div className={clsx("w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold", i === selectedProfileIndex ? 'bg-brand-primary text-black' : 'bg-white/10 text-white')}>{u.username[0].toUpperCase()}</div>
                      <span className={clsx("font-semibold", i === selectedProfileIndex ? 'text-white text-xl' : 'text-gray-500')}>{u.username}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => users[selectedProfileIndex] && handleSelect(users[selectedProfileIndex])} className="bg-brand-primary hover:bg-[#1ed760] text-black font-bold py-3 px-12 rounded-full">{t('play')}</button>
              </div>
            )
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); apiFetch('/register', { method: 'POST', body: JSON.stringify({ username: fd.get('username') }) }).then(r => r.json()).then(r => { 
              if (r.id) { 
                apiFetch('/login', { method: 'POST', body: JSON.stringify({ username: r.username, pin: '' }) }).then(lr => lr.json()).then(lr => {
                  if (lr.token) {
                    localStorage.setItem('localify_token', lr.token);
                    setCurrentUser(lr.user);
                    setShowRegister(false);
                  }
                });
              } 
            }); }} className="space-y-4 w-80">
              <h2 className="text-2xl font-bold text-white">Create account</h2>
              <input name="username" placeholder="Username" required maxLength={20} className="w-full bg-white/10 border border-white/10 p-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary" />
              <button type="submit" className="w-full bg-brand-primary text-black font-bold py-3 rounded-full">Create</button>
            </form>
          )}
        </div>
        <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} title="Enter PIN">
          <div className="text-center py-4">
            <p className="text-white mb-4">{pinForProfile?.username}</p>
            <div className="flex justify-center gap-2 mb-4">
              {enteredPin.map((d, i) => <input key={i} type="text" inputMode="numeric" maxLength={1} value={d} onChange={(e) => { const v = e.target.value.replace(/\D/g,''); const n = [...enteredPin]; n[i] = v; setEnteredPin(n); if (v && i < 3) document.getElementById(`p${i+1}`)?.focus(); }} id={`p${i}`} className="w-12 h-14 bg-white/10 border border-white/10 rounded-lg text-white text-center text-xl" autoFocus={i===0} />)}
            </div>
            {pinError && <p className="text-red-400 text-sm mb-4">{pinError}</p>}
            <button onClick={handlePinSubmit} className="w-full bg-brand-primary text-black font-bold py-3 rounded-full">Continue</button>
          </div>
        </Modal>
      </div>
    );
  }

  const renderContent = () => {
    if (view === 'settings') return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-white mb-6">{t('settings')}</h1>
        <div className="bg-[#181818] rounded-xl p-6 mb-4">
          <h2 className="text-xl font-bold text-white mb-4">{t('language')}</h2>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full max-w-xs bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white">
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>
        <div className="bg-[#181818] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">{t('equalizer')}</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(equalizerPresets).map(([k, p]) => <button key={k} onClick={() => applyPreset(k)} className={clsx("px-4 py-2 rounded-full text-sm", equalizerPreset === k ? 'bg-brand-primary text-black' : 'bg-white/10 text-white')}>{p.name}</button>)}
          </div>
        </div>
      </div>
    );

    const album = selectedAlbum;
    const artist = selectedArtist;

    if (view === 'album' && album) {
      const albumTracks = getAlbumTracks(album.name);
      return (
        <div className="pb-8">
          <div className="flex items-end gap-6 p-6 bg-gradient-to-b from-white/20 to-transparent">
            <div className="w-52 h-52 bg-gray-800 rounded-lg overflow-hidden">{album.cover ? <img src={`getCoverUrl${encodeURIComponent(album.cover.fileName)}`} className="w-full h-full object-cover" /> : <Disc className="w-20 h-20 text-gray-600 m-auto" />}</div>
            <div><p className="text-white text-sm uppercase">Album</p><h1 className="text-4xl font-black text-white">{album.name}</h1><p className="text-white">{album.artist}</p></div>
          </div>
          <div className="flex items-center gap-4 p-6"><button onClick={() => albumTracks[0] && playTrack(albumTracks[0], albumTracks)} className="w-14 h-14 bg-brand-primary rounded-full flex items-center justify-center hover:scale-105"><Play className="w-7 h-7 text-black ml-1" /></button></div>
          <div className="px-6">{albumTracks.map((t, i) => <div key={t.id} onClick={() => playTrack(t, albumTracks)} className={clsx("flex items-center gap-4 py-2 px-3 rounded-md hover:bg-white/5 cursor-pointer", currentTrack?.id === t.id ? 'bg-white/10' : '')}><span className="w-8 text-center text-gray-500">{i+1}</span><div className="flex-1"><p className={clsx("truncate", currentTrack?.id === t.id ? 'text-brand-primary' : 'text-white')}>{t.title}</p></div><span className="text-gray-500">{Math.floor(t.duration/60)}:{String(Math.floor(t.duration%60)).padStart(2,'0')}</span></div>)}</div>
        </div>
      );
    }

    if (view === 'artist' && artist) {
      const aTracks = getArtistTracks(artist.name);
      const aAlbums = getArtistAlbums(artist.name);
      return (
        <div className="pb-8">
          <div className="flex items-end gap-6 p-6 bg-gradient-to-b from-white/20 to-transparent">
            <div className="w-52 h-52 bg-gray-800 rounded-full overflow-hidden">{artist.cover ? <img src={`getCoverUrl${encodeURIComponent(artist.cover.fileName)}`} className="w-full h-full object-cover" /> : <User className="w-24 h-24 text-gray-600 m-auto" />}</div>
            <div><p className="text-white text-sm uppercase">Artist</p><h1 className="text-4xl font-black text-white">{artist.name}</h1></div>
          </div>
          <div className="flex items-center gap-4 p-6"><button onClick={() => aTracks[0] && playTrack(aTracks[0], aTracks)} className="w-14 h-14 bg-brand-primary rounded-full flex items-center justify-center hover:scale-105"><Play className="w-7 h-7 text-black ml-1" /></button></div>
          <div className="px-6"><h2 className="text-xl font-bold text-white mb-4">{t('songs')}</h2>{aTracks.slice(0,10).map((t, i) => <div key={t.id} onClick={() => playTrack(t, aTracks)} className={clsx("flex items-center gap-4 py-2 px-3 rounded-md hover:bg-white/5 cursor-pointer", currentTrack?.id === t.id ? 'bg-white/10' : '')}><span className="w-8 text-center text-gray-500">{i+1}</span><div className="flex-1"><p className={clsx("truncate", currentTrack?.id === t.id ? 'text-brand-primary' : 'text-white')}>{t.title}</p></div><span className="text-gray-500">{Math.floor(t.duration/60)}:{String(Math.floor(t.duration%60)).padStart(2,'0')}</span></div>)}
          <h2 className="text-xl font-bold text-white mt-8 mb-4">{t('albums')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{aAlbums.map(a => <div key={a.name} onClick={() => { setSelectedAlbum(a); setView('album'); }} className="p-3 bg-[#181818] hover:bg-white/10 rounded-lg cursor-pointer"><div className="w-full aspect-square bg-gray-800 rounded mb-3">{a.cover ? <img src={`getCoverUrl${encodeURIComponent(a.cover.fileName)}`} className="w-full h-full object-cover" /> : <Disc className="w-12 h-12 text-gray-600 m-auto" />}</div><p className="text-white truncate">{a.name}</p></div>)}</div></div></div>
      );
    }

    if (view === 'playlist' && activePlaylist) {
      return (
        <div className="pb-8">
          <div className="flex items-end gap-6 p-6 bg-gradient-to-b from-white/20 to-transparent">
            <div className="w-52 h-52 bg-gray-800 rounded-lg overflow-hidden"><ListMusic className="w-20 h-20 text-gray-600 m-auto" /></div>
            <div><p className="text-white text-sm uppercase">{t('playlists')}</p><h1 className="text-4xl font-black text-white">{activePlaylist.name}</h1><p className="text-gray-400">{playlistTracks.length} {t('songs')}</p></div>
          </div>
          <div className="flex items-center gap-4 p-6"><button onClick={() => playlistTracks[0] && playTrack(playlistTracks[0], playlistTracks)} className="w-14 h-14 bg-brand-primary rounded-full flex items-center justify-center hover:scale-105"><Play className="w-7 h-7 text-black ml-1" /></button><button onClick={() => { if (playlistTracks.length) { const s = [...playlistTracks].sort(() => Math.random() - 0.5); playTrack(s[0], s); }}} className="text-gray-400 hover:text-white"><Shuffle className="w-6 h-6" /></button></div>
          <div className="px-6">{playlistTracks.map((t, i) => <div key={t.id} onClick={() => playTrack(t, playlistTracks)} className={clsx("flex items-center gap-4 py-2 px-3 rounded-md hover:bg-white/5 cursor-pointer", currentTrack?.id === t.id ? 'bg-white/10' : '')}><span className="w-8 text-center text-gray-500">{i+1}</span><div className="flex-1"><p className={clsx("truncate", currentTrack?.id === t.id ? 'text-brand-primary' : 'text-white')}>{t.title}</p><p className="text-gray-400 text-sm truncate">{t.artist}</p></div><button onClick={(e) => { e.stopPropagation(); toggleFavorite(t); }} className="text-gray-400 hover:text-white"><Heart className={clsx("w-5 h-5", playlistTracks.some(x => x.id === t.id) ? 'fill-red-500 text-red-500' : '')} /></button><span className="text-gray-500">{Math.floor(t.duration/60)}:{String(Math.floor(t.duration%60)).padStart(2,'0')}</span></div>)}</div>
        </div>
      );
    }

    const isLibrary = view === 'library' || view === 'library-songs' || view === 'library-albums' || view === 'library-artists';

    return (
      <div className="pb-8">
        {view === 'home' && (
          <>
            <h1 className="text-3xl font-bold text-white mb-6 px-6">{t('goodEvening')}</h1>
            {recentlyPlayed.length > 0 && <div className="mb-8 px-6"><h2 className="text-xl font-bold text-white mb-4">Recently played</h2><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{recentlyPlayed.slice(0,6).map(t => <div key={t.id} onClick={() => playTrack(t)} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer"><div className="w-12 h-12 bg-gray-800 rounded">{t.hasPicture ? <img src={`getCoverUrl${encodeURIComponent(t.fileName)}`} className="w-full h-full object-cover" /> : <Disc className="w-6 h-6 text-gray-600 m-auto" />}</div><p className="text-white truncate flex-1">{t.title}</p></div>)}</div></div>}
            <div className="mb-8 px-6"><h2 className="text-xl font-bold text-white mb-4">{t('songs')}</h2><div className="flex items-center gap-4 mb-4"><button onClick={() => tracks[0] && playTrack(tracks[0], tracks)} className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center hover:scale-105"><Play className="w-6 h-6 text-black ml-1" /></button></div><div className="space-y-1">{tracks.slice(0, 20).map((t, i) => <div key={t.id} onClick={() => playTrack(t, tracks)} className={clsx("flex items-center gap-4 py-2 px-3 rounded-md hover:bg-white/5 cursor-pointer", currentTrack?.id === t.id ? 'bg-white/10' : '')}><span className="w-8 text-center text-gray-500">{i+1}</span><div className="w-10 h-10 bg-gray-800 rounded flex-shrink-0">{t.hasPicture ? <img src={`getCoverUrl${encodeURIComponent(t.fileName)}`} className="w-full h-full object-cover" /> : <Music className="w-5 h-5 text-gray-600 m-auto" />}</div><div className="flex-1 min-w-0"><p className={clsx("truncate", currentTrack?.id === t.id ? 'text-brand-primary' : 'text-white')}>{t.title}</p><p className="text-gray-400 text-sm truncate">{t.artist}</p></div><span className="text-gray-500 text-sm">{Math.floor(t.duration/60)}:{String(Math.floor(t.duration%60)).padStart(2,'0')}</span></div>)}</div></div>
            <div className="px-6"><h2 className="text-xl font-bold text-white mb-4">{t('albums')}</h2><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">{getUniqueAlbums().slice(0, 12).map(a => <div key={a.name} onClick={() => { setSelectedAlbum(a); setView('album'); }} className="p-3 bg-[#181818] hover:bg-white/10 rounded-lg cursor-pointer"><div className="w-full aspect-square bg-gray-800 rounded mb-3">{a.cover ? <img src={`getCoverUrl${encodeURIComponent(a.cover.fileName)}`} className="w-full h-full object-cover" /> : <Disc className="w-12 h-12 text-gray-600 m-auto" />}</div><p className="text-white truncate font-medium">{a.name}</p><p className="text-gray-400 text-sm truncate">{a.artist}</p></div>)}</div></div>
            <div className="px-6 mt-8"><h2 className="text-xl font-bold text-white mb-4">{t('artists')}</h2><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">{getUniqueArtists().slice(0, 12).map(a => <div key={a.name} onClick={() => { setSelectedArtist(a); setView('artist'); }} className="p-3 bg-[#181818] hover:bg-white/10 rounded-lg cursor-pointer"><div className="w-full aspect-square bg-gray-800 rounded-full mb-3 mx-auto w-32 h-32">{a.cover ? <img src={`getCoverUrl${encodeURIComponent(a.cover.fileName)}`} className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-gray-600 m-auto" />}</div><p className="text-white truncate text-center">{a.name}</p></div>)}</div></div>
          </>
        )}

        {view === 'search' && (
          <div className="px-6 pb-8">
            <h1 className="text-3xl font-bold text-white mb-6">{t('search')}</h1>
            {searchQuery && <><h2 className="text-xl font-bold text-white mb-4">{t('songs')}</h2><div className="space-y-1">{tracks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.artist.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10).map(t => <div key={t.id} onClick={() => playTrack(t)} className="flex items-center gap-4 py-2 px-3 rounded-md hover:bg-white/5 cursor-pointer"><div className="w-10 h-10 bg-gray-800 rounded">{t.hasPicture ? <img src={`getCoverUrl${encodeURIComponent(t.fileName)}`} className="w-full h-full object-cover" /> : <Music className="w-5 h-5 text-gray-600 m-auto" />}</div><div className="flex-1"><p className="text-white truncate">{t.title}</p><p className="text-gray-400 text-sm">{t.artist}</p></div></div>)}</div></>}
          </div>
        )}

        {isLibrary && (
          <div className="px-6 pb-8">
            <div className="flex items-center justify-between py-4"><h1 className="text-3xl font-bold text-white">{t('library')}</h1><button onClick={() => setShowPlaylistModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white text-sm"><Plus className="w-4 h-4" />{t('createPlaylist')}</button></div>
            <div className="flex gap-2 mb-6">
              <button onClick={() => setView('library')} className={clsx("px-4 py-2 rounded-full text-sm font-medium", view === 'library' ? 'bg-white text-black' : 'bg-white/10 text-white')}>{t('playlists')}</button>
              <button onClick={() => setView('library-songs')} className={clsx("px-4 py-2 rounded-full text-sm font-medium", view === 'library-songs' ? 'bg-white text-black' : 'bg-white/10 text-white')}>{t('songs')}</button>
              <button onClick={() => setView('library-albums')} className={clsx("px-4 py-2 rounded-full text-sm font-medium", view === 'library-albums' ? 'bg-white text-black' : 'bg-white/10 text-white')}>{t('albums')}</button>
              <button onClick={() => setView('library-artists')} className={clsx("px-4 py-2 rounded-full text-sm font-medium", view === 'library-artists' ? 'bg-white text-black' : 'bg-white/10 text-white')}>{t('artists')}</button>
            </div>
            {view === 'library' && <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{playlists.map(p => <div key={p.id} onClick={() => { setActivePlaylist(p); apiFetch(`/playlists/${p.id}/tracks`).then(r => r?.json()).then(d => { if (d) { setPlaylistTracks(d); setCurrentPlayList(d); } }); setView('playlist'); }} className="p-3 bg-[#181818] hover:bg-white/10 rounded-lg cursor-pointer"><div className="w-full aspect-square bg-gray-800 rounded mb-3"><ListMusic className="w-12 h-12 text-gray-600 m-auto" /></div><p className="text-white truncate">{p.name}</p></div>)}</div>}
            {view === 'library-songs' && <><div className="flex items-center gap-4 mb-4"><button onClick={() => tracks[0] && playTrack(tracks[0], tracks)} className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center"><Play className="w-6 h-6 text-black ml-1" /></button></div><div className="space-y-1">{tracks.map((t, i) => <div key={t.id} onClick={() => playTrack(t, tracks)} className={clsx("flex items-center gap-4 py-2 px-3 rounded-md hover:bg-white/5 cursor-pointer", currentTrack?.id === t.id ? 'bg-white/10' : '')}><span className="w-8 text-center text-gray-500">{i+1}</span><div className="w-10 h-10 bg-gray-800 rounded">{t.hasPicture ? <img src={`getCoverUrl${encodeURIComponent(t.fileName)}`} className="w-full h-full object-cover" /> : <Music className="w-5 h-5 text-gray-600 m-auto" />}</div><div className="flex-1"><p className={clsx("truncate", currentTrack?.id === t.id ? 'text-brand-primary' : 'text-white')}>{t.title}</p><p className="text-gray-400 text-sm truncate">{t.artist}</p></div><span className="text-gray-500 text-sm">{Math.floor(t.duration/60)}:{String(Math.floor(t.duration%60)).padStart(2,'0')}</span></div>)}</div></>}
            {view === 'library-albums' && <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{getUniqueAlbums().map(a => <div key={a.name} onClick={() => { setSelectedAlbum(a); setView('album'); }} className="p-3 bg-[#181818] hover:bg-white/10 rounded-lg cursor-pointer"><div className="w-full aspect-square bg-gray-800 rounded mb-3">{a.cover ? <img src={`getCoverUrl${encodeURIComponent(a.cover.fileName)}`} className="w-full h-full object-cover" /> : <Disc className="w-12 h-12 text-gray-600 m-auto" />}</div><p className="text-white truncate">{a.name}</p><p className="text-gray-400 text-sm truncate">{a.artist}</p></div>)}</div>}
            {view === 'library-artists' && <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{getUniqueArtists().map(a => <div key={a.name} onClick={() => { setSelectedArtist(a); setView('artist'); }} className="p-3 bg-[#181818] hover:bg-white/10 rounded-lg cursor-pointer"><div className="w-full aspect-square bg-gray-800 rounded-full mb-3 mx-auto w-32 h-32">{a.cover ? <img src={`getCoverUrl${encodeURIComponent(a.cover.fileName)}`} className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-gray-600 m-auto" />}</div><p className="text-white truncate text-center">{a.name}</p></div>)}</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-black">
      <audio ref={audioRef} />
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-black flex flex-col flex-shrink-0">
          <div className="p-6">
            <div className="flex items-center gap-3 text-white mb-8"><div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center"><Music className="w-6 h-6 text-black" /></div><span className="text-xl font-black">Localify</span></div>
            <nav className="space-y-1">
              <button onClick={() => setView('home')} className={clsx("w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors", view === 'home' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5')}><Home className="w-6 h-6" /><span className="font-medium">{t('home')}</span></button>
              <button onClick={() => setView('search')} className={clsx("w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors", view === 'search' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5')}><SearchIcon className="w-6 h-6" /><span className="font-medium">{t('search')}</span></button>
              <button onClick={() => setView('library')} className={clsx("w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors", view === 'library' || view.startsWith('library') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5')}><Library className="w-6 h-6" /><span className="font-medium">{t('library')}</span></button>
            </nav>
            <div className="mt-8">
              <div className="flex items-center justify-between px-4 mb-3"><span className="text-gray-400 text-sm font-medium uppercase">{t('playlists')}</span><button onClick={() => setShowPlaylistModal(true)} className="text-gray-400 hover:text-white"><Plus className="w-5 h-5" /></button></div>
              <div className="space-y-1 max-h-64 overflow-y-auto">{playlists.map(p => <button key={p.id} onClick={() => { setActivePlaylist(p); apiFetch(`/playlists/${p.id}/tracks`).then(r => r?.json()).then(d => { if (d) { setPlaylistTracks(d); setCurrentPlayList(d); } }); setView('playlist'); }} className="w-full text-left px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-sm truncate">{p.name}</button>)}</div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-black">
          <header className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              {(view !== 'home' && view !== 'search' && view !== 'library' && !view.startsWith('library') && view !== 'settings') && <button onClick={() => { setView('home'); setSelectedAlbum(null); setSelectedArtist(null); setActivePlaylist(null); }} className="p-2 bg-black/50 rounded-full hover:scale-110"><ArrowLeft className="w-5 h-5 text-white" /></button>}
              <div className="relative w-80"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); if (view !== 'search') setView('search'); }} placeholder={t('searchPlaceholder')} className="w-full bg-white/10 border border-transparent rounded-full py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:bg-white/20" /></div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowEqualizer(true)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10"><Sliders className="w-6 h-6" /></button>
              <button onClick={() => setView('settings')} className={clsx("p-2 rounded-full", view === 'settings' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10')}><Settings className="w-6 h-6" /></button>
              <button onClick={() => setShowAccountModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20">{userAvatar ? <img src={userAvatar} className="w-7 h-7 rounded-full object-cover" /> : <div className="w-7 h-7 bg-brand-primary rounded-full flex items-center justify-center text-black font-bold text-sm">{currentUser.username[0].toUpperCase()}</div>}<span className="text-white font-medium text-sm">{currentUser.username}</span></button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto pb-32">{renderContent()}</div>
        </main>
      </div>

      <div className="h-24 bg-black border-t border-white/10 px-6 flex items-center justify-between fixed bottom-0 left-0 right-0 z-50">
        <div className="flex items-center gap-4 w-1/4">
          {currentTrack && (<><div className="w-14 h-14 bg-gray-800 rounded flex-shrink-0 overflow-hidden">{currentTrack.hasPicture ? <img src={`getCoverUrl${encodeURIComponent(currentTrack.fileName)}`} className="w-full h-full object-cover" /> : <Disc className="w-7 h-7 text-gray-600 m-auto" />}</div><div className="min-w-0"><p className="text-white font-medium truncate">{currentTrack.title}</p><p className="text-gray-400 text-sm truncate">{currentTrack.artist}</p></div><button onClick={() => toggleFavorite(currentTrack)} className="text-gray-400 hover:text-white"><Heart className={clsx("w-5 h-5", favoritesPlaylist && playlistTracks.some(t => t.id === currentTrack?.id) ? 'fill-red-500 text-red-500' : '')} /></button></>)}
        </div>
        <div className="flex flex-col items-center w-1/2">
          <div className="flex items-center gap-4 mb-2">
            <button onClick={() => setIsShuffle(!isShuffle)} className={clsx("transition-colors", isShuffle ? 'text-brand-primary' : 'text-gray-400 hover:text-white')}><Shuffle className="w-5 h-5" /></button>
            <button onClick={handlePrev} className="text-gray-400 hover:text-white"><SkipBack className="w-6 h-6" /></button>
            <button onClick={() => { if (currentTrack) { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); } }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105">{isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}</button>
            <button onClick={handleNext} className="text-gray-400 hover:text-white"><SkipForward className="w-6 h-6" /></button>
            <button onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : 'off')} className={clsx("transition-colors", repeatMode !== 'off' ? 'text-brand-primary' : 'text-gray-400 hover:text-white')}><Repeat className="w-5 h-5" /></button>
          </div>
          <div className="w-full flex items-center gap-2"><span className="text-gray-400 text-xs w-10 text-right">{Math.floor(currentTime/60)}:{String(Math.floor(currentTime%60)).padStart(2,'0')}</span><input type="range" min="0" max={duration||100} step="0.1" value={currentTime} onChange={(e) => { audioRef.current.currentTime = e.target.value; }} className="flex-1 h-1 bg-gray-600 rounded-full" /><span className="text-gray-400 text-xs w-10">{Math.floor(duration/60)}:{String(Math.floor(duration%60)).padStart(2,'0')}</span></div>
        </div>
        <div className="flex items-center justify-end gap-3 w-1/4"><button onClick={() => setShowUploadModal(true)} className="text-gray-400 hover:text-white"><Upload className="w-5 h-5" /></button><Volume2 className="w-5 h-5 text-gray-400" /><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => { audioRef.current.volume = e.target.value; setVolume(e.target.value); }} className="w-24 h-1 bg-gray-600 rounded-full" /></div>
      </div>

      <Modal isOpen={showPlaylistModal} onClose={() => setShowPlaylistModal(false)} title={t('createPlaylist')}>
        <form onSubmit={(e) => { e.preventDefault(); createPlaylist(); }}>
          <div className="space-y-4"><div><label className="block text-sm text-gray-400 mb-2">{t('playlists')} name</label><input type="text" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary" /></div><div className="flex gap-3 justify-end"><button type="button" onClick={() => setShowPlaylistModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button><button type="submit" className="px-6 py-2 bg-brand-primary text-black font-semibold rounded-full">{t('play')}</button></div></div>
        </form>
      </Modal>

      <Modal isOpen={showAccountModal} onClose={() => setShowAccountModal(false)} title={t('account')}>
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative"><div className="w-20 h-20 rounded-full overflow-hidden bg-gray-800">{userAvatar ? <img src={userAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-brand-primary flex items-center justify-center text-3xl text-black font-bold">{currentUser.username[0].toUpperCase()}</div>}</div><button onClick={() => avatarInputRef.current.click()} className="absolute bottom-0 right-0 bg-brand-primary p-2 rounded-full"><Camera className="w-4 h-4 text-black" /></button><input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" /></div>
            <div><p className="text-white font-bold text-xl">{currentUser.username}</p><p className="text-gray-400">ID: {currentUser.id}</p></div>
          </div>
          <button onClick={() => { apiFetch('/logout', { method: 'POST' }); setCurrentUser(null); localStorage.removeItem('localify_user'); localStorage.removeItem('localify_token'); }} className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20"><LogOut className="w-5 h-5" />Sign out</button>
        </div>
      </Modal>

      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Music" size="lg">
        <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center"><Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-white mb-2">Drop audio files here</p><p className="text-gray-400 text-sm">Supports MP3, FLAC, WAV, OGG</p></div>
      </Modal>

      <Modal isOpen={showEqualizer} onClose={() => setShowEqualizer(false)} title={t('equalizer')}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">{Object.entries(equalizerPresets).map(([k, p]) => <button key={k} onClick={() => applyPreset(k)} className={clsx("px-4 py-2 rounded-full text-sm", equalizerPreset === k ? 'bg-brand-primary text-black' : 'bg-white/10 text-white')}>{p.name}</button>)}</div>
          <div className="flex justify-end"><button onClick={() => setShowEqualizer(false)} className="px-6 py-2 bg-brand-primary text-black font-semibold rounded-full">Done</button></div>
        </div>
      </Modal>
    </div>
  );
}

export default App;
