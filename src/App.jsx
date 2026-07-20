import React, { useState, useEffect, useRef } from 'react';
import TabSearch from './components/TabSearch';
import TabSync from './components/TabSync';
import TabDemo from './components/TabDemo';
import TabExport from './components/TabExport';
import TabSettings from './components/TabSettings';
import BackgroundController from './components/BackgroundController';
import { Search, Sliders, Download, Play, Settings } from 'lucide-react';
import { playUiSound, getUiVolume, setUiVolume } from './utils/soundEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'sync', 'demo', 'export', 'settings'
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentLyrics, setCurrentLyrics] = useState('');
  const [syncData, setSyncData] = useState([]);
  const [syncMode, setSyncMode] = useState('word'); // 'word' or 'line'

  // Sound Volume State
  const [uiVolume, setUiVolumeState] = useState(() => getUiVolume());

  const handleVolumeChange = (newVol) => {
    setUiVolumeState(newVol);
    setUiVolume(newVol);
  };

  // Hoisted Settings States (accessible globally)
  const [uiScale, setUiScale] = useState(() => {
    return parseFloat(localStorage.getItem('lsync_ui_scale') || '1.0');
  });

  const [globalFontSize, setGlobalFontSize] = useState(() => {
    return parseInt(localStorage.getItem('lsync_global_font_size') || '14');
  });

  const [lyricsFontSize, setLyricsFontSize] = useState(() => {
    return parseInt(localStorage.getItem('lsync_lyrics_font_size') || '28');
  });

  const [bgTheme, setBgTheme] = useState(() => {
    return localStorage.getItem('lsync_bg_theme') || 'wave';
  });

  const handleThemeChange = (newTheme) => {
    setBgTheme(newTheme);
    localStorage.setItem('lsync_bg_theme', newTheme);
  };

  // Sync settings parameters to local storage & root document variables
  useEffect(() => {
    localStorage.setItem('lsync_ui_scale', uiScale.toString());
    document.documentElement.style.setProperty('--ui-scale', uiScale.toString());
  }, [uiScale]);

  useEffect(() => {
    localStorage.setItem('lsync_global_font_size', globalFontSize.toString());
    document.documentElement.style.setProperty('--ui-font-size', `${globalFontSize}px`);
  }, [globalFontSize]);

  useEffect(() => {
    localStorage.setItem('lsync_lyrics_font_size', lyricsFontSize.toString());
  }, [lyricsFontSize]);

  // State to hold seek position when jumping from Demo mode back to Edit mode
  const [initialSeekTime, setInitialSeekTime] = useState(null);

  // Demo preview override (used by Retimer & Time Shift mode)
  const [demoSyncDataOverride, setDemoSyncDataOverride] = useState(null);

  // Initial sub-tab target for TabSync ('sync' vs 'retimer')
  const [initialSyncWorkspaceTab, setInitialSyncWorkspaceTab] = useState('sync');

  // Global bypass warning state (warns ONLY once when accessing missing assets)
  const [hasWarned, setHasWarned] = useState(false);

  // Ref tracking for floating dock sliding indicator
  const navContainerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, height: 0, top: 0 });

  // Update floating dock background slider position when tab changes
  useEffect(() => {
    const updateIndicator = () => {
      const activeBtn = navContainerRef.current?.querySelector(`.tab-btn[data-target="${activeTab}"]`);
      if (activeBtn) {
        const containerRect = navContainerRef.current.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        
        setIndicatorStyle({
          left: `${btnRect.left - containerRect.left}px`,
          width: `${btnRect.width}px`,
          height: `${btnRect.height}px`,
          top: `${btnRect.top - containerRect.top}px`
        });
      }
    };
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTab]);

  const handleResetWorkspace = () => {
    if (window.confirm("Are you sure you want to reset all workspace data?")) {
      setCurrentTrack(null);
      setCurrentLyrics('');
      setSyncData([]);
      setActiveTab('search');
      setInitialSeekTime(null);
      setDemoSyncDataOverride(null);
      setInitialSyncWorkspaceTab('sync');
      setHasWarned(false);
    }
  };

  return (
    <div className="app-container-wrapper" style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
      
      {/* Dynamic Animated Canvas Background */}
      <BackgroundController theme={bgTheme} />

      <div className="app-container">
        
        {/* Top Header */}
        <header className="app-header flex-between">
          <div className="logo-container">
            <h1 className="logo-text">Lsync</h1>
            <span className="badge">BETA</span>
          </div>

          <div className="header-status">
            {currentTrack ? (
              <span className="status-track">
                🎵 {currentTrack.title}
              </span>
            ) : (
              <span className="status-idle">Load a track to start syncing</span>
            )}
          </div>
        </header>

        {/* Tab paned view */}
        <main className="app-content">
          
          {/* Tab 1: Loader and Search */}
          {activeTab === 'search' && (
            <TabSearch
              currentTrack={currentTrack}
              onSelectTrack={setCurrentTrack}
              currentLyrics={currentLyrics}
              onSelectLyrics={setCurrentLyrics}
              syncData={syncData}
              setSyncData={setSyncData}
              syncMode={syncMode}
              onNextTab={() => {
                setInitialSyncWorkspaceTab('sync');
                setActiveTab('sync');
              }}
              onProceedToRetimer={() => {
                setInitialSyncWorkspaceTab('retimer');
                setActiveTab('sync');
              }}
            />
          )}

          {/* Tab 2: Syncher */}
          {activeTab === 'sync' && (
            <TabSync
              key={initialSyncWorkspaceTab}
              currentTrack={currentTrack}
              currentLyrics={currentLyrics}
              syncData={syncData}
              setSyncData={setSyncData}
              syncMode={syncMode}
              setSyncMode={setSyncMode}
              lyricsFontSize={lyricsFontSize}
              setLyricsFontSize={setLyricsFontSize}
              initialSeekTime={initialSeekTime}
              onClearInitialSeekTime={() => setInitialSeekTime(null)}
              onBackTab={() => setActiveTab('search')}
              onNextTab={() => setActiveTab('demo')}
              onSetDemoOverride={setDemoSyncDataOverride}
              initialWorkspaceTab={initialSyncWorkspaceTab}
            />
          )}

          {/* Tab 3: Demo (Lyrics Player) */}
          {activeTab === 'demo' && (
            <TabDemo
              currentTrack={currentTrack}
              syncData={demoSyncDataOverride || syncData}
              syncMode={syncMode}
              onSelectTrack={setCurrentTrack}
              onBackToEdit={(seekTime) => {
                setInitialSeekTime(seekTime);
                setActiveTab('sync');
              }}
            />
          )}

          {/* Tab 4: Exporter */}
          {activeTab === 'export' && (
            <TabExport
              currentTrack={currentTrack}
              syncData={syncData}
              syncMode={syncMode}
              onResetAll={handleResetWorkspace}
            />
          )}

          {/* Tab 5: Personalization Themes */}
          {activeTab === 'settings' && (
            <TabSettings
              bgTheme={bgTheme}
              onChangeBgTheme={handleThemeChange}
              uiScale={uiScale}
              onChangeUiScale={setUiScale}
              globalFontSize={globalFontSize}
              onChangeGlobalFontSize={setGlobalFontSize}
              lyricsFontSize={lyricsFontSize}
              onChangeLyricsFontSize={setLyricsFontSize}
              uiVolume={uiVolume}
              onChangeUiVolume={handleVolumeChange}
            />
          )}

        </main>

        {/* Bottom Floating Dock Navigation */}
        <div className="floating-dock" ref={navContainerRef}>
          <div 
            className="nav-indicator" 
            style={{
              position: 'absolute',
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              height: indicatorStyle.height,
              top: indicatorStyle.top,
              borderRadius: '20px',
              background: 'var(--accent-gradient)',
              boxShadow: '0 2px 10px var(--accent-glow)',
              zIndex: 1,
              transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
              pointerEvents: 'none'
            }}
          ></div>

          <button 
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`} 
            data-target="search"
            onClick={() => { playUiSound('dock'); setActiveTab('search'); }}
          >
            <Search size={13} /> Search
          </button>

          <button 
            className={`tab-btn ${activeTab === 'sync' ? 'active' : ''}`} 
            data-target="sync"
            onClick={() => {
              playUiSound('dock');
              if (!currentTrack || !currentLyrics) {
                if (!hasWarned) {
                  alert("Notice: You haven't loaded an audio track and lyrics yet! The timeline workspace will be empty. Click again to proceed anyway.");
                  setHasWarned(true);
                  return;
                }
              }
              setActiveTab('sync');
            }}
          >
            <Sliders size={13} /> Sync
          </button>

          <button 
            className={`tab-btn ${activeTab === 'demo' ? 'active' : ''}`} 
            data-target="demo"
            onClick={() => {
              playUiSound('dock');
              const hasSync = syncData.length > 0 && syncData.some(line => line.time !== null);
              if (!hasSync) {
                if (!hasWarned) {
                  alert("Notice: You haven't synchronized any lyrics yet! The scrolling canvas will be empty. Click again to proceed anyway.");
                  setHasWarned(true);
                  return;
                }
              }
              setActiveTab('demo');
            }}
          >
            <Play size={13} /> Demo
          </button>

          <button 
            className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`} 
            data-target="export"
            onClick={() => {
              playUiSound('dock');
              const hasSync = syncData.length > 0 && syncData.some(line => line.time !== null);
              if (!hasSync) {
                if (!hasWarned) {
                  alert("Notice: You haven't synchronized any lyrics yet! The exported LRC will be blank. Click again to proceed anyway.");
                  setHasWarned(true);
                  return;
                }
              }
              setActiveTab('export');
            }}
          >
            <Download size={13} /> Export
          </button>

          <button 
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} 
            data-target="settings"
            onClick={() => { playUiSound('dock'); setActiveTab('settings'); }}
          >
            <Settings size={13} /> Theme
          </button>
        </div>
      </div>
    </div>
  );
}
