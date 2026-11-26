/* Tank demo and shop shelf. Data comes from species.js (generated from the app), art from art.js. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const SPECIES = window.SINKER_SPECIES || [];
  const SHOP = window.SINKER_SHOP || { rods: [], boats: [], baits: [], themes: [], decor: [], tank: {}, coinsPerHour: {}, zoneMult: [] };
  const ART = window.SINKER_ART;
  const fishSVG = window.SINKER_FISH;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtM = (d) => `${Math.round(d).toLocaleString('en-US')} m`;
  const coin = '<span class="coin" aria-hidden="true"></span>';

  document.querySelectorAll('[data-slots-start]').forEach((x) => { x.textContent = String(SHOP.tank.startSlots ?? 8); });
  document.querySelectorAll('[data-slots-max]').forEach((x) => { x.textContent = String(SHOP.tank.maxSlots ?? 24); });

  /* ---------------- tank demo ---------------- */
  const tank = $('#demo-tank');
  const box = $('#demo-fish');
  const coinsEl = $('#demo-coins');
  if (tank && box && fishSVG) {
    let total = 0;
    const picks = ['clown', 'bluetang', 'lapu', 'mahi', 'lion', 'glasssquid', 'angler'].map((id) => SPECIES.find((s) => s.id === id)).filter(Boolean);
    const fish = picks.map((sp, i) => {
      const rate = (SHOP.coinsPerHour[sp.rarity] ?? 2) * (SHOP.zoneMult[sp.zone] ?? 1);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 't-swim';
      el.style.setProperty('--w', `${sp.shape === 'long' || sp.shape === 'eel' ? 22 : 15 + (i % 3) * 2}%`);
      el.innerHTML = `<span class="bubble" hidden>${coin}<span>0</span></span>${fishSVG(sp)}`;
      el.setAttribute('aria-label', `${sp.name}, tap to collect coins`);
      const f = { sp, el, rate, pending: 4 + Math.random() * 30, fedUntil: 0, x: 8 + Math.random() * 70, y: 10 + Math.random() * 55 };
      el.style.left = `${f.x}%`;
      el.style.top = `${f.y}%`;
      el.addEventListener('click', () => collect(f));
      box.appendChild(el);
      return f;
    });

    function pop(f, n) {
      const p = document.createElement('div');
      p.className = 't-pop';
      p.textContent = `+${n}`;
      p.style.left = `calc(${f.x}% + 10px)`;
      p.style.top = `${f.y}%`;
      tank.appendChild(p);
      setTimeout(() => p.remove(), 950);
    }
    function collect(f) {
      const n = Math.floor(f.pending);
      if (n < 1) return;
      f.pending -= n;
      total += n;
      coinsEl.textContent = total.toLocaleString('en-US');
      pop(f, n);
      draw();
    }
    function draw() {
      for (const f of fish) {
        const b = f.el.querySelector('.bubble');
        const n = Math.floor(f.pending);
        b.hidden = n < 1;
        b.lastChild.textContent = String(n);
        f.el.classList.toggle('fed', f.fedUntil > Date.now());
      }
    }
    // Demo speed: a minute of the real rate every ~2 seconds, so you can see it tick.
    setInterval(() => {
      const now = Date.now();
      for (const f of fish) f.pending += (f.rate / 60) * (f.fedUntil > now ? 1.5 : 1);
      draw();
    }, 2000);
    function wander() {
      if (reduceMotion) return;
      for (const f of fish) {
        if (Math.random() < 0.55) continue;
        const nx = 4 + Math.random() * 74;
        f.el.classList.toggle('flip', nx > f.x); // art faces left; flip when swimming right
        f.x = nx;
        f.y = Math.max(6, Math.min(62, f.y + (Math.random() - 0.5) * 30));
        f.el.style.left = `${f.x}%`;
        f.el.style.top = `${f.y}%`;
      }
    }
    setInterval(wander, 3200);
    $('#demo-collect').addEventListener('click', () => fish.forEach(collect));
    $('#demo-feed').addEventListener('click', () => {
      for (let i = 0; i < 6; i++) {
        const p = document.createElement('div');
        p.className = 't-pellet';
        p.style.left = `${15 + Math.random() * 70}%`;
        p.style.top = `${4 + Math.random() * 6}%`;
        p.style.animationDelay = `${i * 0.12}s`;
        tank.appendChild(p);
        setTimeout(() => p.remove(), 3200);
      }
      const until = Date.now() + 20000;
      fish.forEach((f) => { f.fedUntil = until; });
      draw();
    });

    // Themes (same colors as the app's tank themes)
    const themes = $('#demo-themes');
    const applyTheme = (t) => {
      tank.style.setProperty('--t-top', t.top);
      tank.style.setProperty('--t-bottom', t.bottom);
      tank.style.setProperty('--t-sand', t.sand);
      themes.querySelectorAll('.t-theme').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === t.id)));
    };
    SHOP.themes.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 't-theme';
      b.dataset.id = t.id;
      b.title = t.name;
      b.setAttribute('aria-label', `${t.name} theme${t.pro ? ', Sinker Pro' : ''}`);
      b.style.background = `linear-gradient(180deg, ${t.top} 0 70%, ${t.sand} 70%)`;
      if (t.pro) b.innerHTML = '<span class="pro-dot">PRO</span>';
      b.addEventListener('click', () => applyTheme(t));
      themes.appendChild(b);
    });
    if (SHOP.themes[0]) applyTheme(SHOP.themes[0]);
  }

  /* ---------------- shop shelf ---------------- */
  const shelf = $('#shelf');
  const price = (item) => item.pro ? '<span class="price pro">PRO</span>'
    : item.cost ? `<span class="price">${coin}${item.cost.toLocaleString('en-US')}</span>`
    : '<span class="price free">Starter</span>';
  const ZONES = ['Sunlight', 'Twilight', 'Midnight', 'Abyss', 'Hadal Trench'];
  const zoneOf = (d) => (d > 6000 ? 4 : d > 4000 ? 3 : d > 1000 ? 2 : d > 200 ? 1 : 0);
  const render = {
    rods: () => SHOP.rods.map((r) => `<article class="item"><div class="art">${ART.rod(r.id)}</div><b>${r.name}</b><span class="stat">Reaches ${fmtM(r.maxDepth)} · ${ZONES[zoneOf(r.maxDepth)]}</span><p>${r.desc}</p>${price(r)}</article>`).join(''),
    boats: () => SHOP.boats.map((b) => `<article class="item"><div class="art">${ART.boat(b.id)}</div><b>${b.name}</b><p>${b.desc}</p>${price(b)}</article>`).join(''),
    baits: () => SHOP.baits.map((b) => `<article class="item"><div class="art water bait">${ART.bait(b.id)}</div><b>${b.name}</b><span class="stat">${b.desc}</span><p>Goes on your hook for one cast.</p>${price(b)}</article>`).join(''),
    tank: () => SHOP.themes.map((t) => `<article class="item"><div class="swatch" style="background:linear-gradient(180deg, ${t.top}, ${t.bottom});--sand:${t.sand}"></div><b>${t.name}</b><p>Tank theme</p>${price(t)}</article>`).join('')
      + `<article class="item"><div class="art water" style="font:600 40px var(--display);color:#fff">+4</div><b>Bigger tank</b><p>Room for four more fish, up to ${SHOP.tank.maxSlots ?? 24}.</p><span class="price">${coin}400</span></article>`
      + SHOP.decor.map((d) => `<article class="item"><div class="art water" style="font:600 15px var(--body);color:#EAF6FF">Decoration</div><b>${d.name}</b><p>Drag it anywhere in your tank.</p>${price(d)}</article>`).join(''),
  };
  function show(tab) {
    document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    shelf.innerHTML = render[tab]();
    shelf.scrollLeft = 0;
  }
  if (shelf && ART) {
    document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
    show('rods');
  }
})();
