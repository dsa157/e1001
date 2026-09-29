/**
 * QLOCKTWO E1001 Interactive Client Application
 * Version: 2026.09.28.16.43.00
 *
 * Handles DOM grid generation, live clock synchronization, corner minute updates,
 * 5 Adobe Kuler grayscale theme palette switching with high-contrast unlit values,
 * custom unlit color adjustment, time simulation, and language selection.
 */

// --- CONFIGURATION PARAMETERS ---
const GLOBAL_SEED = 42; // default: 42 (Global random seed for deterministic effects)
const DEFAULT_LANGUAGE = 'en'; // default: 'en' (Options: de, en, nl, it, es, fr, da, ru, sv)
const DEFAULT_PALETTE_INDEX = 0; // default: 0 (Active palette index 0..4, Default: E-Ink Paper Light)
const BG_COLOR_INDEX = 0; // default: 0 (Color index for canvas/frame background)
const LIT_TEXT_COLOR_INDEX = 1; // default: 1 (Color index for lit letters)
const ACCENT_COLOR_INDEX = 2; // default: 2 (Color index for accents/corner dots)
const MUTED_COLOR_INDEX = 3; // default: 3 (Color index for secondary details)
const UNLIT_TEXT_COLOR_INDEX = 4; // default: 4 (Color index for unlit letters)
const UPDATE_INTERVAL_MS = 1000; // default: 1000 (Poll / sync interval in milliseconds)

// --- 5 ADOBE KULER GRAYSCALE COLOR PALETTES (High Contrast Unlit Values) ---
// Palette 0: "E-Ink Paper Light" (Adobe Kuler: Pure Alabaster & Carbon Ink - Visible #A0A0A0 unlit)
// Palette 1: "E-Ink Classic Dark" (Adobe Kuler: Charcoal & High-Contrast White - Visible #484E55 unlit)
// Palette 2: "E-Ink Neutral Silver" (Adobe Kuler: Neutral Midtone Grayscale - Visible #555555 unlit)
// Palette 3: "E-Ink Off-White Paper" (Adobe Kuler: Soft Bone & Charcoal - Visible #9A9A98 unlit)
// Palette 4: "E-Ink Deep Obsidian" (Adobe Kuler: Dark Slate Grayscale - Visible #484A50 unlit)
const PALETTES = [
  {
    name: 'E-Ink Paper Light',
    colors: ['#FFFFFF', '#111827', '#4B5563', '#6B7280', '#A0A0A0'],
    glow: 'transparent'
  },
  {
    name: 'E-Ink Classic Dark',
    colors: ['#101214', '#FFFFFF', '#F0F0F0', '#9CA3AF', '#484E55'],
    glow: 'rgba(255, 255, 255, 0.4)'
  },
  {
    name: 'E-Ink Neutral Silver',
    colors: ['#1E1E1E', '#F2F2F2', '#CCCCCC', '#AAAAAA', '#555555'],
    glow: 'rgba(242, 242, 242, 0.35)'
  },
  {
    name: 'E-Ink Off-White Paper',
    colors: ['#F2F2F0', '#1C1C1C', '#505050', '#707070', '#9A9A98'],
    glow: 'transparent'
  },
  {
    name: 'E-Ink Deep Obsidian',
    colors: ['#141618', '#F5F5F7', '#A0A0A5', '#7A7A80', '#484A50'],
    glow: 'rgba(245, 245, 247, 0.35)'
  }
];

// App State
let currentLang = DEFAULT_LANGUAGE;
let currentPaletteIndex = DEFAULT_PALETTE_INDEX;
let customUnlitColor = null; // null for palette default, hex string for custom override
let simulatedDate = null; // null for live system time, Date object for simulated time

// DOM Elements
const matrixGrid = document.getElementById('matrixGrid');
const dotTL = document.getElementById('dotTL');
const dotTR = document.getElementById('dotTR');
const dotBR = document.getElementById('dotBR');
const dotBL = document.getElementById('dotBL');
const langSelect = document.getElementById('langSelect');
const paletteSelect = document.getElementById('paletteSelect');
const unlitColorPicker = document.getElementById('unlitColorPicker');
const unlitColorText = document.getElementById('unlitColorText');
const resetUnlitBtn = document.getElementById('resetUnlitBtn');
const timeSim = document.getElementById('timeSim');
const resetTimeBtn = document.getElementById('resetTimeBtn');
const btnMinus5 = document.getElementById('btnMinus5');
const btnMinus1 = document.getElementById('btnMinus1');
const btnPlus1 = document.getElementById('btnPlus1');
const btnPlus5 = document.getElementById('btnPlus5');
const timeStatusLabel = document.getElementById('timeStatusLabel');
const pngLink = document.getElementById('pngLink');

