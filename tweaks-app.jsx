/* tweaks-app.jsx — mounts the Tweaks panel */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "machine": "burgundy",
  "desk": "parchment",
  "font": "elite",
  "trinkets": true,
  "sound": true
}/*EDITMODE-END*/;

const MACHINE_PALETTES = {
  burgundy: {
    burgundy:        '#5e1722',
    'burgundy-hi':   '#7b2333',
    'burgundy-shine':'#9a3041',
    'burgundy-deep': '#3a0d15',
    'burgundy-dark': '#22070d',
    swatch: ['#7b2333','#5e1722','#3a0d15'],
  },
  obsidian: {
    burgundy:        '#1f2024',
    'burgundy-hi':   '#33353c',
    'burgundy-shine':'#4a4c54',
    'burgundy-deep': '#101115',
    'burgundy-dark': '#06070a',
    swatch: ['#33353c','#1f2024','#06070a'],
  },
  forest: {
    burgundy:        '#1f3a2c',
    'burgundy-hi':   '#2b513e',
    'burgundy-shine':'#3a6a52',
    'burgundy-deep': '#142a20',
    'burgundy-dark': '#081410',
    swatch: ['#2b513e','#1f3a2c','#081410'],
  },
  cream: {
    burgundy:        '#d6c498',
    'burgundy-hi':   '#e6d6ac',
    'burgundy-shine':'#f0e2bf',
    'burgundy-deep': '#a8956a',
    'burgundy-dark': '#7a6a48',
    swatch: ['#e6d6ac','#d6c498','#7a6a48'],
  },
  navy: {
    burgundy:        '#1c2a3e',
    'burgundy-hi':   '#2b3d57',
    'burgundy-shine':'#3d5275',
    'burgundy-deep': '#0f1928',
    'burgundy-dark': '#070d18',
    swatch: ['#2b3d57','#1c2a3e','#070d18'],
  },
};

const DESK_PALETTES = {
  parchment: {
    'bg-1':   '#d4c4a1',
    'bg-2':   '#e3d4b3',
    'bg-edge':'#a89677',
    swatch:   ['#e3d4b3','#d4c4a1','#a89677'],
  },
  sage: {
    'bg-1':   '#b8c2a4',
    'bg-2':   '#cdd5b9',
    'bg-edge':'#8a9476',
    swatch:   ['#cdd5b9','#b8c2a4','#8a9476'],
  },
  dusk: {
    'bg-1':   '#6b7388',
    'bg-2':   '#8a91a5',
    'bg-edge':'#4a5267',
    swatch:   ['#8a91a5','#6b7388','#4a5267'],
  },
  rose: {
    'bg-1':   '#d4b3a8',
    'bg-2':   '#e6cabe',
    'bg-edge':'#a88277',
    swatch:   ['#e6cabe','#d4b3a8','#a88277'],
  },
  charcoal: {
    'bg-1':   '#3a3530',
    'bg-2':   '#4d4640',
    'bg-edge':'#211e1b',
    swatch:   ['#4d4640','#3a3530','#211e1b'],
  },
};

const FONTS = {
  elite:   { family: "'Special Elite', 'Courier Prime', monospace", label: 'Special Elite' },
  courier: { family: "'Courier Prime', 'Courier New', monospace",   label: 'Courier Prime' },
};

function applyTweaks(t) {
  const root = document.documentElement;
  const m = MACHINE_PALETTES[t.machine] || MACHINE_PALETTES.burgundy;
  Object.keys(m).forEach((k) => {
    if (k === 'swatch') return;
    root.style.setProperty('--' + k, m[k]);
  });
  const d = DESK_PALETTES[t.desk] || DESK_PALETTES.parchment;
  Object.keys(d).forEach((k) => {
    if (k === 'swatch') return;
    root.style.setProperty('--' + k, d[k]);
  });
  const f = FONTS[t.font] || FONTS.elite;
  root.style.setProperty('--paper-font', f.family);
  document.querySelectorAll('.paper-text').forEach((el) => {
    el.style.fontFamily = f.family;
  });

  document.body.classList.toggle('no-trinkets', !t.trinkets);

  if (window.__typewriter) {
    window.__typewriter.setSound(t.sound);
  }
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => { applyTweaks(t); }, [t]);

  // build swatch palettes for TweakColor
  const machineSwatches = Object.keys(MACHINE_PALETTES).map(k => MACHINE_PALETTES[k].swatch);
  const deskSwatches    = Object.keys(DESK_PALETTES).map(k => DESK_PALETTES[k].swatch);
  const machineKeys     = Object.keys(MACHINE_PALETTES);
  const deskKeys        = Object.keys(DESK_PALETTES);

  const machineIdx = Math.max(0, machineKeys.indexOf(t.machine));
  const deskIdx    = Math.max(0, deskKeys.indexOf(t.desk));

  return (
    <TweaksPanel title="Tweaks">

      <TweakSection label="The machine" />
      <TweakColor
        label="Body"
        value={machineSwatches[machineIdx]}
        options={machineSwatches}
        onChange={(palette) => {
          const i = machineSwatches.findIndex(p => p === palette || (p[0] === palette[0] && p[1] === palette[1]));
          setTweak('machine', machineKeys[i >= 0 ? i : 0]);
        }}
      />

      <TweakSection label="The desk" />
      <TweakColor
        label="Surface"
        value={deskSwatches[deskIdx]}
        options={deskSwatches}
        onChange={(palette) => {
          const i = deskSwatches.findIndex(p => p === palette || (p[0] === palette[0] && p[1] === palette[1]));
          setTweak('desk', deskKeys[i >= 0 ? i : 0]);
        }}
      />

      <TweakSection label="Typing" />
      <TweakRadio
        label="Typeface"
        value={t.font}
        options={[
          { value: 'elite',   label: 'Elite' },
          { value: 'courier', label: 'Courier' },
        ]}
        onChange={(v) => setTweak('font', v)}
      />

      <TweakToggle
        label="Knick-knacks"
        value={t.trinkets}
        onChange={(v) => setTweak('trinkets', v)}
      />
      <TweakToggle
        label="Sound"
        value={t.sound}
        onChange={(v) => setTweak('sound', v)}
      />

      <TweakSection label="Page" />
      <TweakButton
        label="Tear out the page"
        onClick={() => { if (window.__typewriter) window.__typewriter.clear(); }}
      />
      <TweakButton
        label="Tidy up the desk"
        onClick={() => { if (window.__typewriter) window.__typewriter.resetTrinkets(); }}
      />

    </TweaksPanel>
  );
}

// mount
const root = ReactDOM.createRoot(document.getElementById('tweaksRoot'));
root.render(<App />);
