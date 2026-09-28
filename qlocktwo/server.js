/**
 * QLOCKTWO Server for E1001 E-Ink Frame
 * Version: 2026.09.28.16.24.00
 *
 * Express server providing:
 * - Direct image rendering endpoint (/render.png, /api/screen.png) formatted for reTerminal E1001 (800x480)
 * - JSON state API (/api/state, /api/languages, /api/palettes)
 * - Responsive, live-updating web interface optimized for e-ink frames and browsers
 */

const express = require('express');
const path = require('path');
const { calculateQlockState, LANGUAGES } = require('./lib/qlockEngine');
const { renderToBuffer, COLOR_PALETTES } = require('./lib/renderer');

// --- SERVER CONFIGURATION PARAMETERS ---
const GLOBAL_SEED = 42; // default: 42 (Global random seed)
const PORT = process.env.PORT || 3000; // default: 3000 (HTTP Port)
const DEFAULT_LANGUAGE = 'en'; // default: 'en' (Options: de, en, nl, it, es, fr, da, ru, sv)
const DEFAULT_PALETTE_INDEX = 0; // default: 0 (Range: 0-4, Default: E-Ink Paper Light)
const BG_COLOR_INDEX = 0; // default: 0 (Background color index from active palette)
const DEFAULT_WIDTH = 800; // default: 800 (E1001 native display width)
const DEFAULT_HEIGHT = 480; // default: 480 (E1001 native display height)
const REFRESH_RATE_MS = 5000; // default: 5000 (Web UI update interval)

// --- 5 ADOBE KULER GRAYSCALE COLOR PALETTES ---
// 0: "E-Ink Paper Light" (Adobe Kuler: Pure Alabaster & Carbon Ink - #EAEAEA disabled gray)
// 1: "E-Ink Classic Dark" (Adobe Kuler: Charcoal & High-Contrast White)
// 2: "E-Ink Neutral Silver" (Adobe Kuler: Neutral Midtone Grayscale)
// 3: "E-Ink Off-White Paper" (Adobe Kuler: Soft Bone & Charcoal)
// 4: "E-Ink Deep Obsidian" (Adobe Kuler: Dark Slate Grayscale)
const PALETTE_NAMES = [
  'E-Ink Paper Light',
  'E-Ink Classic Dark',
  'E-Ink Neutral Silver',
  'E-Ink Off-White Paper',
  'E-Ink Deep Obsidian'
];

const app = express();

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Helper to parse query parameters with fallbacks
 */
function extractOptions(req) {
  const lang = req.query.lang || DEFAULT_LANGUAGE;
  const paletteIndex = req.query.palette !== undefined 
    ? parseInt(req.query.palette, 10) 
    : DEFAULT_PALETTE_INDEX;
  const width = req.query.w ? parseInt(req.query.w, 10) : DEFAULT_WIDTH;
  const height = req.query.h ? parseInt(req.query.h, 10) : DEFAULT_HEIGHT;
  const seed = req.query.seed ? parseInt(req.query.seed, 10) : GLOBAL_SEED;
  const showFooter = req.query.footer === '1' || req.query.footer === 'true';
  const unlitColor = req.query.unlit ? String(req.query.unlit).trim() : undefined;

  let targetDate = new Date();
  if (req.query.time) {
    const timeStr = String(req.query.time).trim();
    if (timeStr.includes('T')) {
      const parsed = new Date(timeStr);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    } else {
      const timeParts = timeStr.split(':');
      if (timeParts.length >= 2) {
        const h = parseInt(timeParts[0], 10);
        const m = parseInt(timeParts[1], 10);
        const s = parseInt(timeParts[2] || '0', 10);
        if (!isNaN(h) && !isNaN(m)) {
          targetDate.setHours(h, m, s, 0);
        }
      }
    }
  }

  return { lang, paletteIndex, width, height, seed, showFooter, unlitColor, targetDate };
}

/**
 * GET /api/state
 * Returns JSON representing current matrix and corner dots
 */
app.get('/api/state', (req, res) => {
  const { lang, targetDate } = extractOptions(req);
  const state = calculateQlockState(targetDate, lang);
  res.json({
    version: '2026.09.28.16.24.00',
    globalSeed: GLOBAL_SEED,
    state
  });
});

/**
 * GET /api/languages
 * Returns list of supported languages
 */
app.get('/api/languages', (req, res) => {
  const list = Object.keys(LANGUAGES).map(code => ({
    code,
    name: LANGUAGES[code].name
  }));
  res.json({ languages: list });
});

/**
 * GET /api/palettes
 * Returns available color palettes
 */
app.get('/api/palettes', (req, res) => {
  const palettes = COLOR_PALETTES.map((colors, index) => ({
    index,
    name: PALETTE_NAMES[index] || `Palette ${index}`,
    colors,
    bg: colors[BG_COLOR_INDEX],
    lit: colors[1],
    accent: colors[2],
    muted: colors[3],
    unlit: colors[4]
  }));
  res.json({ palettes });
});

/**
 * GET /render.png & GET /api/screen.png
 * Returns PNG binary stream ready for reTerminal E1001 E-Ink frame consumption
 */
const renderHandler = (req, res) => {
  try {
    const opts = extractOptions(req);
    const state = calculateQlockState(opts.targetDate, opts.lang);
    const imageBuffer = renderToBuffer(state, {
      width: opts.width,
      height: opts.height,
      paletteIndex: opts.paletteIndex,
      unlitColor: opts.unlitColor,
      seed: opts.seed,
      showFooter: opts.showFooter
    });

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(imageBuffer);
  } catch (err) {
    console.error('Error rendering image:', err);
    res.status(500).json({ error: 'Rendering failed', details: err.message });
  }
};

app.get('/render.png', renderHandler);
app.get('/api/screen.png', renderHandler);

// Fallback to index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`QLOCKTWO for E1001 Frame`);
  console.log(`Version: 2026.09.28.16.24.00`);
  console.log(`Server listening on port ${PORT}`);
  console.log(`Live Web View:  http://localhost:${PORT}`);
  console.log(`Image Endpoint: http://localhost:${PORT}/render.png`);
  console.log(`State API:      http://localhost:${PORT}/api/state`);
  console.log(`=========================================`);
});
