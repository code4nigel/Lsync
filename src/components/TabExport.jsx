import React, { useState, useEffect } from 'react';
import { Copy, Download, FileText, CheckCircle, ListRestart, Globe, ExternalLink } from 'lucide-react';
import { formatSyncDataToLrc } from '../utils/lrcParser';

export default function TabExport({
  currentTrack,
  syncData,
  syncMode,
  onResetAll
}) {
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [exportFormat, setExportFormat] = useState('lrc'); // 'lrc' or 'json'
  const [selectedGranularity, setSelectedGranularity] = useState(syncMode || 'line');
  const [exportText, setExportText] = useState('');
  const [copiedLbl, setCopiedLbl] = useState(false);
  const [copiedWbw, setCopiedWbw] = useState(false);

  const hasWordTimestamps = syncData.some(line => line.words && line.words.some(w => w.time !== null && w.time !== -1));

  const handlePublishLrclib = () => {
    const track = currentTrack?.title || '';
    const artist = currentTrack?.artist || '';
    const url = `https://lrclib.net/publish?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}`;
    window.open(url, '_blank');
  };

  // Helper to generate content string for specific mode
  const getContentForMode = (granularity, format) => {
    if (!syncData || syncData.length === 0) return '';
    if (format === 'lrc') {
      return formatSyncDataToLrc(syncData, currentTrack, {
        includeMetadata: includeMetadata,
        syncMode: granularity
      });
    } else {
      const jsonStructure = {
        title: currentTrack?.title || 'Unknown Title',
        artist: currentTrack?.artist || 'Unknown Artist',
        syncMode: granularity,
        createdAt: new Date().toISOString(),
        lyrics: syncData.map(line => ({
          text: line.text,
          time: line.time,
          breakTime: line.breakTime,
          ...(granularity === 'word' && {
            words: line.words ? line.words.map(w => ({
              text: w.text,
              time: w.time
            })) : []
          })
        }))
      };
      return JSON.stringify(jsonStructure, null, 2);
    }
  };

  // Update exportText when format or granularity changes
  useEffect(() => {
    setExportText(getContentForMode(selectedGranularity, exportFormat));
  }, [syncData, selectedGranularity, exportFormat, includeMetadata, currentTrack]);

  // Copy specific mode
  const handleCopySpecific = (granularity) => {
    const text = getContentForMode(granularity, exportFormat);
    navigator.clipboard.writeText(text).then(() => {
      if (granularity === 'line') {
        setCopiedLbl(true);
        setTimeout(() => setCopiedLbl(false), 2000);
      } else {
        setCopiedWbw(true);
        setTimeout(() => setCopiedWbw(false), 2000);
      }
    });
  };

  // Download specific mode
  const handleDownloadSpecific = (granularity) => {
    const text = getContentForMode(granularity, exportFormat);
    const fileExtension = exportFormat === 'lrc' ? 'lrc' : 'json';
    const cleanTitle = (currentTrack?.title || 'synced-lyrics')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    const suffix = granularity === 'word' ? '-wbw' : '-lbl';
    const filename = `${cleanTitle}${suffix}.${fileExtension}`;
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tab-pane active" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        
        {/* Left Column: Preview Textbox */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '560px' }}>
          <div className="flex-between">
            <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
              <FileText size={18} style={{ color: 'var(--accent-purple)' }} /> Generated Sync Code
            </h3>
            
            {/* Format & Granularity Switcher Pills */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {exportFormat === 'lrc' && (
                <div style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                  <button 
                    className="btn" 
                    onClick={() => setSelectedGranularity('line')}
                    style={{ 
                      borderRadius: 0,
                      padding: '4px 8px',
                      fontSize: '10px',
                      fontWeight: '700',
                      background: selectedGranularity === 'line' ? 'var(--accent-gradient)' : 'transparent',
                      color: '#fff'
                    }}
                  >
                    Line-by-Line (LbL)
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => setSelectedGranularity('word')}
                    style={{ 
                      borderRadius: 0,
                      padding: '4px 8px',
                      fontSize: '10px',
                      fontWeight: '700',
                      background: selectedGranularity === 'word' ? 'var(--accent-gradient)' : 'transparent',
                      color: '#fff'
                    }}
                  >
                    Word-by-Word (WbW)
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden' }}>
                <button 
                  className="btn" 
                  onClick={() => setExportFormat('lrc')}
                  style={{ 
                    borderRadius: 0,
                    padding: '4px 10px',
                    fontSize: '10px',
                    background: exportFormat === 'lrc' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                    color: exportFormat === 'lrc' ? '#fff' : 'var(--text-sub)'
                  }}
                >
                  LRC
                </button>
                <button 
                  className="btn" 
                  onClick={() => setExportFormat('json')}
                  style={{ 
                    borderRadius: 0,
                    padding: '4px 10px',
                    fontSize: '10px',
                    background: exportFormat === 'json' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                    color: exportFormat === 'json' ? '#fff' : 'var(--text-sub)'
                  }}
                >
                  JSON
                </button>
              </div>
            </div>
          </div>

          {/* Code Render */}
          <textarea
            readOnly
            className="form-control"
            style={{
              flexGrow: 1,
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.6',
              background: '#040406',
              color: 'var(--accent-purple)',
              borderColor: 'var(--border-light)',
              padding: '16px',
              resize: 'none'
            }}
            value={exportText}
          />

          {/* Dual Copy & Download Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '11px' }} onClick={() => handleCopySpecific('line')}>
                {copiedLbl ? (
                  <>
                    <CheckCircle size={14} style={{ color: 'var(--green)' }} />
                    <span>Copied LbL!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy LbL (Line-by-Line)</span>
                  </>
                )}
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '8px', fontSize: '11px', border: '1px solid #FFCB9A', color: '#FFCB9A' }} 
                onClick={() => handleCopySpecific('word')}
              >
                {copiedWbw ? (
                  <>
                    <CheckCircle size={14} style={{ color: 'var(--green)' }} />
                    <span>Copied WbW!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy WbW (Word-by-Word)</span>
                  </>
                )}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '11px' }} onClick={() => handleDownloadSpecific('line')} disabled={!exportText}>
                <Download size={14} />
                <span>Download LbL (.lrc)</span>
              </button>

              <button className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '11px', background: 'var(--accent-gradient)' }} onClick={() => handleDownloadSpecific('word')} disabled={!exportText}>
                <Download size={14} />
                <span>Download WbW (.lrc)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Information & Export Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Options Panel */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--accent-purple)', letterSpacing: '0.05em' }}>
              Export Options
            </h4>

            {/* Export Granularity Mode */}
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                Export Granularity Mode
              </label>
              <div style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                <button 
                  className="btn" 
                  onClick={() => setSelectedGranularity('line')}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    fontSize: '11px', 
                    fontWeight: '700', 
                    background: selectedGranularity === 'line' ? 'var(--accent-gradient)' : 'transparent',
                    color: '#fff' 
                  }}
                >
                  Line-by-Line (LbL)
                </button>
                <button 
                  className="btn" 
                  onClick={() => setSelectedGranularity('word')}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    fontSize: '11px', 
                    fontWeight: '700', 
                    background: selectedGranularity === 'word' ? 'var(--accent-gradient)' : 'transparent',
                    color: '#fff' 
                  }}
                >
                  Word-by-Word (WbW)
                </button>
              </div>
            </div>

            {/* Include Metadata Toggle */}
            <div className="switch-row">
              <div>
                <span style={{ fontSize: '13px', fontWeight: '500', display: 'block' }}>Include Metadata</span>
                <span style={{ fontSize: '10px', color: 'var(--text-sub)' }}>Add artist, title tags to LRC headers</span>
              </div>
              <label className="switch-toggle">
                <input 
                  type="checkbox" 
                  checked={includeMetadata} 
                  onChange={(e) => setIncludeMetadata(e.target.checked)} 
                  disabled={exportFormat === 'json'}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          {/* Contribute & Publish Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: '#FFCB9A', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={16} /> Contribute Synced Lyrics
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-sub)', lineHeight: '1.4' }}>
              Share your newly synced LRC lyrics with the global community across platforms accepting community contributions:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* 1. LRCLIB */}
              <button 
                className="btn btn-primary" 
                style={{ padding: '8px 12px', fontSize: '11px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={handlePublishLrclib}
              >
                <span>Publish to LRCLIB Database</span>
                <ExternalLink size={14} />
              </button>

              {/* 2. Musixmatch Studio */}
              <a 
                href="https://curators.musixmatch.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary" 
                style={{ padding: '8px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: '#D1E8E2', border: '1px solid rgba(209, 232, 226, 0.2)' }}
              >
                <span>Musixmatch Curator Studio</span>
                <ExternalLink size={14} />
              </a>

              {/* 3. Genius Lyrics */}
              <a 
                href="https://genius.com/new" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary" 
                style={{ padding: '8px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: '#D1E8E2', border: '1px solid rgba(209, 232, 226, 0.2)' }}
              >
                <span>Genius Lyrics Community</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Guide / Compatability Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--accent-purple)', letterSpacing: '0.05em' }}>
              Compatibility Guide
            </h4>

            <div style={{ fontSize: '12px', color: 'var(--text-sub)', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.5' }}>
              <p>
                <strong>Standard LRC:</strong> Compatible with almost all local media players (Android Musicolet, Retro Music, Poweramp, Foobar2000). Runs on line-by-line highlight.
              </p>
              <p>
                <strong>Enhanced LRC (eLRC):</strong> Perfect for karaoke highlighting. Used extensively by <strong>Metrolist</strong> and custom media clients. Displays words glowing sync as song advances.
              </p>
              <p>
                <strong>JSON Output:</strong> Ideal for custom web applications or database imports.
              </p>
            </div>
          </div>

          {/* Restart Sync Option */}
          <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: '#f87171', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ListRestart size={14} /> Reset Engine
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-sub)', lineHeight: '1.4' }}>
              Finished exporting? You can clear all current tracks and lyric timings to start synchronization on a new track.
            </p>
            <button className="btn btn-danger" style={{ width: '100%' }} onClick={onResetAll}>
              Reset Workspace
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
