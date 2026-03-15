import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, Search as SearchIcon, Home, Library, PlusSquare, 
  Music, Settings, User as UserIcon, Plus, ArrowLeft, Shuffle, Repeat, Sliders, Disc, User, Heart, ListMusic, Upload, LogOut, Camera, X, Menu, XCircle, Gamepad2, BarChart2
} from 'lucide-react';
import { useGamepad } from './useGamepad.jsx';
import { GamepadHints } from './GamepadHints.jsx';
import clsx from 'clsx';

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000/api`;

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

function TrackMenu({ track, onAddToPlaylist, onDelete, className = '', onTrackDelete, onAddToQueue }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      try {
        const res = await apiFetch(`/tracks/${encodeURIComponent(track.fileName)}`, { method: 'DELETE' });
        if (res.ok) {
          if (onTrackDelete) {
            onTrackDelete(track);
          }
        } else {
          const errorData = await res.json();
          alert(errorData.error || 'Failed to delete track');
        }
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete track');
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        title="Track options"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#181818] border border-white/10 rounded-lg shadow-xl z-50 py-2">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onAddToPlaylist(track); }}
            className="w-full text-left px-4 py-2 text-white hover:bg-white/10 flex items-center gap-3"
          >
            <Plus className="w-4 h-4" />
            Add to playlist
          </button>
          {onAddToQueue && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); onAddToQueue(track); }}
              className="w-full text-left px-4 py-2 text-white hover:bg-white/10 flex items-center gap-3"
            >
              <ListMusic className="w-4 h-4" />
              Add to queue
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); handleDelete(); }}
            className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 flex items-center gap-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete from server
          </button>
        </div>
      )}
    </div>
  );
}

function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  const sizeClasses = { sm: 'max-w-sm sm:max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />
      <div className={clsx("relative bg-[#181818] rounded-xl shadow-2xl w-full animate-scale-in", sizeClasses[size])}>
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10">
          <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
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
  const [userAvatar, setUserAvatar] = useState(() => { return null; });
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
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [favoriteTracks, setFavoriteTracks] = useState([]);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [showUploadMessage, setShowUploadMessage] = useState(false);
  const [uploadData, setUploadData] = useState(null);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [pinForProfile, setPinForProfile] = useState(null);
  const [enteredPin, setEnteredPin] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [pinSetupError, setPinSetupError] = useState('');
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0);
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('localify_language');
    if (saved) return saved;
    return navigator.language.split('-')[0] === 'fr' ? 'fr' : 'en';
  });
  const [favoritesPlaylist, setFavoritesPlaylist] = useState(null);
  const [currentPlayList, setCurrentPlayList] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [queue, setQueue] = useState([]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('all');
  const [contextMenu, setContextMenu] = useState(null);
  const lastPlayTime = useRef(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [focusCategory, setFocusCategory] = useState('profile');
  const [gamepadMode, setGamepadMode] = useState('navigation');
  const [consoleMode, setConsoleMode] = useState(false);
  const [consoleView, setConsoleView] = useState('home');
  const [consoleFocus, setConsoleFocus] = useState({ row: 0, col: 0 });
  const [flatItems, setFlatItems] = useState([]);

  const audioRef = useRef(null);
  const [trackStartTime, setTrackStartTime] = useState(null);
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

  const getFocusProps = (category, index) => {
    if (!gamepadConnected || !currentUser) return {};
    const isFocused = focusCategory === category && focusIndex === index;
    return {
      'data-gamepad-focus': isFocused,
      'data-category': category,
      'data-index': index,
    };
  };

  const t = (key) => {
    const trans = {
      en: { home: 'Home', search: 'Search', library: 'Library', playlists: 'Playlists', createPlaylist: 'Create playlist', favorites: 'Favorites', goodEvening: 'Good evening', songs: 'Songs', albums: 'Albums', artists: 'Artists', play: 'Play', settings: 'Settings', language: 'Language', equalizer: 'Equalizer', account: 'Account', searchPlaceholder: 'What do you want to listen to?' },
      fr: { home: 'Accueil', search: 'Rechercher', library: 'Bibliothèque', playlists: 'Playlists', createPlaylist: 'Créer une playlist', favorites: 'Favoris', goodEvening: 'Bonsoir', songs: 'Chansons', albums: 'Albums', artists: 'Artistes', play: 'Lire', settings: 'Paramètres', language: 'Langue', equalizer: 'Égaliseur', account: 'Compte', searchPlaceholder: 'Qu\'écouter ?' }
    };
    return trans[language]?.[key] || trans.en[key] || key;
  };

  // Disable default context menu and handle custom one
  useEffect(() => {
    const handleContextMenu = (e) => {
      // Find if clicking on a track row
      const trackRow = e.target.closest('[data-track-id]');
      if (trackRow) {
        e.preventDefault();
        const trackId = trackRow.getAttribute('data-track-id');
        const track = tracks.find(t => t.id === trackId);
        if (track) {
          setContextMenu({
            track,
            x: e.clientX,
            y: e.clientY
          });
        }
      }
    };

    const handleClick = () => {
      setContextMenu(null);
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
    };
  }, [tracks]);

  useEffect(() => { localStorage.setItem('localify_language', language); }, [language]);

  useEffect(() => {
    if (isDeletingProfile && currentUser) {
      const deleteProfile = async () => {
        try {
          const res = await apiFetch(`/users/${currentUser.id}`, { method: 'DELETE' });
          if (res.ok) {
            localStorage.removeItem('localify_token');
            localStorage.removeItem('localify_user');
            localStorage.removeItem(`localify_avatar_${currentUser.id}`);
            if (currentUser.id) localStorage.removeItem(`localify_playback_state_${currentUser.id}`);
            setCurrentUser(null);
            setUsers(prev => prev.filter(u => u.id !== currentUser.id));
          } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete profile');
          }
        } catch (err) {
          console.error('Delete profile failed:', err);
          alert('Failed to delete profile');
        }
        setIsDeletingProfile(false);
      };
      deleteProfile();
    }
  }, [isDeletingProfile, currentUser]);

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
      const userIdStr = String(currentUser.id);
      const savedAvatar = localStorage.getItem(`localify_avatar_${userIdStr}`);
      if (savedAvatar) setUserAvatar(savedAvatar);
      else setUserAvatar(null);
      apiFetch(`/playlists/${currentUser.id}`).then(r => r?.json()).then(data => {
        if (data) {
          setPlaylists(data);
          const fav = data.find(p => p.name === 'Favorites');
          if (fav) {
            setFavoritesPlaylist(fav);
            apiFetch(`/playlists/${fav.id}/tracks`).then(r => r?.json()).then(tracks => {
              if (tracks) setFavoriteTracks(tracks);
            });
          }
        }
      });
      
      // Charger les recommandations
      apiFetch(`/recommendations/${currentUser.id}`).then(r => r?.json()).then(data => {
        if (data) setRecommendations(data);
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (view === 'stats' && currentUser) {
      apiFetch(`/stats/${currentUser.id}`).then(r => r?.json()).then(data => {
        if (data) setUserStats(data);
      }).catch(() => {});
    }
  }, [view, currentUser]);

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

  useEffect(() => {
    if (!currentUser) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || tracks.length === 0) return;
    const saved = localStorage.getItem(`localify_playback_state_${currentUser.id}`);
    if (!saved) return;
    try {
      const state = JSON.parse(saved);
      const track = tracks.find(t => t.id === state.trackId);
      if (track) {
        setCurrentTrack(track);
        audioRef.current.src = getStreamUrl(track.fileName);
        audioRef.current.currentTime = state.currentTime || 0;
        audioRef.current.volume = state.volume ?? 0.7;
        setVolume(state.volume ?? 0.7);
        setCurrentPlayList(tracks);
      }
    } catch {}
  }, [currentUser, tracks]);

  useEffect(() => {
    if (currentTrack && currentUser) {
      localStorage.setItem(`localify_playback_state_${currentUser.id}`, JSON.stringify({
        trackId: currentTrack.id,
        currentTime: audioRef.current.currentTime,
        volume: volume
      }));
    }
  }, [currentTrack, currentTime, volume, currentUser]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (consoleMode) {
        const maxItems = flatItems.length;
        if (maxItems > 0) {
          const currentIdx = consoleFocus.row;
          const currentItem = flatItems[currentIdx];
          
          switch (e.code) {
            case 'ArrowUp':
              e.preventDefault();
              setConsoleFocus(f => ({ ...f, row: Math.max(0, f.row - 1) }));
              return;
            case 'ArrowDown':
              e.preventDefault();
              setConsoleFocus(f => ({ ...f, row: Math.min(maxItems - 1, f.row + 1) }));
              return;
            case 'Enter':
            case 'Space':
              e.preventDefault();
              if (currentItem && currentItem.type !== 'category' && currentItem.action) {
                currentItem.action();
              }
              return;
            case 'Escape':
              e.preventDefault();
              if (consoleView !== 'home') {
                setConsoleView('home');
                setConsoleFocus({ row: 0, col: 0 });
              } else {
                setConsoleMode(false);
              }
              return;
          }
        }
      }
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (currentTrack) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play().catch(() => {});
            setIsPlaying(!isPlaying);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!consoleMode) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (!consoleMode) audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!consoleMode) setVolume(v => Math.min(1, parseFloat(v) + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!consoleMode) setVolume(v => Math.max(0, parseFloat(v) - 0.1));
          break;
        case 'KeyN': {
          const list = currentPlayList.length > 0 ? currentPlayList : tracks;
          if (list.length === 0) return;
          let nextIndex = isShuffle ? Math.floor(Math.random() * list.length) : list.findIndex(t => t.id === currentTrack?.id) + 1;
          if (nextIndex >= list.length) nextIndex = repeatMode === 'off' ? -1 : 0;
          if (nextIndex >= 0) playTrack(list[nextIndex], list);
          else setIsPlaying(false);
          break;
        }
        case 'KeyP': {
          const list = currentPlayList.length > 0 ? currentPlayList : tracks;
          if (list.length === 0) return;
          if (audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
          const idx = list.findIndex(t => t.id === currentTrack?.id);
          playTrack(list[idx > 0 ? idx - 1 : list.length - 1], list);
          break;
        }
        case 'Enter': {
          if (gamepadConnected && currentUser && !consoleMode) {
            setConsoleMode(true);
            setConsoleView('home');
            setConsoleFocus({ row: 0, col: 0 });
          }
          break;
        }
        case 'Escape': {
          if (consoleMode) {
            setConsoleMode(false);
          }
          break;
        }
        case 'KeyG': {
          if (gamepadConnected && currentUser) {
            setConsoleMode(!consoleMode);
            if (!consoleMode) {
              setConsoleView('home');
              setConsoleFocus({ row: 0, col: 0 });
            }
          }
          break;
        }
        case 'Tab': {
          if (gamepadConnected && currentUser) {
            e.preventDefault();
            setConsoleMode(!consoleMode);
            if (!consoleMode) {
              setConsoleView('home');
              setConsoleFocus({ row: 0, col: 0 });
            }
          }
          break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTrack, isPlaying, duration, currentPlayList, tracks, isShuffle, repeatMode, consoleMode, flatItems, consoleFocus, setConsoleFocus]);

  const recordTrackDuration = (trackId, userId) => {
    if (!trackStartTime || !trackId || !userId) return;
    const listenedDuration = Math.floor((Date.now() - trackStartTime) / 1000);
    if (listenedDuration > 0) {
      apiFetch('/track-plays', {
        method: 'POST',
        body: JSON.stringify({
          trackId,
          userId,
          duration: listenedDuration
        })
      }).catch(err => console.error('Failed to record duration:', err));
    }
    setTrackStartTime(null);
  };

  const playTrack = (track, list = null) => {
    const playlist = list || currentPlayList || tracks;
    setCurrentPlayList(playlist);
    
    if (currentTrack?.id === track.id) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(() => {});
      setIsPlaying(!isPlaying);
      return;
    }

    // Record duration of previous track before switching
    if (currentTrack && currentUser && trackStartTime) {
      recordTrackDuration(currentTrack.id, currentUser.id);
    }

    setCurrentTrack(track);
    setIsPlaying(true);
    setTrackStartTime(Date.now());
    audioRef.current.src = getStreamUrl(track.fileName);
    audioRef.current.play().catch(() => {});
    setRecentlyPlayed(prev => [track, ...prev.filter(t => t.id !== track.id)].slice(0, 20));
    
    // Enregistrer l'écoute
    if (currentUser) {
      apiFetch('/track-plays', { 
        method: 'POST', 
        body: JSON.stringify({ 
          trackId: track.id, 
          userId: currentUser.id 
        }) 
      }).catch(err => console.error('Failed to record play:', err));
    }
  };

  const handleNext = () => {
    // If queue has items, play from queue first
    if (queue.length > 0) {
      const nextTrack = queue[0];
      removeFromQueue(0);
      playTrack(nextTrack, [nextTrack, ...queue]);
      return;
    }
    
    const list = currentPlayList.length > 0 ? currentPlayList : tracks;
    if (list.length === 0) return;
    let nextIndex = isShuffle ? Math.floor(Math.random() * list.length) : list.findIndex(t => t.id === currentTrack?.id) + 1;
    if (nextIndex >= list.length) nextIndex = repeatMode === 'off' ? -1 : 0;
    if (nextIndex >= 0) playTrack(list[nextIndex], list);
    else setIsPlaying(false);
  };

  const addToQueue = (track) => {
    setQueue(prev => [...prev, track]);
  };

  const removeFromQueue = (index) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const playFromQueue = (index) => {
    const track = queue[index];
    removeFromQueue(index);
    playTrack(track, [track, ...queue]);
  };

  const handlePrev = () => {
    const list = currentPlayList.length > 0 ? currentPlayList : tracks;
    if (list.length === 0) return;
    if (audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    const idx = list.findIndex(t => t.id === currentTrack?.id);
    playTrack(list[idx > 0 ? idx - 1 : list.length - 1], list);
  };

  const toggleFavorite = async (track) => {
    console.log('toggleFavorite called', { track, favoritesPlaylist, currentUser });
    if (!currentUser) {
      console.log('No currentUser');
      return;
    }
    if (!favoritesPlaylist) {
      console.log('Creating favorites playlist for user', currentUser.id);
      try {
        const res = await apiFetch('/playlists', { 
          method: 'POST', 
          body: JSON.stringify({ name: 'Favorites', userId: currentUser.id }) 
        });
        const newP = await res.json();
        console.log('Created playlist', newP);
        setPlaylists(prev => [...prev, newP]);
        setFavoritesPlaylist(newP);
        
        const addRes = await apiFetch(`/playlists/${newP.id}/tracks`, { 
          method: 'POST', 
          body: JSON.stringify({ trackId: track.id }) 
        });
        console.log('Add to favorites response', addRes.status);
        setFavoriteTracks([track]);
      } catch (err) {
        console.error('Error creating favorites:', err);
      }
      return;
    }
    const isFav = favoriteTracks.some(t => t.id === track.id);
    console.log('isFav', isFav);
    if (isFav) {
      await apiFetch(`${favoritesPlaylist.id}/tracks/${encodeURIComponent(track.id)}`, { method: 'DELETE' });
      setFavoriteTracks(prev => prev.filter(t => t.id !== track.id));
    } else {
      console.log('Adding to favorites playlist', favoritesPlaylist.id, 'track', track.id);
      const res = await apiFetch(`${favoritesPlaylist.id}/tracks`, { 
        method: 'POST', 
        body: JSON.stringify({ trackId: track.id }) 
      });
      console.log('Add response', res.status);
      const tracksRes = await apiFetch(`${favoritesPlaylist.id}/tracks`);
      const tracks = await tracksRes.json();
      console.log('Got tracks', tracks.length);
      setFavoriteTracks(tracks);
    }
  };

  const addToPlaylist = async (track) => {
    setTrackToAdd(track);
    setShowAddToPlaylistModal(true);
  };

  const handleAddToPlaylistConfirm = async (playlistId) => {
    if (!trackToAdd || !playlistId) return;
    
    try {
      await apiFetch(`/playlists/${playlistId}/tracks`, { method: 'POST', body: JSON.stringify({ trackId: trackToAdd.id }) });
      setShowAddToPlaylistModal(false);
      setTrackToAdd(null);
    } catch (err) {
      console.error('Failed to add to playlist:', err);
    }
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    apiFetch('/playlists', { method: 'POST', body: JSON.stringify({ name: newPlaylistName, userId: currentUser.id }) })
      .then(() => apiFetch(`/playlists/${currentUser.id}`).then(r => r?.json()).then(setPlaylists))
      .then(() => { setShowPlaylistModal(false); setNewPlaylistName(''); });
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    const userIdStr = String(currentUser.id);
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 150;
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      const avatarData = canvas.toDataURL('image/jpeg', 0.7);
      setUserAvatar(avatarData); 
      localStorage.setItem(`localify_avatar_${userIdStr}`, avatarData);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const formData = new FormData();
    for (const file of files) {
      formData.append('file', file);
    }
    try {
      const token = localStorage.getItem('localify_token');
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (res.ok && data.id) {
        const newTracks = await apiFetch('/tracks').then(r => r?.json());
        if (newTracks) setTracks(newTracks);
        setUploadData(data);
        setUploadMessage({ type: 'success', text: `"${data.title}" has been added to your library` });
        setShowUploadMessage(true);
        setShowUploadModal(false);
      } else if (res.ok) {
        setUploadData(data);
        setUploadMessage({ type: 'error', text: `"${data.title}" is already in your music library` });
        setShowUploadMessage(true);
      } else if (res.status === 401) {
        setUploadMessage({ type: 'error', text: 'You must be logged in to upload music' });
        setShowUploadMessage(true);
      } else {
        setUploadMessage({ type: 'error', text: data.error || 'Upload failed' });
        setShowUploadMessage(true);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadMessage({ type: 'error', text: 'Upload failed' });
      setShowUploadMessage(true);
    }
    setIsUploading(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
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

  const gamepadHandlers = useMemo(() => ({
    onNavigate: (direction) => {
      if (consoleMode) {
        const maxItems = flatItems.length;
        
        if (direction === 'up') {
          setConsoleFocus(f => ({ ...f, row: Math.max(0, f.row - 1) }));
        } else if (direction === 'down') {
          setConsoleFocus(f => ({ ...f, row: Math.min(maxItems - 1, f.row + 1) }));
        } else if (direction === 'left') {
          setConsoleFocus(f => ({ ...f, col: Math.max(0, f.col - 1) }));
        } else if (direction === 'right') {
          setConsoleFocus(f => ({ ...f, col: Math.min(3, f.col + 1) }));
        }
        return;
      }

      if (!currentUser) {
        if (direction === 'up' || direction === 'left') {
          setSelectedProfileIndex(i => Math.max(0, i - 1));
        } else if (direction === 'down' || direction === 'right') {
          setSelectedProfileIndex(i => Math.min(users.length - 1, i + 1));
        }
        return;
      }

      const getMaxIndex = () => {
        switch (focusCategory) {
          case 'sidebar': return 2;
          case 'tracks': return Math.min(tracks.length - 1, 19);
          case 'recently': return Math.min(recentlyPlayed.length - 1, 5);
          case 'albums': return Math.min(getUniqueAlbums().length - 1, 11);
          case 'artists': return Math.min(getUniqueArtists().length - 1, 11);
          case 'playlists': return playlists.length - 1;
          case 'library-tabs': return 3;
          default: return 0;
        }
      };

      if (direction === 'up') setFocusIndex(i => Math.max(0, i - 1));
      else if (direction === 'down') setFocusIndex(i => Math.min(getMaxIndex(), i + 1));
      else if (direction === 'left') {
        if (focusCategory === 'sidebar') { setFocusCategory('profile'); setFocusIndex(0); }
        else if (focusCategory === 'tracks' || focusCategory === 'recently') { setFocusCategory('sidebar'); setFocusIndex(0); }
        else if (focusCategory === 'albums' || focusCategory === 'artists') { setFocusCategory('sidebar'); setFocusIndex(0); }
      } else if (direction === 'right') {
        if (focusCategory === 'sidebar') {
          if (view === 'home') setFocusCategory('recently');
          else if (view === 'library') setFocusCategory('playlists');
          else if (view === 'library-songs' || view === 'search') setFocusCategory('tracks');
          else if (view === 'library-albums') setFocusCategory('albums');
          else if (view === 'library-artists') setFocusCategory('artists');
          setFocusIndex(0);
        }
      }

      setTimeout(() => {
        const activeEl = document.querySelector('[data-gamepad-focus="true"]');
        if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 50);
    },
    onSelect: () => {
      if (consoleMode) {
        const currentItem = flatItems[consoleFocus.row];
        if (currentItem && currentItem.type !== 'category' && currentItem.action) {
          currentItem.action();
        }
        return;
      }

      if (!currentUser && users[selectedProfileIndex]) {
        const user = users[selectedProfileIndex];
        if (user.hasPin) { setPinForProfile(user); setShowPinModal(true); setEnteredPin(['','','','']); setPinError(''); }
        else {
          apiFetch('/login', { method: 'POST', body: JSON.stringify({ username: user.username, pin: '' }) })
            .then(r => r.json())
            .then(d => {
              if (d.token) { localStorage.setItem('localify_token', d.token); setCurrentUser(d.user); setFocusCategory('sidebar'); setFocusIndex(0); }
            });
        }
        return;
      }

      if (focusCategory === 'sidebar') { 
        const navItems = ['home', 'search', 'library']; 
        if (focusIndex < navItems.length) {
          setView(navItems[focusIndex]);
          if (navItems[focusIndex] === 'library') {
            setFocusCategory('library-tabs');
            setFocusIndex(0);
          }
        }
      }
      else if (focusCategory === 'tracks' && tracks[focusIndex]) playTrack(tracks[focusIndex], tracks);
      else if (focusCategory === 'recently' && recentlyPlayed[focusIndex]) playTrack(recentlyPlayed[focusIndex]);
      else if (focusCategory === 'albums') { const albums = getUniqueAlbums(); if (albums[focusIndex]) { setSelectedAlbum(albums[focusIndex]); setView('album'); } }
      else if (focusCategory === 'artists') { const artists = getUniqueArtists(); if (artists[focusIndex]) { setSelectedArtist(artists[focusIndex]); setView('artist'); } }
      else if (focusCategory === 'playlists' && playlists[focusIndex]) { const p = playlists[focusIndex]; setActivePlaylist(p); apiFetch(`/playlists/${p.id}/tracks`).then(r => r?.json()).then(d => { if (d) { setPlaylistTracks(d); setCurrentPlayList(d); } }); setView('playlist'); }
      else if (focusCategory === 'library-tabs') { 
        const tabs = ['library', 'library-songs', 'library-albums', 'library-artists']; 
        if (tabs[focusIndex]) { 
          setView(tabs[focusIndex]); 
          setTimeout(() => { 
            if (tabs[focusIndex] === 'library') setFocusCategory('playlists'); 
            else if (tabs[focusIndex] === 'library-songs') setFocusCategory('tracks'); 
            else if (tabs[focusIndex] === 'library-albums') setFocusCategory('albums'); 
            else if (tabs[focusIndex] === 'library-artists') setFocusCategory('artists'); 
            setFocusIndex(0); 
          }, 50); 
        } 
      }
    },
    onBack: () => {
      if (consoleMode) {
        if (consoleView !== 'home') {
          setConsoleView('home');
          setConsoleFocus({ row: 0, col: 0 });
        } else {
          setConsoleMode(false);
        }
        return;
      }
      if (showPinModal) { setShowPinModal(false); return; }
      if (selectedAlbum) { setSelectedAlbum(null); setView('home'); return; }
      if (selectedArtist) { setSelectedArtist(null); setView('home'); return; }
      if (activePlaylist) { setActivePlaylist(null); setView('library'); return; }
      if (view !== 'home') { setView('home'); setFocusCategory('sidebar'); setFocusIndex(0); }
    },
    onPlayPause: () => { if (currentTrack) { if (isPlaying) audioRef.current.pause(); else audioRef.current.play().catch(() => {}); setIsPlaying(!isPlaying); } },
    onNext: () => handleNext(),
    onPrev: () => handlePrev(),
    onVolumeUp: () => setVolume(v => Math.min(1, parseFloat(v) + 0.1)),
    onVolumeDown: () => setVolume(v => Math.max(0, parseFloat(v) - 0.1)),
  }), [currentUser, users, selectedProfileIndex, focusCategory, focusIndex, tracks, recentlyPlayed, playlists, showPinModal, selectedAlbum, selectedArtist, activePlaylist, view, currentTrack, isPlaying, consoleMode, flatItems, consoleFocus]);

  const { gamepadConnected, controllerType } = useGamepad(gamepadHandlers);



  const toggleConsoleMode = () => {
    setConsoleMode(!consoleMode);
    if (!consoleMode) {
      setConsoleView('home');
      setConsoleFocus({ row: 0, col: 0 });
    }
  };

  useEffect(() => {
    let items = [];
    
    if (consoleView === 'home') {
      items = [
        { type: 'category', label: 'Playlists', icon: 'list' },
        ...playlists.slice(0, 8).map(p => ({ 
          type: 'playlist', 
          data: p,
          label: p.name,
          cover: null,
          action: () => { setActivePlaylist(p); apiFetch(`/playlists/${p.id}/tracks`).then(r => r?.json()).then(d => { if (d) { setPlaylistTracks(d); setCurrentPlayList(d); } }); setConsoleView('playlist'); setConsoleFocus({ row: 0, col: 0 }); }
        })),
        { type: 'category', label: 'Recommandations', icon: 'heart' },
        ...(recommendations.length > 0 ? recommendations : tracks.slice(0, 8)).map(t => ({ 
          type: 'track', 
          data: t,
          label: t.title,
          sublabel: t.artist,
          cover: t.hasPicture ? getCoverUrl(t.fileName) : null,
          action: () => playTrack(t, recommendations.length > 0 ? recommendations : tracks)
        })),
        { type: 'category', label: 'Albums', icon: 'disc' },
        ...getUniqueAlbums().slice(0, 8).map(a => ({ 
          type: 'album', 
          data: a,
          label: a.name,
          sublabel: a.artist,
          cover: a.cover ? getCoverUrl(a.cover.fileName) : null,
          action: () => { setSelectedAlbum(a); setConsoleView('album'); setConsoleFocus({ row: 0, col: 0 }); }
        })),
        { type: 'category', label: 'Artists', icon: 'user' },
        ...getUniqueArtists().slice(0, 8).map(a => ({ 
          type: 'artist', 
          data: a,
          label: a.name,
          cover: a.cover ? getCoverUrl(a.cover.fileName) : null,
          action: () => { setSelectedArtist(a); setConsoleView('artist'); setConsoleFocus({ row: 0, col: 0 }); }
        })),
      ];
    } else if (consoleView === 'playlist' || consoleView === 'album') {
      const albumName = currentTrack?.album;
      const albumTracks = albumName ? getAlbumTracks(albumName) : tracks.slice(0, 20);
      items = albumTracks.map(t => ({
        type: 'track',
        data: t,
        label: t.title,
        sublabel: t.artist,
        cover: t.hasPicture ? getCoverUrl(t.fileName) : null,
        action: () => playTrack(t, albumTracks)
      }));
    } else if (consoleView === 'artist') {
      const artistName = currentTrack?.artist;
      items = [
        { type: 'category', label: 'Songs', icon: 'music' },
        ...getArtistTracks(artistName).slice(0, 12).map(t => ({
          type: 'track',
          data: t,
          label: t.title,
          sublabel: t.album,
          cover: t.hasPicture ? getCoverUrl(t.fileName) : null,
          action: () => playTrack(t)
        })),
        ...(getArtistAlbums(artistName).length > 0 ? [
          { type: 'category', label: 'Albums', icon: 'disc' },
          ...getArtistAlbums(artistName).slice(0, 8).map(a => ({
            type: 'album',
            data: a,
            label: a.name,
            cover: a.cover ? getCoverUrl(a.cover.fileName) : null,
            action: () => { setSelectedAlbum(a); setConsoleView('album'); setConsoleFocus({ row: 0, col: 0 }); }
          }))
        ] : [])
      ];
    } else if (consoleView === 'library') {
      items = [
        { type: 'category', label: 'Songs', icon: 'music' },
        ...tracks.slice(0, 12).map(t => ({
          type: 'track',
          data: t,
          label: t.title,
          sublabel: t.artist,
          cover: t.hasPicture ? getCoverUrl(t.fileName) : null,
          action: () => playTrack(t, tracks)
        })),
        { type: 'category', label: 'Albums', icon: 'disc' },
        ...getUniqueAlbums().slice(0, 8).map(a => ({
          type: 'album',
          data: a,
          label: a.name,
          sublabel: a.artist,
          cover: a.cover ? getCoverUrl(a.cover.fileName) : null,
          action: () => { setSelectedAlbum(a); setConsoleView('album'); setConsoleFocus({ row: 0, col: 0 }); }
        })),
        { type: 'category', label: 'Artists', icon: 'user' },
        ...getUniqueArtists().slice(0, 8).map(a => ({
          type: 'artist',
          data: a,
          label: a.name,
          cover: a.cover ? getCoverUrl(a.cover.fileName) : null,
          action: () => { setSelectedArtist(a); setConsoleView('artist'); setConsoleFocus({ row: 0, col: 0 }); }
        })),
      ];
    } else if (consoleView === 'search') {
      const searchResults = tracks.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.artist.toLowerCase().includes(searchQuery.toLowerCase())
      );
      items = searchResults.slice(0, 20).map(t => ({
        type: 'track',
        data: t,
        label: t.title,
        sublabel: t.artist,
        cover: t.hasPicture ? getCoverUrl(t.fileName) : null,
        action: () => playTrack(t)
      }));
    }
    
    setFlatItems(items);
  }, [consoleView, playlists, recentlyPlayed, tracks, currentTrack, searchQuery]);

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
        <div className="flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center"><Music className="w-6 h-6 text-black" /></div>
            <span className="text-xl md:text-2xl font-black">Localia</span>
          </div>
          <div className="flex items-center gap-3">
            {gamepadConnected && (
              <div className="text-gray-400" title={`Controller connected (${controllerType})`}>
                <Gamepad2 className="w-6 h-6" />
              </div>
            )}
            <button onClick={() => setShowRegister(!showRegister)} className="text-sm font-semibold text-white bg-white/10 hover:bg-white/20 px-4 md:px-5 py-2 md:py-2.5 rounded-full">{showRegister ? 'Sign In' : 'Create Account'}</button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {!showRegister ? (
            users.length === 0 ? (
              <div className="text-center"><p className="text-xl md:text-2xl font-bold text-white mb-2">No profiles</p><button onClick={() => setShowRegister(true)} className="bg-brand-primary text-black font-bold py-3 px-8 md:px-10 rounded-full">Create Account</button></div>
            ) : (
              <div className="text-center w-full max-w-4xl">
                <p className="text-gray-400 text-sm uppercase tracking-widest mb-8">Who's listening?</p>
                <div className="relative">
                  <button 
                    onClick={() => setSelectedProfileIndex(i => Math.max(0, i - 1))}
                    disabled={selectedProfileIndex === 0}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center justify-center gap-4 md:gap-6 overflow-hidden px-12">
                    {users.map((u, i) => {
                      const offset = i - selectedProfileIndex;
                      const isActive = i === selectedProfileIndex;
                      const scale = isActive ? 1 : 0.75;
                      const opacity = isActive ? 1 : 0.4;
                      
                      return (
                        <button 
                          key={u.id} 
                          onClick={() => setSelectedProfileIndex(i)}
                          className="flex flex-col items-center gap-3 transition-all duration-300 ease-out"
                          style={{
                            transform: `scale(${scale})`,
                            opacity: opacity,
                            flexShrink: 0,
                          }}
                        >
                          {(() => {
                            const userIdStr = String(u.id);
                            const savedAvatar = localStorage.getItem(`localify_avatar_${userIdStr}`);
                            return savedAvatar ? (
                              <img src={savedAvatar} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover" />
                            ) : (
                              <div className={clsx(
                                "w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-3xl md:text-4xl font-bold transition-all",
                                isActive 
                                  ? 'bg-brand-primary text-black' 
                                  : 'bg-white/10 text-white'
                              )}>
                                {u.username[0].toUpperCase()}
                              </div>
                            );
                          })()}
                          <span className={clsx(
                            "font-medium transition-all",
                            isActive ? 'text-white text-base' : 'text-gray-500 text-sm'
                          )}>
                            {u.username}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  
                  <button 
                    onClick={() => setSelectedProfileIndex(i => Math.min(users.length - 1, i + 1))}
                    disabled={selectedProfileIndex === users.length - 1}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 rotate-180" />
                  </button>
                </div>
                <button 
                  onClick={() => users[selectedProfileIndex] && handleSelect(users[selectedProfileIndex])} 
                  className="mt-10 bg-brand-primary hover:bg-[#1ed760] text-black font-bold py-3 px-12 md:px-14 rounded-full transition-transform hover:scale-105"
                >
                  {t('play')}
                </button>
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
                    apiFetch('/users').then(r => r?.json()).then(setUsers);
                  }
                });
              } 
            }); }} className="space-y-4 w-full max-w-80">
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
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">{t('settings')}</h1>
        <div className="bg-[#181818] rounded-xl p-4 sm:p-6 mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">{t('language')}</h2>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full max-w-xs bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white">
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>
        <div className="bg-[#181818] rounded-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">{t('equalizer')}</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(equalizerPresets).map(([k, p]) => <button key={k} onClick={() => applyPreset(k)} className={clsx("px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm", equalizerPreset === k ? 'bg-brand-primary text-black' : 'bg-white/10 text-white')}>{p.name}</button>)}
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
          <div className="flex flex-col sm:flex-row items-end gap-4 sm:gap-6 p-4 sm:p-6 bg-gradient-to-b from-white/20 to-transparent">
            <div className="w-36 sm:w-44 md:w-52 h-36 sm:h-44 md:h-52 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">{album.cover ? <img src={getCoverUrl(album.cover.fileName)} className="w-full h-full object-cover" /> : <Disc className="w-16 sm:w-20 h-16 sm:h-20 text-gray-600 m-auto" />}</div>
            <div><p className="text-white text-xs sm:text-sm uppercase">Album</p><h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">{album.name}</h1><p className="text-white text-sm sm:text-base">{album.artist}</p></div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6"><button onClick={() => albumTracks[0] && playTrack(albumTracks[0], albumTracks)} className="w-12 sm:w-14 h-12 sm:h-14 bg-brand-primary rounded-full flex items-center justify-center hover:scale-105"><Play className="w-6 sm:w-7 h-6 sm:h-7 text-black ml-0.5 sm:ml-1" /></button></div>
          <div className="px-3 sm:px-6">{albumTracks.map((t, i) => <div key={t.id} data-track-id={t.id} onClick={() => playTrack(t, albumTracks)} className={clsx("flex items-center gap-2 sm:gap-4 py-2 px-2 sm:px-3 rounded-md hover:bg-white/5 cursor-pointer", currentTrack?.id === t.id ? 'bg-white/10' : '')}><span className="w-5 sm:w-8 text-center text-gray-500 text-xs sm:text-sm">{i+1}</span><div className="flex-1 min-w-0"><p className={clsx("truncate text-sm sm:text-base", currentTrack?.id === t.id ? 'text-brand-primary' : 'text-white')}>{t.title}</p></div><span className="text-gray-500 text-xs sm:text-sm">{Math.floor(t.duration/60)}:{String(Math.floor(t.duration%60)).padStart(2,'0')}</span></div>)}</div>
        </div>
      );
    }

    if (view === 'artist' && artist) {
      const aTracks = getArtistTracks(artist.name);
      const aAlbums = getArtistAlbums(artist.name);
      return (
        <div className="pb-8">
          <div className="flex flex-col sm:flex-row items-end gap-4 sm:gap-6 p-4 sm:p-6 bg-gradient-to-b from-white/20 to-transparent">
            <div className="w-36 sm:w-44 md:w-52 h-36 sm:h-44 md:h-52 bg-gray-800 rounded-full overflow-hidden flex-shrink-0">{artist.cover ? <img src={getCoverUrl(artist.cover.fileName)} className="w-full h-full object-cover" /> : <User className="w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 text-gray-600 m-auto" />}</div>
            <div><p className="text-white text-xs sm:text-sm uppercase">Artist</p><h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">{artist.name}</h1></div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6"><button onClick={() => aTracks[0] && playTrack(aTracks[0], aTracks)} className="w-12 sm:w-14 h-12 sm:h-14 bg-brand-primary rounded-full flex items-center justify-center hover:scale-105"><Play className="w-6 sm:w-7 h-6 sm:h-7 text-black ml-0.5 sm:ml-1" /></button></div>
          <div className="px-3 sm:px-6"><h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">{t('songs')}</h2>{aTracks.slice(0,10).map((t, i) => <div key={t.id} data-track-id={t.id} onClick={() => playTrack(t, aTracks)} className={clsx("flex items-center gap-2 sm:gap-4 py-2 px-2 sm:px-3 rounded-md hover:bg-white/5 cursor-pointer", currentTrack?.id === t.id ? 'bg-white/10' : '')}><span className="w-5 sm:w-8 text-center text-gray-500 text-xs sm:text-sm">{i+1}</span><div className="flex-1 min-w-0"><p className={clsx("truncate text-sm sm:text-base", currentTrack?.id === t.id ? 'text-brand-primary' : 'text-white')}>{t.title}</p></div><span className="text-gray-500 text-xs sm:text-sm">{Math.floor(t.duration/60)}:{String(Math.floor(t.duration%60)).padStart(2,'0')}</span></div>)}
          <h2 className="text-lg sm:text-xl font-bold text-white mt-6 sm:mt-8 mb-3 sm:mb-4">{t('albums')}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4">{aAlbums.map(a => <div key={a.name} onClick={() => { setSelectedAlbum(a); setView('album'); }} className="p-2 sm:p-3 bg-[#181818] hover:bg-white/10 rounded-lg cursor-pointer"><div className="w-full aspect-square bg-gray-800 rounded mb-2 sm:mb-3">{a.cover ? <img src={getCoverUrl(a.cover.fileName)} className="w-full h-full object-cover" /> : <Disc className="w-8 sm:w-12 h-8 sm:h-12 text-gray-600 m-auto" />}</div><p className="text-white text-xs sm:text-sm truncate">{a.name}</p></div>)}</div></div></div>
      );
    }

    if (view === 'playlist' && activePlaylist) {
      return (
        <div className="pb-8">
          <div className="flex flex-col sm:flex-row items-end gap-4 sm:gap-6 p-4 sm:p-6 bg-gradient-to-b from-white/20 to-transparent">
            <div className="w-36 sm:w-44 md:w-52 h-36 sm:h-44 md:h-52 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0"><ListMusic className="w-16 sm:w-20 h-16 sm:h-20 text-gray-600 m-auto" /></div>
            <div><p className="text-white text-xs sm:text-sm uppercase">{t('playlists')}</p><h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">{activePlaylist.name}</h1><p className="text-gray-400 text-sm sm:text-base">{playlistTracks.length} {t('songs')}</p></div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6"><button onClick={() => playlistTracks[0] && playTrack(playlistTracks[0], playlistTracks)} className="w-12 sm:w-14 h-12 sm:h-14 bg-brand-primary rounded-full flex items-center justify-center hover:scale-105"><Play className="w-6 sm:w-7 h-6 sm:h-7 text-black ml-0.5 sm:ml-1" /></button><button onClick={() => { if (playlistTracks.length) { const s = [...playlistTracks].sort(() => Math.random() - 0.5); playTrack(s[0], s); }}} className="text-gray-400 hover:text-white hidden sm:block"><Shuffle className="w-5 sm:w-6 h-5 sm:h-6" /></button></div>
          <div className="px-3 sm:px-6">{playlistTracks.map((t, i) => <div key={t.id} data-track-id={t.id} onClick={() => playTrack(t, playlistTracks)} className={clsx("flex items-center gap-2 sm:gap-4 py-2 px-2 sm:px-3 rounded-md hover:bg-white/5 cursor-pointer", currentTrack?.id === t.id ? 'bg-white/10' : '')}><span className="w-5 sm:w-8 text-center text-gray-500 text-xs sm:text-sm">{i+1}</span><div className="flex-1 min-w-0"><p className={clsx("truncate text-sm sm:text-base", currentTrack?.id === t.id ? 'text-brand-primary' : 'text-white')}>{t.title}</p><p className="text-gray-400 text-xs sm:text-sm truncate hidden sm:block">{t.artist}</p></div><button onClick={(e) => { e.stopPropagation(); toggleFavorite(t); }} className="text-gray-400 hover:text-white flex-shrink-0"><Heart className={clsx("w-4 sm:w-5 h-4 sm:h-5", favoriteTracks.some(x => x.id === t.id) ? 'fill-red-500 text-red-500' : '')} /></button><span className="text-gray-500 text-xs sm:text-sm hidden sm:inline">{Math.floor(t.duration/60)}:{String(Math.floor(t.duration%60)).padStart(2,'0')}</span></div>)}</div>
        </div>
      );
    }

    const isLibrary = view === 'library' || view === 'library-songs' || view === 'library-albums' || view === 'library-artists';

    return (
      <div className="pb-8">
        {view === 'home' && (
          <>
            <div className="px-3 sm:px-6">
              {/* Recommended for you - Grille de 6 */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Recommandations pour toi</h2>
                  {(recommendations.length > 0 || tracks.length > 0) && (
                    <button onClick={() => (recommendations[0] || tracks[0]) && playTrack(recommendations[0] || tracks[0], recommendations.length > 0 ? recommendations : tracks)} className="w-10 sm:w-12 h-10 sm:h-12 bg-brand-primary rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                      <Play className="w-5 sm:w-6 h-5 sm:h-6 text-black ml-0.5 sm:ml-1" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  {(recommendations.length > 0 ? recommendations : tracks.slice(0, 6)).map((t, i) => (
                    <div 
                      key={t.id} 
                      data-track-id={t.id}
                      {...getFocusProps('recommendations', i)}
                      onClick={() => playTrack(t, recommendations.length > 0 ? recommendations : tracks)}
                      className={clsx(
                        "group bg-[#181818] hover:bg-[#282828] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/30",
                        currentTrack?.id === t.id ? 'ring-2 ring-brand-primary' : '',
                        focusCategory === 'recommendations' && focusIndex === i && 'ring-2 ring-brand-primary'
                      )}
                    >
                      <div className="relative aspect-square">
                        {t.hasPicture ? (
                          <img src={getCoverUrl(t.fileName)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                            <Disc className="w-12 sm:w-16 h-12 sm:h-16 text-gray-500" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                          <button className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300 shadow-lg">
                            <Play className="w-6 h-6 text-black ml-1" />
                          </button>
                        </div>
                      </div>
                      <div className="p-2 sm:p-3">
                        <p className={clsx("text-white text-sm font-medium truncate", currentTrack?.id === t.id && 'text-brand-primary')}>
                          {t.title}
                        </p>
                        <p className="text-gray-400 text-xs truncate mt-0.5">{t.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Albums Section */}
              <div className="mb-8">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4">{t('albums')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {getUniqueAlbums().slice(0, 12).map((a, i) => (
                    <div 
                      {...getFocusProps('albums', i)} 
                      key={a.name} 
                      onClick={() => { setSelectedAlbum(a); setView('album'); }} 
                      className={clsx(
                        "group p-3 sm:p-4 bg-[#181818] hover:bg-[#252532] rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02]",
                        focusCategory === 'albums' && focusIndex === i && 'ring-2 ring-brand-primary'
                      )}
                    >
                      <div className="relative mb-3 sm:mb-4">
                        {a.cover ? (
                          <img src={getCoverUrl(a.cover.fileName)} className="w-full aspect-square bg-gray-800 rounded-lg object-cover shadow-lg group-hover:shadow-xl transition-shadow duration-300" />
                        ) : (
                          <div className="w-full aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                            <Disc className="w-12 sm:w-16 h-12 sm:h-16 text-gray-600" />
                          </div>
                        )}
                        <button 
                          className="absolute bottom-2 right-2 w-10 h-10 sm:w-12 sm:h-12 bg-brand-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg hover:scale-105"
                          onClick={(e) => { e.stopPropagation(); const tracks = getAlbumTracks(a.name); if (tracks[0]) playTrack(tracks[0], tracks); }}
                        >
                          <Play className="w-5 h-5 sm:w-6 sm:h-6 text-black ml-0.5 sm:ml-1" />
                        </button>
                      </div>
                      <p className="text-white font-medium text-sm sm:text-base truncate">{a.name}</p>
                      <p className="text-gray-400 text-xs sm:text-sm truncate mt-1">{a.artist}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Artists Section */}
              <div className="mb-8">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4">{t('artists')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {getUniqueArtists().slice(0, 12).map((a, i) => (
                    <div 
                      {...getFocusProps('artists', i)} 
                      key={a.name} 
                      onClick={() => { setSelectedArtist(a); setView('artist'); }} 
                      className={clsx(
                        "group p-3 sm:p-4 bg-[#181818] hover:bg-[#252532] rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02]",
                        focusCategory === 'artists' && focusIndex === i && 'ring-2 ring-brand-primary'
                      )}
                    >
                      <div className="relative mb-3 sm:mb-4 flex justify-center">
                        {a.cover ? (
                          <img src={getCoverUrl(a.cover.fileName)} className="w-24 sm:w-32 md:w-36 lg:w-40 aspect-square bg-gray-800 rounded-full object-cover shadow-lg group-hover:shadow-xl transition-shadow duration-300" />
                        ) : (
                          <div className="w-24 sm:w-32 md:w-36 lg:w-40 aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center">
                            <User className="w-12 sm:w-16 h-12 sm:h-16 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <p className="text-white font-medium text-sm sm:text-base truncate text-center">{a.name}</p>
                      <p className="text-gray-400 text-xs sm:text-sm truncate text-center mt-1">Artist</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {view === 'search' && (
          <div className="px-3 sm:px-6 pb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">{t('search')}</h1>
            {searchQuery && (
              <>
                <div className="flex gap-2 mb-4 sm:mb-6">
                  <button onClick={() => setSearchFilter('all')} className={clsx("px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium", searchFilter === 'all' ? 'bg-white text-black' : 'bg-white/10 text-white')}>Tout</button>
                  <button onClick={() => setSearchFilter('title')} className={clsx("px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium", searchFilter === 'title' ? 'bg-white text-black' : 'bg-white/10 text-white')}>Titres</button>
                  <button onClick={() => setSearchFilter('artist')} className={clsx("px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium", searchFilter === 'artist' ? 'bg-white text-black' : 'bg-white/10 text-white')}>Artistes</button>
                  <button onClick={() => setSearchFilter('album')} className={clsx("px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium", searchFilter === 'album' ? 'bg-white text-black' : 'bg-white/10 text-white')}>Albums</button>
                </div>
                
                {searchFilter === 'all' && (
                  <>
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">{t('songs')}</h2>
                    <div className="space-y-0.5 sm:space-y-1 mb-6">{tracks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.artist.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10).map(t => <div key={t.id} data-track-id={t.id} onClick={() => playTrack(t)} className="flex items-center gap-2 sm:gap-4 py-1.5 sm:py-2 px-2 sm:px-3 rounded-md hover:bg-white/5 cursor-pointer"><div className="w-8 sm:w-10 h-8 sm:h-10 bg-gray-800 rounded flex-shrink-0">{t.hasPicture ? <img src={getCoverUrl(t.fileName)} className="w-full h-full object-cover" /> : <Music className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600 m-auto" />}</div><div className="flex-1 min-w-0"><p className="text-white text-sm truncate">{t.title}</p><p className="text-gray-400 text-xs sm:text-sm truncate">{t.artist}</p></div></div>)}</div>
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">{t('artists')}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">{getUniqueArtists().filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10).map(a => <div key={a.name} onClick={() => { setSelectedArtist(a); setView('artist'); }} className="p-3 sm:p-4 bg-[#181818] hover:bg-[#252532] rounded-xl cursor-pointer"><div className="w-full aspect-square bg-gray-800 rounded-full mb-2 sm:mb-3">{a.cover ? <img src={getCoverUrl(a.cover.fileName)} className="w-full h-full object-cover rounded-full" /> : <User className="w-8 sm:w-12 h-8 sm:h-12 text-gray-600 m-auto" />}</div><p className="text-white text-sm truncate text-center">{a.name}</p></div>)}</div>
                  </>
                )}
                
                {searchFilter === 'title' && (
                  <>
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">{t('songs')}</h2>
                    <div className="space-y-0.5 sm:space-y-1">{tracks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20).map(t => <div key={t.id} data-track-id={t.id} onClick={() => playTrack(t)} className="flex items-center gap-2 sm:gap-4 py-1.5 sm:py-2 px-2 sm:px-3 rounded-md hover:bg-white/5 cursor-pointer"><div className="w-8 sm:w-10 h-8 sm:h-10 bg-gray-800 rounded flex-shrink-0">{t.hasPicture ? <img src={getCoverUrl(t.fileName)} className="w-full h-full object-cover" /> : <Music className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600 m-auto" />}</div><div className="flex-1 min-w-0"><p className="text-white text-sm truncate">{t.title}</p><p className="text-gray-400 text-xs sm:text-sm truncate">{t.artist}</p></div></div>)}</div>
                  </>
                )}
                
                {searchFilter === 'artist' && (
                  <>
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">{t('artists')}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">{getUniqueArtists().filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20).map(a => <div key={a.name} onClick={() => { setSelectedArtist(a); setView('artist'); }} className="p-3 sm:p-4 bg-[#181818] hover:bg-[#252532] rounded-xl cursor-pointer"><div className="w-full aspect-square bg-gray-800 rounded-full mb-2 sm:mb-3">{a.cover ? <img src={getCoverUrl(a.cover.fileName)} className="w-full h-full object-cover rounded-full" /> : <User className="w-8 sm:w-12 h-8 sm:h-12 text-gray-600 m-auto" />}</div><p className="text-white text-sm truncate text-center">{a.name}</p></div>)}</div>
                  </>
                )}
                
                {searchFilter === 'album' && (
                  <>
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">{t('albums')}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">{getUniqueAlbums().filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20).map(a => <div key={a.name} onClick={() => { setSelectedAlbum(a); setView('album'); }} className="p-3 sm:p-4 bg-[#181818] hover:bg-[#252532] rounded-xl cursor-pointer"><div className="w-full aspect-square bg-gray-800 rounded-lg mb-2 sm:mb-3">{a.cover ? <img src={getCoverUrl(a.cover.fileName)} className="w-full h-full object-cover rounded-lg" /> : <Disc className="w-8 sm:w-12 h-8 sm:h-12 text-gray-600 m-auto" />}</div><p className="text-white text-sm truncate">{a.name}</p><p className="text-gray-500 text-xs truncate">{a.artist}</p></div>)}</div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {view === 'stats' && (
          <div className="px-3 sm:px-6 pb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">{t('stats') || 'Your Statistics'}</h1>
            
            {!userStats ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400">Loading statistics...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
                  <div className="bg-[#181818] p-4 rounded-xl">
                    <p className="text-gray-400 text-sm mb-1">Total Listen Time</p>
                    <p className="text-2xl font-bold text-white">{Math.floor((userStats.totalListenTime || 0) / 3600)}h {Math.floor(((userStats.totalListenTime || 0) % 3600) / 60)}m</p>
                  </div>
                  <div className="bg-[#181818] p-4 rounded-xl">
                    <p className="text-gray-400 text-sm mb-1">Total Plays</p>
                    <p className="text-2xl font-bold text-white">{userStats.totalPlays || 0}</p>
                  </div>
                  <div className="bg-[#181818] p-4 rounded-xl">
                    <p className="text-gray-400 text-sm mb-1">Active Days</p>
                    <p className="text-2xl font-bold text-white">{userStats.activeDays || 0}</p>
                  </div>
                  <div className="bg-[#181818] p-4 rounded-xl">
                    <p className="text-gray-400 text-sm mb-1">Top Artist</p>
                    <p className="text-lg font-bold text-white truncate">{userStats.topArtists?.[0]?.artist || '-'}</p>
                  </div>
                </div>

                {userStats.playsByDay && userStats.playsByDay.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Plays This Week</h2>
                    <div className="flex items-end gap-2 h-32">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                        const dayData = userStats.playsByDay.find(d => {
                          const date = new Date(d.date);
                          return date.getDay() === (i === 0 ? 7 : i);
                        });
                        const plays = dayData?.plays || 0;
                        const maxPlays = Math.max(...userStats.playsByDay.map(d => d.plays), 1);
                        const height = (plays / maxPlays) * 100;
                        return (
                          <div key={day} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full bg-[#181818] rounded-t-md relative" style={{ height: `${height}%`, minHeight: plays > 0 ? '8px' : '0' }}>
                              <div className="absolute bottom-0 w-full bg-brand-primary rounded-t-md transition-all" style={{ height: '100%' }} />
                            </div>
                            <span className="text-gray-400 text-xs">{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {userStats.topTracks && userStats.topTracks.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Top Tracks</h2>
                    <div className="space-y-1">
                      {userStats.topTracks.slice(0, 5).map((t, i) => (
                        <div key={t.id} data-track-id={t.id} onClick={() => playTrack(t)} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                          <span className="text-gray-400 w-6 text-center">{i + 1}</span>
                          <div className="w-10 h-10 bg-gray-800 rounded flex-shrink-0">{t.hasPicture ? <img src={getCoverUrl(t.fileName)} className="w-full h-full object-cover rounded" /> : <Music className="w-5 h-5 text-gray-600 m-auto" />}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white truncate">{t.title}</p>
                            <p className="text-gray-400 text-sm truncate">{t.artist}</p>
                          </div>
                          <span className="text-gray-500 text-sm">{Math.floor((t.totalDuration || 0) / 3600)}h {Math.floor(((t.totalDuration || 0) % 3600) / 60)}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {userStats.topArtists && userStats.topArtists.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Top Artists</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {userStats.topArtists.slice(0, 4).map((a, i) => (
                        <div key={i} className="bg-[#181818] p-4 rounded-xl">
                          <div className="w-16 h-16 bg-gray-800 rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden">
                            {a.coverFileName ? (
                              <img src={getCoverUrl(a.coverFileName)} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-8 h-8 text-gray-600" />
                            )}
                          </div>
                          <p className="text-white text-center font-medium truncate">{a.artist}</p>
                          <p className="text-gray-400 text-sm text-center">{Math.floor((a.totalDuration || 0) / 3600)}h {Math.floor(((a.totalDuration || 0) % 3600) / 60)}m</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {userStats.topAlbums && userStats.topAlbums.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Top Albums</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {userStats.topAlbums.slice(0, 4).map((a, i) => (
                        <div key={i} className="bg-[#181818] p-4 rounded-xl">
                          <div className="w-full aspect-square bg-gray-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                            {a.coverFileName ? (
                              <img src={getCoverUrl(a.coverFileName)} className="w-full h-full object-cover" />
                            ) : (
                              <Disc className="w-12 h-12 text-gray-600" />
                            )}
                          </div>
                          <p className="text-white text-sm font-medium truncate">{a.album}</p>
                          <p className="text-gray-400 text-xs truncate">{a.artist}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {view === 'favorites' && (
          <div className="px-3 sm:px-6 pb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-red-500 to-pink-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Heart className="w-8 h-8 sm:w-12 sm:h-12 text-white fill-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm uppercase tracking-wider">Playlist</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('favorites') || 'Favorites'}</h1>
                <p className="text-gray-400 text-sm">{favoriteTracks.length} {t('songs') || 'songs'}</p>
              </div>
            </div>
            {favoriteTracks.length > 0 ? (
              <>
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <button onClick={() => favoriteTracks[0] && playTrack(favoriteTracks[0], favoriteTracks)} className="w-10 sm:w-12 h-10 sm:h-12 bg-brand-primary rounded-full flex items-center justify-center">
                    <Play className="w-5 sm:w-6 h-5 sm:h-6 text-black ml-0.5 sm:ml-1" />
                  </button>
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  {favoriteTracks.map((t, i) => (
                    <div key={t.id} data-track-id={t.id} onClick={() => playTrack(t, favoriteTracks)} className={clsx("flex items-center gap-2 sm:gap-4 py-1.5 sm:py-2 px-2 sm:px-3 rounded-md hover:bg-white/5 cursor-pointer", currentTrack?.id === t.id ? 'bg-white/10' : '')}>
                      <span className="w-5 sm:w-8 text-center text-gray-500 text-xs sm:text-sm">{i+1}</span>
                      <div className="flex items-center gap-2 sm:gap-4 flex-1">
                        <div className="flex items-center gap-2 sm:gap-4 flex-1">
                          {t.hasPicture ? <img src={getCoverUrl(t.fileName)} className="w-8 sm:w-10 h-8 sm:h-10 bg-gray-800 rounded object-cover" /> : <Music className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600 m-auto" />}
                          <div className="flex-1 min-w-0">
                            <p className={clsx("truncate text-xs sm:text-sm", currentTrack?.id === t.id ? 'text-brand-primary' : 'text-white')}>{t.title}</p>
                            <p className="text-gray-400 text-xs sm:text-sm truncate hidden sm:block">{t.artist}</p>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(t); }} className="text-gray-400 hover:text-white flex-shrink-0">
                          <Heart className={clsx("w-4 sm:w-5 h-4 sm:h-5", favoriteTracks.some(x => x.id === t.id) ? 'fill-red-500 text-red-500' : '')} />
                        </button>
                        <span className="text-gray-500 text-xs sm:text-sm hidden sm:inline">{Math.floor(t.duration/60)}:{String(Math.floor(t.duration%60)).padStart(2,'0')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No favorites yet</p>
                <p className="text-gray-500 text-sm">Click the heart icon on any track to add it to your favorites</p>
              </div>
            )}
          </div>
        )}

        {isLibrary && (
          <div className="px-3 sm:px-6 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 py-3 sm:py-4"><h1 className="text-2xl sm:text-3xl font-bold text-white">{t('library')}</h1><button onClick={() => setShowPlaylistModal(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 rounded-full text-white text-sm self-start"><Plus className="w-4 h-4" />{t('createPlaylist')}</button></div>
            <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2">
              <button {...getFocusProps('library-tabs', 0)} onClick={() => { setView('library'); setFocusCategory('library-tabs'); setFocusIndex(0); }} className={clsx("px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap", view === 'library' ? 'bg-white text-black' : 'bg-white/10 text-white')}>{t('playlists')}</button>
              <button {...getFocusProps('library-tabs', 1)} onClick={() => { setView('library-songs'); setFocusCategory('library-tabs'); setFocusIndex(1); }} className={clsx("px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap", view === 'library-songs' ? 'bg-white text-black' : 'bg-white/10 text-white')}>{t('songs')}</button>
              <button {...getFocusProps('library-tabs', 2)} onClick={() => { setView('library-albums'); setFocusCategory('library-tabs'); setFocusIndex(2); }} className={clsx("px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap", view === 'library-albums' ? 'bg-white text-black' : 'bg-white/10 text-white')}>{t('albums')}</button>
              <button {...getFocusProps('library-tabs', 3)} onClick={() => { setView('library-artists'); setFocusCategory('library-tabs'); setFocusIndex(3); }} className={clsx("px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap", view === 'library-artists' ? 'bg-white text-black' : 'bg-white/10 text-white')}>{t('artists')}</button>
            </div>
            {view === 'library' && <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4">{playlists.filter(p => p.name !== 'Favorites').map((p, i) => <div {...getFocusProps('playlists', i)} key={p.id} onClick={() => { setActivePlaylist(p); apiFetch(`/playlists/${p.id}/tracks`).then(r => r?.json()).then(d => { if (d) { setPlaylistTracks(d); setCurrentPlayList(d); } }); setView('playlist'); }} className={clsx("p-2 sm:p-3 bg-[#181818] hover:bg-white/10 rounded-lg cursor-pointer", focusCategory === 'playlists' && focusIndex === i && 'ring-2 ring-brand-primary')}><div className="w-full aspect-square bg-gray-800 rounded mb-2 sm:mb-3"><ListMusic className="w-8 sm:w-12 h-8 sm:h-12 text-gray-600 m-auto" /></div><p className="text-white text-xs sm:text-sm truncate">{p.name}</p></div>)}</div>}
            {view === 'library-songs' && <><div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4"><button onClick={() => tracks[0] && playTrack(tracks[0], tracks)} className="w-10 sm:w-12 h-10 sm:h-12 bg-brand-primary rounded-full flex items-center justify-center"><Play className="w-5 sm:w-6 h-5 sm:h-6 text-black ml-0.5 sm:ml-1" /></button></div><div className="space-y-0.5 sm:space-y-1">{tracks.map((t, i) => <div {...getFocusProps('tracks', i)} key={t.id} data-track-id={t.id} onClick={() => playTrack(t, tracks)} className={clsx("flex items-center gap-2 sm:gap-4 py-1.5 sm:py-2 px-2 sm:px-3 rounded-md hover:bg-white/5 cursor-pointer", currentTrack?.id === t.id ? 'bg-white/10' : '', focusCategory === 'tracks' && focusIndex === i && 'ring-2 ring-brand-primary')}><div className="flex items-center gap-2 sm:gap-4 flex-1"><div className="flex items-center gap-2 sm:gap-4 flex-1">{t.hasPicture ? <img src={getCoverUrl(t.fileName)} className="w-8 sm:w-10 h-8 sm:h-10 bg-gray-800 rounded object-cover" /> : <Music className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600 m-auto" />}<div className="flex-1 min-w-0"><p className={clsx("truncate text-xs sm:text-sm", currentTrack?.id === t.id ? 'text-brand-primary' : 'text-white')}>{t.title}</p><p className="text-gray-400 text-xs truncate hidden sm:block">{t.artist}</p></div></div><span className="text-gray-500 text-xs hidden sm:inline">{Math.floor(t.duration/60)}:{String(Math.floor(t.duration%60)).padStart(2,'0')}</span></div><TrackMenu track={t} onAddToPlaylist={addToPlaylist} onAddToQueue={addToQueue} onDelete={() => {}} onTrackDelete={(deletedTrack) => {
              // Refresh tracks list
              apiFetch('/tracks').then(r => r?.json()).then(newTracks => {
                if (newTracks) {
                  setTracks(newTracks);
                  setCurrentPlayList(newTracks);
                }
              });
              // If current track was deleted, stop playback
              if (currentTrack?.id === deletedTrack.id) {
                audioRef.current.pause();
                setIsPlaying(false);
                setCurrentTrack(null);
              }
            }} /></div>)}</div></>}
            {view === 'library-albums' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {getUniqueAlbums().map((a, i) => (
                  <div {...getFocusProps('albums', i)} key={a.name} onClick={() => { setSelectedAlbum(a); setView('album'); }} className={clsx("group p-3 sm:p-4 bg-[#181818] hover:bg-[#252532] rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02]", focusCategory === 'albums' && focusIndex === i && 'ring-2 ring-brand-primary')}>
                    <div className="relative mb-3 sm:mb-4">
                      {a.cover ? <img src={getCoverUrl(a.cover.fileName)} className="w-full aspect-square bg-gray-800 rounded-lg object-cover shadow-lg group-hover:shadow-xl transition-shadow duration-300" /> : <div className="w-full aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center"><Disc className="w-12 sm:w-16 h-12 sm:h-16 text-gray-600" /></div>}
                      <button className="absolute bottom-2 right-2 w-10 h-10 sm:w-12 sm:h-12 bg-brand-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg hover:scale-105" onClick={(e) => { e.stopPropagation(); const tracks = getAlbumTracks(a.name); if (tracks[0]) playTrack(tracks[0], tracks); }}><Play className="w-5 h-5 sm:w-6 sm:h-6 text-black ml-0.5 sm:ml-1" /></button>
                    </div>
                    <p className="text-white font-medium text-sm sm:text-base truncate">{a.name}</p>
                    <p className="text-gray-400 text-xs sm:text-sm truncate mt-1">{a.artist}</p>
                  </div>
                ))}
              </div>
            )}
            {view === 'library-artists' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {getUniqueArtists().map((a, i) => (
                  <div {...getFocusProps('artists', i)} key={a.name} onClick={() => { setSelectedArtist(a); setView('artist'); }} className={clsx("group p-3 sm:p-4 bg-[#181818] hover:bg-[#252532] rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02]", focusCategory === 'artists' && focusIndex === i && 'ring-2 ring-brand-primary')}>
                    <div className="relative mb-3 sm:mb-4 flex justify-center">
                      {a.cover ? <img src={getCoverUrl(a.cover.fileName)} className="w-24 sm:w-32 md:w-36 lg:w-40 aspect-square bg-gray-800 rounded-full object-cover shadow-lg group-hover:shadow-xl transition-shadow duration-300" /> : <div className="w-24 sm:w-32 md:w-36 lg:w-40 aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center"><User className="w-12 sm:w-16 h-12 sm:h-16 text-gray-600" /></div>}
                    </div>
                    <p className="text-white font-medium text-sm sm:text-base truncate text-center">{a.name}</p>
                    <p className="text-gray-400 text-xs sm:text-sm truncate text-center mt-1">Artist</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const isPS = controllerType === 'playstation';

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-black">
      <audio 
        ref={audioRef} 
        onEnded={() => {
          if (currentTrack && currentUser) {
            recordTrackDuration(currentTrack.id, currentUser.id);
          }
          handleNext();
        }}
      />
      <div className="flex-1 flex overflow-hidden">
        <aside className={clsx(
          "fixed md:relative z-40 h-full bg-black flex flex-col flex-shrink-0 transition-transform duration-300",
          showMobileMenu ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between md:justify-start gap-3 text-white mb-6 md:mb-8">
              <button onClick={() => setShowMobileMenu(false)} className="md:hidden p-2 text-gray-400 hover:text-white"><XCircle className="w-7 h-7" /></button>
              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center"><Music className="w-6 h-6 text-black" /></div><span className="text-xl font-black">Localia</span></div>
            </div>
            <nav className="space-y-1">
              <button {...getFocusProps('sidebar', 0)} onClick={() => { setView('home'); setShowMobileMenu(false); setFocusCategory('sidebar'); setFocusIndex(0); }} className={clsx("w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors relative", view === 'home' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5', focusCategory === 'sidebar' && focusIndex === 0 && gamepadConnected && 'ring-2 ring-brand-primary ring-inset')}><Home className="w-6 h-6" /><span className="font-medium">{t('home')}</span></button>
              <button {...getFocusProps('sidebar', 1)} onClick={() => { setView('search'); setShowMobileMenu(false); setFocusCategory('sidebar'); setFocusIndex(1); }} className={clsx("w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors relative", view === 'search' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5', focusCategory === 'sidebar' && focusIndex === 1 && gamepadConnected && 'ring-2 ring-brand-primary ring-inset')}><SearchIcon className="w-6 h-6" /><span className="font-medium">{t('search')}</span></button>
              <button {...getFocusProps('sidebar', 2)} onClick={() => { setView('library'); setShowMobileMenu(false); setFocusCategory('sidebar'); setFocusIndex(2); }} className={clsx("w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors relative", view === 'library' || view.startsWith('library') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5', focusCategory === 'sidebar' && focusIndex === 2 && gamepadConnected && 'ring-2 ring-brand-primary ring-inset')}><Library className="w-6 h-6" /><span className="font-medium">{t('library')}</span></button>
              <button {...getFocusProps('sidebar', 3)} onClick={() => { setView('stats'); setShowMobileMenu(false); setFocusCategory('sidebar'); setFocusIndex(3); }} className={clsx("w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors relative", view === 'stats' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5', focusCategory === 'sidebar' && focusIndex === 3 && gamepadConnected && 'ring-2 ring-brand-primary ring-inset')}><BarChart2 className="w-6 h-6" /><span className="font-medium">{t('stats') || 'Statistics'}</span></button>
              {favoritesPlaylist && (
                <button {...getFocusProps('sidebar', 4)} onClick={() => { apiFetch(`/playlists/${favoritesPlaylist.id}/tracks`).then(r => r?.json()).then(d => { if (d) { setPlaylistTracks(d); setCurrentPlayList(d); } }); setView('favorites'); setShowMobileMenu(false); setFocusCategory('sidebar'); setFocusIndex(4); }} className={clsx("w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors relative", view === 'favorites' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5', focusCategory === 'sidebar' && focusIndex === 4 && gamepadConnected && 'ring-2 ring-brand-primary ring-inset')}><Heart className="w-6 h-6" /><span className="font-medium">{t('favorites') || 'Favorites'}</span></button>
              )}
            </nav>
            <div className="mt-6 md:mt-8">
              <div className="flex items-center justify-between px-4 mb-3"><span className="text-gray-400 text-sm font-medium uppercase">{t('playlists')}</span><button onClick={() => setShowPlaylistModal(true)} className="text-gray-400 hover:text-white"><Plus className="w-5 h-5" /></button></div>
              <div className="space-y-1 max-h-48 md:max-h-64 overflow-y-auto">{playlists.filter(p => p.name !== 'Favorites').map(p => <button key={p.id} onClick={() => { setActivePlaylist(p); apiFetch(`/playlists/${p.id}/tracks`).then(r => r?.json()).then(d => { if (d) { setPlaylistTracks(d); setCurrentPlayList(d); } }); setView('playlist'); setShowMobileMenu(false); }} className="w-full text-left px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-sm truncate">{p.name}</button>)}</div>
            </div>
          </div>
        </aside>

        {showMobileMenu && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setShowMobileMenu(false)} />}

        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-black">
          <header className="flex items-center justify-between p-3 md:p-4 gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 text-gray-400 hover:text-white flex-shrink-0"><Menu className="w-6 h-6" /></button>
              {(view !== 'home' && view !== 'search' && view !== 'library' && !view.startsWith('library') && view !== 'settings' && view !== 'stats' && view !== 'favorites') && <button onClick={() => { setView('home'); setSelectedAlbum(null); setSelectedArtist(null); setActivePlaylist(null); }} className="p-2 bg-black/50 rounded-full hover:scale-110 flex-shrink-0"><ArrowLeft className="w-5 h-5 text-white" /></button>}
              <div className="relative w-full max-w-xs md:max-w-md lg:max-w-80 hidden sm:block"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); if (view !== 'search') setView('search'); }} placeholder={t('searchPlaceholder')} className="w-full bg-white/10 border border-transparent rounded-full py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:bg-white/20 text-sm" /></div>
            </div>
            <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
              {gamepadConnected && currentUser && (
                <button 
                  onClick={toggleConsoleMode}
                  className={clsx(
                    "p-2 rounded-full transition-all",
                    consoleMode 
                      ? "bg-brand-primary text-black" 
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  )}
                  title={consoleMode ? "Quitter le mode console" : "Mode Console TV"}
                >
                  <Gamepad2 className="w-5 h-5" />
                </button>
              )}
              <button onClick={() => setShowUploadModal(true)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10" title="Upload Music"><Upload className="w-5 h-5" /></button>
              <button onClick={() => setShowEqualizer(true)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 hidden sm:flex"><Sliders className="w-6 h-6" /></button>
              <button onClick={() => setView('settings')} className={clsx("p-2 rounded-full", view === 'settings' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10')}><Settings className="w-6 h-6" /></button>
              <button onClick={() => setShowAccountModal(true)} className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20">{userAvatar ? <img src={userAvatar} className="w-7 h-7 rounded-full object-cover" /> : <div className="w-7 h-7 bg-brand-primary rounded-full flex items-center justify-center text-black font-bold text-sm">{currentUser.username[0].toUpperCase()}</div>}<span className="text-white font-medium text-sm hidden md:inline">{currentUser.username}</span></button>
            </div>
          </header>
          <div className="sm:hidden px-3 pb-2"><div className="relative w-full"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); if (view !== 'search') setView('search'); }} placeholder={t('searchPlaceholder')} className="w-full bg-white/10 border border-transparent rounded-full py-2 pl-9 pr-4 text-white placeholder-gray-400 focus:outline-none focus:bg-white/20 text-sm" /></div></div>
          <div className="flex-1 overflow-y-auto pb-24 sm:pb-32 animate-fade-in">{renderContent()}</div>
        </main>
      </div>

      <div className="h-20 sm:h-24 bg-gradient-to-r from-[#181818] via-[#1a1a1a] to-[#181818] border-t border-white/10 px-2 sm:px-6 flex items-center justify-between fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-4 w-1/3 sm:w-1/4 min-w-0">
          {currentTrack && (
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden shadow-lg">
                {currentTrack.hasPicture ? (
                  <img src={getCoverUrl(currentTrack.fileName)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <Disc className="w-4 h-5 sm:w-7 sm:h-7 text-gray-500" />
                  </div>
                )}
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className="text-white font-medium truncate text-sm">{currentTrack.title}</p>
                <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); console.log('Heart clicked', currentTrack); toggleFavorite(currentTrack); }} className="text-gray-400 hover:text-white transition-colors flex-shrink-0 p-2">
                <Heart className={clsx("w-5 h-5", favoritesPlaylist && favoriteTracks.some(t => t.id === currentTrack?.id) ? 'fill-red-500 text-red-500' : '')} />
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center w-1/3 sm:w-1/2">
          <div className="flex items-center gap-2 sm:gap-4 mb-1 sm:mb-2">
            <button onClick={() => setIsShuffle(!isShuffle)} className={clsx("transition-colors hidden sm:block", isShuffle ? 'text-brand-primary' : 'text-gray-400 hover:text-white')}><Shuffle className="w-4 h-4" /></button>
            <button onClick={handlePrev} className="text-gray-400 hover:text-white transition-colors"><SkipBack className="w-4 h-5" /></button>
            <button onClick={() => { if (currentTrack) { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); } }} className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg">{isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-black" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 text-black ml-0.5" />}</button>
            <button onClick={handleNext} className="text-gray-400 hover:text-white transition-colors"><SkipForward className="w-4 h-5" /></button>
            <button onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : 'off')} className={clsx("transition-colors hidden sm:block", repeatMode !== 'off' ? 'text-brand-primary' : 'text-gray-400 hover:text-white')}><Repeat className="w-4 h-4" /></button>
            <button onClick={() => setShowQueueModal(true)} className="text-gray-400 hover:text-white transition-colors relative">
              <ListMusic className="w-4 h-4" />
              {queue.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary text-white text-[10px] rounded-full flex items-center justify-center">{queue.length}</span>
              )}
            </button>
          </div>
          <div className="w-full flex items-center gap-1 sm:gap-3">
            <span className="text-gray-400 text-xs w-6 sm:w-10 text-right tabular-nums hidden sm:block">{Math.floor(currentTime/60)}:{String(Math.floor(currentTime%60)).padStart(2,'0')}</span>
            <div className="flex-1 relative h-1.5 bg-white/10 rounded-full group">
              <div 
                className="absolute h-full bg-brand-primary rounded-full transition-all"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
              <input 
                type="range" 
                min="0" 
                max={duration||100} 
                step="0.1" 
                value={currentTime} 
                onChange={(e) => { audioRef.current.currentTime = e.target.value; }} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <span className="text-gray-400 text-xs w-6 sm:w-10 tabular-nums hidden sm:block">{Math.floor(duration/60)}:{String(Math.floor(duration%60)).padStart(2,'0')}</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 sm:gap-4 w-1/3 sm:w-1/4">
          <div className="flex items-center gap-1 sm:gap-2 group">
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-white transition-colors" />
            <div className="w-12 sm:w-20 relative h-1.5 bg-white/10 rounded-full">
              <div 
                className="absolute h-full bg-white rounded-full transition-all"
                style={{ width: `${volume * 100}%` }}
              />
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume} 
                onChange={(e) => { audioRef.current.volume = e.target.value; setVolume(e.target.value); }} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
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
            <div>
              {isEditingUsername ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={editedUsername} 
                      onChange={(e) => setEditedUsername(e.target.value)}
                      className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-white text-lg font-bold focus:outline-none focus:border-brand-primary"
                      maxLength={20}
                    />
                    <button 
                      onClick={async () => {
                        if (editedUsername.trim().length < 2) return;
                        const res = await apiFetch(`/users/${currentUser.id}`, { 
                          method: 'PUT', 
                          body: JSON.stringify({ username: editedUsername.trim() }) 
                        });
                        const data = await res.json();
                        if (data.success) {
                          setCurrentUser({ ...currentUser, username: editedUsername.trim() });
                          localStorage.setItem('localify_user', JSON.stringify({ ...currentUser, username: editedUsername.trim() }));
                          setIsEditingUsername(false);
                        } else {
                          alert(data.error || 'Failed to update username');
                        }
                      }}
                      className="p-1.5 bg-brand-primary rounded-full text-black hover:bg-green-400"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button 
                      onClick={() => { setIsEditingUsername(false); setEditedUsername(currentUser.username); }}
                      className="p-1.5 bg-white/10 rounded-full text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-white font-bold text-xl">{currentUser.username}</p>
                  <button onClick={() => { setIsEditingUsername(true); setEditedUsername(currentUser.username); }} className="text-gray-400 text-sm hover:text-white">Edit name</button>
                </>
              )}
              <p className="text-gray-400 text-sm">ID: {currentUser.id}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <div>
                  <p className="text-white font-medium">PIN Code</p>
                  <p className="text-gray-400 text-sm">{currentUser.hasPin ? 'Enabled' : 'Not set'}</p>
                </div>
              </div>
              {currentUser.hasPin ? (
                <button 
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to remove your PIN code?')) {
                      const res = await apiFetch(`/users/${currentUser.id}`, { 
                        method: 'PUT', 
                        body: JSON.stringify({ removePin: true }) 
                      });
                      const data = await res.json();
                      if (data.success) {
                        setCurrentUser({ ...currentUser, hasPin: false });
                        apiFetch('/users').then(r => r?.json()).then(setUsers);
                      } else {
                        alert(data.error || 'Failed to remove PIN');
                      }
                    }
                  }}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-sm hover:bg-red-500/30"
                >
                  Remove
                </button>
              ) : (
                <button 
                  onClick={() => { setShowPinSetupModal(true); setNewPin(['', '', '', '']); setPinSetupError(''); }}
                  className="px-3 py-1.5 bg-brand-primary text-black rounded-full text-sm font-medium hover:bg-green-400"
                >
                  Add PIN
                </button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </div>
                <div>
                  <p className="text-white font-medium">Delete Profile</p>
                  <p className="text-gray-400 text-sm">Permanently delete your account</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDeleteConfirmModal(true)}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-sm hover:bg-red-500/30"
              >
                Delete
              </button>
            </div>
          </div>

          <button onClick={() => { const userId = currentUser?.id; apiFetch('/logout', { method: 'POST' }); setCurrentUser(null); localStorage.removeItem('localify_user'); localStorage.removeItem('localify_token'); if (userId) localStorage.removeItem(`localify_playback_state_${userId}`); }} className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 w-full justify-center"><LogOut className="w-5 h-5" />Sign out</button>
        </div>
      </Modal>

      <Modal isOpen={showPinSetupModal} onClose={() => setShowPinSetupModal(false)} title="Set PIN Code">
        <div className="text-center py-4">
          <p className="text-gray-400 mb-4">Enter a 4-digit PIN to protect your profile</p>
          <div className="flex justify-center gap-2 mb-4">
            {newPin.map((d, i) => (
              <input 
                key={i} 
                type="text" 
                inputMode="numeric" 
                maxLength={1} 
                value={d} 
                onChange={(e) => { 
                  const v = e.target.value.replace(/\D/g,''); 
                  const n = [...newPin]; 
                  n[i] = v; 
                  setNewPin(n); 
                  if (v && i < 3) document.getElementById(`newpin${i+1}`)?.focus(); 
                }} 
                id={`newpin${i}`}
                className="w-12 h-14 bg-white/10 border border-white/10 rounded-lg text-white text-center text-xl" 
                autoFocus={i===0} 
              />
            ))}
          </div>
          {pinSetupError && <p className="text-red-400 text-sm mb-4">{pinSetupError}</p>}
          <button 
            onClick={async () => {
              const pin = newPin.join('');
              if (pin.length !== 4) { setPinSetupError('Enter 4 digits'); return; }
              try {
                const res = await fetch(`${API_BASE}/users/${currentUser.id}`, { 
                  method: 'PUT', 
                  headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                  },
                  body: JSON.stringify({ pin }) 
                });
                const data = await res.json();
                if (data.success) {
                  setCurrentUser({ ...currentUser, hasPin: true });
                  apiFetch('/users').then(r => r?.json()).then(setUsers);
                  setShowPinSetupModal(false);
                } else {
                  setPinSetupError(`Error ${res.status}: ${data.error || 'Failed to set PIN'}`);
                }
              } catch (err) {
                console.error('Error setting PIN:', err);
                setPinSetupError('Network error: ' + err.message);
              }
            }} 
            className="w-full bg-brand-primary text-black font-bold py-3 rounded-full"
          >
            Save PIN
          </button>
        </div>
      </Modal>

      <Modal isOpen={showDeleteConfirmModal} onClose={() => setShowDeleteConfirmModal(false)} title="Delete Profile" size="sm">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </div>
          <p className="text-white font-medium mb-2">Are you sure?</p>
          <p className="text-gray-400 text-sm mb-6">This action cannot be undone. All your playlists and data will be permanently deleted.</p>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowDeleteConfirmModal(false)}
              className="flex-1 px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20"
            >
              Cancel
            </button>
            <button 
              onClick={() => { setShowDeleteConfirmModal(false); setIsDeletingProfile(true); }}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAddToPlaylistModal} onClose={() => { setShowAddToPlaylistModal(false); setTrackToAdd(null); }} title="Add to playlist" size="sm">
        <div className="space-y-2">
          {playlists.filter(p => p.name !== 'Favorites').length === 0 ? (
            <p className="text-gray-400 text-center py-4">No playlists yet. Create one first!</p>
          ) : (
            playlists.filter(p => p.name !== 'Favorites').map(playlist => (
              <button
                key={playlist.id}
                onClick={() => handleAddToPlaylistConfirm(playlist.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ListMusic className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{playlist.name}</p>
                  <p className="text-gray-500 text-sm">{playlist.is_group_shared ? 'Shared playlist' : 'Your playlist'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>

      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Music" size="lg">
        <div 
          className={clsx(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            isDragging 
              ? "border-brand-primary bg-brand-primary/10" 
              : "border-gray-600 hover:border-gray-500 hover:bg-white/5"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => uploadInputRef.current?.click()}
        >
          <input 
            ref={uploadInputRef}
            type="file" 
            accept=".mp3,.flac,.wav,.ogg,.m4a" 
            multiple 
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          {isUploading ? (
            <div className="py-8">
              <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-white mb-2 font-medium">Drop audio files here or click to browse</p>
              <p className="text-gray-400 text-sm">Supports MP3, FLAC, WAV, OGG, M4A</p>
            </>
          )}
        </div>
      </Modal>

      <Modal isOpen={showUploadMessage} onClose={() => { setShowUploadMessage(false); setUploadData(null); }} title={uploadMessage?.type === 'success' ? 'Success' : 'Already exists'}>
        <div className="text-center py-4">
          {uploadData && (
            <div className="mb-4">
              <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden bg-gray-800 shadow-lg mb-3">
                {uploadData.hasPicture ? (
                  <img src={getCoverUrl(uploadData.fileName || uploadData.id)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <Disc className="w-12 h-12 text-gray-500" />
                  </div>
                )}
              </div>
              <h3 className="text-white font-bold text-lg">{uploadData.title}</h3>
              <p className="text-gray-400">{uploadData.artist}</p>
              {uploadData.album && uploadData.album !== 'Unknown Album' && (
                <p className="text-gray-500 text-sm">{uploadData.album}</p>
              )}
            </div>
          )}
          <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4", uploadMessage?.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20')}>
            {uploadMessage?.type === 'success' ? (
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
          </div>
          <p className={clsx("font-medium", uploadMessage?.type === 'success' ? 'text-green-400' : 'text-red-400')}>{uploadMessage?.text}</p>
          <button onClick={() => { setShowUploadMessage(false); setUploadData(null); }} className="mt-6 px-6 py-2 bg-brand-primary text-black font-semibold rounded-full">OK</button>
        </div>
      </Modal>

      <Modal isOpen={showEqualizer} onClose={() => setShowEqualizer(false)} title={t('equalizer')}>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-wrap gap-2">{Object.entries(equalizerPresets).map(([k, p]) => <button key={k} onClick={() => applyPreset(k)} className={clsx("px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm", equalizerPreset === k ? 'bg-brand-primary text-black' : 'bg-white/10 text-white')}>{p.name}</button>)}</div>
          <div className="flex justify-end"><button onClick={() => setShowEqualizer(false)} className="px-5 sm:px-6 py-1.5 sm:py-2 bg-brand-primary text-black font-semibold rounded-full text-sm sm:text-base">Done</button></div>
        </div>
      </Modal>

      <Modal isOpen={showQueueModal} onClose={() => setShowQueueModal(false)} title="File d'attente" size="lg">
        <div className="max-h-[60vh] overflow-y-auto">
          {queue.length === 0 ? (
            <div className="text-center py-8">
              <ListMusic className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">La file d'attente est vide</p>
              <p className="text-gray-500 text-sm mt-1">Les titres ajoutés apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-1">
              {queue.map((track, index) => (
                <div key={`${track.id}-${index}`} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg group">
                  <span className="text-gray-500 text-sm w-6">{index + 1}</span>
                  <div className="w-10 h-10 bg-gray-800 rounded flex-shrink-0 overflow-hidden">
                    {track.hasPicture ? (
                      <img src={getCoverUrl(track.fileName)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Disc className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{track.title}</p>
                    <p className="text-gray-500 text-xs truncate">{track.artist}</p>
                  </div>
                  <button onClick={() => playFromQueue(index)} className="p-2 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-4 h-4" />
                  </button>
                  <button onClick={() => removeFromQueue(index)} className="p-2 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {queue.length > 0 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-white/10">
            <button onClick={clearQueue} className="text-gray-400 hover:text-white text-sm">ToutClear</button>
            <button onClick={() => setShowQueueModal(false)} className="px-4 py-2 bg-brand-primary text-black font-semibold rounded-full text-sm">Fermer</button>
          </div>
        )}
      </Modal>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-[#181818] border border-white/10 rounded-lg shadow-xl z-50 py-2"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button 
            onClick={() => { addToPlaylist(contextMenu.track); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-white hover:bg-white/10 flex items-center gap-3"
          >
            <Plus className="w-4 h-4" />
            Add to playlist
          </button>
          <button 
            onClick={() => { addToQueue(contextMenu.track); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-white hover:bg-white/10 flex items-center gap-3"
          >
            <ListMusic className="w-4 h-4" />
            Add to queue
          </button>
        </div>
      )}

      {gamepadConnected && currentUser && (
        <GamepadHints controllerType={controllerType} mode="navigation" />
      )}

      {consoleMode && currentUser && (
        <ConsoleModeView
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          consoleView={consoleView}
          setConsoleView={setConsoleView}
          consoleFocus={consoleFocus}
          setConsoleFocus={setConsoleFocus}
          flatItems={flatItems}
          controllerType={controllerType}
          onPlayPause={() => { if (currentTrack) { if (isPlaying) audioRef.current.pause(); else audioRef.current.play().catch(() => {}); setIsPlaying(!isPlaying); } }}
          onNext={handleNext}
          onPrev={handlePrev}
          onVolumeUp={() => setVolume(v => Math.min(1, parseFloat(v) + 0.1))}
          onVolumeDown={() => setVolume(v => Math.max(0, parseFloat(v) - 0.1))}
          getCoverUrl={getCoverUrl}
          setConsoleMode={setConsoleMode}
          volume={volume}
          currentTime={currentTime}
          duration={duration}
          tracks={tracks}
          playlists={playlists}
          recommendations={recommendations}
          recentlyPlayed={recentlyPlayed}
          getUniqueAlbums={getUniqueAlbums}
          getUniqueArtists={getUniqueArtists}
          getAlbumTracks={getAlbumTracks}
          getArtistTracks={getArtistTracks}
          getArtistAlbums={getArtistAlbums}
          apiFetch={apiFetch}
          setActivePlaylist={setActivePlaylist}
          setPlaylistTracks={setPlaylistTracks}
          setCurrentPlayList={setCurrentPlayList}
          setSelectedAlbum={setSelectedAlbum}
          setSelectedArtist={setSelectedArtist}
          setView={setView}
          audioRef={audioRef}
          setIsPlaying={setIsPlaying}
          setRecentlyPlayed={setRecentlyPlayed}
          getStreamUrl={getStreamUrl}
        />
      )}
    </div>
  );
}

function ConsoleModeView({
  currentTrack, isPlaying,
  consoleView, setConsoleView, consoleFocus, setConsoleFocus,
  flatItems, controllerType, onPlayPause, onNext, onPrev,
  onVolumeUp, onVolumeDown, getCoverUrl, setConsoleMode, volume, currentTime, duration,
  tracks, playlists, recommendations, recentlyPlayed, getUniqueAlbums, getUniqueArtists, getAlbumTracks, getArtistTracks, getArtistAlbums, apiFetch,
  setActivePlaylist, setPlaylistTracks, setCurrentPlayList, setSelectedAlbum, setSelectedArtist, setView
}) {
  const isPS = controllerType === 'playstation';
  const gridRef = useRef(null);
  const [gridItems, setGridItems] = useState([]);
  const [gridFocus, setGridFocus] = useState({ row: 0, col: 0 });
  const [gridCols, setGridCols] = useState(4);

  // Calculer la grille dynamique
  useEffect(() => {
    const updateGrid = () => {
      let items = [];
      let cols = 4;
      
      if (consoleView === 'home') {
        items = [
          { type: 'section', label: 'Playlists', items: playlists.slice(0, 8) },
          { type: 'section', label: 'Recommandations', items: (recommendations.length > 0 ? recommendations : tracks.slice(0, 8)) },
          { type: 'section', label: 'Albums', items: getUniqueAlbums().slice(0, 8) },
          { type: 'section', label: 'Artists', items: getUniqueArtists().slice(0, 8) }
        ];
        cols = 4;
      } else if (consoleView === 'playlist' || consoleView === 'album') {
        const albumName = currentTrack?.album;
        const albumTracks = albumName ? getAlbumTracks(albumName) : tracks.slice(0, 20);
        items = [{ type: 'tracks', items: albumTracks }];
        cols = 3;
      } else if (consoleView === 'artist') {
        const artistName = currentTrack?.artist;
        items = [
          { type: 'section', label: 'Songs', items: getArtistTracks(artistName).slice(0, 12) },
          { type: 'section', label: 'Albums', items: getArtistAlbums(artistName).slice(0, 8) }
        ];
        cols = 4;
      }
      
      setGridItems(items);
      setGridCols(cols);
    };
    
    updateGrid();
    window.addEventListener('resize', updateGrid);
    return () => window.removeEventListener('resize', updateGrid);
  }, [consoleView, playlists, recentlyPlayed, tracks, currentTrack, getUniqueAlbums, getUniqueArtists, getAlbumTracks, getArtistTracks, getArtistAlbums]);

  // Synchroniser avec le focus global
  useEffect(() => {
    // Convertir flatItems focus en grille focus
    let flatIndex = 0;
    for (let r = 0; r < gridItems.length; r++) {
      const section = gridItems[r];
      if (section.type === 'section') {
        for (let c = 0; c < Math.min(section.items.length, gridCols); c++) {
          if (flatIndex === consoleFocus.row) {
            setGridFocus({ row: r, col: c });
            return;
          }
          flatIndex++;
        }
      } else if (section.type === 'tracks') {
        for (let c = 0; c < Math.min(section.items.length, gridCols); c++) {
          if (flatIndex === consoleFocus.row) {
            setGridFocus({ row: r, col: c });
            return;
          }
          flatIndex++;
        }
      }
    }
  }, [consoleFocus.row, gridItems, gridCols]);

  const navigateGrid = (direction) => {
    setGridFocus(prev => {
      let { row, col } = prev;
      
      switch (direction) {
        case 'up':
          row = Math.max(0, row - 1);
          break;
        case 'down':
          row = Math.min(gridItems.length - 1, row + 1);
          break;
        case 'left':
          col = Math.max(0, col - 1);
          break;
        case 'right':
          col = Math.min(gridCols - 1, col + 1);
          break;
      }
      
      return { row, col };
    });
    
    // Scroll to keep focused item visible
    setTimeout(() => {
      const item = getGridItem(row, col);
      if (item && gridRef.current) {
        const element = gridRef.current.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, 100);
  };

  const getGridItem = (row, col) => {
    const section = gridItems[row];
    if (!section) return null;
    
    if (section.type === 'section') {
      return section.items[col] || null;
    } else if (section.type === 'tracks') {
      return section.items[col] || null;
    }
    
    return null;
  };

  const handleSelect = () => {
    const item = getGridItem(gridFocus.row, gridFocus.col);
    if (!item) return;

    const section = gridItems[gridFocus.row];
    
    if (section.type === 'section') {
      if (section.label === 'Playlists') {
        setActivePlaylist(item);
        apiFetch(`/playlists/${item.id}/tracks`).then(r => r?.json()).then(d => {
          if (d) {
            setPlaylistTracks(d);
            setCurrentPlayList(d);
          }
        });
        setConsoleView('playlist');
        setGridFocus({ row: 0, col: 0 });
      } else if (section.label === 'Recently Played') {
        playTrack(item);
      } else if (section.label === 'Albums') {
        setSelectedAlbum(item);
        setConsoleView('album');
        setGridFocus({ row: 0, col: 0 });
      } else if (section.label === 'Artists') {
        setSelectedArtist(item);
        setConsoleView('artist');
        setGridFocus({ row: 0, col: 0 });
      }
    } else if (section.type === 'tracks') {
      playTrack(item, section.items);
    }
  };

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
    audioRef.current.src = getStreamUrl(track.fileName);
    audioRef.current.play().catch(() => {});
    setRecentlyPlayed(prev => [track, ...prev.filter(t => t.id !== track.id)].slice(0, 20));
  };

  const isFocused = (row, col) => gridFocus.row === row && gridFocus.col === col;

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-[#0a0a0f] via-[#121218] to-[#0a0a0f] flex flex-col">
      {/* Header TV Style */}
      <div className="h-16 bg-gradient-to-r from-[#1a1a24] to-[#121218] border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setConsoleMode(false)}
            className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
            <Music className="w-5 h-5 text-black" />
          </div>
          <span className="text-white font-bold text-xl">Localia TV</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"></div>
        </div>
        
        <div className="text-gray-400 text-sm">
          {controllerType === 'playstation' ? 'PlayStation Controller' : 'Xbox Controller'}
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 p-8 overflow-y-auto" ref={gridRef}>
        <div className="max-w-7xl mx-auto">
          {gridItems.map((section, rowIndex) => (
            <div key={rowIndex} className="mb-8">
              {section.type === 'section' && (
                <>
                  <h2 className="text-2xl font-bold text-white mb-6">{section.label}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {section.items.slice(0, gridCols).map((item, colIndex) => (
                      <div
                        key={colIndex}
                        onClick={() => {
                          setGridFocus({ row: rowIndex, col: colIndex });
                          handleSelect();
                        }}
                        className={clsx(
                          "group cursor-pointer transform transition-all duration-300 hover:scale-105",
                          isFocused(rowIndex, colIndex) 
                            ? "ring-4 ring-brand-primary scale-110 z-10" 
                            : "hover:translate-y-[-4px]"
                        )}
                      >
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/20 hover:border-white/40 transition-all">
                          <div className="w-full aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl mb-4 overflow-hidden shadow-2xl">
                            {item.hasPicture || item.cover ? (
                              <img 
                                src={item.hasPicture ? getCoverUrl(item.fileName) : item.cover} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {section.label === 'Playlists' ? (
                                  <ListMusic className="w-16 h-16 text-gray-600 mx-auto" />
                                ) : section.label === 'Albums' ? (
                                  <Disc className="w-16 h-16 text-gray-600 mx-auto" />
                                ) : section.label === 'Artists' ? (
                                  <User className="w-16 h-16 text-gray-600 mx-auto" />
                                ) : (
                                  <Music className="w-16 h-16 text-gray-600 mx-auto" />
                                )}
                              </div>
                            )}
                            {isFocused(rowIndex, colIndex) && (
                              <div className="absolute inset-0 bg-brand-primary/30 rounded-xl flex items-center justify-center">
                                <div className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center shadow-lg">
                                  <Play className="w-8 h-8 text-black ml-1" />
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <h3 className="text-white font-semibold text-lg truncate">{item.name || item.title}</h3>
                            {item.artist && (
                              <p className="text-gray-400 text-sm truncate">{item.artist}</p>
                            )}
                            {item.album && section.label !== 'Albums' && (
                              <p className="text-gray-500 text-xs truncate">{item.album}</p>
                            )}
                            {item.duration && (
                              <p className="text-gray-500 text-xs">
                                {Math.floor(item.duration/60)}:{String(Math.floor(item.duration%60)).padStart(2,'0')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {section.type === 'tracks' && (
                <>
                  <h2 className="text-2xl font-bold text-white mb-6">Tracks</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {section.items.slice(0, gridCols).map((item, colIndex) => (
                      <div
                        key={colIndex}
                        onClick={() => {
                          setGridFocus({ row: rowIndex, col: colIndex });
                          handleSelect();
                        }}
                        className={clsx(
                          "group cursor-pointer transform transition-all duration-300 hover:scale-105",
                          isFocused(rowIndex, colIndex) 
                            ? "ring-4 ring-brand-primary scale-110 z-10" 
                            : "hover:translate-y-[-4px]"
                        )}
                      >
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/20 hover:border-white/40 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden shadow-lg">
                              {item.hasPicture ? (
                                <img 
                                  src={getCoverUrl(item.fileName)} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music className="w-8 h-8 text-gray-600" />
                                </div>
                              )}
                              {isFocused(rowIndex, colIndex) && (
                                <div className="absolute inset-0 bg-brand-primary/30 rounded-lg flex items-center justify-center">
                                  <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                                    <Play className="w-4 h-4 text-black ml-0.5" />
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-medium text-base truncate">{item.title}</h3>
                              <p className="text-gray-400 text-sm truncate">{item.artist}</p>
                              <p className="text-gray-500 text-xs mt-1">
                                {Math.floor(item.duration/60)}:{String(Math.floor(item.duration%60)).padStart(2,'0')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Player Bar TV Style */}
      <div className="h-32 bg-gradient-to-t from-[#181824] to-[#121218] border-t border-white/10 px-8 flex items-center justify-between">
        {/* Current Track Info */}
        <div className="flex items-center gap-6 flex-1">
          {currentTrack && (
            <>
              <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl">
                {currentTrack.hasPicture ? (
                  <img src={getCoverUrl(currentTrack.fileName)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Disc className="w-10 h-10 text-gray-600" />
                  </div>
                )}
              </div>
              
              <div className="min-w-0">
                <h3 className="text-white font-bold text-lg truncate">{currentTrack.title}</h3>
                <p className="text-gray-400 text-base truncate">{currentTrack.artist}</p>
              </div>
            </>
          )}
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center gap-4 flex-1">
          <div className="flex items-center gap-6">
            <button onClick={onPrev} className="text-gray-400 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors">
              <SkipBack className="w-8 h-8" />
            </button>
            
            <button 
              onClick={onPlayPause}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-black" />
              ) : (
                <Play className="w-8 h-8 text-black ml-1" />
              )}
            </button>
            
            <button onClick={onNext} className="text-gray-400 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors">
              <SkipForward className="w-8 h-8" />
            </button>
          </div>
          
          <div className="flex items-center gap-4 w-full max-w-md">
            <span className="text-gray-400 text-sm tabular-nums w-12 text-right">
              {Math.floor(currentTime/60)}:{String(Math.floor(currentTime%60)).padStart(2,'0')}
            </span>
            <div className="flex-1 relative h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-brand-primary rounded-full transition-all"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
              <input 
                type="range" 
                min="0" 
                max={duration||100} 
                step="0.1" 
                value={currentTime} 
                onChange={(e) => { audioRef.current.currentTime = e.target.value; }} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <span className="text-gray-400 text-sm tabular-nums w-12">
              {Math.floor(duration/60)}:{String(Math.floor(duration%60)).padStart(2,'0')}
            </span>
          </div>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-4 flex-1 justify-end">
          <button onClick={onVolumeDown} className="text-gray-400 hover:text-white p-2">
            <Volume2 className="w-6 h-6 transform rotate-180" />
          </button>
          <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${volume * 100}%` }} />
          </div>
          <button onClick={onVolumeUp} className="text-gray-400 hover:text-white p-2">
            <Volume2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Gamepad Hints Overlay */}
      <div className="absolute bottom-6 left-6 bg-black/80 backdrop-blur-md px-4 py-3 rounded-lg border border-white/20">
        <div className="text-white text-sm font-medium mb-2">Controller Navigation</div>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-2 py-1 rounded text-white font-bold text-xs">
              {isPS ? 'X' : 'A'}
            </span>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-2 py-1 rounded text-white font-bold text-xs">
              {isPS ? 'O' : 'B'}
            </span>
            <span>Back</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-2 py-1 rounded text-white font-bold text-xs">
              D-pad
            </span>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-2 py-1 rounded text-white font-bold text-xs">
              {isPS ? 'R1' : 'RB'}
            </span>
            <span>Next</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
