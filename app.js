/* Sinker website: a free web version of the focus timer + the scroll "descent".
 * The timer follows the app's rules: a session of 25 min or more reaches the bottom at its end,
 * shorter ones go proportionally less deep; a bite alarm at the end; reel in for a catch from the
 * zone you reached (trash under 3 min); then a break you can start or skip.
 * State is saved in localStorage so a refresh doesn't lose a running session. */
(() => {
  'use strict';

  // Set this once Sinker is live on the App Store (e.g. https://apps.apple.com/app/id1234567890).
  const APP_STORE_URL = '';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- game rules (mirrors lib/game/engine.ts) ---------------- */
  const ZONES = [
    { name: 'Sunlight Zone', from: 0, bg: '#3FA9D6' }, { name: 'Twilight Zone', from: 200, bg: '#1C6BA0' },
    { name: 'Midnight Zone', from: 1000, bg: '#0F2F5E' }, { name: 'Abyss', from: 4000, bg: '#081630' },
    { name: 'Hadal Trench', from: 6000, bg: '#04081A' },
  ];
  const zoneOf = (d) => { let z = 0; ZONES.forEach((x, i) => { if (d >= x.from) z = i; }); return z; };
  const CURVE = [[0, 0], [15, 200], [30, 1000], [60, 4000], [90, 6000], [120, 11000]];
  function depthFromMinutes(m) {
    if (m <= 0) return 0;
    if (m >= 120) return 11000;
    for (let i = 1; i < CURVE.length; i++) {
      const [m1, d1] = CURVE[i];
      if (m <= m1) { const [m0, d0] = CURVE[i - 1]; return d0 + ((m - m0) / (m1 - m0)) * (d1 - d0); }
    }
    return 11000;
  }
  const depthScale = (planned) => 120 / Math.max(25, planned);
  const WATER = [[0, '#5EC8E5'], [200, '#1C7FB5'], [1000, '#12407A'], [4000, '#0A1A3A'], [6000, '#050B1C'], [11000, '#02030A']];
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function waterColor(d) {
    d = clamp(d, 0, 11000);
    for (let i = 1; i < WATER.length; i++) {
      const [d1, c1] = WATER[i];
      if (d <= d1) {
        const [d0, c0] = WATER[i - 1];
        const t = (d - d0) / (d1 - d0);
        const a = hexToRgb(c0), b = hexToRgb(c1);
        return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(',')})`;
      }
    }
    return WATER[WATER.length - 1][1];
  }
  const fmt = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const fmtM = (d) => `${Math.round(d).toLocaleString('en-US')} m`;
  const spoken = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); const m = Math.floor(t / 60), s = t % 60; return `${m} minutes ${s} seconds`; };

  const SPECIES = window.SINKER_SPECIES || [];
  const RARITY = { C: ['Common', '#7E95A3'], U: ['Uncommon', '#2E9E6B'], R: ['Rare', '#2F7FC1'], E: ['Epic', '#8B5CF6'], L: ['Legendary', '#E0A21B'] };
  const WEIGHTS = { C: 55, U: 25, R: 13, E: 6, L: 1 };
  function rollCatch(zone, early) {
    const pool = SPECIES.filter((s) => s.zone === zone);
    const w = { ...WEIGHTS };
    if (early) { w.R *= 0.4; w.E *= 0.4; w.L *= 0.4; }
    const tiers = Object.keys(w).filter((k) => pool.some((s) => s.rarity === k));
    let x = Math.random() * tiers.reduce((a, k) => a + w[k], 0);
    let tier = tiers[0];
    for (const k of tiers) { x -= w[k]; if (x <= 0) { tier = k; break; } }
    const options = pool.filter((s) => s.rarity === tier);
    const sp = options[Math.floor(Math.random() * options.length)];
    const t = (Math.random() + Math.random()) / 2;
    return { sp, size: Math.round(sp.size[0] + t * (sp.size[1] - sp.size[0])) };
  }
  const TRASH = ['Old boot', 'Tin can', 'Plastic bottle', 'Seaweed clump'];
  const TRASH_ART = {
    'Old boot': '<path d="M30 10 h22 v30 q20 2 26 14 v6 h-56 z" fill="#5A3B26"/><path d="M22 60 h56" stroke="#3E2817" stroke-width="4"/>',
    'Tin can': '<rect x="34" y="12" width="32" height="46" rx="4" fill="#C7D3DC"/><rect x="34" y="22" width="32" height="20" fill="#E25A35"/><ellipse cx="50" cy="12" rx="16" ry="4" fill="#AEBBC4"/>',
    'Plastic bottle': '<rect x="44" y="6" width="12" height="8" rx="2" fill="#2F7FC1"/><path d="M40 16 h20 l4 10 v34 a4 4 0 0 1 -4 4 h-20 a4 4 0 0 1 -4 -4 v-34z" fill="rgba(190,230,245,.85)"/><rect x="36" y="32" width="28" height="12" fill="#7FD6EC"/>',
    'Seaweed clump': '<path d="M30 62 C 20 40, 40 30, 32 8 M50 62 C 60 40, 40 26, 52 6 M66 62 C 58 44, 76 32, 70 14" stroke="#2F8F5F" stroke-width="7" fill="none" stroke-linecap="round"/>',
  };

  /* ---------------- fish drawings (simplified from the app's art) ---------------- */
  function fishSVG(sp, { silhouette = false } = {}) {
    const c = silhouette ? 'rgba(234,246,255,.22)' : sp.color;
    const a = silhouette ? 'rgba(234,246,255,.22)' : sp.accent;
    const eye = silhouette ? '' : '<circle cx="EX" cy="EY" r="3" fill="#fff"/><circle cx="EX2" cy="EY" r="1.6" fill="#0B2E45"/>';
    const e = (x, y) => eye.replace(/EX2/g, x + 0.8).replace(/EX/g, x).replace(/EY/g, y);
    switch (sp.shape) {
      case 'long': case 'eel':
        return `<svg viewBox="0 0 140 40" aria-hidden="true"><path d="M6 20 C 30 6, 100 8, 124 20 C 100 32, 30 34, 6 20 Z" fill="${c}"/><path d="M122 20 L138 9 L134 20 L138 31 Z" fill="${c}"/><path d="M30 21 C 60 26, 90 26, 116 21" stroke="${a}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>${e(18, 17)}</svg>`;
      case 'shark':
        return `<svg viewBox="0 0 100 60" aria-hidden="true"><path d="M44 22 L52 4 L60 22Z" fill="${c}"/><path d="M6 32 C 22 16, 64 14, 84 30 C 64 46, 22 46, 6 32Z" fill="${c}"/><path d="M82 30 L98 12 L93 30 L98 48Z" fill="${c}"/><path d="M14 36 C 34 44, 60 44, 78 34" fill="${a}" opacity=".7"/>${e(18, 29)}</svg>`;
      case 'ray':
        return `<svg viewBox="0 0 100 70" aria-hidden="true"><path d="M50 8 C 70 20, 96 30, 98 36 C 80 40, 62 50, 50 56 C 38 50, 20 40, 2 36 C 4 30, 30 20, 50 8Z" fill="${c}"/><path d="M50 56 L52 68" stroke="${c}" stroke-width="3"/><path d="M36 30 Q 50 38 64 30" stroke="${a}" stroke-width="3" fill="none" opacity=".7"/>${e(44, 24)}</svg>`;
      case 'squid': case 'octo':
        return `<svg viewBox="0 0 100 60" aria-hidden="true"><path d="M60 30 C 60 12, 92 12, 96 30 C 92 48, 60 48, 60 30Z" fill="${c}"/><path d="M60 22 C 40 18, 22 24, 6 20 M60 30 C 40 30, 22 34, 4 32 M60 38 C 40 42, 22 40, 6 44" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="82" cy="30" r="4" fill="${a}" opacity=".8"/>${e(70, 26)}</svg>`;
      case 'jelly':
        return `<svg viewBox="0 0 80 90" aria-hidden="true"><path d="M8 40 C 8 10, 72 10, 72 40 Z" fill="${c}" opacity=".9"/><path d="M18 40 q4 20 -2 40 M32 40 q-4 22 2 44 M48 40 q4 22 -2 44 M62 40 q-4 20 2 40" stroke="${a}" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
      case 'crab':
        return `<svg viewBox="0 0 100 60" aria-hidden="true"><ellipse cx="50" cy="34" rx="28" ry="16" fill="${c}"/><path d="M22 30 L8 18 M78 30 L92 18 M30 46 L20 56 M70 46 L80 56 M40 48 L36 58 M60 48 L64 58" stroke="${c}" stroke-width="4" stroke-linecap="round"/><circle cx="8" cy="16" r="6" fill="${a}"/><circle cx="92" cy="16" r="6" fill="${a}"/>${e(42, 26)}</svg>`;
      case 'shrimp':
        return `<svg viewBox="0 0 100 60" aria-hidden="true"><path d="M14 36 C 20 14, 70 10, 86 28 C 80 40, 62 44, 50 42 C 40 50, 26 50, 14 36Z" fill="${c}"/><path d="M86 28 L98 20 M86 28 L98 32" stroke="${a}" stroke-width="2"/><path d="M30 26 v14 M44 22 v18 M58 22 v16" stroke="${a}" stroke-width="2" opacity=".7"/>${e(76, 26)}</svg>`;
      case 'cucumber':
        return `<svg viewBox="0 0 100 60" aria-hidden="true"><path d="M10 34 C 10 18, 90 18, 90 34 C 90 46, 10 46, 10 34Z" fill="${c}"/><circle cx="30" cy="26" r="3" fill="${a}"/><circle cx="50" cy="24" r="3" fill="${a}"/><circle cx="70" cy="26" r="3" fill="${a}"/>${e(82, 30)}</svg>`;
      case 'tall':
        return `<svg viewBox="0 0 100 80" aria-hidden="true"><path d="M10 40 C 20 4, 66 4, 80 40 C 66 76, 20 76, 10 40Z" fill="${c}"/><path d="M78 40 L96 24 L92 40 L96 56Z" fill="${c}"/><path d="M34 12 C 40 30, 40 50, 34 68" stroke="${a}" stroke-width="6" fill="none" opacity=".75"/>${e(22, 34)}</svg>`;
      default:
        return `<svg viewBox="0 0 100 60" aria-hidden="true"><path d="M8 30 C 22 8, 64 6, 80 30 C 64 54, 22 52, 8 30Z" fill="${c}"/><path d="M78 30 L96 14 L91 30 L96 46Z" fill="${c}"/><path d="M40 12 Q 50 4 60 14" fill="${c}"/><path d="M18 36 C 34 46, 58 46, 74 34" fill="${a}" opacity=".7"/>${e(20, 26)}</svg>`;
    }
  }

  /* ---------------- persistence ---------------- */
  const KEY = 'sinker-web-v1';
  const LOG = 'sinker-web-log-v1';
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
  let s = load(KEY, null) || { status: 'idle', planned: 25, brk: 5, focusedMs: 0, runSince: null, breakEndsAt: null, maxDepth: 0 };
  let log = load(LOG, {});
  const persist = () => save(KEY, s);

  const focused = (now) => s.focusedMs + (s.runSince ? now - s.runSince : 0);
  const remaining = (now) => Math.max(0, s.planned * 60000 - focused(now));
  const depthNow = (now) => (s.status === 'bite' ? s.maxDepth : depthFromMinutes((focused(now) / 60000) * depthScale(s.planned)));

  /* ---------------- elements ---------------- */
  const dive = $('#dive');
  const el = {
    timer: $('#timer'), status: $('#status'), readout: $('#readout'), lengths: $('#lengths'), breaks: $('#breaks'),
    cast: $('#btn-cast'), pause: $('#btn-pause'), reel: $('#btn-reel'), reelNow: $('#btn-reel-now'), skip: $('#btn-skip'),
    brk: $('#btn-break'), again: $('#btn-again'), fine: $('#fine'), nav: $('#nav'), modal: $('#modal'), sheet: $('#sheet'),
    logCount: $('#log-count'),
  };

  /* ---------------- layout: boat, rod tip, line ---------------- */
  let geo = {};
  function layout() {
    const W = dive.clientWidth, H = dive.clientHeight;
    const wide = W >= 960;
    const skyH = Math.round(H * (wide ? 0.34 : 0.28));
    const boatW = wide ? Math.min(W * 0.4, 520) : Math.min(W * 0.92, 440);
    const boatH = (boatW * 110) / 236;
    const boatX = wide ? W * 0.07 : (W - boatW) / 2;
    const tipX = boatX + ((262 - 60) / 236) * boatW;
    const tipY = skyH - boatH * 0.82 + (18 / 110) * boatH;
    geo = { W, H, skyH, tipY, idleLen: skyH + 34 - tipY, deepLen: H * 0.66 + skyH + 60 - tipY };
    const st = dive.style;
    st.setProperty('--sky-h', `${skyH}px`);
    st.setProperty('--boat-w', `${boatW}px`);
    st.setProperty('--boat-h', `${boatH}px`);
    st.setProperty('--boat-x', `${boatX}px`);
    st.setProperty('--tip-x', `${tipX}px`);
    st.setProperty('--tip-y', `${tipY}px`);
    render(Date.now());
  }

  /* ---------------- alarm (Web Audio bell) + notifications ---------------- */
  let actx = null, ringTimer = null;
  function audio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; } } return actx; }
  function bell() {
    const ctx = audio(); if (!ctx) return;
    const now = ctx.currentTime;
    [[660, 0], [660, 0.45]].forEach(([f, at]) => {
      [[1, 0.5], [2, 0.22], [2.76, 0.14], [5.4, 0.05]].forEach(([m, amp]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f * m; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, now + at);
        g.gain.exponentialRampToValueAtTime(amp * 0.35, now + at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + at + 1.6);
        o.connect(g).connect(ctx.destination); o.start(now + at); o.stop(now + at + 1.7);
      });
    });
    if (navigator.vibrate) navigator.vibrate([180, 80, 180]);
  }
  function startRing() { if (ringTimer) return; bell(); ringTimer = setInterval(bell, 2200); }
  function stopRing() { clearInterval(ringTimer); ringTimer = null; }
  function notify(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
    try { new Notification(title, { body, icon: 'assets/icon.png' }); } catch { /* ignore */ }
  }
  $('#btn-notify').addEventListener('click', async () => {
    if (!('Notification' in window)) { $('#btn-notify').textContent = 'Notifications not supported here'; return; }
    const p = await Notification.requestPermission();
    $('#btn-notify').textContent = p === 'granted' ? 'Notifications on' : 'Notifications blocked';
  });

  /* ---------------- state changes ---------------- */
  function setStatus(next) { s.status = next; persist(); render(Date.now()); }
  function cast() {
    audio(); // unlock audio inside the click
    s = { ...s, status: 'focus', focusedMs: 0, runSince: Date.now(), breakEndsAt: null, maxDepth: 0 };
    persist(); render(Date.now());
  }
  function togglePause() {
    const now = Date.now();
    if (s.runSince) { s.focusedMs = focused(now); s.runSince = null; } else s.runSince = now;
    persist(); render(now);
  }
  function reelIn() {
    const now = Date.now();
    stopRing();
    const full = s.status === 'bite';
    const mins = focused(now) / 60000;
    const depth = depthNow(now);
    s.focusedMs = focused(now); s.runSince = null;
    s.lastTrash = !full && mins < 3;
    if (s.lastTrash) { showCatch({ trash: TRASH[Math.floor(Math.random() * TRASH.length)], depth, mins }); return; }
    const c = rollCatch(zoneOf(depth), !full);
    const prev = log[c.sp.id];
    log[c.sp.id] = { n: (prev?.n ?? 0) + 1, best: Math.max(prev?.best ?? 0, c.size) };
    save(LOG, log);
    showCatch({ ...c, depth, full, isNew: !prev });
  }
  function startBreak() { s.status = 'break'; s.breakEndsAt = Date.now() + s.brk * 60000; persist(); render(Date.now()); }
  function endBreak() { stopRing(); s.status = 'idle'; s.breakEndsAt = null; persist(); render(Date.now()); }

  /* ---------------- catch / logbook sheets ---------------- */
  function openSheet(html, onClose) {
    el.sheet.innerHTML = html;
    el.modal.classList.add('open');
    const close = () => { el.modal.classList.remove('open'); el.modal.onclick = null; onClose?.(); };
    el.modal.onclick = (e) => { if (e.target === el.modal) close(); };
    $$('[data-close]', el.sheet).forEach((b) => b.addEventListener('click', close));
    setTimeout(() => $('[data-close]', el.sheet)?.focus(), 50);
  }
  const nudge = `<p class="app-nudge">In the app your fish go into your tank and earn coins. <a href="#get" data-close>Get Sinker for iPhone</a></p>`;
  function showCatch(c) {
    const toBreak = () => setStatus('breakReady');
    if (c.trash) {
      openSheet(`<p class="kicker">Reeled in after ${Math.max(1, Math.round(c.mins))} min · ${fmtM(c.depth)}</p>
        <div class="catch-art" style="background:#7E98A4"><svg viewBox="0 0 100 70" style="width:40%">${TRASH_ART[c.trash]}</svg></div>
        <h2 class="catch-name display" id="catch-name">${c.trash}</h2><span class="tag" style="background:#8A7A66">TRASH</span>
        <p>Too shallow for fish. Stay down at least 3 minutes to catch something alive.</p>
        <div class="row"><button class="btn" data-close>Toss it back</button></div>`, toBreak);
      return;
    }
    const [rname, rcol] = RARITY[c.sp.rarity];
    const z = ZONES[c.sp.zone];
    openSheet(`<p class="kicker">${c.full ? 'Fish on!' : 'Reeled in early'} · ${z.name} · ${fmtM(c.depth)}</p>
      <div class="catch-art" style="background:${z.bg}">${fishSVG(c.sp)}</div>
      ${c.isNew ? '<p class="kicker" style="color:var(--coral)">New species · added to your logbook</p>' : ''}
      <h2 class="catch-name display" id="catch-name">${c.sp.name}</h2>
      <span class="tag" style="background:${rcol}">${rname.toUpperCase()}</span>
      <p>${c.sp.fact}</p>
      <div class="facts"><span>${c.size} cm</span><span>${z.name}</span></div>
      <div class="row"><button class="btn" data-close>Nice!</button></div>${nudge}`, toBreak);
  }
  function showLog() {
    const got = SPECIES.filter((sp) => log[sp.id]);
    const grid = SPECIES.map((sp) => `<div title="${log[sp.id] ? sp.name : '???'}" style="display:grid;place-items:center;gap:2px;padding:6px;border-radius:12px;background:${log[sp.id] ? '#E7F1F4' : '#F0F4F6'}">${fishSVG(sp, { silhouette: !log[sp.id] }).replace('<svg', '<svg style="width:52px;height:34px;filter:' + (log[sp.id] ? 'none' : 'brightness(.3)') + '"')}<small style="font-size:10px;font-weight:800;color:#3A5566;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px">${log[sp.id] ? sp.name : '???'}</small></div>`).join('');
    openSheet(`<p class="kicker">Your web logbook</p><h2 class="display" style="font-size:28px">${got.length} / ${SPECIES.length} species</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:6px;max-height:46vh;overflow:auto;text-align:center">${grid}</div>
      <div class="row"><button class="btn light" data-close>Close</button></div>${nudge}`);
  }
  $('#btn-log').addEventListener('click', showLog);

  /* ---------------- render ---------------- */
  let lastStatus = null;
  function render(now) {
    const st = s.status;
    const deep = st === 'focus' || st === 'bite';
    const depth = deep ? depthNow(now) : 0;
    const paused = st === 'focus' && !s.runSince;
    dive.classList.toggle('deep', deep);
    dive.classList.toggle('started', st !== 'idle');
    dive.classList.toggle('biting', st === 'bite');
    dive.classList.toggle('ink-light', deep && depth > 120);
    el.nav.classList.toggle('hidden', deep);

    // water and light follow the depth, like the app
    dive.style.setProperty('--water-top', waterColor(depth * 0.55));
    dive.style.setProperty('--water-bottom', waterColor(Math.min(11000, depth * 1.25 + 120)));
    dive.style.setProperty('--sun', String(clamp(1 - depth / 450, 0, 1)));
    dive.style.setProperty('--halo', deep && depth > 120 ? 'rgba(143,245,225,.35)' : 'rgba(255,255,255,.6)');
    dive.style.setProperty('--line-h', `${deep ? geo.deepLen : geo.idleLen}px`);

    let t = fmt(s.planned * 60000), status = '', read = '';
    const reach = depthFromMinutes(s.planned * depthScale(s.planned));
    if (st === 'idle') read = `Reaches ${reach >= 11000 ? 'the very bottom' : `~${fmtM(reach)} · ${ZONES[zoneOf(reach - 1)].name}`} · ${s.brk} min break after`;
    if (st === 'focus') { t = fmt(remaining(now)); status = paused ? 'Paused' : ZONES[zoneOf(depth)].name; read = fmtM(depth); }
    if (st === 'bite') { t = '00:00'; status = 'Something is biting!'; read = `${fmtM(s.maxDepth)} · ${ZONES[zoneOf(s.maxDepth)].name}`; }
    if (st === 'breakReady') { t = fmt(s.brk * 60000); status = s.lastTrash ? 'Back on deck. Take a break?' : 'Nice catch! Take a break?'; read = 'Rest your eyes, then cast again'; }
    if (st === 'break') { t = fmt((s.breakEndsAt ?? now) - now); status = 'Break on deck'; read = `Next: ${s.planned} min`; }
    if (st === 'breakOver') { t = '00:00'; status = 'Break is over!'; read = `Ready for another ${s.planned} min`; }
    el.timer.textContent = t;
    el.timer.setAttribute('aria-label', `${st === 'focus' ? 'Time left' : st === 'break' ? 'Break left' : 'Length'}: ${spoken(st === 'focus' ? remaining(now) : st === 'break' ? (s.breakEndsAt ?? now) - now : s.planned * 60000)}`);
    if (el.status.textContent !== status) el.status.textContent = status;
    el.readout.textContent = read;

    el.lengths.hidden = !(st === 'idle' || st === 'breakOver');
    el.breaks.hidden = !(st === 'idle' || st === 'breakReady');
    el.cast.hidden = st !== 'idle';
    el.pause.hidden = st !== 'focus';
    el.pause.textContent = paused ? 'Resume' : 'Pause';
    el.reel.hidden = st !== 'focus';
    el.reelNow.hidden = st !== 'bite';
    el.skip.hidden = !(st === 'break' || st === 'breakReady');
    el.brk.hidden = st !== 'breakReady';
    el.again.hidden = st !== 'breakOver';
    el.fine.hidden = deep;
    $$('#lengths .chip').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.min === s.planned)));
    $$('#breaks .chip').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.break === s.brk)));
    el.logCount.textContent = String(Object.keys(log).length);

    document.title = st === 'focus' ? `${t} · ${ZONES[zoneOf(depth)].name} · Sinker`
      : st === 'bite' && !el.modal.classList.contains('open') ? (Math.floor(now / 800) % 2 ? '🐟 Something is biting!' : '🎣 Reel it in!')
      : st === 'break' ? `${t} · Break · Sinker`
      : st === 'breakOver' ? 'Break is over · Sinker' : 'Sinker – Focus Timer';

    if (st !== lastStatus) {
      if (st === 'bite' || st === 'breakOver') startRing(); else stopRing();
      if (st === 'bite' && lastStatus === 'focus') notify('Something is biting!', 'Your line went taut. Come back and reel it in.');
      if (st === 'breakOver' && lastStatus === 'break') notify('Break is over', 'Back to the water when you\'re ready.');
      if (deep && lastStatus !== 'focus' && lastStatus !== 'bite') dive.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      lastStatus = st;
    }
  }

  function tick() {
    const now = Date.now();
    if (s.status === 'focus' && s.runSince && remaining(now) <= 0) {
      const end = s.runSince + (s.planned * 60000 - s.focusedMs);
      s.focusedMs = s.planned * 60000; s.runSince = null;
      s.maxDepth = depthFromMinutes(s.planned * depthScale(s.planned));
      s.status = 'bite'; s.biteAt = end; persist();
    }
    if (s.status === 'break' && s.breakEndsAt && now >= s.breakEndsAt) { s.status = 'breakOver'; persist(); }
    render(now);
  }

  /* ---------------- ambient ocean life ---------------- */
  const snow = $('#snow');
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${100 + Math.random() * 20}%`;
    p.style.animationDuration = `${10 + Math.random() * 14}s`;
    p.style.animationDelay = `${-Math.random() * 20}s`;
    p.style.opacity = String(0.3 + Math.random() * 0.6);
    snow.appendChild(p);
  }
  const swimmers = $('#swimmers');
  function spawnSwimmer() {
    if (reduceMotion || document.hidden) return;
    const deep = s.status === 'focus' || s.status === 'bite';
    if (swimmers.childElementCount >= 4) return;
    const zone = deep ? zoneOf(depthNow(Date.now())) : 0;
    const pool = SPECIES.filter((sp) => sp.zone === zone && sp.rarity !== 'L');
    if (!pool.length) return;
    const sp = pool[Math.floor(Math.random() * pool.length)];
    const W = dive.clientWidth, H = dive.clientHeight;
    const size = 40 + Math.random() * 40;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const f = document.createElement('div');
    f.className = 'swimmer';
    f.innerHTML = fishSVG(sp);
    f.style.width = `${size}px`;
    const minTop = deep ? 0.12 : (geo.skyH + 60) / H;
    f.style.top = `${(minTop + Math.random() * (0.8 - minTop)) * 100}%`;
    f.style.left = '0';
    // fish art faces left (head at x≈10), so flip when swimming right
    f.style.setProperty('--dir', String(-dir));
    f.style.setProperty('--from', `${dir > 0 ? -size - 20 : W + 20}px`);
    f.style.setProperty('--to', `${dir > 0 ? W + 20 : -size - 20}px`);
    const dur = 14 + Math.random() * 10;
    f.style.animationDuration = `${dur}s`;
    swimmers.appendChild(f);
    setTimeout(() => f.remove(), dur * 1000 + 200);
  }
  setInterval(spawnSwimmer, 3800);
  spawnSwimmer();

  /* ---------------- sections ---------------- */
  // Fish parade: two rows of species, duplicated for a seamless loop.
  const tracks = $$('#parade .track');
  const shuffled = [...SPECIES].sort(() => Math.random() - 0.5);
  [shuffled.slice(0, 20), shuffled.slice(20, 40)].forEach((list, i) => {
    const html = list.map((sp) => `<div class="fishcard">${fishSVG(sp)}<span>${sp.name}</span></div>`).join('');
    if (tracks[i]) tracks[i].innerHTML = html + html;
  });
  const clown = SPECIES.find((sp) => sp.id === 'clown');
  if (clown) $('#widget-fish').innerHTML = fishSVG(clown).replace('<svg', '<svg style="width:70px"');

  // Pro perks (same list as the app's paywall).
  const ICON = {
    deep: 'M12 3v14m0 0-5-5m5 5 5-5M5 21h14', gold: 'M12 2l2.6 6.4L21 9l-5 4.4L17.5 20 12 16.6 6.5 20 8 13.4 3 9l6.4-.6z',
    palette: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.8-.6-1.2-.6-2 0-.8.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4c0-5-4-9-9-9Z',
    phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 17h2', tone: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm11-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z',
    sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4', shield: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5Zm-3 10 2 2 4-4',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', gift: 'M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7c-2-4-6-3-6 0m6 0c2-4 6-3 6 0', coins: 'M12 6c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Zm-8 3v6c0 1.7 3.6 3 8 3s8-1.3 8-3V9',
  };
  const PERKS = [
    ['deep', 'The deep sea', 'Dive to 11 km. 38 more species'], ['gold', 'Golden fish', 'Rare gold catches worth 3×'],
    ['palette', 'Pro designs', 'Golden yacht, Aurora rod, themes'], ['phone', 'Widgets', 'Lock Screen and Dynamic Island'],
    ['tone', 'Tone pack', '6 extra alarm tones'], ['sliders', 'Any length', 'Custom focus and break times'],
    ['shield', 'Streak shield', 'Miss a day, keep your streak'], ['calendar', 'Logbook', 'Weekly chart, 5-week calendar'],
    ['gift', 'Bonus quest', '4th daily quest, double chest'], ['coins', 'Richer tank', '24 fish, earns 25% more'],
  ];
  $('#perks').innerHTML = PERKS.map(([ic, t, d]) => `<div class="perk card"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[ic]}"/></svg></span><div><b>${t}</b><span>${d}</span></div></div>`).join('');

  // App Store links
  $$('[data-store]').forEach((a) => {
    if (APP_STORE_URL) { a.href = APP_STORE_URL; a.target = '_blank'; a.rel = 'noopener'; }
    else if (a.tagName === 'A' && !a.classList.contains('pill')) a.href = '#get';
  });
  $$('[data-store-small]').forEach((x) => { x.textContent = APP_STORE_URL ? 'Download on the' : 'Coming soon on the'; });
  $('#year').textContent = String(new Date().getFullYear());

  // Widget mock countdown
  let mock = 18 * 60 + 42;
  setInterval(() => {
    mock = mock > 0 ? mock - 1 : 25 * 60;
    const txt = `${Math.floor(mock / 60)}:${String(mock % 60).padStart(2, '0')}`;
    $$('[data-clock]').forEach((x) => { x.textContent = txt; });
    $('#live-meter').style.height = `${Math.round((1 - mock / 1500) * 100)}%`;
  }, 1000);

  /* ---------------- the descent: scroll → depth ---------------- */
  const zones = $$('[data-depth]');
  const gauge = $('#gauge');
  function onScroll() {
    const y = scrollY, H = innerHeight;
    el.nav.classList.toggle('scrolled', y > 40);
    // depth = interpolate between section anchors (hero = 0 m)
    const anchors = [[0, 0], ...zones.map((z) => [z.offsetTop - H * 0.4, +z.dataset.depth])];
    let d = 0;
    for (let i = 1; i < anchors.length; i++) {
      const [y0, d0] = anchors[i - 1], [y1, d1] = anchors[i];
      if (y <= y1) { d = d0 + clamp((y - y0) / Math.max(1, y1 - y0), 0, 1) * (d1 - d0); break; }
      d = d1;
    }
    if (y + H >= document.body.scrollHeight - 4) d = 11000;
    document.body.style.setProperty('--sea', waterColor(d));
    document.body.style.setProperty('--sea-deep', waterColor(Math.min(11000, d * 1.3 + 200)));
    gauge.classList.toggle('show', y > H * 0.6);
    gauge.style.setProperty('--g', `${(d / 11000) * 100}%`);
    $('#gauge-m').textContent = fmtM(d);
    $('#gauge-z').textContent = ZONES[zoneOf(d)].name.replace(' Zone', '');
  }
  addEventListener('scroll', onScroll, { passive: true });

  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
  $$('.reveal').forEach((x) => io.observe(x));

  /* ---------------- wiring ---------------- */
  $$('#lengths .chip').forEach((b) => b.addEventListener('click', () => { s.planned = +b.dataset.min; persist(); render(Date.now()); }));
  $$('#breaks .chip').forEach((b) => b.addEventListener('click', () => { s.brk = +b.dataset.break; persist(); render(Date.now()); }));
  el.cast.addEventListener('click', cast);
  el.again.addEventListener('click', cast);
  el.pause.addEventListener('click', togglePause);
  el.reel.addEventListener('click', reelIn);
  el.reelNow.addEventListener('click', reelIn);
  el.brk.addEventListener('click', startBreak);
  el.skip.addEventListener('click', endBreak);
  addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.target.closest('button, a, input, summary') || el.modal.classList.contains('open')) return;
    e.preventDefault();
    if (s.status === 'idle' || s.status === 'breakOver') cast(); else if (s.status === 'focus') togglePause(); else if (s.status === 'bite') reelIn();
  });
  addEventListener('resize', layout);

  layout();
  onScroll();
  setInterval(tick, 250);
  tick();
})();
