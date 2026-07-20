// Sound Effects Engine for Lsync UI
let globalVolume = 0.5; // Default 50% volume

try {
  const savedVol = localStorage.getItem('lsync_ui_volume');
  if (savedVol !== null) {
    globalVolume = parseFloat(savedVol);
  }
} catch (e) {
  console.warn("Could not read sound volume from localStorage:", e);
}

export const getUiVolume = () => globalVolume;

export const setUiVolume = (vol) => {
  globalVolume = Math.max(0, Math.min(1, vol));
  try {
    localStorage.setItem('lsync_ui_volume', globalVolume.toString());
  } catch (e) {
    console.warn("Could not save sound volume to localStorage:", e);
  }
};

const sounds = {
  dock: './sfx/tap1.wav',
  click: './sfx/tap2.wav',
  modal: './sfx/tap3.wav'
};

export const playUiSound = (type = 'click') => {
  if (globalVolume <= 0) return;
  try {
    const soundUrl = sounds[type] || sounds.click;
    const audio = new Audio(soundUrl);
    audio.volume = globalVolume;
    audio.play().catch(() => {});
  } catch (e) {
    console.warn("Sound play error:", e);
  }
};
