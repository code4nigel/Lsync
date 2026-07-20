import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ArrowLeft } from 'lucide-react';

export default function TabDemo({
  currentTrack,
  syncData,
  syncMode,
  onBackToEdit,
  onSelectTrack
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [displayList, setDisplayList] = useState([]);
  const [activeItemIndex, setActiveItemIndex] = useState(-1);
  const [demoYtUrl, setDemoYtUrl] = useState('');

  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const listContainerRef = useRef(null);
  const activeLineRef = useRef(null);

  const handleAttachYtInDemo = () => {
    const match = demoYtUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const videoId = match ? match[1] : null;
    if (!videoId) {
      alert("Please enter a valid 11-character YouTube video URL.");
      return;
    }
    if (onSelectTrack) {
      onSelectTrack({
        title: 'YouTube Audio Stream',
        artist: 'YouTube Video',
        duration: 0,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        audioUrl: null,
        source: 'youtube',
        videoId: videoId
      });
      setDemoYtUrl('');
    }
  };

  const handleAttachLocalInDemo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const audioUrl = URL.createObjectURL(file);
    if (onSelectTrack) {
      onSelectTrack({
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Local File',
        duration: 0,
        thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop',
        audioUrl: audioUrl,
        source: 'local',
        fileName: file.name
      });
    }
  };

  // Preprocess syncData into a flattened list of lyric lines and instrumental breaks
  useEffect(() => {
    const list = [];
    syncData.forEach((line, idx) => {
      if (line.breakTime !== null && line.breakTime !== -1) {
        list.push({
          type: 'break',
          text: '♪ (Music Break) ♪',
          time: line.breakTime,
          originalLineIdx: idx
        });
      }
      if (line.time !== null && line.time !== -1) {
        list.push({
          type: 'lyrics',
          text: line.text,
          time: line.time,
          words: line.words,
          originalLineIdx: idx
        });
      }
    });

    list.sort((a, b) => a.time - b.time);
    setDisplayList(list);
  }, [syncData]);

  // Initialize YouTube Player
  useEffect(() => {
    if (currentTrack?.source !== 'youtube') return;

    let checkYtInterval;

    const initializePlayer = () => {
      if (!window.YT || !window.YT.Player) return false;
      
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch(e) {}
      }

      ytPlayerRef.current = new window.YT.Player('yt-demo-player', {
        height: '100%',
        width: '100%',
        videoId: currentTrack.videoId,
        playerVars: {
          playsinline: 1,
          controls: 1,
          disablekb: 1,
          modestbranding: 1,
          fs: 0
        },
        events: {
          onReady: (event) => {
            setDuration(event.target.getDuration());
          },
          onStateChange: (event) => {
            if (event.data === 1) {
              setIsPlaying(true);
            } else if (event.data === 2 || event.data === 0) {
              setIsPlaying(false);
            }
          }
        }
      });
      return true;
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    if (window.YT && window.YT.Player) {
      initializePlayer();
    } else {
      checkYtInterval = setInterval(() => {
        if (initializePlayer()) {
          clearInterval(checkYtInterval);
        }
      }, 250);
    }

    return () => {
      if (checkYtInterval) clearInterval(checkYtInterval);
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch(e) {}
        ytPlayerRef.current = null;
      }
    };
  }, [currentTrack]);

  // High precision current time updates
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        if (currentTrack?.source === 'youtube' && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          setCurrentTime(ytPlayerRef.current.getCurrentTime());
        } else if (currentTrack?.source === 'local' && audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 33);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

  // Calculate active item in displayList
  useEffect(() => {
    if (displayList.length === 0) return;
    
    let activeIdx = -1;
    for (let i = 0; i < displayList.length; i++) {
      const itemTime = displayList[i].time;
      if (itemTime !== null && itemTime !== -1 && itemTime <= currentTime) {
        activeIdx = i;
      }
    }
    setActiveItemIndex(activeIdx);
  }, [currentTime, displayList]);

  // Scroll active item into center view smoothly
  useEffect(() => {
    if (activeLineRef.current && listContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeItemIndex]);

  // Local media event handlers
  const handleLocalTimeUpdate = () => {
    if (currentTrack?.source === 'local' && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLocalLoadedMetadata = () => {
    if (currentTrack?.source === 'local' && audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (currentTrack?.source === 'youtube') {
      if (!ytPlayerRef.current || typeof ytPlayerRef.current.getPlayerState !== 'function') return;
      const state = ytPlayerRef.current.getPlayerState();
      if (state === 1) { // Playing
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    } else {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(err => console.error("Playback error:", err));
        setIsPlaying(true);
      }
    }
  };

  // Seek helper when clicking elements in the lyrics list
  const seekPlayerTo = (time) => {
    if (time === null || time === -1) return;
    setCurrentTime(time);
    
    if (currentTrack?.source === 'youtube') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(time, true);
        if (!isPlaying) {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      }
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        if (isPlaying) {
          audioRef.current.play().catch(err => console.error("Playback error:", err));
        } else {
          audioRef.current.play().catch(err => console.error("Playback error:", err));
          setIsPlaying(true);
        }
      }
    }
  };

  const handleScrub = (e) => {
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const seekTime = pct * duration;
    seekPlayerTo(seekTime);
  };

  const formatTime = (timeInSecs) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="tab-pane active" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      
      {/* Offline local audio fallback */}
      {currentTrack?.source === 'local' && (
        <audio
          ref={audioRef}
          src={currentTrack.audioUrl}
          onTimeUpdate={handleLocalTimeUpdate}
          onLoadedMetadata={handleLocalLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Grid structure: Left lyrics canvas, right player */}
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        
        {/* Left: Spotify-style scrolling lyrics with Liquid Glass frosted design */}
        <div 
          className="glass-card" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '560px', 
            maxHeight: '560px',
            position: 'relative', 
            overflow: 'hidden',
            background: 'rgba(44, 53, 49, 0.45)',
            backdropFilter: 'blur(35px) saturate(180%)',
            border: '1px solid rgba(209, 232, 226, 0.18)',
            padding: '24px 16px'
          }}
        >
          {/* Scrollable list container */}
          <div 
            ref={listContainerRef}
            style={{
              flexGrow: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              padding: '180px 10px',
              scrollBehavior: 'smooth'
            }}
            className="lyrics-demo-scroller"
          >
            {displayList.map((item, itemIdx) => {
              const isActive = itemIdx === activeItemIndex;
              const isPast = itemIdx < activeItemIndex;
              const isBreak = item.type === 'break';
              
              return (
                <div 
                  key={itemIdx}
                  ref={isActive ? activeLineRef : null}
                  style={{
                    fontSize: '19px',
                    fontWeight: isActive ? '700' : '500',
                    lineHeight: '1.45',
                    color: isActive 
                      ? '#FFCB9A' 
                      : isPast 
                        ? 'rgba(209, 232, 226, 0.35)' 
                        : 'rgba(209, 232, 226, 0.75)',
                    textShadow: isActive ? '0 0 20px rgba(255, 203, 154, 0.6), 0 0 10px rgba(209, 232, 226, 0.3)' : 'none',
                    textAlign: isBreak ? 'center' : 'left',
                    fontStyle: isBreak ? 'italic' : 'normal',
                    padding: isActive ? '8px 14px' : '4px 0',
                    borderRadius: isActive ? '12px' : '0',
                    background: isActive ? 'rgba(255, 203, 154, 0.08)' : 'transparent',
                    border: isActive ? '1px solid rgba(255, 203, 154, 0.2)' : '1px solid transparent',
                    boxShadow: isActive ? '0 8px 24px rgba(255, 203, 154, 0.1)' : 'none',
                    
                    // GPU accelerated layout-safe transform scaling
                    transform: isActive ? 'scale(1.04)' : 'scale(1.0)',
                    transformOrigin: isBreak ? 'center center' : 'left center',
                    opacity: isActive ? 1.0 : isPast ? 0.55 : 0.75,
                    transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                    
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: isBreak ? 'center' : 'flex-start',
                    width: '100%',
                    gap: '8px 6px',
                    maxWidth: '100%'
                  }}
                >
                  {syncMode === 'line' || isBreak ? (
                    <span 
                      style={{ 
                        color: isBreak ? '#D9B08C' : 'inherit', 
                        cursor: 'pointer',
                        background: isBreak ? 'rgba(217, 176, 140, 0.12)' : 'transparent',
                        padding: isBreak ? '4px 12px' : '0',
                        borderRadius: isBreak ? '16px' : '0',
                        border: isBreak ? '1px solid rgba(217, 176, 140, 0.25)' : 'none'
                      }}
                      onClick={() => seekPlayerTo(item.time)}
                    >
                      {item.text}
                    </span>
                  ) : (
                    // Word by Word render: Each word is clickable to seek player
                    item.words.map((word, wordIdx) => {
                      const isWordSynced = word.time !== null && word.time !== -1;
                      const isWordHighlighted = isWordSynced && word.time <= currentTime;
                      
                      return (
                        <span 
                          key={wordIdx}
                          style={{
                            color: isActive 
                              ? (isWordHighlighted ? '#FFCB9A' : 'rgba(209, 232, 226, 0.45)') 
                              : 'inherit',
                            cursor: 'pointer',
                            textShadow: isWordHighlighted && isActive ? '0 0 12px rgba(255, 203, 154, 0.8)' : 'none',
                            transition: 'color 0.15s ease, text-shadow 0.15s ease'
                          }}
                          onClick={() => seekPlayerTo(word.time)}
                        >
                          {word.text}
                        </span>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Media display card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {!currentTrack ? (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.25s ease' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#FFCB9A', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🎵 Missing Audio Track
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--text-sub)', lineHeight: '1.4' }}>
                You entered Demo mode with lyrics but no audio file or YouTube video. Attach one below to listen and test your synced lyrics live!
              </p>

              {/* YouTube Link Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', color: '#fff', fontWeight: '700' }}>Paste YouTube Link</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input 
                    type="text" 
                    placeholder="https://youtube.com/watch?v=..."
                    value={demoYtUrl}
                    onChange={(e) => setDemoYtUrl(e.target.value)}
                    className="form-control"
                    style={{ flexGrow: 1, fontSize: '11px', padding: '6px 10px', borderRadius: '6px' }}
                  />
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '11px', background: 'var(--accent-gradient)', fontWeight: '700' }}
                    onClick={handleAttachYtInDemo}
                  >
                    Attach
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-sub)', fontWeight: '700' }}>— OR —</div>

              {/* Local File Input */}
              <label className="btn btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', border: '1px solid #D1E8E2', color: '#D1E8E2' }}>
                <span>📁 Upload Local Audio File</span>
                <input 
                  type="file" 
                  accept="audio/*" 
                  style={{ display: 'none' }}
                  onChange={handleAttachLocalInDemo}
                />
              </label>
            </div>
          ) : (
            /* Audio Player Card (YouTube or Static Art) */
            <div className="glass-card mini-player" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* YouTube display frame */}
              <div 
                style={{ 
                  width: '100%', 
                  height: currentTrack?.source === 'youtube' ? '180px' : '0px', 
                  overflow: 'hidden', 
                  borderRadius: '12px', 
                  border: currentTrack?.source === 'youtube' ? '1px solid var(--border-light)' : 'none', 
                  display: currentTrack?.source === 'youtube' ? 'block' : 'none',
                  background: '#000'
                }}
              >
                <div id="yt-demo-player"></div>
              </div>

              <div className="track-info-row">
                {currentTrack?.source !== 'youtube' && (
                  <img src={currentTrack?.thumbnail} className="player-art" alt="" onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop';
                  }} />
                )}
                <div className="player-details">
                  <div className="player-title">{currentTrack?.title}</div>
                  <div className="player-artist">{currentTrack?.artist}</div>
                </div>
              </div>

              {/* Timeline */}
              <div className="time-container">
                <div className="progress-track" onClick={handleScrub}>
                  <div className="progress-fill" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}></div>
                </div>
                <div className="progress-labels">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="player-controls">
                <button className="player-btn player-btn-main" onClick={togglePlay}>
                  {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '3px' }} />}
                </button>
              </div>
            </div>
          )}

          {/* Quick info about demo mode */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#FFCB9A', letterSpacing: '0.05em' }}>
              Lyrics Auditing
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-sub)', lineHeight: '1.5' }}>
              Click directly on any word or line to jump there instantly. Use the button below to return and edit timings from that precise spot.
            </p>
          </div>

          {/* Action Button: Edit */}
          <button 
            className="btn btn-primary demo-edit-btn" 
            style={{ 
              width: '100%', 
              height: '48px', 
              gap: '8px', 
              background: 'var(--accent-gradient)',
              fontWeight: '700',
              fontSize: '13px',
              marginBottom: '20px'
            }} 
            onClick={() => onBackToEdit(currentTime)}
          >
            <ArrowLeft size={16} />
            <span>Edit Synced Lyrics</span>
          </button>

        </div>

      </div>

      <style>{`
        .lyrics-demo-scroller::-webkit-scrollbar {
          display: none;
        }
        .lyrics-demo-scroller {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
