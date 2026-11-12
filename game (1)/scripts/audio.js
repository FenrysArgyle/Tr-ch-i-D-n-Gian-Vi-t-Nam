(function registerAudio(window) {
  "use strict";
  window.SoonLabGame ||= {};
  const game = window.SoonLabGame;
  game.createAudio = function () {
    const LOBSTER_CONFIG = window.LOBSTER_GAME_CONFIG;
    const bgmConfig = LOBSTER_CONFIG.audio.bgm;
    const sfxConfig = LOBSTER_CONFIG.audio.sfx;
    const buffers = new Map(), lastPlayed = new Map(), counts = new Map();
    let context, master, music, fallbackTimer, unlocked = false, muted = false, preloadStarted = false;
    let scene = null, failedUrl = null, crossbowShotBuffer = null;
    function ensure() {
      if (context) return context;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext(); master = context.createGain(); master.gain.value = muted ? 0 : 1; master.connect(context.destination);
      return context;
    }
    function tone(options, gain, when) {
      if (!ensure() || muted) return;
      const start = when || context.currentTime;
      const oscillator = context.createOscillator(), envelope = context.createGain();
      oscillator.type = options.type || "sine";
      oscillator.frequency.setValueAtTime(options.from || 440, start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.to || options.from || 440), start + (options.duration || 0.1));
      envelope.gain.setValueAtTime(0.001, start);
      envelope.gain.linearRampToValueAtTime(gain, start + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.001, start + (options.duration || 0.1));
      oscillator.connect(envelope); envelope.connect(master); oscillator.start(start); oscillator.stop(start + (options.duration || 0.1) + 0.02);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    }
    function fallback() {
      if (fallbackTimer || bgmConfig.enabled === false) return;
      if (music) music.pause();
      let index = 0;
      const notes = [293.66, 349.23, 392, 440, 523.25, 440, 392, 349.23];
      fallbackTimer = window.setInterval(() => {
        if (!muted && unlocked && game.manager?.state !== "paused") tone({from:notes[index++ % notes.length], duration:0.35, type:"sine"}, bgmConfig.volume * 0.42);
      }, 600);
    }
    function selectScene() {
      const manager = game.manager;
      if (!manager || manager.state === "ready" || manager.state === "festival-complete") return null;
      const state = manager.state === "paused" ? manager.previousState : manager.state;
      if (state.endsWith("-result")) return manager.activity?.success === false ? "defeat" : null;
      if (state === "exploring") return "home";
      if (manager.activity?.id === "sap" && manager.activity.tripTimer > 0) return "defeat";
      return manager.activeActivity || null;
    }
    function stopFallback() { clearInterval(fallbackTimer); fallbackTimer = null; }
    function playBGM() {
      const nextScene = selectScene();
      if (nextScene !== scene) {
        if (music) { music.pause(); music.removeAttribute("src"); music.load(); }
        music = null; failedUrl = null; stopFallback(); scene = nextScene;
      }
      if (bgmConfig.enabled === false || !unlocked || !scene || game.manager?.state === "paused") return;
      const track = scene === "home" ? bgmConfig : LOBSTER_CONFIG.audio.sceneMusic?.[scene];
      if (!track?.url || failedUrl === track.url) { fallback(); return; }
      if (!music) {
        music = new Audio(track.url); music.loop = true; music.volume = bgmConfig.volume; music.muted = muted;
        const selected = music;
        music.addEventListener("error", () => {
          if (music !== selected) return;
          failedUrl = track.url; game.warn("Festival music uses its synthesized arrangement."); fallback();
        });
      }
      if (!music.paused) return;
      const selected = music;
      music.play()?.then(() => { if (music === selected && !failedUrl) stopFallback(); }).catch(error => {
        if (music !== selected) return;
        if (error.name !== "NotAllowedError" && error.name !== "AbortError") { failedUrl = track.url; fallback(); }
      });
    }
    async function preloadSFX() {
      if (preloadStarted || !ensure()) return;
      preloadStarted = true;
      await Promise.all(Object.entries(sfxConfig.clips).map(async ([event, clip]) => {
        if (!clip.url) return;
        try {
          const response = await fetch(clip.url);
          if (!response.ok) throw new Error("Audio unavailable");
          const buffer = await context.decodeAudioData(await response.arrayBuffer()); buffers.set(event, buffer);
        } catch { game.warn("Some festival sounds use their event-specific synthesized fallbacks."); }
      }));
    }
    function crossbowShot() {
      if (crossbowShotBuffer) return crossbowShotBuffer;
      const duration = 0.3, sampleRate = context.sampleRate;
      crossbowShotBuffer = context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
      const samples = crossbowShotBuffer.getChannelData(0);
      let lowNoise = 0, stringPhase = 0;
      for (let index = 0; index < samples.length; index++) {
        const time = index / sampleRate, noise = Math.random() * 2 - 1;
        lowNoise += (1 - Math.exp(-2 * Math.PI * 1600 / sampleRate)) * (noise - lowNoise);
        stringPhase += 2 * Math.PI * (105 + 85 * Math.exp(-time * 24)) / sampleRate;
        const attack = Math.min(1, time / 0.0008);
        const latch = (noise - lowNoise) * Math.exp(-time * 240) * 0.7;
        const string = (Math.sin(stringPhase) + 0.32 * Math.sin(stringPhase * 2.73)) * Math.exp(-time * 24) * 0.45;
        const stock = Math.sin(2 * Math.PI * 460 * time) * Math.exp(-time * 85) * 0.18;
        const flightTime = Math.max(0, time - 0.012);
        const flight = lowNoise * Math.min(1, flightTime / 0.008) * Math.exp(-flightTime * 32) * 0.32;
        samples[index] = Math.max(-1, Math.min(1, (latch + string + stock + flight) * attack * Math.min(1, (duration - time) / 0.02)));
      }
      return crossbowShotBuffer;
    }
    function playSFX(event, variant) {
      if (!unlocked || muted || !ensure()) return;
      const clip = sfxConfig.clips[event]; if (!clip) return;
      const now = context.currentTime;
      if (now - (lastPlayed.get(event) ?? -100) < (clip.cooldownMs || 0) / 1000) return;
      if ((counts.get(event) || 0) >= (clip.polyphony || 4)) return;
      lastPlayed.set(event, now);
      const buffer = variant === "crossbow" ? crossbowShot() : buffers.get(event);
      if (!buffer) { tone(clip.fallbackTone || {}, sfxConfig.volume * (clip.gain || 1)); return; }
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = buffer; gain.gain.value = sfxConfig.volume * (clip.gain || 1);
      source.connect(gain); gain.connect(master); counts.set(event, (counts.get(event) || 0) + 1);
      source.onended = () => { counts.set(event, Math.max(0, (counts.get(event) || 1) - 1)); source.disconnect(); gain.disconnect(); };
      source.start();
    }
    const button = document.querySelector("[data-audio-toggle]");
    function update() { button.textContent = muted ? "Sound off" : "Sound on"; button.setAttribute("aria-pressed", String(muted)); if (master) master.gain.value = muted ? 0 : 1; if (music) music.muted = muted; }
    button.addEventListener("click", () => { muted = !muted; update(); unlock(); });
    function unlock() { unlocked = true; ensure()?.resume()?.catch(() => {}); preloadSFX(); playBGM(); }
    update();
    return { playBGM, playSFX, preloadSFX, unlock, get muted() { return muted; }, get scene() { return scene; }, pause(value) { if (value) music?.pause(); else if (unlocked) playBGM(); }, dispose() { clearInterval(fallbackTimer); music?.pause(); context?.close(); } };
  };
})(window);
