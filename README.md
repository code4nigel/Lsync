# 🎵 Lsync — Synchronized Lyrics Editor

> **Lsync** is a web application for creating, editing, retiming, and exporting line-by-line (`.lrc`) and word-by-word (`eLRC`) synchronized lyrics.

---

### 🌐 Live Web Access

Access Lsync directly in your browser:  
👉 **[https://code4nigel.github.io/Lsync/](https://code4nigel.github.io/Lsync/)**

---

### 🖥️ 📱 Interfaces (Desktop & Mobile)

Lsync provides optimized layouts for both **Desktop** and **Mobile** viewports.

#### 1. 🔍 Search & Import Lyrics
Search lyrics online via LRCLIB, import YouTube / YouTube Music links with automatic title & artist extraction, or clean LRC tags into plain text.

| Desktop View | Mobile View |
| :---: | :---: |
| ![Search Page Desktop](Images/Demonstartions/SS_search_page.png) | ![Search Page Mobile](Images/Demonstartions/ss_search_tab.jpg) |

---

#### 2. ⚡ Word & Line Synchronization
Sync lyrics with live audio playback, visualizers, latency compensation, and shortcut controls.

| Desktop View | Mobile View |
| :---: | :---: |
| ![Sync Tab Desktop](Images/Demonstartions/SS_sync.png) | ![Sync Tab Mobile](Images/Demonstartions/ss_sync_tab.jpg) |

---

#### 3. ⏱️ Retimer & Time Shift Tool
Shift timestamps forward or backward by custom milliseconds or seconds with live side-by-side testing.

| Retimer & Time Shift Tool |
| :---: |
| ![Retimer Tool Desktop](Images/Demonstartions/SS_reshink_timer.png) |

---

#### 4. 🎤 Demo Karaoke Player
Preview synced lyrics in real-time with smooth karaoke highlight animations.

| Desktop View | Mobile View |
| :---: | :---: |
| ![Demo Tab Desktop](Images/Demonstartions/SS_demo_page.png) | ![Demo Tab Mobile](Images/Demonstartions/ss_demo_tab.jpg) |

---

#### 5. 📄 Export & Format Generator
Export synchronized lyrics in Line-by-Line (LbL), Word-by-Word (WbW), plain text `.txt`, and `.doc` formats.

| Desktop View | Mobile View |
| :---: | :---: |
| ![Export Tab Desktop](Images/Demonstartions/SS_export.png) | ![Export Tab Mobile](Images/Demonstartions/ss_export_tab.jpg) |

---

#### 6. 🎨 Personalization & Themes
Customize UI scale, font sizes, audio volume, and background themes.

| Desktop View | Mobile View |
| :---: | :---: |
| ![Theme Tab Desktop](Images/Demonstartions/SS_theme_page.png) | ![Theme Tab Mobile](Images/Demonstartions/ss_theme.jpg) |

---

### ✨ Features

- **Audio Visualizer:** Canvas visualizer reacting to audio playback.
- **Mobile Controller Dock:** Floating controls designed for touch screens (`PLAY`, `BREAK [M]`, `UNDO [Z]`, `STAMP [S]`, `END [E]`, `SKIP [D]`, `LOOP`, `OPTIONS`).
- **YouTube Title Auto-Fill & Swap:** Automatically extracts song title & artist from YouTube / YTM URLs with a quick-swap option.
- **Clean Timestamps & Tags:** Converts synced LRC files into clean plain text lines.
- **Retimer & Time Shift:** Shift timestamps forward or backward across entire tracks or selected sections.
- **Latency & Playback Speed Controls:** Adjust latency compensation and playback speed.
- **Lyrics Font Size Control:** Adjust workspace font size directly in Sync Options or Theme settings.
- **Multi-Format Exporter:**
  - **LRC (`.lrc`)** — Line-by-Line & Word-by-Word
  - **JSON (`.json`)** — Timing metadata
  - **Text (`.txt`)** — Plain text, LbL timed text, and WbW tagged text
  - **Word Document (`.doc`)** — Formatted document export
- **Keyboard Shortcuts:**
  - `SPACE` — Play / Pause audio
  - `S` or `ENTER` — Stamp timestamp
  - `Z` or `BACKSPACE` — Undo last timestamp
  - `M` — Insert music break `[mm:ss.xx] ♪`
  - `E` — Mark end of line
  - `D` — Skip current line
  - `A` / `B` — Set loop range markers

---

### 🌐 Data Sources & References

| Provider / Engine | Description | Reference Link |
| :--- | :--- | :--- |
| **LRCLIB Database** | Open database for plain and synced LRC lyrics | [lrclib.net](https://lrclib.net) |
| **YouTube / Invidious / Piped** | Video streaming nodes & audio playback | [invidious.io](https://invidious.io) |
| **Web Audio API Engine** | Browser audio engine (`.mp3`, `.flac`, `.wav`, `.m4a`) | Web Audio API |
| **eLRC Engine** | Parser for line and word timestamps | Enhanced LRC Spec |

---

### 👤 Author & Credits

Crafted with ❤️ by **NigelWeb** ([github.com/code4nigel](https://github.com/code4nigel)), Lead Architect of **Lsync** & **Scrobby**.

---

### 📜 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)** — see the [LICENSE](LICENSE) file for full details.
