/**
 * QLOCKTWO E1001 E-Ink Canvas Renderer
 * Version: 2026.09.28.16.21.00
 *
 * Renders the QLOCKTWO matrix and corner minute indicators onto an 800x480 (or custom)
 * canvas for the reTerminal E1001 E-Ink frame. Features seedable noise/dither texture,
 * 5 curated Adobe Kuler all-grayscale e-ink palettes, corner minute dots, and configurable layout.
 */

const { createCanvas } = require('@napi-rs/canvas');

// --- CONFIGURATION PARAMETERS ---
const GLOBAL_SEED = 42; // default: 42 (Global random seed for deterministic rendering)
const DEFAULT_PALETTE_INDEX = 0; // default: 0 (Active color palette: 0-4, Default: E-Ink Paper Light)
const BG_COLOR_INDEX = 0; // default: 0 (Index of color within active palette used for background)
const LIT_TEXT_COLOR_INDEX = 1; // default: 1 (Index of color for lit characters)
const ACCENT_COLOR_INDEX = 2; // default: 2 (Index of color for accents & corner dots)
const MUTED_COLOR_INDEX = 3; // default: 3 (Index of color for secondary details)
const UNLIT_TEXT_COLOR_INDEX = 4; // default: 4 (Index of color for unlit characters)

const CANVAS_WIDTH = 800; // default: 800 (E1001 display landscape width)
const CANVAS_HEIGHT = 480; // default: 480 (E1001 display landscape height)
const GRID_COLUMNS = 11; // default: 11 (Standard QlockTwo columns)
const GRID_ROWS = 10; // default: 10 (Standard QlockTwo rows)
const GRID_WIDTH = 480; // default: 480 (Matrix display width in pixels)
const GRID_HEIGHT = 400; // default: 400 (Matrix display height in pixels)
const FONT_SIZE = 28; // default: 28 (Font size for matrix letters)
const FONT_FAMILY = 'Helvetica, -apple-system, sans-serif'; // default: 'Helvetica, -apple-system, sans-serif'
const CORNER_DOT_RADIUS = 5; // default: 5 (Radius of corner minute dots)
const CORNER_DOT_OFFSET = 24; // default: 24 (Distance from frame edge for corner dots)
const GLOW_INTENSITY = 0; // default: 0 (Set to 0 for crisp e-ink rendering)
const SHOW_HEADER_INFO = false; // default: false (Optional minimal header info)

// --- 5 ADOBE KULER GRAYSCALE COLOR PALETTES ---
// Palette 0: "E-Ink Paper Light" (Adobe Kuler: Pure Alabaster & Carbon Ink - #EAEAEA unlit)
// Palette 1: "E-Ink Classic Dark" (Adobe Kuler: Charcoal & High-Contrast White)
// Palette 2: "E-Ink Neutral Silver" (Adobe Kuler: Neutral Midtone Grayscale)
// Palette 3: "E-Ink Off-White Paper" (Adobe Kuler: Soft Bone & Charcoal)
// Palette 4: "E-Ink Deep Obsidian" (Adobe Kuler: Dark Slate Grayscale)
const COLOR_PALETTES = [
  ['#FFFFFF', '#111827', '#4B5563', '#9CA3AF', '#EAEAEA'], // 0: E-Ink Paper Light (Default: #EAEAEA disabled gray)
  ['#101214', '#FFFFFF', '#F0F0F0', '#6C757D', '#24282D'], // 1: E-Ink Classic Dark
  ['#1E1E1E', '#F2F2F2', '#CCCCCC', '#777777', '#333333'], // 2: E-Ink Neutral Silver
  ['#F2F2F0', '#1C1C1C', '#505050', '#888888', '#DCDCDA'], // 3: E-Ink Off-White Paper
  ['#141618', '#F5F5F7', '#A0A0A5', '#55555A', '#222428']  // 4: E-Ink Deep Obsidian
];

/**
 * Seedable pseudo-random number generator (Mulberry32)
 * @param {number} seed 
 * @returns {function(): number}
 */
