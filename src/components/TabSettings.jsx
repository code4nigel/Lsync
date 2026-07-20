import React from 'react';
import { Sliders, Check, Settings, Compass, Layout, ZoomIn, Type, Globe, Sparkles, Volume2, VolumeX } from 'lucide-react';
import devAvatar from '../../Images/developer.png';
import { playUiSound } from '../utils/soundEngine';

export default function TabSettings({ 
  bgTheme, 
  onChangeBgTheme, 
  uiScale, 
  onChangeUiScale,
  globalFontSize,
  onChangeGlobalFontSize,
  lyricsFontSize,
  onChangeLyricsFontSize,
  uiVolume = 0.5,
  onChangeUiVolume
}) {
  const themes = [
    {
      id: 'wave',
      name: 'Liquid Glass Wave',
      description: '60fps Canvas-based fluid wave ripples moving organically with glowing bubble flows.',
      icon: <Layout size={20} />
    },
    {
      id: 'matrix',
      name: 'Teal Matrix Rain',
      description: 'Futuristic code rain dropping down in custom teal (#116466) and mint (#D1E8E2) palette.',
      icon: <Compass size={20} />
    },
    {
      id: 'orbs',
      name: 'Glowing Color Orbs',
      description: 'Slow-drifting glassmorphic spheres blending gradients in space.',
      icon: <Sliders size={20} />
    }
  ];

  return (
    <div className="tab-pane active" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '120px' }}>
      
      {/* 2-Column Settings Layout */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        
        {/* Left Card: Animation selector */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} style={{ color: '#FFCB9A' }} /> Background Themes
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-sub)', lineHeight: '1.5' }}>
            Choose an animated background theme to make Lsync look dynamic.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            {themes.map(t => {
              const isActive = bgTheme === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => { playUiSound('modal'); onChangeBgTheme(t.id); }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(17, 100, 102, 0.15)' : 'rgba(255,255,255,0.01)',
                    border: isActive ? '1px solid var(--accent-blue)' : '1px solid var(--border-light)',
                    boxShadow: isActive ? '0 0 15px rgba(209, 232, 226, 0.15)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isActive ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0
                  }}>
                    {t.icon}
                  </div>

                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {t.name}
                      {isActive && (
                        <span style={{ fontSize: '8px', fontWeight: '700', color: '#FFCB9A', border: '1px solid rgba(255,203,154,0.3)', padding: '0 4px', borderRadius: '10px', background: 'rgba(255,203,154,0.05)' }}>ACTIVE</span>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-sub)', marginTop: '2px', lineHeight: '1.4', whiteSpace: 'normal' }}>
                      {t.description}
                    </div>
                  </div>

                  {isActive && (
                    <div style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Card: UI & Font Sizing */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ZoomIn size={18} style={{ color: '#FFCB9A' }} /> Accessibility & Sizing
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-sub)', lineHeight: '1.5' }}>
            Adjust the size of the buttons, cards, and text to match your preference.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
            
            {/* UI Sound Effects Volume Control Slider */}
            <div className="form-group" style={{ marginBottom: '0', padding: '12px', background: 'rgba(17, 100, 102, 0.12)', border: '1px solid rgba(209, 232, 226, 0.2)', borderRadius: '12px' }}>
              <div className="flex-between" style={{ marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {uiVolume > 0 ? <Volume2 size={14} style={{ color: '#FFCB9A' }} /> : <VolumeX size={14} style={{ color: '#ef4444' }} />} UI Sound Effects Volume
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A' }}>
                    {Math.round(uiVolume * 100)}%
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      if (onChangeUiVolume) onChangeUiVolume(uiVolume > 0 ? 0 : 0.5);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '9px',
                      color: uiVolume > 0 ? '#FFCB9A' : '#ef4444',
                      cursor: 'pointer'
                    }}
                  >
                    {uiVolume > 0 ? 'Mute' : 'Unmute'}
                  </button>
                </div>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="1.0" 
                step="0.05" 
                value={uiVolume}
                onChange={(e) => {
                  if (onChangeUiVolume) onChangeUiVolume(parseFloat(e.target.value));
                }}
                style={{ width: '100%', height: '4px', accentColor: '#116466', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '4px', fontSize: '9px', fontWeight: '700' }}
                  onClick={() => playUiSound('dock')}
                >
                  🔊 Test Dock Sound
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '4px', fontSize: '9px', fontWeight: '700' }}
                  onClick={() => playUiSound('click')}
                >
                  🔊 Test UI Click
                </button>
              </div>
            </div>

            {/* UI Scale Slider */}
            <div className="form-group" style={{ marginBottom: '0' }}>
              <div className="flex-between" style={{ marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ZoomIn size={12} style={{ color: 'var(--accent-blue)' }} /> Global UI Zoom Scale
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A' }}>
                    {Math.round(uiScale * 100)}%
                  </span>
                  <button 
                    onClick={() => onChangeUiScale(1.0)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontSize: '9px',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    Reset
                  </button>
                </div>
              </div>
              <input 
                type="range" 
                min="0.80" 
                max="1.20" 
                step="0.05" 
                value={uiScale}
                onChange={(e) => onChangeUiScale(parseFloat(e.target.value))}
                style={{ width: '100%', height: '4px', accentColor: '#116466', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '9px', color: 'var(--text-sub)', display: 'block', marginTop: '4px' }}>
                Scales layouts, tabs, buttons, and settings panels dynamically.
              </span>
            </div>

            {/* Global UI Font Size Slider */}
            <div className="form-group" style={{ marginBottom: '0' }}>
              <div className="flex-between" style={{ marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Type size={12} style={{ color: 'var(--accent-blue)' }} /> Global UI Font Size
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A' }}>
                    {globalFontSize}px
                  </span>
                  <button 
                    onClick={() => onChangeGlobalFontSize(14)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontSize: '9px',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    Reset
                  </button>
                </div>
              </div>
              <input 
                type="range" 
                min="12" 
                max="18" 
                step="1" 
                value={globalFontSize}
                onChange={(e) => onChangeGlobalFontSize(parseInt(e.target.value))}
                style={{ width: '100%', height: '4px', accentColor: '#116466', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '9px', color: 'var(--text-sub)', display: 'block', marginTop: '4px' }}>
                Changes typography sizes globally across all menus and labels.
              </span>
            </div>

            {/* Lyrics Font Size Slider */}
            <div className="form-group" style={{ marginBottom: '0' }}>
              <div className="flex-between" style={{ marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Type size={12} style={{ color: 'var(--accent-blue)' }} /> Workspace Lyrics Font Size
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A' }}>
                    {lyricsFontSize}px
                  </span>
                  <button 
                    onClick={() => onChangeLyricsFontSize(28)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontSize: '9px',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    Reset (28px)
                  </button>
                </div>
              </div>
              <input 
                type="range" 
                min="12" 
                max="64" 
                step="1" 
                value={lyricsFontSize}
                onChange={(e) => onChangeLyricsFontSize(parseInt(e.target.value))}
                style={{ width: '100%', height: '4px', accentColor: '#116466', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '9px', color: 'var(--text-sub)', display: 'block', marginTop: '4px' }}>
                Adjusts lyrics font size in both syncher and retimer views. Default: 28px.
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* New Section: Data & Lyrics Sources */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} style={{ color: '#FFCB9A' }} /> Connected Data Sources & Lyrics Providers
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-sub)', lineHeight: '1.5' }}>
          Lsync integrates with open web APIs and local media engines to fetch audio, metadata, and synced lyrics.
        </p>

        <div className="grid-2" style={{ gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          
          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFCB9A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🌐 LRCLIB Database
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-sub)', lineHeight: '1.4' }}>
              Open-source global repository hosting plain and line-by-line / word-by-word synced LRC lyrics.
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFCB9A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ▶️ YouTube / Invidious / Piped
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-sub)', lineHeight: '1.4' }}>
              Decentralized web streaming nodes providing real-time audio streams, video embeds, and song details.
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFCB9A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📁 Local Media Engine
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-sub)', lineHeight: '1.4' }}>
              High-fidelity local browser playback engine supporting <code>.mp3</code>, <code>.flac</code>, <code>.wav</code>, and <code>.m4a</code> audio files.
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFCB9A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📝 Enhanced LRC (eLRC) Engine
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-sub)', lineHeight: '1.4' }}>
              Native parser and builder for line timestamps <code>[mm:ss.xx]</code> and inline word timestamps <code>&lt;mm:ss.xx&gt;</code>.
            </div>
          </div>

        </div>
      </div>

      {/* Developer Profile Card */}
      <DeveloperProfileCard />

    </div>
  );
}

function DeveloperProfileCard() {
  const devFacts = [
    "Legend says Nigel wrote Lsync in a single sitting — it's now 3 AM in the morning and he is still going strong.",
    "Nigel's favorite music genre is 'whatever he likes at the moment'. It's hard to pick a favorite, but he is always down for some NEFFEX.",
    "Nigel is very hungry while working on Lsync; it's 3 AM and he skipped dinner to keep building, powered by pure dedication.",
    "Did you know? Nigel makes extensions and web apps that actually work."
  ];

  const [factIndex, setFactIndex] = React.useState(0);
  const [factAnimating, setFactAnimating] = React.useState(false);

  const handleFactClick = () => {
    playUiSound('click');
    setFactAnimating(true);

    setTimeout(() => {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * devFacts.length);
      } while (nextIndex === factIndex && devFacts.length > 1);
      
      setFactIndex(nextIndex);
      setFactAnimating(false);
    }, 200);
  };

  return (
    <div className="glass-card dev-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255, 203, 154, 0.25)', maxWidth: '520px', width: '100%', margin: '0 auto' }}>
      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={18} style={{ color: '#FFCB9A' }} /> Developer Profile
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Avatar with Floating Orbiting Emojis */}
        <div className="dev-avatar-wrapper">
          <div className="dev-avatar-container">
            <img src={devAvatar} alt="NigelWeb" className="dev-avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            <span className="emoji emoji-1">🎵</span>
            <span className="emoji emoji-2">🎶</span>
            <span className="emoji emoji-3">🎧</span>
            <span className="emoji emoji-4">🎸</span>
            <span className="emoji emoji-5">🎹</span>
          </div>
        </div>

        <div className="dev-identity" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexGrow: 1 }}>
          <span className="dev-name" style={{ fontSize: '16px', fontWeight: '700', color: '#fff', lineHeight: '1.2', display: 'block' }}>NigelWeb</span>
          <span className="dev-title" style={{ fontSize: '11px', color: 'var(--text-sub)', lineHeight: '1.3', display: 'block' }}>Lead Architect of Lsync & Scrobby</span>
          
          <a 
            href="https://github.com/code4nigel" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="dev-github-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '10px', color: '#FFCB9A', textDecoration: 'none', fontWeight: '600', width: 'fit-content' }}
          >
            <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            <span>github.com/code4nigel</span>
          </a>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border-light)', width: '100%' }}></div>

      {/* Interactive Facts Bubble */}
      <div 
        className="dev-interactive-facts"
        onClick={handleFactClick}
        style={{
          padding: '12px 14px',
          background: 'rgba(17, 100, 102, 0.12)',
          border: '1px dashed var(--border-light)',
          borderRadius: '12px',
          cursor: 'pointer',
          textAlign: 'center',
          userSelect: 'none',
          transition: 'all 0.2s ease'
        }}
      >
        <p style={{ fontSize: '11px', fontWeight: '700', color: '#FFCB9A', marginBottom: '4px' }}>
          💡 Click here for a Nigel Fact!
        </p>
        <p style={{
          fontSize: '12px',
          color: '#fff',
          lineHeight: '1.4',
          margin: 0,
          opacity: factAnimating ? 0 : 1,
          transform: factAnimating ? 'translateY(4px)' : 'translateY(0)',
          transition: 'all 0.2s ease'
        }}>
          {devFacts[factIndex]}
        </p>
      </div>

    </div>
  );
}