/**
 * Format Date to HH:mm string
 */
function formatTimeHHMM(d) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Apply selected color palette & custom unlit color to CSS variables
 */
function applyPalette(index) {
  currentPaletteIndex = index;
  const p = PALETTES[index] || PALETTES[0];
  const root = document.documentElement;

  const activeUnlit = customUnlitColor || p.colors[UNLIT_TEXT_COLOR_INDEX];

  root.style.setProperty('--bg-color', p.colors[BG_COLOR_INDEX]);
  root.style.setProperty('--lit-color', p.colors[LIT_TEXT_COLOR_INDEX]);
  root.style.setProperty('--accent-color', p.colors[ACCENT_COLOR_INDEX]);
  root.style.setProperty('--muted-color', p.colors[MUTED_COLOR_INDEX]);
  root.style.setProperty('--unlit-color', activeUnlit);
  root.style.setProperty('--glow-color', p.glow);

  if (!customUnlitColor) {
    unlitColorPicker.value = p.colors[UNLIT_TEXT_COLOR_INDEX];
    unlitColorText.value = p.colors[UNLIT_TEXT_COLOR_INDEX];
  }

  updatePngLink();
}

/**
 * Set custom unlit gray color
 */
function setCustomUnlit(colorHex) {
  if (!colorHex || !colorHex.startsWith('#')) return;
  customUnlitColor = colorHex.toUpperCase();
  document.documentElement.style.setProperty('--unlit-color', customUnlitColor);
  unlitColorPicker.value = customUnlitColor;
  unlitColorText.value = customUnlitColor;
  updatePngLink();
}

/**
 * Update the direct PNG endpoint download link
 */
function updatePngLink() {
  let url = `/render.png?lang=${encodeURIComponent(currentLang)}&palette=${currentPaletteIndex}`;
  if (customUnlitColor) {
    url += `&unlit=${encodeURIComponent(customUnlitColor)}`;
  }
  if (simulatedDate) {
    url += `&time=${encodeURIComponent(formatTimeHHMM(simulatedDate))}`;
  }
  if (pngLink) {
    pngLink.href = url;
  }
}

/**
 * Update the status badge and time input display
 */
function updateStatusBadge() {
  if (simulatedDate) {
    timeStatusLabel.textContent = `Sim: ${formatTimeHHMM(simulatedDate)}`;
    timeStatusLabel.classList.add('simulated');
    resetTimeBtn.classList.remove('active-live');
    timeSim.value = formatTimeHHMM(simulatedDate);
  } else {
    timeStatusLabel.textContent = 'Live';
    timeStatusLabel.classList.remove('simulated');
    resetTimeBtn.classList.add('active-live');
  }
}

/**
 * Adjust simulated time by delta minutes
 */
function adjustMinutes(delta) {
  if (!simulatedDate) {
    simulatedDate = new Date();
  }
  simulatedDate = new Date(simulatedDate.getTime() + delta * 60 * 1000);
  updateStatusBadge();
  updatePngLink();
  fetchAndUpdate();
}

/**
 * Handle manual time input from picker
 */
function handleTimeInput(val) {
  if (!val) {
    simulatedDate = null;
  } else {
    const parts = val.split(':');
    if (parts.length >= 2) {
      const d = new Date();
      d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
      simulatedDate = d;
    }
  }
  updateStatusBadge();
  updatePngLink();
  fetchAndUpdate();
}

/**
 * Populate language and palette dropdown selectors
 */
