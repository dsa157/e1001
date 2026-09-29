/**
 * ============================================================================
 * Seeed reTerminal E1001 - Umlaut Typographic Art Canvas Renderer (umlaut)
 * Version: 2026.09.29.19.42.00
 * Description: Generative typographic grid composition of rotated umlaut characters
 *              rendered with DIFFERENCE blend mode on 800x480 canvas buffer.
 * Attribution: Created by https://www.instagram.com/dsa157.art
 * ============================================================================
 */

const { createCanvas } = require('@napi-rs/canvas');

// Top-level configuration parameters (Zero magic numbers)
const CANVAS_WIDTH = 800;                     // default: 800 (Native display width)
const CANVAS_HEIGHT = 480;                    // default: 480 (Native display height)
const DEFAULT_FONT_SIZE = 160;                // default: 160
const X_SPACING = 80;                         // default: 80
const Y_SPACING = 80;                         // default: 80
const MAX_ROTATION_DEG = 360;                 // default: 360
const LETTERS = ['ë', 'ö', 'ä', 'ü'];         // default: ['ë', 'ö', 'ä', 'ü']
const FONT_FAMILIES = ['Impact', 'Arial Black', 'sans-serif']; // default: ['Impact', 'Arial Black', 'sans-serif']
const DEFAULT_PALETTE_INDEX = 0;              // default: 0
const DEFAULT_BG_INDEX = 4;                   // default: 4
const DEFAULT_FG_INDEX = 4;                   // default: 4

// 5 Curated Adobe Kuler Color Palettes
const COLOR_PALETTES = [
  ['#000000', '#222222', '#555555', '#AAAAAA', '#FFFFFF'], // 0: E-Ink Minimalist Monochrome
  ['#1A1A1A', '#C55144', '#7D8C86', '#D4A373', '#F4F1EA'], // 1: Japanese Woodblock / Wabi-Sabi
  ['#2E4057', '#048A81', '#F4D35E', '#EE964B', '#F95738'], // 2: Retro Bauhaus Modern
  ['#111418', '#222831', '#393E46', '#00ADB5', '#EEEEEE'], // 3: Nordic Frost & Slate
  ['#1D3557', '#457B9D', '#A8DADC', '#E63946', '#F1FAEE']  // 4: Sand & Terracotta Coast
];

function createPrng(seed) {
  let s = Math.floor(seed) >>> 0;
  return function() {
    let t = (s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function renderUmlaut(options = {}) {
  const seed = options.seed || Date.now();
  const paletteIndex = options.paletteIndex !== undefined ? options.paletteIndex : DEFAULT_PALETTE_INDEX;
  const bgIndex = options.bgIndex !== undefined ? options.bgIndex : DEFAULT_BG_INDEX;
  const fgIndex = options.fgIndex !== undefined ? options.fgIndex : DEFAULT_FG_INDEX;

  const palette = COLOR_PALETTES[paletteIndex % COLOR_PALETTES.length];
  const bgColor = palette[bgIndex % palette.length];
  const fgColor = palette[fgIndex % palette.length];

  const rng = createPrng(seed);
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Fill base background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Set difference blend mode for XOR overlapping negative-space effect
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = fgColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontIdx = Math.floor(rng() * FONT_FAMILIES.length);
  const fontName = FONT_FAMILIES[fontIdx];
  ctx.font = `bold ${DEFAULT_FONT_SIZE}px "${fontName}", sans-serif`;

  const cols = Math.floor(CANVAS_WIDTH / X_SPACING);
  const rows = Math.floor(CANVAS_HEIGHT / Y_SPACING);
  const gridTotalWidth = cols * X_SPACING;
  const gridTotalHeight = rows * Y_SPACING;
  const marginX = (CANVAS_WIDTH - gridTotalWidth) / 2 + (X_SPACING / 2);
  const marginY = (CANVAS_HEIGHT - gridTotalHeight) / 2 + (Y_SPACING / 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = marginX + (c * X_SPACING);
      const y = marginY + (r * Y_SPACING);
      const letterIdx = Math.floor(rng() * LETTERS.length);
      const letter = LETTERS[letterIdx];
      const angleDeg = rng() * MAX_ROTATION_DEG;
      const angleRad = (angleDeg * Math.PI) / 180.0;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angleRad);
      ctx.fillText(letter, 0, 0);
      ctx.restore();
    }
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderUmlaut,
  COLOR_PALETTES
};
