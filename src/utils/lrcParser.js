/**
 * Utility to parse & format LRC / Enhanced LRC (word-by-word) content.
 */

export const formatLrcTime = (timeInSecs) => {
  if (timeInSecs === null || timeInSecs === undefined || timeInSecs === -1 || isNaN(timeInSecs)) return null;
  const mins = Math.floor(timeInSecs / 60);
  const secs = Math.floor(timeInSecs % 60);
  const ms = Math.floor((timeInSecs % 1) * 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
};

export const parseLrcText = (lrcString) => {
  if (!lrcString || typeof lrcString !== 'string') return [];

  const rawLines = lrcString.split('\n');
  const parsedLines = [];

  for (let rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Ignore metadata header tags like [ti:...], [ar:...], [re:...], [ve:...]
    if (/^\[(ti|ar|al|au|by|offset|re|ve):/i.test(trimmed)) {
      continue;
    }

    // Match line timestamp [mm:ss.xx]
    const lineMatch = trimmed.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    if (!lineMatch) {
      // Plain text line without timestamp
      const cleanText = trimmed;
      if (cleanText === '♪') {
        parsedLines.push({
          text: '♪',
          time: null,
          breakTime: null,
          words: []
        });
      } else {
        parsedLines.push({
          text: cleanText,
          time: null,
          breakTime: null,
          words: cleanText.split(/\s+/).filter(Boolean).map(w => ({ text: w, time: null }))
        });
      }
      continue;
    }

    // Extract line timestamp
    const mins = parseFloat(lineMatch[1]);
    const secs = parseFloat(lineMatch[2]);
    const lineTime = mins * 60 + secs;
    const body = lineMatch[3].trim();

    if (body === '♪') {
      parsedLines.push({
        text: '♪',
        time: lineTime,
        breakTime: lineTime,
        words: []
      });
      continue;
    }

    // Check for inline word timestamps <mm:ss.xx>
    const hasWordTags = /<(\d+):(\d+(?:\.\d+)?)>/.test(body);

    if (!hasWordTags) {
      // Standard line timestamp without word-by-word tags
      parsedLines.push({
        text: body,
        time: lineTime,
        breakTime: null,
        words: body.split(/\s+/).filter(Boolean).map(w => ({ text: w, time: null }))
      });
    } else {
      // Enhanced LRC line with word-level timestamps like "<00:12.92>मेने <00:13.43>छुपा"
      const wordList = [];
      const parts = body.split(/(<(?:\d+):(?:\d+(?:\.\d+)?>))/).filter(Boolean);
      let currentWordTime = null;
      let cleanTextParts = [];

      for (let part of parts) {
        const tagMatch = part.match(/^<(\d+):(\d+(?:\.\d+)?)>$/);
        if (tagMatch) {
          const m = parseFloat(tagMatch[1]);
          const s = parseFloat(tagMatch[2]);
          currentWordTime = m * 60 + s;
        } else {
          const wordsInPart = part.split(/\s+/).filter(Boolean);
          for (let wordStr of wordsInPart) {
            cleanTextParts.push(wordStr);
            wordList.push({
              text: wordStr,
              time: currentWordTime
            });
            currentWordTime = null;
          }
        }
      }

      parsedLines.push({
        text: cleanTextParts.join(' '),
        time: lineTime,
        breakTime: null,
        words: wordList.length > 0 ? wordList : body.split(/\s+/).filter(Boolean).map(w => ({ text: w, time: null }))
      });
    }
  }

  return parsedLines;
};

export const formatSyncDataToLrc = (syncData, currentTrack = null, options = { includeMetadata: true, syncMode: 'line' }) => {
  if (!syncData || syncData.length === 0) return '';

  let headers = [];
  if (options.includeMetadata && currentTrack) {
    if (currentTrack.title) headers.push(`[ti:${currentTrack.title}]`);
    if (currentTrack.artist) headers.push(`[ar:${currentTrack.artist}]`);
    headers.push(`[re:Lsync]`);
    headers.push(`[ve:1.0.0]`);
    headers.push(``);
  }

  let lrcLines = [];

  syncData.forEach(line => {
    // 1. Instrumental break line
    if (line.breakTime !== null && line.breakTime !== -1) {
      const formattedBreak = formatLrcTime(line.breakTime);
      if (formattedBreak) {
        lrcLines.push({
          time: line.breakTime,
          text: `[${formattedBreak}] ♪`
        });
      }
    }

    // 2. Lyric line
    if (line.time !== null && line.time !== -1) {
      const formattedTime = formatLrcTime(line.time);
      if (formattedTime) {
        if (line.text.trim() === '♪') {
          lrcLines.push({
            time: line.time,
            text: `[${formattedTime}] ♪`
          });
        } else {
          const hasWordTimestamps = line.words && line.words.some(w => w.time !== null && w.time !== -1);
          
          if (options.syncMode === 'word' || hasWordTimestamps) {
            const wordStr = line.words.map(w => {
              const wTimeFormatted = formatLrcTime(w.time);
              if (wTimeFormatted) {
                return `<${wTimeFormatted}>${w.text}`;
              }
              return w.text;
            }).join(' ');

            lrcLines.push({
              time: line.time,
              text: `[${formattedTime}] ${wordStr}`
            });
          } else {
            lrcLines.push({
              time: line.time,
              text: `[${formattedTime}] ${line.text}`
            });
          }
        }
      }
    }
  });

  // Sort chronologically by timestamp
  lrcLines.sort((a, b) => a.time - b.time);

  return [...headers, ...lrcLines.map(l => l.text)].join('\n');
};