async function initializeControls() {
  try {
    const [langRes, palRes] = await Promise.all([
      fetch('/api/languages'),
      fetch('/api/palettes')
    ]);

    if (langRes.ok) {
      const { languages } = await langRes.json();
      langSelect.innerHTML = languages
        .map(l => `<option value="${l.code}" ${l.code === currentLang ? 'selected' : ''}>${l.name}</option>`)
        .join('');
    }

    if (palRes.ok) {
      const { palettes } = await palRes.json();
      paletteSelect.innerHTML = palettes
        .map(p => `<option value="${p.index}" ${p.index === currentPaletteIndex ? 'selected' : ''}>${p.name}</option>`)
        .join('');
    }
  } catch (err) {
    console.warn('Using local fallback for controls initialization:', err);
    paletteSelect.innerHTML = PALETTES
      .map((p, idx) => `<option value="${idx}" ${idx === currentPaletteIndex ? 'selected' : ''}>${p.name}</option>`)
      .join('');
  }

  // Event Listeners
  langSelect.addEventListener('change', (e) => {
    currentLang = e.target.value;
    updatePngLink();
    fetchAndUpdate();
  });

  paletteSelect.addEventListener('change', (e) => {
    customUnlitColor = null;
    applyPalette(parseInt(e.target.value, 10));
  });

  // Unlit color custom controls
  unlitColorPicker.addEventListener('input', (e) => {
    setCustomUnlit(e.target.value);
  });

  unlitColorText.addEventListener('input', (e) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#') && val.length > 0) val = '#' + val;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setCustomUnlit(val);
    }
  });

  resetUnlitBtn.addEventListener('click', () => {
    customUnlitColor = null;
    applyPalette(currentPaletteIndex);
  });

  // Time simulator controls
  timeSim.addEventListener('input', (e) => handleTimeInput(e.target.value));
  timeSim.addEventListener('change', (e) => handleTimeInput(e.target.value));

  btnMinus5.addEventListener('click', () => adjustMinutes(-5));
  btnMinus1.addEventListener('click', () => adjustMinutes(-1));
  btnPlus1.addEventListener('click', () => adjustMinutes(1));
  btnPlus5.addEventListener('click', () => adjustMinutes(5));

  resetTimeBtn.addEventListener('click', () => {
    simulatedDate = null;
    timeSim.value = '';
    updateStatusBadge();
    updatePngLink();
    fetchAndUpdate();
  });
}

/**
 * Fetch state from server and update DOM matrix and corner dots
 */
async function fetchAndUpdate() {
  try {
    let url = `/api/state?lang=${encodeURIComponent(currentLang)}`;
    if (simulatedDate) {
      url += `&time=${encodeURIComponent(formatTimeHHMM(simulatedDate))}`;
    }

    const res = await fetch(url);
    if (!res.ok) return;

    const data = await res.json();
    const state = data.state;

    renderMatrix(state.grid);
    renderCorners(state.corners);
  } catch (err) {
    console.error('Error fetching QLOCKTWO state:', err);
  }
}

/**
 * Render matrix cells
 */
function renderMatrix(grid) {
  const totalCells = grid.length * (grid[0] ? grid[0].length : 0);
  if (matrixGrid.children.length !== totalCells) {
    matrixGrid.innerHTML = '';
    grid.forEach(row => {
      row.forEach(cell => {
        const div = document.createElement('div');
        div.id = `cell_${cell.id}`;
        div.className = `matrix-cell ${cell.isLit ? 'lit' : ''}`;
        div.textContent = cell.char;
        matrixGrid.appendChild(div);
      });
    });
  } else {
    grid.forEach(row => {
      row.forEach(cell => {
        const div = document.getElementById(`cell_${cell.id}`);
        if (div) {
          if (cell.isLit) {
            div.classList.add('lit');
          } else {
            div.classList.remove('lit');
          }
          if (div.textContent !== cell.char) {
            div.textContent = cell.char;
          }
        }
      });
    });
  }
}

/**
 * Render corner dots
 */
function renderCorners(corners) {
  dotTL.classList.toggle('lit', Boolean(corners.topLeft));
  dotTR.classList.toggle('lit', Boolean(corners.topRight));
  dotBR.classList.toggle('lit', Boolean(corners.bottomRight));
  dotBL.classList.toggle('lit', Boolean(corners.bottomLeft));
}

// Initial Boot
applyPalette(DEFAULT_PALETTE_INDEX);
initializeControls();
updateStatusBadge();
fetchAndUpdate();
setInterval(() => {
  if (!simulatedDate) {
    fetchAndUpdate();
  }
}, UPDATE_INTERVAL_MS);
