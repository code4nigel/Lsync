import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Settings, HelpCircle, ChevronUp, ChevronDown, Trash2, Repeat, RefreshCw, Info, CheckCircle, Music, Bookmark, Save, Plus, X } from 'lucide-react';
import { parseLrcText, formatSyncDataToLrc, formatLrcTime } from '../utils/lrcParser';
import { playUiSound } from '../utils/soundEngine';

export default function TabSync({
  currentTrack,
  currentLyrics,
  syncData,
  setSyncData,
  syncMode,
  setSyncMode,
  lyricsFontSize,
  setLyricsFontSize,
  initialSeekTime,
  onClearInitialSeekTime,
  onBackTab,
  onNextTab,
  onSetDemoOverride,
  initialWorkspaceTab
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [latencyOffset, setLatencyOffset] = useState(100); // ms default
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(true);

  // Buffering state
  const [isBuffering, setIsBuffering] = useState(false);

  // Preference Settings
  const [settingsTab, setSettingsTab] = useState('options'); // 'options' or 'shortcuts' sidebar pill

  // Workspace sub-tab: 'sync', 'resync', or 'retimer'
  const [workspaceTab, setWorkspaceTab] = useState(initialWorkspaceTab || 'sync');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Custom Presets Profiles State
  const [presetProfiles, setPresetProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem('lsync_preset_profiles');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [newPresetName, setNewPresetName] = useState('');

  const handleSavePreset = (e) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const newProfile = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      latencyOffset,
      playbackSpeed,
      lyricsFontSize,
      syncMode
    };
    const updated = [...presetProfiles, newProfile];
    setPresetProfiles(updated);
    localStorage.setItem('lsync_preset_profiles', JSON.stringify(updated));
    setNewPresetName('');
  };

  const handleLoadPreset = (p) => {
    setLatencyOffset(p.latencyOffset);
    changeSpeed(p.playbackSpeed);
    setLyricsFontSize(p.lyricsFontSize);
    if (p.syncMode) setSyncMode(p.syncMode);
  };

  const handleDeletePreset = (id, e) => {
    e.stopPropagation();
    const updated = presetProfiles.filter(p => p.id !== id);
    setPresetProfiles(updated);
    localStorage.setItem('lsync_preset_profiles', JSON.stringify(updated));
  };

  useEffect(() => {
    if (initialWorkspaceTab) {
      setWorkspaceTab(initialWorkspaceTab);
    }
  }, [initialWorkspaceTab]);

  // Retimer & Time Shift states
  const [retimerDirection, setRetimerDirection] = useState('+');
  const [retimerMins, setRetimerMins] = useState(0);
  const [retimerSecs, setRetimerSecs] = useState(0);
  const [retimerMs, setRetimerMs] = useState(200);
  const [isRetimerPasteMode, setIsRetimerPasteMode] = useState(false);
  const [retimerInputText, setRetimerInputText] = useState('');

  const retimerOffsetSec = (retimerMins * 60 + retimerSecs + retimerMs / 1000) * (retimerDirection === '+' ? 1 : -1);

  const getShiftedDataset = () => {
    if (!syncData || syncData.length === 0) return [];
    return syncData.map(line => {
      const newTime = (line.time !== null && line.time !== -1)
        ? Math.max(0, line.time + retimerOffsetSec)
        : line.time;
      
      const newBreakTime = (line.breakTime !== null && line.breakTime !== -1)
        ? Math.max(0, line.breakTime + retimerOffsetSec)
        : line.breakTime;
      
      const newWords = (line.words || []).map(w => ({
        ...w,
        time: (w.time !== null && w.time !== -1)
          ? Math.max(0, w.time + retimerOffsetSec)
          : w.time
      }));

      return {
        ...line,
        time: newTime,
        breakTime: newBreakTime,
        words: newWords
      };
    });
  };

  // Interactive Tour Modal States (Session Persistence)
  const [showTutorial, setShowTutorial] = useState(() => {
    return sessionStorage.getItem('lsync_session_tutorial_dismissed') !== 'true';
  });

  const syncOptionsRef = useRef(null);
  const prevScrollPosRef = useRef(0);
  const [isViewingSyncOptions, setIsViewingSyncOptions] = useState(false);

  const handleToggleSyncOptionsScroll = () => {
    playUiSound('click');
    if (!isViewingSyncOptions) {
      const currentPos = window.scrollY || document.documentElement.scrollTop || 0;
      prevScrollPosRef.current = currentPos;
      if (syncOptionsRef.current) {
        syncOptionsRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      setIsViewingSyncOptions(true);
    } else {
      const targetPos = prevScrollPosRef.current > 0 ? prevScrollPosRef.current : 0;
      window.scrollTo({ top: targetPos, behavior: 'smooth' });
      if (listContainerRef.current) {
        listContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setIsViewingSyncOptions(false);
    }
  };

  // A-B Looping states
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(false);

  // Shift selection states
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [lastClickedIndex, setLastClickedIndex] = useState(null);

  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const listContainerRef = useRef(null);
  const activeLineRef = useRef(null);

  // Trigger quick fade animation when switching workspace tab
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 200);
    return () => clearTimeout(timer);
  }, [workspaceTab]);



  // Snaps position if returning from Demo tab
  useEffect(() => {
    if (initialSeekTime !== null && initialSeekTime !== undefined) {
      const time = parseFloat(initialSeekTime);
      
      // 1. Seek player (handles async YT load delay if needed)
      if (currentTrack?.source === 'youtube') {
        const checkYtLoaded = setInterval(() => {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
            ytPlayerRef.current.seekTo(time, true);
            ytPlayerRef.current.pauseVideo();
            setCurrentTime(time);
            clearInterval(checkYtLoaded);
          }
        }, 150);
        setTimeout(() => clearInterval(checkYtLoaded), 4000);
      } else if (audioRef.current) {
        audioRef.current.currentTime = time;
        audioRef.current.pause();
        setCurrentTime(time);
      }

      // 2. Snap active line cursor to the matching line
      let matchingLineIdx = 0;
      for (let i = 0; i < syncData.length; i++) {
        const line = syncData[i];
        if (line.time !== null && line.time !== -1 && line.time <= time) {
          matchingLineIdx = i;
        }
      }
      setActiveLineIndex(matchingLineIdx);
      setActiveWordIndex(0);

      // 3. Clear initial seek time
      onClearInitialSeekTime();
    }
  }, [initialSeekTime, currentTrack, syncData]);

  // Initialize syncData when lyrics load
  useEffect(() => {
    if (!currentLyrics) return;
    
    const parsedLines = currentLyrics
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((lineText) => {
        const words = lineText.split(/\s+/).filter(w => w.length > 0).map(wordText => ({
          text: wordText,
          time: null
        }));
        
        return {
          text: lineText,
          time: null,
          breakTime: null,
          words: words
        };
      });
      
    if (syncData.length === 0 || syncData[0].text !== parsedLines[0]?.text) {
      setSyncData(parsedLines);
      setActiveLineIndex(0);
      setActiveWordIndex(0);
      setSelectedIndices([]);
    }
  }, [currentLyrics]);

  // YouTube IFrame Player Setup
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

      ytPlayerRef.current = new window.YT.Player('yt-player', {
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
            event.target.setPlaybackRate(playbackSpeed);
            setLoopEnd(event.target.getDuration());
          },
          onStateChange: (event) => {
            if (event.data === 1) {
              setIsPlaying(true);
              setIsBuffering(false);
            } else if (event.data === 3) {
              setIsBuffering(true);
            } else {
              setIsPlaying(false);
              setIsBuffering(false);
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

  // High precision time tracker & loop interceptor for YouTube (pauses during buffering)
  useEffect(() => {
    let interval;
    if (isPlaying && !isBuffering && currentTrack?.source === 'youtube') {
      interval = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const time = ytPlayerRef.current.getCurrentTime();
          
          if (loopEnabled && time >= loopEnd) {
            ytPlayerRef.current.seekTo(loopStart, true);
            setCurrentTime(loopStart);
          } else {
            setCurrentTime(time);
          }
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isBuffering, currentTrack, loopEnabled, loopStart, loopEnd]);

  // Local Media Event Handlers with Loop Interceptor
  const handleTimeUpdate = () => {
    if (currentTrack?.source === 'local' && audioRef.current) {
      const time = audioRef.current.currentTime;
      if (loopEnabled && time >= loopEnd) {
        audioRef.current.currentTime = loopStart;
        setCurrentTime(loopStart);
      } else {
        setCurrentTime(time);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (currentTrack?.source === 'local' && audioRef.current) {
      setDuration(audioRef.current.duration);
      setLoopEnd(audioRef.current.duration);
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

  const pausePlayer = () => {
    setIsPlaying(false);
    if (currentTrack?.source === 'youtube' && ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
      ytPlayerRef.current.pauseVideo();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const seekAndPause = (time) => {
    setIsPlaying(false);
    const cleanTime = Math.max(0, time);
    if (currentTrack?.source === 'youtube' && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(cleanTime, true);
      ytPlayerRef.current.pauseVideo();
      setCurrentTime(cleanTime);
    } else if (audioRef.current) {
      audioRef.current.currentTime = cleanTime;
      audioRef.current.pause();
      setCurrentTime(cleanTime);
    }
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (currentTrack?.source === 'youtube') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setPlaybackRate === 'function') {
        ytPlayerRef.current.setPlaybackRate(speed);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.playbackRate = speed;
      }
    }
  };

  const getPlayerTime = () => {
    if (currentTrack?.source === 'youtube') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        return ytPlayerRef.current.getCurrentTime();
      }
    } else {
      if (audioRef.current) {
        return audioRef.current.currentTime;
      }
    }
    return 0;
  };

  const seekToLine = (index) => {
    const line = syncData[index];
    if (line && line.time !== null && line.time !== -1) {
      if (currentTrack?.source === 'youtube') {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
          ytPlayerRef.current.seekTo(line.time, true);
          setCurrentTime(line.time);
        }
      } else {
        if (audioRef.current) {
          audioRef.current.currentTime = line.time;
        }
      }
    }
  };

  const handleSync = () => {
    const rawTime = getPlayerTime();
    const stampTime = Math.max(0, rawTime - (latencyOffset / 1000));
    const updatedData = [...syncData];
    
    if (syncMode === 'line') {
      if (activeLineIndex >= updatedData.length) return;
      updatedData[activeLineIndex].time = stampTime;
      setSyncData(updatedData);
      setActiveLineIndex(prev => Math.min(updatedData.length, prev + 1));
    } else {
      if (activeLineIndex >= updatedData.length) return;
      const line = updatedData[activeLineIndex];
      if (line.words.length === 0) {
        updatedData[activeLineIndex].time = stampTime;
        setSyncData(updatedData);
        setActiveLineIndex(prev => Math.min(updatedData.length, prev + 1));
        setActiveWordIndex(0);
        return;
      }
      
      if (activeWordIndex === 0) {
        updatedData[activeLineIndex].time = stampTime;
      }
      
      updatedData[activeLineIndex].words[activeWordIndex].time = stampTime;
      setSyncData(updatedData);
      
      if (activeWordIndex + 1 < line.words.length) {
        setActiveWordIndex(prev => prev + 1);
      } else {
        setActiveLineIndex(prev => Math.min(updatedData.length, prev + 1));
        setActiveWordIndex(0);
      }
    }
  };

  const handleInsertMusicBreak = () => {
    if (activeLineIndex >= syncData.length) return;
    const rawTime = getPlayerTime();
    const stampTime = Math.max(0, rawTime - (latencyOffset / 1000));
    
    const updatedData = [...syncData];
    updatedData[activeLineIndex].breakTime = stampTime;
    setSyncData(updatedData);
  };

  const handleMarkEnd = () => {
    if (activeLineIndex >= syncData.length) return;
    const updatedData = [...syncData];
    const endTimestamp = duration || getPlayerTime();
    
    if (syncMode === 'line') {
      updatedData[activeLineIndex].time = endTimestamp;
      setSyncData(updatedData);
      setActiveLineIndex(prev => Math.min(updatedData.length, prev + 1));
    } else {
      const line = updatedData[activeLineIndex];
      if (line.words.length === 0) {
        updatedData[activeLineIndex].time = endTimestamp;
        setSyncData(updatedData);
        setActiveLineIndex(prev => Math.min(updatedData.length, prev + 1));
        setActiveWordIndex(0);
        return;
      }
      
      if (activeWordIndex === 0) {
        updatedData[activeLineIndex].time = endTimestamp;
      }
      
      const updatedWords = line.words.map((w, wIdx) => {
        if (wIdx >= activeWordIndex) {
          return { ...w, time: endTimestamp };
        }
        return w;
      });
      updatedData[activeLineIndex].words = updatedWords;
      setSyncData(updatedData);
      setActiveLineIndex(prev => Math.min(updatedData.length, prev + 1));
      setActiveWordIndex(0);
    }
  };

  const handleUndo = () => {
    if (syncData.length === 0) return;
    const updatedData = [...syncData];
    
    let targetTime = 0;

    if (syncMode === 'line') {
      if (activeLineIndex === 0) return;
      const targetIndex = activeLineIndex - 1;
      
      updatedData[targetIndex].time = null;
      updatedData[targetIndex].breakTime = null;
      setSyncData(updatedData);
      setActiveLineIndex(targetIndex);

      const prevIdx = targetIndex - 1;
      if (prevIdx >= 0 && updatedData[prevIdx] && updatedData[prevIdx].time !== null && updatedData[prevIdx].time !== -1) {
        targetTime = updatedData[prevIdx].time;
      }
    } else {
      let targetLineIdx = activeLineIndex;
      let targetWordIdx = activeWordIndex - 1;
      
      if (targetWordIdx < 0) {
        targetLineIdx = activeLineIndex - 1;
        if (targetLineIdx < 0) return;
        const prevLine = updatedData[targetLineIdx];
        targetWordIdx = prevLine.words.length - 1;
      }
      
      if (updatedData[targetLineIdx].words[targetWordIdx]) {
        updatedData[targetLineIdx].words[targetWordIdx].time = null;
      }
      if (targetWordIdx === 0) {
        updatedData[targetLineIdx].time = null;
        updatedData[targetLineIdx].breakTime = null;
      }
      
      setSyncData(updatedData);
      setActiveLineIndex(targetLineIdx);
      setActiveWordIndex(targetWordIdx);

      let foundTime = false;
      let l = targetLineIdx;
      let w = targetWordIdx - 1;
      
      while (l >= 0 && !foundTime) {
        if (w < 0) {
          l--;
          if (l >= 0) {
            w = updatedData[l].words.length - 1;
          }
          continue;
        }
        const t = updatedData[l].words[w]?.time;
        if (t !== null && t !== -1) {
          targetTime = t;
          foundTime = true;
        }
        w--;
      }
    }

    seekAndPause(targetTime);
  };

  const handleSkip = () => {
    const updatedData = [...syncData];
    
    if (syncMode === 'line') {
      if (activeLineIndex >= updatedData.length) return;
      updatedData[activeLineIndex].time = -1;
      setSyncData(updatedData);
      setActiveLineIndex(prev => Math.min(updatedData.length, prev + 1));
    } else {
      if (activeLineIndex >= updatedData.length) return;
      const line = updatedData[activeLineIndex];
      
      updatedData[activeLineIndex].words[activeWordIndex].time = -1;
      setSyncData(updatedData);
      
      if (activeWordIndex + 1 < line.words.length) {
        setActiveWordIndex(prev => prev + 1);
      } else {
        setActiveLineIndex(prev => Math.min(updatedData.length, prev + 1));
        setActiveWordIndex(0);
      }
    }
  };

  const handleLoopSelected = () => {
    if (selectedIndices.length === 0) {
      alert("Please select lines in the list to loop them.");
      return;
    }
    
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    selectedIndices.forEach(idx => {
      const line = syncData[idx];
      if (line) {
        if (line.time !== null && line.time !== -1) {
          if (line.time < minTime) minTime = line.time;
          if (line.time > maxTime) maxTime = line.time;
        }
        if (line.breakTime !== null && line.breakTime !== -1) {
          if (line.breakTime < minTime) minTime = line.breakTime;
          if (line.breakTime > maxTime) maxTime = line.breakTime;
        }
        line.words.forEach(w => {
          if (w.time !== null && w.time !== -1) {
            if (w.time < minTime) minTime = w.time;
            if (w.time > maxTime) maxTime = w.time;
          }
        });
      }
    });

    if (minTime === Infinity || maxTime === -Infinity) {
      alert("Selected lines do not have synchronization times yet. Sync them first!");
      return;
    }

    if (minTime === maxTime) {
      maxTime = minTime + 2.0;
    }

    setLoopStart(minTime);
    setLoopEnd(Math.min(duration, maxTime + 0.3));
    setLoopEnabled(true);
    
    if (currentTrack?.source === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(minTime, true);
      setCurrentTime(minTime);
    } else if (audioRef.current) {
      audioRef.current.currentTime = minTime;
    }
  };

  const handleStartReSync = () => {
    if (selectedIndices.length === 0) return;
    
    const sorted = [...selectedIndices].sort((a, b) => a - b);
    const firstIdx = sorted[0];
    const lastIdx = sorted[sorted.length - 1];
    
    let startT = 0;
    for (let i = firstIdx; i >= 0; i--) {
      const t = syncData[i]?.time;
      if (t !== null && t !== -1 && t !== undefined) {
        startT = t;
        break;
      }
    }
    
    let endT = startT + 12.0;
    for (let i = lastIdx; i < syncData.length; i++) {
      const t = syncData[i]?.time;
      if (t !== null && t !== -1 && t !== undefined) {
        endT = t + 2.0;
        break;
      }
    }
    
    setLoopStart(startT);
    setLoopEnd(Math.min(duration || 9999, endT));
    setLoopEnabled(true);
    
    setActiveLineIndex(firstIdx);
    setActiveWordIndex(0);
    
    const updated = [...syncData];
    sorted.forEach(idx => {
      if (updated[idx]) {
        updated[idx].time = null;
        updated[idx].breakTime = null;
        if (updated[idx].words) {
          updated[idx].words = updated[idx].words.map(w => ({ ...w, time: null }));
        }
      }
    });
    setSyncData(updated);
    
    seekAndPause(startT);
    setSelectedIndices([]);
    setLastClickedIndex(null);
    setWorkspaceTab('sync');
  };

  const handleResetAll = () => {
    if (!window.confirm("Are you sure you want to clear all sync timings and start over?")) return;
    
    const reset = syncData.map(line => ({
      ...line,
      time: null,
      breakTime: null,
      words: line.words.map(w => ({ ...w, time: null }))
    }));
    setSyncData(reset);
    setActiveLineIndex(0);
    setActiveWordIndex(0);
    setSelectedIndices([]);
  };

  const adjustTimestamp = (lineIdx, wordIdx, amount) => {
    const updated = [...syncData];
    if (wordIdx === null) {
      if (updated[lineIdx].time !== null && updated[lineIdx].time !== -1) {
        updated[lineIdx].time = Math.max(0, updated[lineIdx].time + amount);
        setSyncData(updated);
      }
    } else {
      if (updated[lineIdx].words[wordIdx].time !== null && updated[lineIdx].words[wordIdx].time !== -1) {
        updated[lineIdx].words[wordIdx].time = Math.max(0, updated[lineIdx].words[wordIdx].time + amount);
        if (wordIdx === 0) {
          updated[lineIdx].time = updated[lineIdx].words[wordIdx].time;
        }
        setSyncData(updated);
      }
    }
  };

  const formatTime = (timeInSecs) => {
    if (timeInSecs === null || timeInSecs === undefined) return '--:--.--';
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    const ms = Math.floor((timeInSecs % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      
      const key = e.key.toLowerCase();
      
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      switch (key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 's':
        case 'enter':
          e.preventDefault();
          handleSync();
          break;
        case 'z':
        case 'backspace':
          e.preventDefault();
          handleUndo();
          break;
        case 'd':
          e.preventDefault();
          handleSkip();
          break;
        case 'm':
          e.preventDefault();
          handleInsertMusicBreak();
          break;
        case 'e':
          e.preventDefault();
          handleMarkEnd();
          break;
        case 'a':
          e.preventDefault();
          setLoopStart(getPlayerTime());
          break;
        case 'b':
          e.preventDefault();
          setLoopEnd(getPlayerTime());
          break;
        case 'l':
          e.preventDefault();
          if (selectedIndices.length > 0) {
            if (workspaceTab === 'resync') {
              handleStartReSync();
            } else {
              if (loopEnabled) {
                setLoopEnabled(false);
              } else {
                handleLoopSelected();
              }
            }
          } else {
            setLoopEnabled(prev => !prev);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [syncData, activeLineIndex, activeWordIndex, syncMode, latencyOffset, isPlaying, loopEnabled, loopStart, loopEnd, selectedIndices, workspaceTab]);

  // Programmatic centered auto-scroll handler
  useEffect(() => {
    if (activeLineRef.current && listContainerRef.current && workspaceTab === 'sync') {
      const container = listContainerRef.current;
      const activeEl = activeLineRef.current;
      
      const containerHeight = container.clientHeight;
      const activeElTop = activeEl.offsetTop;
      const activeElHeight = activeEl.clientHeight;
      
      container.scrollTo({
        top: activeElTop - (containerHeight / 2) + (activeElHeight / 2),
        behavior: 'smooth'
      });
    }
  }, [activeLineIndex, workspaceTab]);

  // Scrub progress bar
  const handleScrub = (e) => {
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const seekTime = pct * duration;
    
    if (currentTrack?.source === 'youtube') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(seekTime, true);
        setCurrentTime(seekTime);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
      }
    }
  };

  // Line list item selection handler
  const handleLineSelect = (e, index) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

    if (workspaceTab === 'sync') {
      seekToLine(index);
    }

    if (e.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const range = [];
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      setSelectedIndices(range);
    } else if (e.ctrlKey || e.metaKey || workspaceTab === 'resync') {
      setSelectedIndices(prev => {
        if (prev.includes(index)) {
          return prev.filter(i => i !== index);
        } else {
          return [...prev, index];
        }
      });
      setLastClickedIndex(index);
    } else {
      setSelectedIndices([index]);
      setLastClickedIndex(index);
    }
  };

  // Auto-scroll active line to vertical center during sync
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [activeLineIndex, activeWordIndex, workspaceTab]);

  return (
    <div className="tab-pane active" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', position: 'relative' }}>
      
      {/* HTML5 Audio (For Local Files Only) */}
      {currentTrack?.source === 'local' && (
        <audio
          ref={audioRef}
          src={currentTrack.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        
        {/* Left Column: Sync Timeline Workspace */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '560px' }}>
          
          {/* Sub-tab selection bar */}
          <div className="flex-between" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
              <button 
                className={`workspace-tab ${workspaceTab === 'sync' ? 'active' : ''}`}
                onClick={() => { playUiSound('click'); setSelectedIndices([]); setWorkspaceTab('sync'); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: workspaceTab === 'sync' ? '2px solid var(--accent-purple)' : '2px solid transparent',
                  color: workspaceTab === 'sync' ? '#fff' : 'var(--text-sub)',
                  paddingBottom: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Sync Timeline
              </button>
              <button 
                className={`workspace-tab ${workspaceTab === 'resync' ? 'active' : ''}`}
                onClick={() => { playUiSound('click'); setSelectedIndices([]); setWorkspaceTab('resync'); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: workspaceTab === 'resync' ? '2px solid var(--accent-purple)' : '2px solid transparent',
                  color: workspaceTab === 'resync' ? '#fff' : 'var(--text-sub)',
                  paddingBottom: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Re-sync & Loop
              </button>
              <button 
                className={`workspace-tab ${workspaceTab === 'retimer' ? 'active' : ''}`}
                onClick={() => { playUiSound('click'); setSelectedIndices([]); setWorkspaceTab('retimer'); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: workspaceTab === 'retimer' ? '2px solid #FFCB9A' : '2px solid transparent',
                  color: workspaceTab === 'retimer' ? '#fff' : 'var(--text-sub)',
                  paddingBottom: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                ⏱️ Retimer & Shift
              </button>

              {/* Welcome Info tour Trigger Button */}
              <button
                type="button"
                onClick={() => { playUiSound('modal'); setShowTutorial(true); }}
                style={{
                  background: 'linear-gradient(135deg, #FFCB9A 0%, #D1E8E2 100%)',
                  border: '1px solid #FFCB9A',
                  borderRadius: '16px',
                  padding: '3px 9px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#1C2321',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '800',
                  boxShadow: '0 2px 10px rgba(255, 203, 154, 0.4)',
                  transition: 'all 0.2s ease-in-out'
                }}
                title="Quick Guide & Latency Settings"
              >
                <HelpCircle size={12} style={{ strokeWidth: 2.5 }} />
                <span>Guide</span>
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
              Line {Math.min(syncData.length, activeLineIndex + 1)} of {syncData.length}
            </span>
          </div>
          {/* Workspace Body: Sync / Resync vs Retimer */}
          {workspaceTab === 'retimer' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, overflow: 'hidden', animation: 'fadeIn 0.25s ease' }}>
              
              {/* Retimer Control Bar */}
              <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-light)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                <div className="flex-between">
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ⏱️ Time Shift Settings
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: retimerOffsetSec >= 0 ? '#D1E8E2' : '#FFCB9A', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <span>Total Shift:</span>
                    <span>{retimerOffsetSec >= 0 ? `+${retimerOffsetSec.toFixed(3)}s` : `${retimerOffsetSec.toFixed(3)}s`}</span>
                  </div>
                </div>

                {/* Direction & Numeric Inputs */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  
                  {/* Direction Switch */}
                  <div style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                    <button 
                      type="button"
                      className="btn"
                      onClick={() => { playUiSound('click'); setRetimerDirection('+'); }}
                      style={{ padding: '4px 10px', fontSize: '11px', background: retimerDirection === '+' ? 'var(--accent-gradient)' : 'transparent', color: '#fff', fontWeight: '700' }}
                    >
                      + Delay (+)
                    </button>
                    <button 
                      type="button"
                      className="btn"
                      onClick={() => { playUiSound('click'); setRetimerDirection('-'); }}
                      style={{ padding: '4px 10px', fontSize: '11px', background: retimerDirection === '-' ? 'var(--accent-gradient)' : 'transparent', color: '#fff', fontWeight: '700' }}
                    >
                      - Advance (-)
                    </button>
                  </div>

                  {/* Mins Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: '#fff', fontWeight: '700' }}>Mins:</label>
                    <input 
                      type="number"
                      min="0"
                      max="59"
                      value={retimerMins}
                      onChange={(e) => setRetimerMins(Math.max(0, parseInt(e.target.value) || 0))}
                      className="form-control"
                      style={{ width: '48px', padding: '4px 6px', fontSize: '11px', textAlign: 'center', borderRadius: '6px' }}
                    />
                  </div>

                  {/* Secs Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: '#fff', fontWeight: '700' }}>Secs:</label>
                    <input 
                      type="number"
                      min="0"
                      max="59"
                      value={retimerSecs}
                      onChange={(e) => setRetimerSecs(Math.max(0, parseInt(e.target.value) || 0))}
                      className="form-control"
                      style={{ width: '48px', padding: '4px 6px', fontSize: '11px', textAlign: 'center', borderRadius: '6px' }}
                    />
                  </div>

                  {/* Ms Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: '#fff', fontWeight: '700' }}>Ms:</label>
                    <input 
                      type="number"
                      min="0"
                      max="999"
                      step="50"
                      value={retimerMs}
                      onChange={(e) => setRetimerMs(Math.max(0, parseInt(e.target.value) || 0))}
                      className="form-control"
                      style={{ width: '60px', padding: '4px 6px', fontSize: '11px', textAlign: 'center', borderRadius: '6px' }}
                    />
                  </div>

                </div>

                {/* Preset Buttons */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: '700', marginRight: '2px' }}>PRESETS:</span>
                  {[
                    { label: '-500ms', dir: '-', m: 0, s: 0, ms: 500 },
                    { label: '-300ms', dir: '-', m: 0, s: 0, ms: 300 },
                    { label: '-200ms', dir: '-', m: 0, s: 0, ms: 200 },
                    { label: '-100ms', dir: '-', m: 0, s: 0, ms: 100 },
                    { label: '+100ms', dir: '+', m: 0, s: 0, ms: 100 },
                    { label: '+200ms', dir: '+', m: 0, s: 0, ms: 200 },
                    { label: '+500ms', dir: '+', m: 0, s: 0, ms: 500 }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 7px', fontSize: '9px', borderRadius: '4px' }}
                      onClick={() => {
                        playUiSound('click');
                        setRetimerDirection(p.dir);
                        setRetimerMins(p.m);
                        setRetimerSecs(p.s);
                        setRetimerMs(p.ms);
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

              </div>

              {/* Side-by-side comparison boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flexGrow: 1, overflow: 'hidden' }}>
                
                {/* Left Column: Original Synced Lyrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '10px', overflow: 'hidden' }}>
                  <div className="flex-between">
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#D1E8E2' }}>Original Timings</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '9px', borderRadius: '4px', border: '1px solid #D1E8E2', color: '#D1E8E2' }}
                      onClick={() => {
                        if (!isRetimerPasteMode && retimerInputText === '' && syncData.length > 0) {
                          const formatted = formatSyncDataToLrc(syncData, null, { includeMetadata: false, syncMode: 'word' });
                          setRetimerInputText(formatted);
                        }
                        setIsRetimerPasteMode(!isRetimerPasteMode);
                      }}
                    >
                      {isRetimerPasteMode ? '📜 View List' : '📋 Edit/Paste LRC'}
                    </button>
                  </div>

                  {isRetimerPasteMode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1, overflow: 'hidden' }}>
                      <textarea
                        className="form-control"
                        placeholder="Paste synced LRC text or raw lines here...&#10;e.g.&#10;[00:12.45] <00:12.92>मेने <00:13.43>छुपा&#10;[00:15.30] Second line of lyrics"
                        value={retimerInputText}
                        onChange={(e) => setRetimerInputText(e.target.value)}
                        style={{
                          flexGrow: 1,
                          resize: 'none',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          lineHeight: '1.5',
                          padding: '6px',
                          background: 'rgba(0,0,0,0.3)',
                          borderRadius: '6px'
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '6px', fontSize: '10px', background: 'var(--accent-gradient)' }}
                        onClick={() => {
                          playUiSound('modal');
                          if (retimerInputText.trim()) {
                            const dataset = parseLrcText(retimerInputText);
                            setSyncData(dataset);
                            setIsRetimerPasteMode(false);
                          }
                        }}
                        disabled={!retimerInputText.trim()}
                      >
                        Paste Lyrics to Load ✨
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
                        {syncData.length === 0 && (
                          <div style={{ fontSize: '10px', color: 'var(--text-sub)', textAlign: 'center', padding: '20px' }}>
                            No lyrics in workspace. Click "📋 Edit/Paste LRC" above to paste external LRC text!
                          </div>
                        )}
                        {syncData.map((line, idx) => (
                          <div key={idx} style={{ fontSize: '10px', display: 'flex', gap: '6px', padding: '3px 5px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                            <span style={{ fontFamily: 'monospace', color: '#FFCB9A', flexShrink: 0 }}>
                              {line.time === null ? '--:--' : formatTime(line.time)}
                            </span>
                            <span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {line.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button 
                        className="btn btn-secondary" 
                        style={{ width: '100%', padding: '6px', fontSize: '10px', gap: '4px' }}
                        onClick={() => {
                          if (onSetDemoOverride) onSetDemoOverride(null);
                          onNextTab();
                        }}
                      >
                        <span>Demo Original</span> 🎬
                      </button>
                    </>
                  )}
                </div>

                {/* Right Column: Shifted Synced Lyrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(17, 100, 102, 0.1)', border: '1px solid var(--accent-blue)', borderRadius: '10px', padding: '10px', overflow: 'hidden' }}>
                  <div className="flex-between">
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A' }}>Shifted ({retimerOffsetSec >= 0 ? `+${retimerOffsetSec.toFixed(2)}s` : `${retimerOffsetSec.toFixed(2)}s`})</span>
                    <span style={{ fontSize: '9px', color: '#FFCB9A' }}>New Offset</span>
                  </div>
                  <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
                    {getShiftedDataset().map((line, idx) => (
                      <div key={idx} style={{ fontSize: '10px', display: 'flex', gap: '6px', padding: '3px 5px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                        <span style={{ fontFamily: 'monospace', color: '#D1E8E2', flexShrink: 0, fontWeight: '700' }}>
                          {line.time === null ? '--:--' : formatTime(line.time)}
                        </span>
                        <span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {line.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', padding: '6px', fontSize: '10px', gap: '4px', border: '1px solid #FFCB9A', color: '#FFCB9A' }}
                    onClick={() => {
                      if (onSetDemoOverride) onSetDemoOverride(getShiftedDataset());
                      onNextTab();
                    }}
                  >
                    <span>Demo Shifted</span> 🚀
                  </button>
                </div>

              </div>

              {/* Apply Action Button */}
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', height: '38px', background: 'var(--accent-gradient)', fontWeight: '700', fontSize: '12px', boxShadow: '0 4px 15px var(--accent-glow)' }}
                onClick={() => {
                  playUiSound('modal');
                  const shifted = getShiftedDataset();
                  setSyncData(shifted);
                  if (onSetDemoOverride) onSetDemoOverride(null);
                  setWorkspaceTab('sync');
                  alert(`Successfully applied time shift of ${retimerOffsetSec >= 0 ? '+' : ''}${retimerOffsetSec.toFixed(3)}s to all lyrics!`);
                }}
              >
                Apply effect to lyrics ✨
              </button>

            </div>
          ) : (
            <>
              {/* Sync Lyrics Viewer (With smooth fade transition) */}
              <div 
                ref={listContainerRef}
                className="lyrics-sync-viewer"
                style={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  paddingRight: '6px',
                  paddingBottom: '100px',
                  opacity: isTransitioning ? 0.35 : 1.0,
                  transition: 'opacity 0.2s ease-in-out'
                }}
              >
                {syncData.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-sub)' }}>
                    No lyrics loaded. Go back to the Search & Import tab first.
                  </div>
                )}
                {syncData.map((line, lineIdx) => {
                  const isActive = workspaceTab === 'sync' && lineIdx === activeLineIndex;
                  const isSynced = line.time !== null;
                  const isPast = workspaceTab === 'sync' && lineIdx < activeLineIndex;
                  const isSelected = selectedIndices.includes(lineIdx);
                  
                  return (
                    <div 
                      key={lineIdx}
                      ref={isActive ? activeLineRef : null}
                      className={`sync-line-card ${isActive ? 'active' : ''} ${isSynced ? 'synced' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={(e) => handleLineSelect(e, lineIdx)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: isActive 
                          ? 'rgba(168, 85, 247, 0.08)' 
                          : isSelected
                            ? 'rgba(168, 85, 247, 0.06)'
                            : isSynced 
                              ? 'rgba(255, 255, 255, 0.02)' 
                              : 'transparent',
                        border: isActive 
                          ? '1px solid rgba(168, 85, 247, 0.3)' 
                          : isSelected
                            ? '1px solid rgba(168, 85, 247, 0.4)'
                            : '1px solid transparent',
                        boxShadow: isActive ? '0 0 15px rgba(168, 85, 247, 0.1)' : 'none',
                        opacity: workspaceTab === 'resync' ? 1.0 : isActive ? 1 : isPast ? 0.6 : 0.35,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      {/* Checkbox for Re-sync Tab */}
                      {workspaceTab === 'resync' && (
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {}} // row click toggles
                          style={{ 
                            width: '16px', 
                            height: '16px', 
                            accentColor: 'var(--accent-purple)', 
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        />
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
                        {line.breakTime !== null && (
                          <div 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              fontSize: '11px', 
                              color: 'var(--accent-purple)', 
                              padding: '4px 8px', 
                              background: 'rgba(168, 85, 247, 0.04)',
                              border: '1px dashed rgba(168, 85, 247, 0.25)', 
                              borderRadius: '6px',
                              marginBottom: '4px' 
                            }}
                          >
                            <span style={{ fontWeight: '600' }}>♪ Instrumental Break starts here ({formatTime(line.breakTime).split('.')[0]})</span>
                            <button 
                              style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '9px', fontWeight: 'bold' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = [...syncData];
                                updated[lineIdx].breakTime = null;
                                setSyncData(updated);
                              }}
                            >
                              REMOVE
                            </button>
                          </div>
                        )}

                        <div className="flex-between">
                          <div 
                            style={{ 
                              fontSize: `${lyricsFontSize}px`, 
                              fontWeight: isActive ? '600' : '400', 
                              flexGrow: 1 
                            }}
                          >
                            {syncMode === 'line' ? (
                              <span>{line.text}</span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 4px' }}>
                                {line.words.map((word, wordIdx) => {
                                  const isWordActive = isActive && wordIdx === activeWordIndex;
                                  const isWordSynced = word.time !== null;
                                  
                                  return (
                                    <span 
                                      key={wordIdx}
                                      onClick={(e) => {
                                        if (word.time !== null && word.time !== -1) {
                                          e.stopPropagation();
                                          if (currentTrack?.source === 'youtube' && ytPlayerRef.current) {
                                            ytPlayerRef.current.seekTo(word.time, true);
                                            setCurrentTime(word.time);
                                          } else if (audioRef.current) {
                                            audioRef.current.currentTime = word.time;
                                          }
                                        }
                                      }}
                                      style={{
                                        padding: '2px 6px',
                                        borderRadius: '6px',
                                        cursor: isWordSynced ? 'pointer' : 'default',
                                        background: isWordActive
                                          ? 'var(--accent-purple)'
                                          : isWordSynced
                                            ? 'rgba(168, 85, 247, 0.2)'
                                            : 'transparent',
                                        color: isWordActive
                                          ? '#fff'
                                          : isWordSynced
                                            ? '#fff'
                                            : 'var(--text-main)',
                                        border: isWordActive
                                          ? '1px solid var(--accent-purple)'
                                          : isWordSynced
                                            ? '1px solid rgba(168, 85, 247, 0.3)'
                                            : '1px solid transparent',
                                        boxShadow: isWordActive ? '0 0 8px var(--accent-glow)' : 'none',
                                        fontWeight: isWordActive || isWordSynced ? '600' : '400',
                                        fontSize: '0.9em',
                                        animation: isWordActive ? 'pulseWord 1s infinite alternate' : 'none',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      {word.text}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: isSynced ? 'var(--accent-purple)' : 'var(--text-sub)' }}>
                              {line.time === -1 ? 'Skipped' : formatTime(line.time)}
                            </span>
                            
                            {isSynced && line.time !== -1 && (
                              <div style={{ display: 'flex', gap: '2px' }}>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '2px 4px', fontSize: '8px' }}
                                  onClick={() => adjustTimestamp(lineIdx, null, -0.1)}
                                >
                                  -0.1s
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '2px 4px', fontSize: '8px' }}
                                  onClick={() => adjustTimestamp(lineIdx, null, 0.1)}
                                >
                                  +0.1s
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {syncMode === 'word' && line.words.some(w => w.time !== null) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 8px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                            {line.words.map((word, wordIdx) => {
                              if (word.time === null || word.time === -1) return null;
                              return (
                                <div key={wordIdx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', background: 'rgba(255,255,255,0.03)', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                                  <span style={{ color: 'var(--text-sub)' }}>{word.text}:</span>
                                  <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{word.time.toFixed(2)}s</span>
                                  <button style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', padding: '0 2px' }} onClick={() => adjustTimestamp(lineIdx, wordIdx, -0.1)}>-</button>
                                  <button style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', padding: '0 2px' }} onClick={() => adjustTimestamp(lineIdx, wordIdx, 0.1)}>+</button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Unified Ergonomic Sync Controller Bar (Desktop & Mobile - Hidden when Guide Modal is open) */}
              {!showTutorial && (
                <div className="sync-controller-bar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                {workspaceTab === 'sync' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
                      
                      {/* LEFT THUMB / CONTROL WING: PLAY/PAUSE & BREAK [M] (PINK) */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          type="button"
                          className="btn btn-secondary" 
                          onClick={togglePlay}
                          style={{
                            flex: '1 1 0',
                            height: '48px',
                            fontSize: '11px',
                            fontWeight: '800',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            background: isPlaying ? 'rgba(239, 68, 68, 0.25)' : 'rgba(17, 100, 102, 0.3)',
                            border: '1px solid var(--accent-blue)'
                          }}
                        >
                          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                          <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                        </button>

                        <button 
                          type="button"
                          className="btn btn-secondary" 
                          onClick={handleInsertMusicBreak}
                          style={{
                            flex: '1 1 0',
                            height: '48px',
                            fontSize: '10px',
                            fontWeight: '800',
                            borderRadius: '12px',
                            color: '#F472B6',
                            border: '1px solid rgba(244, 114, 182, 0.4)',
                            background: 'rgba(244, 114, 182, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 10px rgba(244, 114, 182, 0.2)'
                          }}
                        >
                          <Music size={15} />
                          <span>BREAK [M]</span>
                        </button>
                      </div>

                      {/* RIGHT THUMB / CONTROL WING: UNDO [Z] & STAMP [S] */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          type="button"
                          className="btn btn-secondary" 
                          onClick={handleUndo}
                          style={{
                            flex: '1 1 0',
                            height: '48px',
                            fontSize: '11px',
                            fontWeight: '800',
                            borderRadius: '12px',
                            color: '#FFCB9A',
                            border: '1px solid rgba(255, 203, 154, 0.4)',
                            background: 'rgba(255, 203, 154, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <RotateCcw size={15} />
                          <span>UNDO [Z]</span>
                        </button>

                        <button 
                          type="button"
                          className="btn btn-primary" 
                          onClick={handleSync}
                          style={{
                            flex: '1.4 1 0',
                            height: '48px',
                            fontSize: '12px',
                            fontWeight: '900',
                            background: 'var(--accent-gradient)',
                            boxShadow: '0 4px 18px var(--accent-glow)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            border: 'none'
                          }}
                        >
                          <CheckCircle size={16} />
                          <span>STAMP [S]</span>
                        </button>
                      </div>

                    </div>

                    {/* Bottom Quick Actions Row: END [E], SKIP [D], LOOP, OPTIONS */}
                    <div style={{ display: 'flex', gap: '4px', width: '100%', overflowX: 'auto', paddingTop: '2px' }}>
                      <button type="button" className="btn btn-secondary" onClick={handleMarkEnd} style={{ flex: '1 0 auto', padding: '6px 8px', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        ⏹️ END [E]
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={handleSkip} style={{ flex: '1 0 auto', padding: '6px 8px', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        ⏭️ SKIP [D]
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => {
                          playUiSound('click');
                          setLoopEnabled(prev => !prev);
                        }} 
                        style={{ 
                          flex: '1 0 auto', 
                          padding: '6px 8px', 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          whiteSpace: 'nowrap',
                          background: loopEnabled ? 'rgba(17, 100, 102, 0.4)' : 'rgba(255,255,255,0.03)',
                          border: loopEnabled ? '1px solid var(--accent-blue)' : '1px solid var(--border-light)',
                          color: loopEnabled ? '#fff' : 'var(--text-sub)'
                        }}
                      >
                        🔁 LOOP {loopEnabled ? '(ON)' : '(OFF)'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={handleToggleSyncOptionsScroll} 
                        style={{ 
                          flex: '1 0 auto', 
                          padding: '6px 8px', 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          whiteSpace: 'nowrap',
                          background: isViewingSyncOptions ? 'rgba(255, 203, 154, 0.25)' : 'rgba(255,255,255,0.03)',
                          border: isViewingSyncOptions ? '1px solid #FFCB9A' : '1px solid var(--border-light)',
                          color: isViewingSyncOptions ? '#FFCB9A' : 'var(--text-sub)'
                        }}
                      >
                        ⚙️ OPTIONS {isViewingSyncOptions ? '↑' : '↓'}
                      </button>
                    </div>
                  </>
                ) : (
                  <button 
                    className="btn btn-primary"
                    style={{
                      gridColumn: '1 / -1',
                      height: '48px',
                      fontSize: '14px',
                      background: 'var(--accent-gradient)',
                      boxShadow: '0 4px 15px var(--accent-glow)'
                    }}
                    disabled={selectedIndices.length === 0}
                    onClick={handleStartReSync}
                  >
                    <RefreshCw size={16} style={{ marginRight: '6px' }} />
                    RE-SYNC & LOOP SELECTED RANGE ({selectedIndices.length} lines)
                  </button>
                )}
              </div>
              )}
            </>
          )}

        </div>

        {/* Right Column: Player Controls & Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '560px', overflowY: 'auto', paddingRight: '4px' }}>
          
          <div className="glass-card mini-player" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div 
              style={{ 
                width: '100%', 
                height: currentTrack?.source === 'youtube' ? '140px' : '0px', 
                position: 'relative',
                overflow: 'hidden', 
                borderRadius: '12px', 
                border: currentTrack?.source === 'youtube' ? '1px solid var(--border-light)' : 'none', 
                display: currentTrack?.source === 'youtube' ? 'block' : 'none',
                background: '#000'
              }}
            >
              <div id="yt-player"></div>
              {isBuffering && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(13, 13, 20, 0.85)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  zIndex: 10,
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    borderTop: '2px solid var(--accent-purple)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
                  <span>Buffering YouTube Video...</span>
                </div>
              )}
            </div>

            <div className="track-info-row">
              {currentTrack?.source !== 'youtube' && (
                <img src={currentTrack?.thumbnail} className="player-art" alt="" onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop';
                }} />
              )}
              <div className="player-details">
                <div className="player-title">{currentTrack?.title || 'No song playing'}</div>
                <div className="player-artist">{currentTrack?.artist || 'Unknown Artist'}</div>
              </div>
            </div>

            {/* Timeline with A-B Loop highlight overlay */}
            <div className="time-container">
              <div className="progress-track" onClick={handleScrub} style={{ position: 'relative' }}>
                {loopEnabled && duration > 0 && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      height: '100%',
                      left: `${(loopStart / duration) * 100}%`,
                      width: `${((loopEnd - loopStart) / duration) * 100}%`,
                      background: 'rgba(168, 85, 247, 0.3)',
                      borderLeft: '1px solid var(--accent-purple)',
                      borderRight: '1px solid var(--accent-purple)',
                      pointerEvents: 'none',
                      borderRadius: '2px'
                    }}
                  />
                )}
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

          {/* Action buttons (Clear and Export) — Placed directly below the player so they are never buried */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-danger" style={{ flex: 1, padding: '10px 14px' }} onClick={() => { playUiSound('modal'); handleResetAll(); }}>
              <Trash2 size={14} /> Clear Timings
            </button>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '10px 14px', background: 'var(--accent-gradient)', boxShadow: '0 4px 15px var(--accent-glow)' }} 
              onClick={() => { playUiSound('modal'); onNextTab(); }}
              disabled={syncData.length === 0 || !syncData.some(line => line.time !== null)}
            >
              Export Lyrics
            </button>
          </div>

          {/* Section Looper (A-B): Only rendered in Re-sync workspace mode */}
          {workspaceTab === 'resync' && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
              <div className="flex-between">
                <h4 style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--accent-purple)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Repeat size={14} /> Section Looper (A-B)
                </h4>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={loopEnabled} 
                    onChange={(e) => setLoopEnabled(e.target.checked)} 
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {selectedIndices.length > 0 && (
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '6px', fontSize: '11px', width: '100%', background: 'var(--accent-gradient)' }}
                  onClick={handleStartReSync}
                >
                  Re-sync Selected Section
                </button>
              )}

              <div className="grid-2" style={{ gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-sub)', display: 'block', marginBottom: '4px' }}>Start Point (A)</span>
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', padding: '6px', fontSize: '11px' }}
                    onClick={() => setLoopStart(getPlayerTime())}
                  >
                    Set: {formatTime(loopStart).split('.')[0]}
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: '9px' }} onClick={() => setLoopStart(s => Math.max(0, s - 0.5))}>-0.5s</button>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: '9px' }} onClick={() => setLoopStart(s => Math.min(duration, s + 0.5))}>+0.5s</button>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-sub)', display: 'block', marginBottom: '4px' }}>End Point (B)</span>
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', padding: '6px', fontSize: '11px' }}
                    onClick={() => setLoopEnd(getPlayerTime())}
                  >
                    Set: {formatTime(loopEnd).split('.')[0]}
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: '9px' }} onClick={() => setLoopEnd(e => Math.max(loopStart, e - 0.5))}>-0.5s</button>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: '9px' }} onClick={() => setLoopEnd(e => Math.min(duration, e + 0.5))}>+0.5s</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Combined Settings Panel (Options vs Keyboard Shortcuts Pill Switcher) */}
          <div className="glass-card" ref={syncOptionsRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Pill Switcher in Header */}
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: '20px', overflow: 'hidden', padding: '2px', background: 'rgba(0,0,0,0.2)' }}>
                <button 
                  className={`btn ${settingsTab === 'options' ? 'active-pill' : ''}`}
                  onClick={() => { playUiSound('click'); setSettingsTab('options'); }}
                  style={{
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '11px',
                    background: settingsTab === 'options' ? 'var(--accent-gradient)' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    boxShadow: settingsTab === 'options' ? '0 2px 8px var(--accent-glow)' : 'none'
                  }}
                >
                  Sync Options
                </button>
                <button 
                  className={`btn ${settingsTab === 'shortcuts' ? 'active-pill' : ''}`}
                  onClick={() => { playUiSound('click'); setSettingsTab('shortcuts'); }}
                  style={{
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '11px',
                    background: settingsTab === 'shortcuts' ? 'var(--accent-gradient)' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    boxShadow: settingsTab === 'shortcuts' ? '0 2px 8px var(--accent-glow)' : 'none'
                  }}
                >
                  Hotkeys Guide
                </button>
              </div>
            </div>

            {/* Conditionally render forms inside card */}
            {settingsTab === 'options' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* 1. Latency Offset with Reset Button */}
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latency Offset</label>
                      <button 
                        type="button"
                        onClick={() => setLatencyOffset(100)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '9px',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        Reset
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A' }}>{-latencyOffset}ms</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="500" 
                    step="10" 
                    value={latencyOffset}
                    onChange={(e) => setLatencyOffset(parseInt(e.target.value))}
                    style={{ width: '100%', height: '4px', accentColor: '#116466', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', overflowX: 'auto' }}>
                    {[0, 100, 150, 200, 250].map((val) => (
                      <button 
                        key={val}
                        type="button" 
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '3px', fontSize: '9px', fontWeight: '600', background: latencyOffset === val ? 'var(--accent-gradient)' : 'rgba(0,0,0,0.2)' }}
                        onClick={() => setLatencyOffset(val)}
                      >
                        {val === 0 ? '0ms' : `-${val}ms`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Playback Speed with Reset Button & Presets Bar */}
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Playback Speed</label>
                      <button 
                        type="button"
                        onClick={() => changeSpeed(1.0)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '9px',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        Reset
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A' }}>{playbackSpeed}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.4" 
                    max="1.0" 
                    step="0.05" 
                    value={playbackSpeed}
                    onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                    style={{ width: '100%', height: '4px', accentColor: '#116466', cursor: 'pointer' }}
                  />
                  {/* Speed Presets Bar */}
                  <div style={{ display: 'flex', gap: '3px', marginTop: '6px', overflowX: 'auto' }}>
                    {[1.0, 0.85, 0.80, 0.75, 0.70, 0.50, 0.45].map((spd) => (
                      <button 
                        key={spd}
                        type="button" 
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '3px 2px', fontSize: '9px', fontWeight: '700', whiteSpace: 'nowrap', background: playbackSpeed === spd ? 'var(--accent-gradient)' : 'rgba(0,0,0,0.2)' }}
                        onClick={() => changeSpeed(spd)}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Lyrics Font Size with Reset Button */}
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lyrics Font Size</label>
                      <button 
                        type="button"
                        onClick={() => setLyricsFontSize(window.innerWidth <= 768 ? 22 : 28)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '9px',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        Reset
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A' }}>{lyricsFontSize}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="14" 
                    max="48" 
                    step="1" 
                    value={lyricsFontSize}
                    onChange={(e) => setLyricsFontSize(parseInt(e.target.value))}
                    style={{ width: '100%', height: '4px', accentColor: '#116466', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', overflowX: 'auto' }}>
                    {[18, 22, 28, 34, 40].map((sz) => (
                      <button 
                        key={sz}
                        type="button" 
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '3px', fontSize: '9px', fontWeight: '600', background: lyricsFontSize === sz ? 'var(--accent-gradient)' : 'rgba(0,0,0,0.2)' }}
                        onClick={() => setLyricsFontSize(sz)}
                      >
                        {sz}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Sync Method */}
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>Sync Method</label>
                  <div style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                    <button 
                      className="btn" 
                      onClick={() => { setSyncMode('line'); setActiveWordIndex(0); }}
                      style={{ 
                        flex: 1, 
                        borderRadius: 0,
                        padding: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: syncMode === 'line' ? 'var(--accent-gradient)' : 'transparent',
                        color: '#fff'
                      }}
                    >
                      Line-by-Line
                    </button>
                    <button 
                      className="btn" 
                      onClick={() => { setSyncMode('word'); }}
                      style={{ 
                        flex: 1, 
                        borderRadius: 0,
                        padding: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: syncMode === 'word' ? 'var(--accent-gradient)' : 'transparent',
                        color: '#fff'
                      }}
                    >
                      Word-by-Word
                    </button>
                  </div>
                </div>

                {/* 4. Lyrics Font Size with Reset Button */}
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lyrics Font Size</label>
                      <button 
                        type="button"
                        onClick={() => setLyricsFontSize(28)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '9px',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        Reset
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A' }}>{lyricsFontSize}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="12" 
                    max="64" 
                    step="1" 
                    value={lyricsFontSize}
                    onChange={(e) => setLyricsFontSize(parseInt(e.target.value))}
                    style={{ width: '100%', height: '4px', accentColor: '#116466', cursor: 'pointer' }}
                  />
                </div>

                {/* 5. Custom Presets Profile Manager (Save & Load) */}
                <div style={{ padding: '10px 12px', background: 'rgba(17, 100, 102, 0.15)', border: '1px solid rgba(209, 232, 226, 0.2)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bookmark size={13} /> Saved Sync Preset Profiles
                  </span>
                  
                  {/* Built-in Presets */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => handleLoadPreset({ latencyOffset: 100, playbackSpeed: 1.0, lyricsFontSize: 28, syncMode: 'word' })}
                      style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '700', borderRadius: '12px' }}
                    >
                      ⚡ Standard (1.0x / -100ms)
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => handleLoadPreset({ latencyOffset: 100, playbackSpeed: 0.75, lyricsFontSize: 32, syncMode: 'word' })}
                      style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '700', borderRadius: '12px' }}
                    >
                      🐢 Precision (0.75x / -100ms)
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => handleLoadPreset({ latencyOffset: 0, playbackSpeed: 0.50, lyricsFontSize: 34, syncMode: 'word' })}
                      style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '700', borderRadius: '12px' }}
                    >
                      🐌 Ultra Slow (0.50x / 0ms)
                    </button>

                    {presetProfiles.map((p) => (
                      <div 
                        key={p.id}
                        onClick={() => handleLoadPreset(p)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          fontSize: '9px',
                          fontWeight: '700',
                          background: 'rgba(255, 203, 154, 0.15)',
                          border: '1px solid rgba(255, 203, 154, 0.4)',
                          borderRadius: '12px',
                          color: '#FFCB9A',
                          cursor: 'pointer'
                        }}
                      >
                        <span>💾 {p.name}</span>
                        <X 
                          size={10} 
                          onClick={(e) => handleDeletePreset(p.id, e)} 
                          style={{ cursor: 'pointer', opacity: 0.7 }} 
                        />
                      </div>
                    ))}
                  </div>

                  {/* Save current settings form */}
                  <form onSubmit={handleSavePreset} style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <input 
                      type="text" 
                      placeholder="Name your current preset..." 
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '6px', flexGrow: 1 }}
                    />
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      style={{ padding: '4px 10px', fontSize: '10px', fontWeight: '700', background: 'var(--accent-gradient)', border: 'none', whiteSpace: 'nowrap' }}
                      disabled={!newPresetName.trim()}
                    >
                      <Save size={11} style={{ marginRight: '2px' }} /> Save
                    </button>
                  </form>
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10px' }}>
                <div className="flex-between">
                  <span style={{ color: 'var(--text-sub)' }}>Record Sync Time</span>
                  <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>S / Enter</span>
                </div>
                <div className="flex-between">
                  <span style={{ color: 'var(--text-sub)' }}>Start Music Break</span>
                  <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>M</span>
                </div>
                <div className="flex-between">
                  <span style={{ color: 'var(--text-sub)' }}>Mark End of Song / Break</span>
                  <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>E</span>
                </div>
                <div className="flex-between">
                  <span style={{ color: 'var(--text-sub)' }}>Play / Pause</span>
                  <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>Space</span>
                </div>
                <div className="flex-between">
                  <span style={{ color: 'var(--text-sub)' }}>Undo stamp & pause</span>
                  <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>Z / Backspace</span>
                </div>
                <div className="flex-between">
                  <span style={{ color: 'var(--text-sub)' }}>Set Loop bounds</span>
                  <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>A / B</span>
                </div>
                <div className="flex-between">
                  <span style={{ color: 'var(--text-sub)' }}>Lock / Unlock Loop</span>
                  <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>L</span>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Interactive Tour Welcome Modal */}
      {showTutorial && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(44, 53, 49, 0.75)',
          backdropFilter: 'blur(10px) saturate(140%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div className="glass-card" style={{
            width: '94%',
            maxWidth: '480px',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '20px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(17, 100, 102, 0.2)',
            border: '1px solid rgba(209, 232, 226, 0.22)',
            borderRadius: '16px',
            background: 'linear-gradient(180deg, rgba(44, 53, 49, 0.96) 0%, rgba(28, 35, 33, 0.98) 100%)'
          }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                🎵 Quick Keyboard & Latency Guide
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-sub)', lineHeight: '1.5' }}>
                Lsync is designed to be fully keyboard-driven so you can sync lyrics smoothly without breaking focus.
              </p>
            </div>

            {/* Reaction Time & Latency Offset Explanation & Initial Setup Card */}
            <div style={{ padding: '12px 14px', background: 'rgba(255, 203, 154, 0.08)', border: '1px solid rgba(255, 203, 154, 0.3)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 What is the Latency Offset slider for?
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.5' }}>
                Feel the synced words are a bit behind or a bit early? Adjust the <strong>Latency Offset</strong> slider according to your hearing-to-tapping reaction ratio to sync words perfectly! Or simply set the latency slider to <code>0ms</code> and slow down the playback speed to sync properly.
              </span>

              {/* Initial Setup Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', paddingTop: '8px', borderTop: '1px dashed rgba(255, 203, 154, 0.3)' }}>
                <div className="flex-between">
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#FFCB9A' }}>Select Starting Latency Offset:</span>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff' }}>{-latencyOffset}ms</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0, 100, 150, 200, 250].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setLatencyOffset(val)}
                      style={{ flex: 1, padding: '4px', fontSize: '9px', fontWeight: '700', background: latencyOffset === val ? 'var(--accent-gradient)' : 'rgba(0,0,0,0.3)', color: '#fff', border: latencyOffset === val ? 'none' : '1px solid var(--border-light)' }}
                    >
                      {val === 0 ? '0ms' : `-${val}ms`}
                    </button>
                  ))}
                </div>

                <div className="flex-between" style={{ marginTop: '2px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#FFCB9A' }}>Select Starting Playback Speed:</span>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff' }}>{playbackSpeed}x</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0.5, 0.75, 1.0].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPlaybackSpeed(spd)}
                      style={{ flex: 1, padding: '4px', fontSize: '9px', fontWeight: '700', background: playbackSpeed === spd ? 'var(--accent-gradient)' : 'rgba(0,0,0,0.3)', color: '#fff', border: playbackSpeed === spd ? 'none' : '1px solid var(--border-light)' }}
                    >
                      {spd}x Speed
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(17, 100, 102, 0.15)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(209, 232, 226, 0.1)' }}>
              <div className="flex-between" style={{ fontSize: '11px' }}>
                <span style={{ color: 'var(--text-sub)' }}>Record Sync Time</span>
                <span style={{ fontFamily: 'monospace', background: 'var(--accent-gradient)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', boxShadow: '0 2px 8px var(--accent-glow)' }}>S / Enter</span>
              </div>
              <div className="flex-between" style={{ fontSize: '11px' }}>
                <span style={{ color: 'var(--text-sub)' }}>Start Music Break</span>
                <span style={{ fontFamily: 'monospace', background: 'rgba(209, 232, 226, 0.08)', border: '1px solid var(--border-light)', padding: '2px 8px', borderRadius: '4px', color: '#fff', fontWeight: '600' }}>M</span>
              </div>
              <div className="flex-between" style={{ fontSize: '11px' }}>
                <span style={{ color: 'var(--text-sub)' }}>Mark End of Song / Break</span>
                <span style={{ fontFamily: 'monospace', background: 'rgba(209, 232, 226, 0.08)', border: '1px solid var(--border-light)', padding: '2px 8px', borderRadius: '4px', color: '#fff', fontWeight: '600' }}>E</span>
              </div>
              <div className="flex-between" style={{ fontSize: '11px' }}>
                <span style={{ color: 'var(--text-sub)' }}>Play / Pause</span>
                <span style={{ fontFamily: 'monospace', background: 'rgba(209, 232, 226, 0.08)', border: '1px solid var(--border-light)', padding: '2px 8px', borderRadius: '4px', color: '#fff', fontWeight: '600' }}>Space</span>
              </div>
              <div className="flex-between" style={{ fontSize: '11px' }}>
                <span style={{ color: 'var(--text-sub)' }}>Undo stamp & pause</span>
                <span style={{ fontFamily: 'monospace', background: 'rgba(209, 232, 226, 0.08)', border: '1px solid var(--border-light)', padding: '2px 8px', borderRadius: '4px', color: '#fff', fontWeight: '600' }}>Z / Backspace</span>
              </div>
              <div className="flex-between" style={{ fontSize: '11px' }}>
                <span style={{ color: 'var(--text-sub)' }}>Set Loop bounds (A / B)</span>
                <span style={{ fontFamily: 'monospace', background: 'rgba(209, 232, 226, 0.08)', border: '1px solid var(--border-light)', padding: '2px 8px', borderRadius: '4px', color: '#fff', fontWeight: '600' }}>A / B</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', marginTop: '4px', display: 'flex', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '10px', fontSize: '13px', background: 'var(--accent-gradient)', fontWeight: '800', borderRadius: '12px', boxShadow: '0 4px 15px var(--accent-glow)' }}
                onClick={() => {
                  playUiSound('modal');
                  sessionStorage.setItem('lsync_session_tutorial_dismissed', 'true');
                  setShowTutorial(false);
                }}
              >
                Okay, let's sync!
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseWord {
          from { box-shadow: 0 0 2px var(--accent-glow); }
          to { box-shadow: 0 0 12px var(--accent-purple); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1.0); }
        }
        .sync-line-card.selected {
          box-shadow: inset 0 0 0 1px rgba(168, 85, 247, 0.4);
        }
      `}</style>
    </div>
  );
}
