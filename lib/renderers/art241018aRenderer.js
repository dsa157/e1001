/**
 * ============================================================================
 * Seeed reTerminal E1001 - Modular Grid Art Hub Canvas Renderer (art-241018a)
 * Version: 2026.09.29.18.25.00
 * Description: Algorithmic modular arc and line patterns for E1001 800x480 buffer.
 * Attribution: Based on work by takawo (https://openprocessing.org/@takawo)
 * ============================================================================
 */

const { createCanvas } = require('@napi-rs/canvas');

// Top-level configuration parameters (Zero magic numbers)
const CANVAS_WIDTH = 800;                     // default: 800 (Native display width)
const CANVAS_HEIGHT = 480;                    // default: 480 (Native display height)
const MARGIN = 40;                            // default: 40
const CELL_BASE_MULTIPLIER = 5;               // default: 5
const MIN_GRID_CELL_FACTOR = 2;               // default: 2
const MAX_GRID_CELL_FACTOR = 12;              // default: 12
const STROKE_WEIGHT_RATIO = 0.16;             // default: 0.16 (Doubled from 0.08 for bold strokes)
const ARC_PROBABILITY = 0.55;                 // default: 0.55
const ARC_CONCENTRIC_COUNT = 3;               // default: 3
const ARC_DIAMETER_SCALE = 2;                 // default: 2
const CORNER_COUNT = 4;                       // default: 4
const DEFAULT_PALETTE_INDEX = 0;              // default: 0
const DEFAULT_BG_INDEX = 4;                   // default: 4

// 5 Curated Adobe Kuler Color Palettes
const COLOR_PALETTES = [
  ['#1A1A1A', '#4A4A4A', '#808080', '#D0D0D0', '#F7F7F7'], // 0: E-Ink Minimalist Monochrome
  ['#2B2B2B', '#C55144', '#7D8C86', '#D4A373', '#F4F1EA'], // 1: Japanese Woodblock / Wabi-Sabi
  ['#2E4057', '#048A81', '#F4D35E', '#EE964B', '#F95738'], // 2: Retro Bauhaus Modern
  ['#222831', '#393E46', '#948B77', '#00ADB5', '#EEEEEE'], // 3: Nordic Frost & Slate
  ['#1D3557', '#457B9D', '#A8DADC', '#E63946', '#F1FAEE']  // 4: Sand & Terracotta Coast
];

const FG_COLOR_INDICES = [0, 1, 2, 3];

function createPrng(seed) {
  let s = Math.floor(seed) >>> 0;
  return function() {
    let t = (s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function renderArt241018a(options = {}) {
  const seed = options.seed || Math.floor(Math.random() * 1000000);
  const paletteIndex = options.paletteIndex !== undefined ? options.paletteIndex : DEFAULT_PALETTE_INDEX;
  const bgIndex = options.bgIndex !== undefined ? options.bgIndex : DEFAULT_BG_INDEX;
  const palette = COLOR_PALETTES[paletteIndex % COLOR_PALETTES.length];
  const bgColor = palette[bgIndex % palette.length];

  const rng = createPrng(seed);
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const size = CELL_BASE_MULTIPLIER * (Math.ceil(rng() * MAX_GRID_CELL_FACTOR) + MIN_GRID_CELL_FACTOR);
  const sw = Math.max(1, size * STROKE_WEIGHT_RATIO);
  ctx.lineWidth = sw;
  ctx.lineCap = 'round';

  const totalX = Math.floor((CANVAS_WIDTH - MARGIN * 2) / size);
  const totalY = Math.floor((CANVAS_HEIGHT - MARGIN * 2) / size);

  const mgX = (CANVAS_WIDTH - totalX * size) / 2;
  const mgY = (CANVAS_HEIGHT - totalY * size) / 2;

  for (let i = 0; i < totalX; i++) {
    for (let j = 0; j < totalY; j++) {
      const x = i * size + mgX;
      const y = j * size + mgY;

      const colorIdx = FG_COLOR_INDICES[Math.floor(rng() * FG_COLOR_INDICES.length)];
      const strokeColor = palette[colorIdx % palette.length];
      ctx.strokeStyle = strokeColor;

      const isArc = rng() < ARC_PROBABILITY;
      if (isArc) {
        const center = Math.floor(rng() * CORNER_COUNT);
        const cx = center % 3 === 0 ? x : x + size;
        const cy = center < 2 ? y : y + size;
        const beginAngle = center * (Math.PI / 2);
        const endAngle = beginAngle + (Math.PI / 2);
        const stepFraction = 1.0 / ARC_CONCENTRIC_COUNT;

        for (let scl = 1.0; scl > 0; scl -= stepFraction) {
          const radius = (size * ARC_DIAMETER_SCALE * scl) / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, beginAngle, endAngle);
          ctx.stroke();
        }
      } else {
        const corners = [
          { x: x, y: y },
          { x: x + size, y: y },
          { x: x + size, y: y + size },
          { x: x, y: y + size }
        ];
        const beginIdx = Math.floor(rng() * CORNER_COUNT);
        let list = [0, 1, 2, 3].filter(idx => idx !== beginIdx);
        const endIdx = list[Math.floor(rng() * list.length)];

        ctx.beginPath();
        ctx.moveTo(corners[beginIdx].x, corners[beginIdx].y);
        ctx.lineTo(corners[endIdx].x, corners[endIdx].y);
        ctx.stroke();
      }
    }
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderArt241018a
};
