(function (global) {
  'use strict';
  const API = 'https://game-studio-api.soonlab.ai/api/leaderboards';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const GAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/;
  const error = (code) => ({ ok: false, code, error: code });
  const testMode = () => global.SoonLabGame?.testMode === true;
  const skipped = () => ({ ok: true, skipped: true, reason: 'test_mode' });
  function name(value) {
    if (typeof value !== 'string' || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value)) return null;
    const normalized = value.normalize('NFC').trim();
    return [...normalized].length >= 1 && [...normalized].length <= 16 ? normalized : null;
  }
  function createClient({ gameId, fetchImpl } = {}) {
    const key = `soonlab.leaderboard.v1:${gameId}`;
    let playerId = null, displayName = '游客', persistent = false, hasScore = null;
    let storage, renamePending = false, nameEpoch = 0, submissionSequence = 0, pendingSubmissions = 0;
    try {
      storage = global.localStorage;
      const saved = JSON.parse(storage?.getItem(key) || 'null');
      if (saved?.version === 1 && UUID.test(saved.playerId) && name(saved.displayName)) {
        playerId = saved.playerId.toLowerCase(); displayName = name(saved.displayName);
      }
    } catch { /* Denied or corrupt storage falls back to an in-page identity. */ }
    if (!playerId) {
      try { const value = global.crypto?.randomUUID(); if (UUID.test(value)) playerId = value.toLowerCase(); }
      catch { /* Unsupported crypto disables network operations, not the game. */ }
    }
    function save() {
      persistent = false;
      if (!playerId || !GAME.test(gameId)) return;
      try { storage?.setItem(key, JSON.stringify({ version: 1, playerId, displayName })); persistent = Boolean(storage); }
      catch { /* Memory profile remains usable for this page. */ }
    }
    save();
    function validBoard(value) {
      const row = (entry) => entry && UUID.test(entry.playerId) && name(entry.displayName) === entry.displayName
        && Number.isSafeInteger(entry.score) && Number.isInteger(entry.rank) && entry.rank > 0;
      return value?.ok === true && value.gameId === gameId && Array.isArray(value.items) && value.items.length <= 100
        && value.items.every(row) && (value.current === null || row(value.current) && value.current.playerId === playerId
          && (value.current.nextScore === null || Number.isSafeInteger(value.current.nextScore) && value.current.nextScore > value.current.score));
    }
    async function request(path, method, payload) {
      if (!GAME.test(gameId) || !playerId) return error('unavailable');
      let fetcher;
      try { fetcher = fetchImpl || global.fetch?.bind(global); } catch { return error('unavailable'); }
      if (typeof fetcher !== 'function') return error('unavailable');
      let timer;
      try {
        const controller = new AbortController();
        const timeout = new Promise(resolve => { timer = setTimeout(() => {
          resolve(error('request_timeout')); controller.abort();
        }, 5000); });
        const operation = (async () => {
          const response = await fetcher(`${API}/${encodeURIComponent(gameId)}${path}`, {
            method, credentials: 'omit', signal: controller.signal,
            ...(payload === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
          });
          const value = await response.json();
          if (!response.ok) return value?.ok === false && typeof value.code === 'string' ? error(value.code) : error('request_failed');
          return validBoard(value) && (method === 'GET' || value.current !== null) ? value : error('invalid_response');
        })();
        return await Promise.race([operation, timeout]);
      } catch { return error('request_failed'); }
      finally { clearTimeout(timer); }
    }
    function accept(result, epoch) {
      if (result.ok && result.current) {
        hasScore = true;
        if (epoch === nameEpoch && !renamePending) { displayName = result.current.displayName; save(); }
      }
      return result;
    }
    return Object.freeze({
      get profile() { return { playerId, displayName, hasScore, persistent }; },
      async submit(score) {
        if (!Number.isSafeInteger(score)) return error('invalid_score');
        if (testMode()) return skipped();
        submissionSequence++; pendingSubmissions++;
        if (hasScore !== true) hasScore = null;
        const epoch = nameEpoch;
        try { return accept(await request('/scores', 'POST', { playerId, score, displayName }), epoch); }
        finally { pendingSubmissions--; }
      },
      async list({ limit = 20 } = {}) {
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) return error('invalid_limit');
        const sequence = submissionSequence, epoch = nameEpoch, pendingAtStart = pendingSubmissions;
        const result = await request(`?limit=${limit}&playerId=${encodeURIComponent(playerId)}`, 'GET');
        if (result.ok && result.current === null && hasScore !== true && pendingAtStart === 0 && pendingSubmissions === 0 && sequence === submissionSequence) hasScore = false;
        return accept(result, epoch);
      },
      async rename(value) {
        const normalized = name(value);
        if (!normalized) return error('invalid_display_name');
        if (testMode()) return skipped();
        if (renamePending) return error('rename_in_progress');
        if (hasScore === null) return error('score_unconfirmed');
        if (hasScore === false) {
          nameEpoch++; displayName = normalized; save();
          return { ok: true, localOnly: true, displayName };
        }
        renamePending = true; const epoch = ++nameEpoch;
        try {
          const result = await request(`/players/${encodeURIComponent(playerId)}`, 'PATCH', { displayName: normalized });
          if (result.ok && result.current && epoch === nameEpoch) {
            // Also invalidate reads/submissions launched while this PATCH was pending.
            nameEpoch++; displayName = result.current.displayName; save();
          }
          return result;
        } finally { renamePending = false; }
      },
    });
  }
  global.SoonLabLeaderboard = Object.freeze({ createClient });
})(window);
