import React, { useState } from 'react';
import { Search, Music, AlignLeft, Sparkles, FileText, CheckCircle, Upload, Globe, Eye, ArrowRight, X } from 'lucide-react';
import { parseLrcText } from '../utils/lrcParser';
import { playUiSound } from '../utils/soundEngine';

const YoutubeIcon = (props) => (
  <svg 
    viewBox="0 0 24 24" 
    width={props.size || "16"} 
    height={props.size || "16"} 
    fill="currentColor"
    style={props.style}
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const PixelCassette = ({ size = 32, color = "#FFCB9A" }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill={color} style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
    <path d="M1 2h14v12H1V2zm1 1v10h12V3H2zm2 2h8v4H4V5zm1 1v2h6V6H5zm1 5h1v1H6v-1zm3 0h1v1H9v-1z" />
  </svg>
);

const PixelHeadphones = ({ size = 32, color = "#D1E8E2" }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill={color} style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
    <path d="M4 1h8v1h2v2h1v4h-2V5h-1V3H4v2H3v3H1V4h1v-1h2v-2zm-3 7h3v5H1V8zm11 0h3v5h-3V8z" />
  </svg>
);

const PixelNote = ({ size = 32, color = "#D9B08C" }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill={color} style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
    <path d="M9 1h5v3H9v8H6v3H3v-3h3V4h3V1zm1 1v2h3V2h-3z" />
  </svg>
);

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.yt",
  "https://piped-api.lunar.icu",
  "https://pipedapi.col1a.ru",
  "https://piped-api.garudalinux.org"
];

const INVIDIOUS_INSTANCES = [
  "https://invidious.projectsegfau.lt",
  "https://yewtu.be",
  "https://invidious.nerd.ol",
  "https://inv.tux.im",
  "https://invidious.privacydev.net"
];

