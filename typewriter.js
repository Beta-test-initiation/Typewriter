/* ============================================================
   typewriter — behavior
   - listens for global keydown
   - depresses matching key visually
   - appends typed characters to paper, with jitter
   - synthesizes clack / bell / ding sounds via WebAudio
   - scales the design canvas to fit the viewport
   ============================================================ */

(function () {
  'use strict';

  // ─── email config (values come from config.js, which is gitignored) ──
  const _cfg              = window.TYPEWRITER_CONFIG || {};
  const EMAILJS_PUBLIC_KEY  = _cfg.EMAILJS_PUBLIC_KEY  || '';
  const EMAILJS_SERVICE_ID  = _cfg.EMAILJS_SERVICE_ID  || '';
  const EMAILJS_TEMPLATE_ID = _cfg.EMAILJS_TEMPLATE_ID || '';
  const SITE_URL            = _cfg.SITE_URL            || '';

  const EMAILJS_READY = (
    typeof emailjs !== 'undefined' &&
    EMAILJS_PUBLIC_KEY !== '' &&
    EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY'
  );
  if (EMAILJS_READY) emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  // ─── build a beautiful HTML letter email ──────────────────
  function buildHtmlEmail(name, text, from, dateStr) {
    const esc = (s) => String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const bodyHtml = esc(text).replace(/\n/g, '<br>');
    const fromRow  = from
      ? `<tr><td style="padding:0 48px 24px;font-family:'Courier New',Courier,monospace;font-size:14px;color:#2a1f17;">&#x2014;&nbsp;${esc(from)}</td></tr>`
      : '';
    const promoUrl     = (SITE_URL && SITE_URL !== 'YOUR_SITE_URL') ? SITE_URL : '#';
    const promoDisplay = (SITE_URL && SITE_URL !== 'YOUR_SITE_URL')
      ? SITE_URL.replace(/^https?:\/\//, '')
      : 'underwood — a typewriter';
    const promoRow = `<tr><td style="padding:10px 48px 24px;border-top:1px solid rgba(100,70,30,0.1);text-align:center;">
           <p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:10px;color:rgba(80,55,20,0.4);letter-spacing:0.05em;">
             write your own letter at
             <a href="${promoUrl}" style="color:#7a5a2a;text-decoration:none;">${promoDisplay}</a>
           </p></td></tr>`;

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ede4c8;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ede4c8;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fbf3df;border:1px solid #d8cc9e;max-width:600px;box-shadow:0 4px 28px rgba(0,0,0,0.12);">
  <tr><td style="padding:36px 48px 16px;border-bottom:1px solid rgba(100,70,30,0.18);">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-family:Georgia,serif;font-style:italic;color:#7a5a2a;font-size:14px;">${esc(dateStr)}</td>
      <td align="right" style="font-family:Georgia,serif;font-style:italic;color:rgba(80,55,20,0.4);font-size:12px;letter-spacing:0.18em;">~ Underwood ~</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px 48px 8px;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:1.9;color:#2a1f17;">${bodyHtml}</td></tr>
  ${fromRow}
  <tr><td style="padding:12px 48px 20px;border-top:1px solid rgba(100,70,30,0.15);">
    <p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:11px;color:rgba(80,55,20,0.5);text-align:right;">&#x2014;&nbsp;typed on a typewriter</p>
  </td></tr>
  ${promoRow}
</table>
</td></tr></table>
</body></html>`;
  }

  // ─── fit scene to viewport ────────────────────────────────
  const DESIGN_W = 1280, DESIGN_H = 820;
  const sceneInner = document.getElementById('sceneInner');
  let currentScale = 1;
  function fitScene() {
    const sx = window.innerWidth  / DESIGN_W;
    const sy = window.innerHeight / DESIGN_H;
    const s = Math.min(sx, sy, 1.1);
    currentScale = s;
    sceneInner.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  fitScene();
  window.addEventListener('resize', fitScene);

  // ─── elements ─────────────────────────────────────────────
  const paperText  = document.getElementById('paperText');
  const paperStage = document.getElementById('paperStage');
  const carriage   = document.getElementById('carriage');
  const soundPill  = document.getElementById('soundPill');
  const spLabel    = document.getElementById('spLabel');
  const spIcon     = document.getElementById('spIcon');

  // ─── audio ────────────────────────────────────────────────
  let audioCtx = null;
  let soundOn  = true;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // a single short clack — quick noise burst through a bandpass,
  // plus a low thunk and a tiny metallic strike
  function clack(intensity = 1) {
    if (!soundOn) return;
    const ctx = ensureAudio();
    const now = ctx.currentTime;

    // noise burst
    const len = Math.floor(0.05 * ctx.sampleRate);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500 + Math.random() * 600;
    bp.Q.value = 1.3;
    const g = ctx.createGain();
    g.gain.value = 0.22 * intensity;
    g.gain.setValueAtTime(0.22 * intensity, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.08);

    // low thunk
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 + Math.random() * 30, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.12 * intensity, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(og).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    // tiny metallic strike at the end
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 3200 + Math.random() * 400;
    const og2 = ctx.createGain();
    og2.gain.setValueAtTime(0.0, now + 0.005);
    og2.gain.linearRampToValueAtTime(0.04 * intensity, now + 0.008);
    og2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'highpass';
    bp2.frequency.value = 2200;
    osc2.connect(bp2).connect(og2).connect(ctx.destination);
    osc2.start(now + 0.005);
    osc2.stop(now + 0.05);
  }

  function spaceWhoosh() {
    if (!soundOn) return;
    const ctx = ensureAudio();
    const now = ctx.currentTime;
    const len = Math.floor(0.08 * ctx.sampleRate);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i/len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(now); src.stop(now + 0.1);
  }

  function carriageReturn() {
    if (!soundOn) return;
    const ctx = ensureAudio();
    const now = ctx.currentTime;
    const len = Math.floor(0.18 * ctx.sampleRate);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.2) * (0.5 + 0.5 * Math.sin(i * 0.1));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(now); src.stop(now + 0.2);
  }

  // ─── paper text model ─────────────────────────────────────
  // store as array of "lines" of chars; current line is last.
  const COLS = 38;            // characters per line on the paper

  let lines = [['']];         // start with one empty line

  function currentLine() { return lines[lines.length - 1]; }

  function totalChars() {
    return lines.reduce((s, l) => s + l.length, 0);
  }

  function render() {
    // Build HTML, with each char a span for jitter
    const frag = document.createDocumentFragment();
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      for (let ci = 0; ci < line.length; ci++) {
        const ch = line[ci];
        if (ch === '') continue;
        const s = document.createElement('span');
        s.className = 'ch';
        // small per-glyph wobble for ink-strike feel
        const dy = (Math.random() - 0.5) * 1.6;
        const dx = (Math.random() - 0.5) * 0.6;
        const rot = (Math.random() - 0.5) * 1.8;
        const ink = 0.78 + Math.random() * 0.22;
        s.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
        s.style.opacity = ink.toFixed(2);
        s.textContent = ch;
        frag.appendChild(s);
      }
      if (li < lines.length - 1) {
        frag.appendChild(document.createTextNode('\n'));
      }
    }
    paperText.innerHTML = '';
    paperText.appendChild(frag);
  }

  // ─── input handling ───────────────────────────────────────

  function pressKeyVisual(el) {
    if (!el) return;
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 110);
  }

  function findKeyEl(rawKey) {
    if (!rawKey) return null;
    // normalize: alpha letters use lowercase
    let k = rawKey;
    if (k.length === 1 && /[A-Z]/.test(k)) k = k.toLowerCase();
    if (k === ' ') return document.querySelector('.space-bar');
    // exact match
    let el = document.querySelector(`.key[data-key="${cssEscape(k)}"]`);
    return el;
  }
  function cssEscape(s) {
    return s.replace(/(["\\])/g, '\\$1');
  }

  function appendChar(ch) {
    let line = currentLine();
    if (line.length >= COLS) {
      // hard wrap (rare — usually bell + user hits Enter)
      lineFeed();
      line = currentLine();
    }
    line.push(ch);

    // bell disabled

    paperStage.classList.remove('kick');
    void paperStage.offsetWidth;
    paperStage.classList.add('kick');
    render();
    autoTrimLines();
  }

  function backspace() {
    const line = currentLine();
    if (line.length > 0) {
      line.pop();
    } else if (lines.length > 1) {
      lines.pop();
    }
    render();
  }

  function lineFeed() {
    lines.push([]);
    paperStage.classList.remove('linefeed');
    void paperStage.offsetWidth;
    paperStage.classList.add('linefeed');
    carriage.classList.remove('bell');
    void carriage.offsetWidth;
    carriage.classList.add('bell');
    carriageReturn();
    autoTrimLines();
    render();
  }

  // keep paper from filling up forever — drop oldest lines past 18
  function autoTrimLines() {
    const MAX_LINES = 14;
    while (lines.length > MAX_LINES) lines.shift();
  }

  // ─── keyboard listener ────────────────────────────────────

  // chars we consider "printable" for the paper text
  const PRINTABLE_RE = /^[\x20-\x7E\u00A0-\u00FF\u2010-\u2027]$/;

  function clearSeedIfNeeded() {
    if (!seeded) return;
    seeded = false;
    lines = [[]];
    render();
  }

  window.addEventListener('keydown', (e) => {
    // don't swallow keys when user has focused the tweaks panel input
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
      return;
    }

    let key = e.key;

    // visual depress
    let visualKey = key;
    if (key === 'Shift') visualKey = e.location === 2 ? 'ShiftR' : 'Shift';
    pressKeyVisual(findKeyEl(visualKey));

    // ignore modifier-only / nav keys for paper input
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (key === 'Backspace') {
      e.preventDefault();
      clearSeedIfNeeded();
      clack(0.9);
      backspace();
      return;
    }
    if (key === 'Enter') {
      e.preventDefault();
      clearSeedIfNeeded();
      lineFeed();
      return;
    }
    if (key === 'Tab') {
      e.preventDefault();
      clearSeedIfNeeded();
      for (let i = 0; i < 4; i++) appendChar(' ');
      spaceWhoosh();
      return;
    }
    if (key === ' ') {
      e.preventDefault();
      clearSeedIfNeeded();
      spaceWhoosh();
      appendChar(' ');
      return;
    }
    if (key.length === 1 && PRINTABLE_RE.test(key)) {
      e.preventDefault();
      clearSeedIfNeeded();
      clack(1);
      appendChar(key);
      return;
    }
  });

  // ─── click any key on screen to type it ───────────────────
  document.querySelectorAll('.key').forEach((el) => {
    el.addEventListener('mousedown', () => {
      const k = el.getAttribute('data-key');
      if (!k) return;
      pressKeyVisual(el);
      if (k === 'Backspace') { clearSeedIfNeeded(); clack(0.9); backspace(); return; }
      if (k === 'Enter') { clearSeedIfNeeded(); lineFeed(); return; }
      if (k === 'Tab') { clearSeedIfNeeded(); for (let i = 0; i < 4; i++) appendChar(' '); spaceWhoosh(); return; }
      if (k === 'Shift' || k === 'ShiftR') { return; }
      if (k.length === 1) {
        clearSeedIfNeeded();
        clack(1);
        appendChar(k);
      }
    });
  });
  document.querySelector('.space-bar').addEventListener('mousedown', () => {
    const el = document.querySelector('.space-bar');
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 110);
    clearSeedIfNeeded();
    spaceWhoosh();
    appendChar(' ');
  });

  // ─── sound toggle ─────────────────────────────────────────
  function setSound(v) {
    soundOn = v;
    soundPill.classList.toggle('off', !soundOn);
    spIcon.textContent = soundOn ? '♪' : '⃠';
    spLabel.textContent = soundOn ? 'sound on' : 'sound off';
  }
  soundPill.addEventListener('click', () => setSound(!soundOn));

  // ─── seed the paper with a soft prompt ────────────────────
  function seed() {
    const seedJSON = document.getElementById('seed-text');
    if (!seedJSON) return;
    let txt = '';
    try { txt = JSON.parse(seedJSON.textContent); } catch (e) { txt = ''; }
    lines = [[]];
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (c === '\n') { lines.push([]); }
      else { currentLine().push(c); }
    }
    autoTrimLines();
    render();
  }
  seed();
  let seeded = true; // paper has seed text; first real keypress clears it

  // ─── trinket drag-to-reposition ───────────────────────────
  // Each trinket carries CSS vars --tx/--ty that compose with its base rotate.
  // Positions persist to localStorage so they survive reloads.

  const TRINKET_STORE = 'typewriter.trinketPos.v1';
  let trinketPos = {};
  try { trinketPos = JSON.parse(localStorage.getItem(TRINKET_STORE) || '{}'); } catch (e) {}

  document.querySelectorAll('.trinket').forEach((el) => {
    const id = el.getAttribute('data-trinket');
    if (id && trinketPos[id]) {
      el.style.setProperty('--tx', trinketPos[id].tx + 'px');
      el.style.setProperty('--ty', trinketPos[id].ty + 'px');
    }

    let startX = 0, startY = 0, baseTx = 0, baseTy = 0, moved = false, dragging = false;

    el.addEventListener('pointerdown', (e) => {
      // primary button only
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      moved = false;
      el.classList.add('dragging');
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      startX = e.clientX;
      startY = e.clientY;
      baseTx = parseFloat(el.style.getPropertyValue('--tx')) || 0;
      baseTy = parseFloat(el.style.getPropertyValue('--ty')) || 0;
      e.preventDefault();
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const s = currentScale || 1;
      const dx = (e.clientX - startX) / s;
      const dy = (e.clientY - startY) / s;
      if (Math.abs(dx) + Math.abs(dy) > 1.5) moved = true;
      el.style.setProperty('--tx', (baseTx + dx) + 'px');
      el.style.setProperty('--ty', (baseTy + dy) + 'px');
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      try { el.releasePointerCapture(e.pointerId); } catch (err) {}
      if (moved && id) {
        const tx = parseFloat(el.style.getPropertyValue('--tx')) || 0;
        const ty = parseFloat(el.style.getPropertyValue('--ty')) || 0;
        trinketPos[id] = { tx, ty };
        try { localStorage.setItem(TRINKET_STORE, JSON.stringify(trinketPos)); } catch (err) {}
      }
    }
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  });

  // ─── expose hooks for tweaks panel ────────────────────────
  window.__typewriter = {
    setSound,
    isSoundOn: () => soundOn,
    clear() { lines = [['']]; render(); },
    resetTrinkets() {
      trinketPos = {};
      try { localStorage.removeItem(TRINKET_STORE); } catch (e) {}
      document.querySelectorAll('.trinket').forEach((el) => {
        el.style.removeProperty('--tx');
        el.style.removeProperty('--ty');
      });
    },
    getLetterText() {
      return lines.map((l) => l.join('')).join('\n').replace(/\s+$/, '');
    },
  };

  // ─── envelope overlay (seal & send) ───────────────────────

  const envOverlay    = document.getElementById('envOverlay');
  const envelope      = document.getElementById('envelope');
  const envBackdrop   = document.getElementById('envBackdrop');
  const envName       = document.getElementById('envName');
  const envEmail      = document.getElementById('envEmail');
  const envFrom       = document.getElementById('envFrom');
  const envCancelBtn  = document.getElementById('envCancel');
  const envSendBtn    = document.getElementById('envSend');
  const envPostmark   = document.getElementById('envPostmarkDate');

  const ENV_STORE = 'typewriter.envSender.v1';

  function setPostmarkDate() {
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const d = new Date();
    if (envPostmark) {
      envPostmark.textContent = `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  }

  function validateEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
  }
  function updateSendDisabled() {
    if (envSendBtn) envSendBtn.disabled = !validateEmail(envEmail.value);
  }

  function openEnvelope() {
    setPostmarkDate();
    envOverlay.classList.remove('posting');
    envelope.classList.remove('sealed', 'sealing', 'flying');
    // restore sender name if remembered
    try {
      const saved = JSON.parse(localStorage.getItem(ENV_STORE) || '{}');
      if (saved.from && !envFrom.value) envFrom.value = saved.from;
    } catch (e) {}
    envOverlay.classList.add('open');
    envOverlay.setAttribute('aria-hidden', 'false');
    updateSendDisabled();
    // pull focus into the name field after the entry animation settles
    setTimeout(() => envName && envName.focus(), 320);
  }

  function closeEnvelope() {
    envOverlay.classList.remove('open');
    envOverlay.setAttribute('aria-hidden', 'true');
  }

  function showToast(msg) {
    let t = document.getElementById('envToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'envToast';
      t.className = 'env-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => t.classList.remove('show'), 3500);
  }

  function postLetter() {
    if (!validateEmail(envEmail.value)) {
      envEmail.focus();
      return;
    }

    try {
      localStorage.setItem(ENV_STORE, JSON.stringify({ from: envFrom.value.trim() }));
    } catch (e) {}

    const text    = window.__typewriter.getLetterText() || '';
    const to      = envEmail.value.trim();
    const toName  = envName.value.trim();
    const from    = envFrom.value.trim();

    const months  = ['January','February','March','April','May','June','July',
                     'August','September','October','November','December'];
    const d       = new Date();
    const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    const subject = toName ? `A letter for ${toName}` : 'A letter from my typewriter';

    // sound: wax drop + soft thud
    if (soundOn) {
      const ctx = ensureAudio();
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(220, now);
      o.frequency.exponentialRampToValueAtTime(90, now + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(now); o.stop(now + 0.28);
    }

    // sequence:
    //   T+0   : wax seal stamps down
    //   T+460 : top flap closes
    //   T+900 : envelope flies — fire the send here
    //   T+2200: close overlay, show result toast

    let sendPromise = null;

    envelope.classList.add('sealing');
    setTimeout(() => { envelope.classList.add('sealed'); }, 460);

    setTimeout(() => {
      envOverlay.classList.add('posting');
      envelope.classList.add('flying');

      if (EMAILJS_READY) {
        sendPromise = emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          to_email:     to,
          to_name:      toName || 'friend',
          from_name:    from   || 'a friend with a typewriter',
          subject:      subject,
          message_html: buildHtmlEmail(toName, text, from, dateStr),
        });
      } else {
        // EmailJS not configured — fall back to mailto
        const plainBody =
          (toName ? `Dear ${toName},\n\n` : '') +
          text +
          (from ? `\n\n— ${from}` : '') +
          '\n\n(typed on a typewriter)';
        const mailtoUrl =
          `mailto:${encodeURIComponent(to)}` +
          `?subject=${encodeURIComponent(subject)}` +
          `&body=${encodeURIComponent(plainBody)}`;
        sendPromise = new Promise((resolve) => {
          try { const w = window.open(mailtoUrl, '_blank'); if (!w) window.location.href = mailtoUrl; }
          catch (e) { window.location.href = mailtoUrl; }
          resolve();
        });
      }
    }, 900);

    setTimeout(() => {
      closeEnvelope();
      envelope.classList.remove('sealing', 'sealed', 'flying');
      envName.value = '';
      envEmail.value = '';
      updateSendDisabled();
      if (sendPromise) {
        sendPromise
          .then(() => showToast(`posted to ${to} ✉`))
          .catch(() => showToast('could not send — please try again'));
      } else {
        showToast(`posted to ${to} ✉`);
      }
    }, 2200);
  }

  if (envCancelBtn) envCancelBtn.addEventListener('click', closeEnvelope);
  if (envBackdrop) envBackdrop.addEventListener('click', closeEnvelope);
  if (envSendBtn) envSendBtn.addEventListener('click', postLetter);
  if (envEmail) envEmail.addEventListener('input', updateSendDisabled);

  // ESC closes overlay; Enter inside fields posts
  window.addEventListener('keydown', (e) => {
    if (!envOverlay.classList.contains('open')) return;
    if (e.key === 'Escape') { closeEnvelope(); e.stopImmediatePropagation(); }
    if (e.key === 'Enter' && (e.target === envEmail || e.target === envName || e.target === envFrom)) {
      if (!envSendBtn.disabled) { postLetter(); }
      e.stopImmediatePropagation();
    }
  }, true);  // capture, so this runs before the typewriter listener swallows keys

  // ─── letters-trinket action menu ──────────────────────────

  const lettersTrinket = document.querySelector('.trinket-letters');
  const lettersMenu    = document.getElementById('lettersMenu');
  const lmSend         = document.getElementById('lmSend');
  const lmPdf          = document.getElementById('lmPdf');

  let lmHideTimer = 0;
  function showLm() {
    clearTimeout(lmHideTimer);
    if (!lettersMenu || !lettersTrinket) return;

    // Position the menu below wherever the trinket currently is,
    // converting from screen coords into scene-inner's coordinate space.
    const tr = lettersTrinket.getBoundingClientRect();
    const sr = sceneInner.getBoundingClientRect();
    lettersMenu.style.left = ((tr.left + tr.width / 2 - sr.left) / currentScale) + 'px';
    lettersMenu.style.top  = ((tr.bottom - sr.top) / currentScale + 10) + 'px';

    lettersMenu.classList.add('show');
    lettersMenu.setAttribute('aria-hidden', 'false');
  }
  function scheduleHideLm(delay) {
    clearTimeout(lmHideTimer);
    lmHideTimer = setTimeout(() => {
      if (!lettersMenu) return;
      lettersMenu.classList.remove('show');
      lettersMenu.setAttribute('aria-hidden', 'true');
    }, delay == null ? 260 : delay);
  }

  if (lettersTrinket && lettersMenu) {
    lettersTrinket.addEventListener('pointerenter', showLm);
    lettersTrinket.addEventListener('pointerleave', () => scheduleHideLm());
    lettersMenu.addEventListener('pointerenter', showLm);
    lettersMenu.addEventListener('pointerleave', () => scheduleHideLm());
  }

  if (lmSend) {
    lmSend.addEventListener('click', () => {
      scheduleHideLm(0);
      openEnvelope();
    });
  }
  if (lmPdf) {
    lmPdf.addEventListener('click', () => {
      scheduleHideLm(0);
      exportPDF();
    });
  }

  // ─── PDF export via the browser print dialog ──────────────

  function exportPDF() {
    const text = (window.__typewriter.getLetterText() || '').trim();
    const months = ['January','February','March','April','May','June','July',
                    'August','September','October','November','December'];
    const d = new Date();
    const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

    const printBody = document.getElementById('printBody');
    const printDate = document.getElementById('printDate');
    if (printBody) printBody.textContent = text || '(an empty page)';
    if (printDate) printDate.textContent = dateStr;

    // a frame to ensure DOM is committed before print
    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 30);
    });
  }

})();
