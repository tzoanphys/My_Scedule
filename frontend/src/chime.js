let shared = null;

function context() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!shared) shared = new AudioContext();
  return shared;
}

export function armChime() {
  const unlock = () => {
    const ctx = context();
    if (ctx && ctx.state === "suspended") ctx.resume();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function playHourChime() {
  const ctx = context();
  if (!ctx) return;
  const start = () => {
    const at = ctx.currentTime;
    [523.25, 659.25].forEach((frequency, index) => {
      const tone = ctx.createOscillator();
      const level = ctx.createGain();
      const when = at + index * 0.18;
      tone.type = "sine";
      tone.frequency.value = frequency;
      level.gain.setValueAtTime(0.0001, when);
      level.gain.exponentialRampToValueAtTime(0.03, when + 0.03);
      level.gain.exponentialRampToValueAtTime(0.0001, when + 0.62);
      tone.connect(level);
      level.connect(ctx.destination);
      tone.start(when);
      tone.stop(when + 0.66);
    });
  };
  if (ctx.state === "suspended") {
    ctx.resume().then(start).catch(() => {});
    return;
  }
  start();
}
