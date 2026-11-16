(function registerCore(window) {
  "use strict";
  window.SoonLabGame ||= {};
  const game = window.SoonLabGame;
  game.config = window.LOBSTER_GAME_CONFIG;
  game.assets = window.LOBSTER_GAME_ASSETS.assets;
  game.runtime = window.LOBSTER_THREE_RUNTIME;
  game.errors = [];
  game.warnings = [];
  game.warn = function (message) { if (!game.warnings.includes(message)) game.warnings.push(message); };
  game.clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  game.triangle = seconds => 1 - Math.abs((seconds % 2) - 1);
  class PlayerState {
    constructor() { this.heldItem = null; this.velocity = new THREE.Vector3(); this.verticalSpeed = 0; this.grounded = true; }
  }
  class MiniGameBase {
    constructor(id) { this.id = id; this.elapsed = 0; this.finished = false; }
    update(delta) { this.elapsed += delta; }
    exit() { this.finished = true; }
  }
  class GameManager {
    constructor() { this.reset(); }
    reset() {
      this.state = "ready"; this.frame = 0; this.time = 0;
      this.difficulty = game.config.difficulty.default; this.player = new PlayerState();
      this.stamps = new Set(); this.activeActivity = null; this.activity = null;
      this.message = "Chào mừng đến hội làng. Bảy trò chơi, bảy dấu hội!";
      this.interactionTarget = null; this.savedPose = null; this.completeSeen = false;
      this.records = { conTotal: 0, conBest: 0, hitStreak: 0, bestHitStreak: 0, quanStreak: 0, quanBest: 0, lastOpponent: null };
      this.finalScore = null; this.submitAttempts = 0; this.lastAttemptScore = null; this.submissionState = "idle";
      this.roundVersion = (this.roundVersion || 0) + 1;
    }
    get tuning() { return game.config.difficulty.levels[this.difficulty]; }
    setState(state) {
      this.state = state;
      game.audio?.pause(state === "paused");
      if (game.input) game.input.reset(game.canLook());
      if (game.view) game.view.rig.clearShake();
      if (state.endsWith("-result") || ["ready", "paused", "festival-complete", "quan-turn"].includes(state)) {
        if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
      }
      if (state === "con-result" && this.submitAttempts === 0) {
        this.finalScore = this.activity ? this.activity.hits : 0;
        this.submitAttempts = 1; this.lastAttemptScore = this.finalScore;
        game.submitScore();
      }
      game.ui?.refresh();
    }
    stamp(id) {
      if (!this.stamps.has(id)) { this.stamps.add(id); game.audio.playSFX("victory"); }
    }
    pause() {
      if (["ready", "paused", "festival-complete"].includes(this.state) || this.state.endsWith("-result")) return;
      this.previousState = this.state; this.setState("paused");
    }
    resume() { if (this.state === "paused") { this.setState(this.previousState); game.requestLook(); } }
  }
  game.PlayerState = PlayerState;
  game.MiniGameBase = MiniGameBase;
  game.GameManager = GameManager;
})(window);