export default function TabSearch({
  onSelectTrack,
  onSelectLyrics,
  currentTrack,
  currentLyrics,
  onNextTab,
  onProceedToRetimer,
  setSyncData
}) {
  const [audioTab, setAudioTab] = useState('local'); // 'local' or 'online'
  const [lyricsTab, setLyricsTab] = useState('import'); // 'import' or 'editor'

  const [audioQuery, setAudioQuery] = useState('');
  const [lyricsQuery, setLyricsQuery] = useState('');
  const [audioResults, setAudioResults] = useState([]);
  const [lyricsResults, setLyricsResults] = useState([]);
  const [searchAudioLoading, setSearchAudioLoading] = useState(false);
  const [searchLyricsLoading, setSearchLyricsLoading] = useState(false);
  const [pastedLyrics, setPastedLyrics] = useState(currentLyrics || '');
  
  const [activePipedIdx, setActivePipedIdx] = useState(0);
  const [activeInvidiousIdx, setActiveInvidiousIdx] = useState(0);
  
  // Custom YouTube URL loading state
  const [ytUrlInput, setYtUrlInput] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [showCustomDetailsForm, setShowCustomDetailsForm] = useState(false);
  const [pastedVideoId, setPastedVideoId] = useState('');

  // Lyric preview modal state
  const [previewLyrics, setPreviewLyrics] = useState(null);

  // Drag and drop state
  const [dragOver, setDragOver] = useState(false);

  // Extract video ID from any YouTube URL
  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Clean & split YouTube titles into Song Title and Artist Name
  const parseYtTitle = (rawTitle, authorName) => {
    if (!rawTitle) return { title: 'Unknown Title', artist: authorName || 'Unknown Artist' };
    
    let cleaned = rawTitle
      .replace(/\s*[\(\[](Official\s+(Audio|Video|Music\s+Video|Visualizer|Lyric\s+Video|Lyrics)|Lyric\s+Video|Lyrics|Visualizer|HD|4K|Audio)[\)\]]/gi, '')
      .replace(/- Topic$/i, '')
      .trim();

    const separators = [' - ', ' – ', ' — ', ' : '];
    for (const sep of separators) {
      if (cleaned.includes(sep)) {
        const parts = cleaned.split(sep);
        if (parts.length >= 2) {
          let artist = parts[0].trim();
          let title = parts.slice(1).join(sep).trim();
          return { title, artist };
        }
      }
    }

    return {
      title: cleaned,
      artist: authorName ? authorName.replace(/- Topic$/i, '').trim() : 'Unknown Artist'
    };
  };

  // Handle pasted YouTube Link
  const handleLoadYtUrl = async (e) => {
    e.preventDefault();
    const videoId = extractVideoId(ytUrlInput);
    if (!videoId) {
      alert("Invalid YouTube URL. Please make sure it contains a 11-character video ID.");
      return;
    }

    setPastedVideoId(videoId);
    setSearchAudioLoading(true);
    
    let infoFetched = false;
    let attempts = 0;
    let fetchedTitle = '';
    let fetchedAuthor = '';
    
    while (attempts < INVIDIOUS_INSTANCES.length && !infoFetched) {
      const idx = (activeInvidiousIdx + attempts) % INVIDIOUS_INSTANCES.length;
      const instance = INVIDIOUS_INSTANCES[idx];
      try {
        const res = await fetch(`${instance}/api/v1/videos/${videoId}`);
        if (res.ok) {
          const data = await res.json();
          fetchedTitle = data.title;
          fetchedAuthor = data.author;
          setActiveInvidiousIdx(idx);
          infoFetched = true;
        }
      } catch (err) {
        console.warn(`Invidious metadata fetch failed on ${instance}, trying next...`);
      }
      attempts++;
    }

    // Try noembed CORS fallback if Invidious rate limits
    if (!infoFetched) {
      try {
        const noembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        if (noembedRes.ok) {
          const noembedData = await noembedRes.json();
          if (noembedData && noembedData.title) {
            fetchedTitle = noembedData.title;
            fetchedAuthor = noembedData.author_name;
            infoFetched = true;
          }
        }
      } catch (err) {
        console.warn("Noembed oEmbed fetch failed:", err);
      }
    }

    if (infoFetched && fetchedTitle) {
      const parsed = parseYtTitle(fetchedTitle, fetchedAuthor);
      setCustomTitle(parsed.title);
      setCustomArtist(parsed.artist);
    } else {
      setCustomTitle('');
      setCustomArtist('');
    }

    setShowCustomDetailsForm(true);
    setSearchAudioLoading(false);
  };

  // Submit manually typed details for pasted YouTube URL
  const handleCustomDetailsSubmit = (e) => {
    e.preventDefault();
    if (!customTitle.trim()) {
      alert("Please enter a song title.");
      return;
    }
    
    onSelectTrack({
      title: customTitle,
      artist: customArtist.trim() || 'Unknown Artist',
      duration: 0,
      thumbnail: `https://img.youtube.com/vi/${pastedVideoId}/hqdefault.jpg`,
      audioUrl: null,
      source: 'youtube',
      videoId: pastedVideoId
    });

    setShowCustomDetailsForm(false);
    setCustomTitle('');
    setCustomArtist('');
    setYtUrlInput('');
  };

  // Search YouTube using Piped with Invidious fallback
  const handleAudioSearch = async (e) => {
    e.preventDefault();
    if (!audioQuery.trim()) return;

    setSearchAudioLoading(true);
    setAudioResults([]);

    let attempts = 0;
    while (attempts < PIPED_INSTANCES.length) {
      const idx = (activePipedIdx + attempts) % PIPED_INSTANCES.length;
      const instance = PIPED_INSTANCES[idx];
      try {
        const res = await fetch(`${instance}/search?q=${encodeURIComponent(audioQuery)}&filter=music_songs`);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const songs = data.items.map(item => ({
              title: item.title,
              artist: item.uploaderName || 'Unknown Artist',
              duration: item.duration || 0,
              thumbnail: item.thumbnail,
              videoId: item.url.split('v=')[1] || item.url
            }));
            setAudioResults(songs);
            setActivePipedIdx(idx);
            setSearchAudioLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn(`Piped search failed on ${instance}, trying next...`);
      }
      attempts++;
    }

    console.log("Piped search failed, falling back to Invidious...");
    attempts = 0;
    while (attempts < INVIDIOUS_INSTANCES.length) {
      const idx = (activeInvidiousIdx + attempts) % INVIDIOUS_INSTANCES.length;
      const instance = INVIDIOUS_INSTANCES[idx];
      try {
        const res = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(audioQuery)}&type=video`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const songs = data.map(item => ({
              title: item.title,
              artist: item.author || 'Unknown Artist',
              duration: item.lengthSeconds || 0,
              thumbnail: item.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
              videoId: item.videoId
            }));
            setAudioResults(songs);
            setActiveInvidiousIdx(idx);
            setSearchAudioLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn(`Invidious search failed on ${instance}, trying next...`);
      }
      attempts++;
    }
    
    alert("Audio search failed across all servers. YouTube rate-limits may be active. Please paste a YouTube link directly, or load a local file.");
    setSearchAudioLoading(false);
  };

  // Auto-fill lyrics search query when a track is loaded
  React.useEffect(() => {
    if (currentTrack?.title && !lyricsQuery) {
      setLyricsQuery(`${currentTrack.title} ${currentTrack.artist || ''}`.trim());
    }
  }, [currentTrack]);

  // Search LRCLIB for lyrics (supports "+" operator for title + artist)
  const handleLyricsSearch = async (e) => {
    if (e) e.preventDefault();
    if (!lyricsQuery.trim()) return;

    setSearchLyricsLoading(true);
    setLyricsResults([]);

    let searchTrack = lyricsQuery.trim();
    let searchArtist = '';

    if (lyricsQuery.includes('+')) {
      const parts = lyricsQuery.split('+');
      searchTrack = parts[0].trim();
      searchArtist = parts[1] ? parts[1].trim() : '';
    }

    try {
      let url = searchArtist
        ? `https://lrclib.net/api/search?track_name=${encodeURIComponent(searchTrack)}&artist_name=${encodeURIComponent(searchArtist)}`
        : `https://lrclib.net/api/search?q=${encodeURIComponent(searchTrack)}`;

      let res = await fetch(url);
      let data = [];
      if (res.ok) {
        data = await res.json();
      }
      
      // Fallback general search if specific track+artist yielded no results
      if ((!Array.isArray(data) || data.length === 0) && searchArtist) {
        res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchTrack + ' ' + searchArtist)}`);
        if (res.ok) {
          data = await res.json();
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        setLyricsResults(data);
      } else {
        setLyricsResults([]);
      }
    } catch (err) {
      console.error("LRCLIB lyrics fetch error:", err);
      alert("Failed to search lyrics. Please check your internet connection.");
    } finally {
      setSearchLyricsLoading(false);
    }
  };

  // Import selected lyrics directly to Editor
  const handleImportLyricsToEditor = (lyricsItem) => {
    const rawLyrics = lyricsItem.syncedLyrics || lyricsItem.plainLyrics || '';
    setPastedLyrics(rawLyrics);
    onSelectLyrics(rawLyrics);
    if (setSyncData) {
      const dataset = parseLrcText(rawLyrics);
      setSyncData(dataset);
    }
    setLyricsTab('editor'); // Swap to Editor pill tab
  };

  // Handle local file load
  const handleLocalFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    loadLocalFile(file);
  };

  const loadLocalFile = (file) => {
    const audioUrl = URL.createObjectURL(file);
    onSelectTrack({
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Local File',
      duration: 0,
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop',
      audioUrl: audioUrl,
      source: 'local',
      fileName: file.name
    });
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      loadLocalFile(file);
    } else {
      alert("Please upload a valid audio file.");
    }
  };

  // Submit lyrics from editor
  const handleSaveLyrics = () => {
    if (!pastedLyrics.trim()) {
      alert("Please paste or import some lyrics first.");
      return;
    }
    onSelectLyrics(pastedLyrics);
    if (setSyncData) {
      const dataset = parseLrcText(pastedLyrics);
      setSyncData(dataset);
    }
  };

  return (
    <div className="tab-pane active" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 2-Column Search Layout */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        
        {/* Left Column: Audio Loader */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '530px', maxHeight: '530px', overflow: 'hidden' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', width: '100%' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', justifyContent: 'center' }}>
              <Music size={18} style={{ color: '#116466' }} /> Load Audio Track
            </h3>
            {/* Pill Tabs for Audio */}
            <div style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: '20px', overflow: 'hidden', padding: '2px', background: 'rgba(0,0,0,0.2)' }}>
              <button 
                className={`btn ${audioTab === 'local' ? 'active-pill' : ''}`}
                onClick={() => { playUiSound('click'); setAudioTab('local'); }}
                style={{
                  borderRadius: '16px',
                  padding: '4px 12px',
                  fontSize: '11px',
                  background: audioTab === 'local' ? 'var(--accent-gradient)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  boxShadow: audioTab === 'local' ? '0 2px 8px var(--accent-glow)' : 'none'
                }}
              >
                <Upload size={10} style={{ marginRight: '4px', display: 'inline' }} /> Local Audio
              </button>
              <button 
                className={`btn ${audioTab === 'online' ? 'active-pill' : ''}`}
                onClick={() => { playUiSound('click'); setAudioTab('online'); }}
                style={{
                  borderRadius: '16px',
                  padding: '4px 12px',
                  fontSize: '11px',
                  background: audioTab === 'online' ? 'var(--accent-gradient)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  boxShadow: audioTab === 'online' ? '0 2px 8px var(--accent-glow)' : 'none'
                }}
              >
                <Globe size={10} style={{ marginRight: '4px', display: 'inline' }} /> Online Search
              </button>
            </div>
          </div>

          {/* Local Audio drag and drop loader */}
          {audioTab === 'local' && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                flexGrow: 1,
                border: dragOver ? '2px dashed var(--accent-purple)' : '2px dashed var(--border-light)',
                borderRadius: '12px',
                background: dragOver ? 'rgba(168, 85, 247, 0.05)' : 'rgba(255,255,255,0.01)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => document.getElementById('local-audio-file-input').click()}
            >
              <input 
                id="local-audio-file-input"
                type="file" 
                accept="audio/*" 
                onChange={handleLocalFileChange} 
                style={{ display: 'none' }}
              />
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(168, 85, 247, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-purple)',
                boxShadow: '0 0 15px rgba(168,85,247,0.1)'
              }}>
                <Upload size={20} />
              </div>
              <div>
                <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: '#fff' }}>
                  Drag & Drop Audio File
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '4px', display: 'block' }}>
                  Supports MP3, WAV, M4A, FLAC
                </span>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '11px', pointerEvents: 'none' }}>
                Browse Files
              </button>
            </div>
          )}

          {/* Online loader (URL paste) */}
          {audioTab === 'online' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1, animation: 'fadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ animation: 'float 3.8s ease-in-out infinite', flexShrink: 0, marginTop: '16px' }}>
                  <PixelCassette size={32} color="#FFCB9A" />
                </div>
                <form onSubmit={handleLoadYtUrl} className="form-group" style={{ marginBottom: '0', flexGrow: 1 }}>
                  <label htmlFor="yt-url-input" style={{ fontSize: '10px', color: 'var(--text-sub)', fontWeight: '700', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paste YouTube / YTM URL</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      id="yt-url-input"
                      type="text" 
                      placeholder="https://www.youtube.com/watch?v=..." 
                      value={ytUrlInput}
                      onChange={(e) => setYtUrlInput(e.target.value)}
                      className="form-control"
                      style={{ borderRadius: '24px', border: '2px solid var(--border-light)', padding: '10px 18px', background: 'rgba(0,0,0,0.15)' }}
                    />
                    <button type="submit" className="btn" style={{ width: '40px', height: '40px', borderRadius: '50%', padding: '0', background: 'rgba(239, 68, 68, 0.15)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }} disabled={searchAudioLoading}>
                      <YoutubeIcon size={16} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </form>
              </div>

              {/* Custom Details Form (Confirm / Edit Title & Artist) */}
              {showCustomDetailsForm && (
                <form onSubmit={handleCustomDetailsSubmit} style={{ padding: '12px', background: 'rgba(17, 100, 102, 0.12)', border: '1px solid rgba(209, 232, 226, 0.25)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.25s ease' }}>
                  <div className="flex-between">
                    <span style={{ fontSize: '10px', color: '#FFCB9A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Track Details</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        playUiSound('click');
                        const temp = customTitle;
                        setCustomTitle(customArtist);
                        setCustomArtist(temp);
                      }} 
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '2px 6px', fontSize: '9px', color: '#D1E8E2', cursor: 'pointer', fontWeight: '700' }}
                    >
                      ⇄ Swap Title & Artist
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '9px', fontWeight: '700', color: '#D1E8E2', display: 'block', marginBottom: '3px' }}>🎵 SONG TITLE</label>
                      <input 
                        type="text" 
                        placeholder="Song Title" 
                        value={customTitle} 
                        onChange={(e) => setCustomTitle(e.target.value)} 
                        className="form-control"
                        style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '8px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '9px', fontWeight: '700', color: '#D1E8E2', display: 'block', marginBottom: '3px' }}>🎤 ARTIST NAME</label>
                      <input 
                        type="text" 
                        placeholder="Artist Name" 
                        value={customArtist} 
                        onChange={(e) => setCustomArtist(e.target.value)} 
                        className="form-control"
                        style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '8px' }}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" onClick={() => playUiSound('modal')} style={{ padding: '6px', fontSize: '11px', background: 'var(--accent-gradient)', fontWeight: '700' }}>
                    Load Track
                  </button>
                </form>
              )}

              {/* Content Area below input: shows loading, loaded details, or empty prompt */}
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                {searchAudioLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-sub)', fontSize: '12px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      border: '2px solid rgba(255,255,255,0.1)',
                      borderTop: '2px solid var(--accent-blue)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }}></div>
                    <span>Fetching YouTube Metadata...</span>
                  </div>
                ) : currentTrack && currentTrack.source === 'youtube' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '12px', width: '90%', animation: 'fadeIn 0.3s ease' }}>
                    <img src={currentTrack.thumbnail} alt={currentTrack.title} style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }} onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop';
                    }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{currentTrack.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>{currentTrack.artist}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#FFCB9A', background: 'rgba(255,203,154,0.08)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(255,203,154,0.15)' }}>
                      <span>ACTIVE AUDIO</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'rgba(209, 232, 226, 0.1)',
                      border: '1px solid rgba(209, 232, 226, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-blue)',
                      boxShadow: '0 8px 24px rgba(209, 232, 226, 0.15)',
                      animation: 'float 3.5s ease-in-out infinite'
                    }}>
                      <Music size={18} />
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-sub)', maxWidth: '200px', lineHeight: '1.4' }}>
                      Paste a YouTube or YouTube Music link above to load your audio track!
                    </span>
                  </div>
                )}
              </div>

            </div>
          )}

          {currentTrack && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <CheckCircle size={16} style={{ color: 'var(--green)' }} />
              <div style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>
                Loaded: <strong style={{ color: '#fff' }}>{currentTrack.title}</strong> by {currentTrack.artist}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Lyrics Integration (Search/Import vs. Editor Tabs) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '530px', maxHeight: '530px', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', width: '100%' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', justifyContent: 'center' }}>
              <AlignLeft size={18} style={{ color: '#116466' }} /> Lyrics
            </h3>
            {/* Pill Tabs for Lyrics */}
            <div style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: '20px', overflow: 'hidden', padding: '2px', background: 'rgba(0,0,0,0.2)' }}>
              <button 
                className={`btn ${lyricsTab === 'import' ? 'active-pill' : ''}`}
                onClick={() => { playUiSound('click'); setLyricsTab('import'); }}
                style={{
                  borderRadius: '16px',
                  padding: '4px 12px',
                  fontSize: '11px',
                  background: lyricsTab === 'import' ? 'var(--accent-gradient)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  boxShadow: lyricsTab === 'import' ? '0 2px 8px var(--accent-glow)' : 'none'
                }}
              >
                Search & Import
              </button>
              <button 
                className={`btn ${lyricsTab === 'editor' ? 'active-pill' : ''}`}
                onClick={() => { playUiSound('click'); setLyricsTab('editor'); }}
                style={{
                  borderRadius: '16px',
                  padding: '4px 12px',
                  fontSize: '11px',
                  background: lyricsTab === 'editor' ? 'var(--accent-gradient)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  boxShadow: lyricsTab === 'editor' ? '0 2px 8px var(--accent-glow)' : 'none'
                }}
              >
                Lyrics Editor
              </button>
            </div>
          </div>

          {/* Search & Import Tab Panel */}
          {lyricsTab === 'import' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ animation: 'float 3.8s ease-in-out infinite', animationDelay: '0.2s', flexShrink: 0, marginTop: '16px' }}>
                  <PixelNote size={32} color="#D9B08C" />
                </div>
                <form onSubmit={handleLyricsSearch} className="form-group" style={{ marginBottom: '0', flexGrow: 1 }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <label htmlFor="lyrics-search-input" style={{ fontSize: '10px', color: 'var(--text-sub)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search lyrics from the internet</label>
                    <span style={{ fontSize: '9px', color: '#FFCB9A' }}>Tip: Use "+" for Artist (e.g. Cry For Me + The Weeknd)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      id="lyrics-search-input"
                      type="text" 
                      placeholder="e.g. Cry For Me + The Weeknd or Song title..." 
                      value={lyricsQuery}
                      onChange={(e) => setLyricsQuery(e.target.value)}
                      className="form-control"
                      style={{ borderRadius: '24px', border: '2px solid var(--border-light)', padding: '10px 18px', background: 'rgba(0,0,0,0.15)' }}
                    />
                    <button type="submit" className="btn" style={{ width: '40px', height: '40px', borderRadius: '50%', padding: '0', background: 'rgba(17, 100, 102, 0.25)', border: '2px solid #116466', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }} disabled={searchLyricsLoading}>
                      <Search size={16} style={{ color: '#D1E8E2' }} />
                    </button>
                  </div>
                </form>
              </div>

              {/* Lyrics Search Results */}
              {searchLyricsLoading && (
                <div className="list-container" style={{ flexGrow: 1, maxHeight: '280px' }}>
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-sub)' }}>Searching lyrics...</div>
                </div>
              )}

              {!searchLyricsLoading && lyricsResults.length > 0 && (
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-sub)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px', display: 'block', letterSpacing: '0.05em' }}>
                    Lyrics Found
                  </span>
                  <div className="list-container" style={{ flexGrow: 1, maxHeight: '280px' }}>
                    {lyricsResults.map((lyricsItem) => (
                      <div 
                        key={lyricsItem.id} 
                        className="list-item"
                        style={{ flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}
                      >
                        <div className="flex-between">
                          <div className="list-item-text">
                            <div className="list-item-title" style={{ fontSize: '12px' }}>{lyricsItem.name}</div>
                            <div className="list-item-sub" style={{ fontSize: '10px' }}>{lyricsItem.artistName} {lyricsItem.albumName ? `• ${lyricsItem.albumName}` : ''}</div>
                          </div>
                          {lyricsItem.syncedLyrics ? (
                            <span style={{ fontSize: '8px', fontWeight: '700', padding: '1px 5px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)', textTransform: 'uppercase' }}>Synced</span>
                          ) : (
                            <span style={{ fontSize: '8px', fontWeight: '700', padding: '1px 5px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Plain</span>
                          )}
                        </div>

                        {/* Preview & Open buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ flex: 1, padding: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            onClick={() => setPreviewLyrics(lyricsItem)}
                          >
                            <Eye size={12} /> Preview
                          </button>
                          <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, padding: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'var(--accent-gradient)' }}
                            onClick={() => handleImportLyricsToEditor(lyricsItem)}
                          >
                            Open in Editor <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!searchLyricsLoading && lyricsResults.length === 0 && (
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'rgba(209, 232, 226, 0.1)',
                      border: '1px solid rgba(209, 232, 226, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#D1E8E2',
                      boxShadow: '0 8px 24px rgba(209, 232, 226, 0.15)',
                      animation: 'float 3.5s ease-in-out infinite',
                      animationDelay: '0.4s'
                    }}>
                      <FileText size={18} />
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-sub)', maxWidth: '200px', lineHeight: '1.4' }}>
                      Search above or type custom lyrics inside the editor!
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lyrics Editor Tab Panel */}
          {lyricsTab === 'editor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>
              <div className="form-group" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <label htmlFor="lyrics-textarea" style={{ fontSize: '11px', color: 'var(--text-sub)', marginBottom: '6px', display: 'block' }}>Paste or edit your raw lyrics here. Clean up credits.</label>
                <textarea 
                  id="lyrics-textarea"
                  className="form-control"
                  style={{ 
                    flexGrow: 1,
                    minHeight: '140px',
                    height: '200px',
                    maxHeight: '220px',
                    resize: 'none', 
                    fontFamily: 'inherit',
                    lineHeight: '1.6',
                    fontSize: '13px',
                    background: 'rgba(0,0,0,0.2)'
                  }}
                  placeholder="First line of lyrics...&#10;Second line of lyrics..."
                  value={pastedLyrics}
                  onChange={(e) => setPastedLyrics(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '12px', marginTop: '4px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    playUiSound('modal');
                    const cleaned = pastedLyrics
                      .replace(/^\[(ti|ar|al|au|by|offset|re|ve):.*\]$/gmi, '')
                      .replace(/\[\d+:\d+(?:\.\d+)?\]/g, '')
                      .replace(/<\d+:\d+(?:\.\d+)?>/g, '')
                      .replace(/^\s*♪\s*$/gm, '')
                      .split('\n')
                      .map(l => l.trim())
                      .filter(Boolean)
                      .join('\n');
                    setPastedLyrics(cleaned);
                  }}
                  style={{ fontSize: '10px', padding: '6px 10px', fontWeight: '700' }}
                >
                  <Sparkles size={11} /> Clean Timestamps & Tags
                </button>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexGrow: 1, justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => { playUiSound('modal'); handleSaveLyrics(); }}
                    style={{ fontSize: '11px', padding: '6px 12px', flex: '1 1 auto', fontWeight: '700' }}
                  >
                    Save Lyrics
                  </button>
                  <button 
                    type="button" 
                    className="btn" 
                    onClick={() => {
                      playUiSound('modal');
                      handleSaveLyrics();
                      if (onProceedToRetimer) {
                        onProceedToRetimer();
                      } else {
                        onNextTab();
                      }
                    }}
                    style={{ 
                      fontSize: '11px', 
                      padding: '6px 14px', 
                      flex: '1 1 auto', 
                      background: 'linear-gradient(135deg, #FFCB9A 0%, #D9B08C 100%)', 
                      color: '#1C2321', 
                      borderRadius: '18px', 
                      fontWeight: '800',
                      boxShadow: '0 3px 12px rgba(255, 203, 154, 0.35)',
                      border: 'none'
                    }}
                    disabled={!pastedLyrics.trim()}
                  >
                    Proceed to Retimer ⏱️
                  </button>
                  <button 
                    type="button" 
                    className="btn" 
                    onClick={() => {
                      playUiSound('modal');
                      handleSaveLyrics();
                      if (currentTrack && pastedLyrics.trim()) {
                        onNextTab();
                      } else {
                        alert("Make sure you have BOTH loaded a track AND applied lyrics to proceed!");
                      }
                    }}
                    style={{ 
                      fontSize: '11px', 
                      padding: '6px 16px', 
                      flex: '1 1 auto', 
                      background: 'linear-gradient(135deg, #116466 0%, #D1E8E2 100%)', 
                      color: '#1C2321', 
                      borderRadius: '18px', 
                      fontWeight: '800',
                      boxShadow: '0 3px 12px rgba(209, 232, 226, 0.4)',
                      border: 'none'
                    }}
                    disabled={!currentTrack || !pastedLyrics.trim()}
                  >
                    Proceed to Sync <ArrowRight size={13} style={{ marginLeft: '4px' }} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Inline glassmorphic lyrics preview modal */}
          {previewLyrics && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(13, 13, 20, 0.85)',
              backdropFilter: 'blur(8px)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 20,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              border: '1px solid var(--border-light)'
            }}>
              <div className="flex-between">
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-purple)', textTransform: 'uppercase' }}>Lyrics Preview</span>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '4px', borderRadius: '50%', background: 'transparent', border: 'none' }}
                  onClick={() => setPreviewLyrics(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                {previewLyrics.name} — {previewLyrics.artistName}
              </div>
              <div style={{
                flexGrow: 1,
                overflowY: 'auto',
                padding: '12px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontFamily: 'monospace',
                fontSize: '11px',
                lineHeight: '1.6',
                color: 'rgba(255,255,255,0.7)',
                whiteSpace: 'pre-wrap'
              }}>
                {previewLyrics.syncedLyrics || previewLyrics.plainLyrics || "No lyrics content found."}
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', background: 'var(--accent-gradient)' }}
                onClick={() => {
                  handleImportLyricsToEditor(previewLyrics);
                  setPreviewLyrics(null);
                }}
              >
                Import These Lyrics
              </button>
            </div>
          )}

        </div>

      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
}
