import React, { useState, useEffect } from 'react';
import { Copy, Download, FileText, CheckCircle, ListRestart, Globe, ExternalLink } from 'lucide-react';
import { formatSyncDataToLrc } from '../utils/lrcParser';
import { playUiSound } from '../utils/soundEngine';

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
    playUiSound('modal');
    const track = currentTrack?.title || '';
    const artist = currentTrack?.artist || '';
    const url = `https://lrclib.net/publish?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}`;
    window.open(url, '_blank');
  };

  // Helper to generate content string for specific mode and format
  const getContentForMode = (granularity, format) => {
    if (!syncData || syncData.length === 0) return '';

    if (format === 'lrc') {
      return formatSyncDataToLrc(syncData, currentTrack, {
        includeMetadata: includeMetadata,
        syncMode: granularity
      });
    } else if (format === 'json') {
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
    } else if (format === 'txt') {
      let txtHeader = (includeMetadata && currentTrack) ? `Title: ${currentTrack.title}\nArtist: ${currentTrack.artist}\n-----------------------------------\n\n` : '';
      return txtHeader + syncData.map(line => line.text).join('\n');
    } else if (format === 'doc') {
      let docHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${currentTrack?.title || 'Lyrics'}</title><style>body{font-family:Arial,sans-serif;margin:40px;line-height:1.6;}h1{color:#116466;margin-bottom:4px;}h3{color:#666;margin-top:0;}p{font-size:14px;margin:6px 0;}</style></head><body>`;
      if (includeMetadata && currentTrack) {
        docHtml += `<h1>${currentTrack.title}</h1><h3>Artist: ${currentTrack.artist}</h3><hr style="border:none;border-top:1px solid #ccc;margin:16px 0;"/>`;
      }
      docHtml += syncData.map(line => `<p>${line.text || '&nbsp;'}</p>`).join('');
      docHtml += `</body></html>`;
      return docHtml;
    }
    return '';
  };

  // Update exportText when format or granularity changes
  useEffect(() => {
    setExportText(getContentForMode(selectedGranularity, exportFormat));
  }, [syncData, selectedGranularity, exportFormat, includeMetadata, currentTrack]);

  // Copy current code
  const handleCopyCurrent = () => {
    playUiSound('modal');
    navigator.clipboard.writeText(exportText).then(() => {
      setCopiedLbl(true);
      setTimeout(() => setCopiedLbl(false), 2000);
    });
  };

  // Download current file
  const handleDownloadCurrent = () => {
    playUiSound('modal');
    const ext = exportFormat === 'lrc' ? 'lrc' : exportFormat === 'json' ? 'json' : exportFormat === 'txt' ? 'txt' : 'doc';
    const mime = exportFormat === 'doc' ? 'application/msword;charset=utf-8' : 'text/plain;charset=utf-8';
    const cleanTitle = (currentTrack?.title || 'synced-lyrics').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const suffix = (exportFormat === 'lrc' || exportFormat === 'json') ? (selectedGranularity === 'word' ? '-wbw' : '-lbl') : '';
    const filename = `${cleanTitle}${suffix}.${ext}`;
    
    const blob = new Blob([exportText], { type: mime });
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
          <div className="flex-between" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
              <FileText size={18} style={{ color: 'var(--accent-purple)' }} /> Generated Export Code
            </h3>
            
            {/* Format Selector Pills */}
            <div style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: '20px', overflow: 'hidden', padding: '2px', background: 'rgba(0,0,0,0.2)' }}>
              {['lrc', 'json', 'txt', 'doc'].map((fmt) => (
                <button 
                  key={fmt}
                  className="btn" 
                  onClick={() => { playUiSound('click'); setExportFormat(fmt); }}
                  style={{ 
                    borderRadius: '16px',
                    padding: '3px 10px',
                    fontSize: '10px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    background: exportFormat === fmt ? 'var(--accent-gradient)' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    boxShadow: exportFormat === fmt ? '0 2px 8px var(--accent-glow)' : 'none'
                  }}
                >
                  {fmt === 'doc' ? 'DOCS' : fmt}
                </button>
              ))}
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
              color: exportFormat === 'doc' ? '#D1E8E2' : 'var(--accent-purple)',
              borderColor: 'var(--border-light)',
              padding: '16px',
              resize: 'none'
            }}
            value={exportText}
          />

          {/* Unified Copy & Download Action Bar */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '11px', fontWeight: '700' }} onClick={handleCopyCurrent}>
              {copiedLbl ? (
                <>
                  <CheckCircle size={14} style={{ color: 'var(--green)', marginRight: '4px' }} />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy size={14} style={{ marginRight: '4px' }} />
                  <span>Copy {exportFormat.toUpperCase()} Code</span>
                </>
              )}
            </button>

            <button className="btn btn-primary" style={{ flex: 1, padding: '10px', fontSize: '11px', background: 'var(--accent-gradient)', fontWeight: '800' }} onClick={handleDownloadCurrent} disabled={!exportText}>
              <Download size={14} style={{ marginRight: '4px' }} />
              <span>Download .{exportFormat === 'doc' ? 'doc' : exportFormat} File</span>
            </button>
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