function createPrng(seed) {
  let s = Math.floor(seed) >>> 0;
  return function() {
    let t = (s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Render QLOCKTWO state to a Canvas buffer
 * @param {object} qlockState - Result from calculateQlockState
 * @param {object} options - Custom overrides (paletteIndex, unlitColor, width, height, seed, etc.)
 * @returns {Buffer} PNG image buffer
 */
function renderToBuffer(qlockState, options = {}) {
  const width = options.width || CANVAS_WIDTH;
  const height = options.height || CANVAS_HEIGHT;
  const paletteIndex = (options.paletteIndex !== undefined) ? options.paletteIndex : DEFAULT_PALETTE_INDEX;
  const palette = COLOR_PALETTES[paletteIndex] || COLOR_PALETTES[0];
  const seed = (options.seed !== undefined) ? options.seed : GLOBAL_SEED;
  const prng = createPrng(seed);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background fill from active palette
  const bgColor = palette[BG_COLOR_INDEX];
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Subtle deterministic paper grain
  const isLightBg = paletteIndex === 0 || paletteIndex === 3;
  const grainCount = 80; // default: 80
  ctx.fillStyle = isLightBg ? 'rgba(0, 0, 0, 0.015)' : 'rgba(255, 255, 255, 0.02)';
  for (let i = 0; i < grainCount; i++) {
    const gx = prng() * width;
    const gy = prng() * height;
    const gSize = 1 + prng() * 1.2;
    ctx.beginPath();
    ctx.arc(gx, gy, gSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Calculate centered grid layout
  const gridW = options.gridWidth || GRID_WIDTH;
  const gridH = options.gridHeight || GRID_HEIGHT;
  const startX = Math.round((width - gridW) / 2);
  const startY = Math.round((height - gridH) / 2);

  const cellW = gridW / GRID_COLUMNS;
  const cellH = gridH / GRID_ROWS;

  // Colors
  const litTextColor = palette[LIT_TEXT_COLOR_INDEX];
  const unlitTextColor = options.unlitColor || palette[UNLIT_TEXT_COLOR_INDEX];
  const dotR = CORNER_DOT_RADIUS;
  const cornerMargin = CORNER_DOT_OFFSET;

  // Corner Minute Dots
  const corners = [
    { x: cornerMargin, y: cornerMargin, isLit: qlockState.corners.topLeft }, // Minute +1
    { x: width - cornerMargin, y: cornerMargin, isLit: qlockState.corners.topRight }, // Minute +2
    { x: width - cornerMargin, y: height - cornerMargin, isLit: qlockState.corners.bottomRight }, // Minute +3
    { x: cornerMargin, y: height - cornerMargin, isLit: qlockState.corners.bottomLeft } // Minute +4
  ];

  corners.forEach(corner => {
    ctx.beginPath();
    ctx.arc(corner.x, corner.y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = corner.isLit ? litTextColor : unlitTextColor;
    ctx.fill();
  });

  // Render Grid Characters
  ctx.font = `600 ${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  qlockState.grid.forEach(row => {
    row.forEach(cell => {
      const cx = startX + (cell.col * cellW) + (cellW / 2);
      const cy = startY + (cell.row * cellH) + (cellH / 2);

      if (cell.isLit) {
        ctx.fillStyle = litTextColor;
        ctx.fillText(cell.char, cx, cy);
      } else {
        ctx.fillStyle = unlitTextColor;
        ctx.fillText(cell.char, cx, cy);
      }
    });
  });

  // Minimal optional footer
  if (options.showFooter) {
    ctx.font = `400 12px ${FONT_FAMILY}`;
    ctx.fillStyle = palette[MUTED_COLOR_INDEX];
    ctx.textAlign = 'center';
    ctx.fillText(`QLOCKTWO • ${qlockState.languageName.toUpperCase()}`, width / 2, height - 12);
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  GLOBAL_SEED,
  DEFAULT_PALETTE_INDEX,
  COLOR_PALETTES,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  renderToBuffer
};
