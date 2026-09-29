/**
 * ============================================================================
 * Seeed reTerminal E1001 - 3D Isometric Brutalist Canvas Renderer (brutalist)
 * Version: 2026.09.29.20.43.00
 * Description: Generative 3D isometric brutalist architectural pipe structure
 *              rendered on 800x480 canvas buffer with gauge depth and occlusion.
 *              Fills the full frame across all corners.
 * Attribution: Created by https://www.instagram.com/dsa157.art
 * ============================================================================
 */

const { createCanvas } = require('@napi-rs/canvas');

// Top-level configuration parameters (Zero magic numbers)
const CANVAS_WIDTH = 800;                     // default: 800 (Native display width)
const CANVAS_HEIGHT = 480;                    // default: 480 (Native display height)
const CANVAS_PADDING = -60;                   // default: -60 (Negative padding ensures edge-to-edge frame filling)
const TOP_GAUGE = 46.0;                       // default: 46.0 (Maximum pipe gauge in px)
const BOT_GAUGE = 8.0;                        // default: 8.0 (Minimum pipe gauge in px)
const TOP_PEN = 6.0;                          // default: 6.0 (Maximum stroke pen weight in px)
const BOT_PEN = 1.0;                          // default: 1.0 (Minimum stroke pen weight in px)
const JITTER_STRENGTH = 0.25;                 // default: 0.25 (Angular jitter per connection)
const MAX_CRAWLER_STEPS = 1400;               // default: 1400 (Max simulation steps)
const ISO_ANGLE = Math.PI / 6;                // default: Math.PI / 6 (30 degrees)
const ISO_SCALE = 26.0;                       // default: 26.0 (Isometric grid cell scale)
const Z_HEIGHT_STEP = 38.0;                   // default: 38.0 (Vertical spacing between tiers)
const GRID_COLS = 32;                         // default: 32 (X dimension voxel count)
const GRID_ROWS = 32;                         // default: 32 (Y dimension voxel count)
const GRID_TIERS = 6;                         // default: 6 (Z dimension tier count)
const SPAWN_DIVISIONS = 5;                    // default: 5 (Spawning grid density across tiers)
const DEFAULT_PALETTE_INDEX = 0;              // default: 0
const DEFAULT_BG_INDEX = 4;                   // default: 4
const DEFAULT_STROKE_INDEX = 0;               // default: 0

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

function mapVal(value, start1, stop1, start2, stop2) {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

function constrainVal(n, low, high) {
  return Math.max(Math.min(n, high), low);
}

function lerpVal(start, stop, amt) {
  return start + (stop - start) * amt;
}

function distVal(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

class IsoCell {
  constructor(i, j, k) {
    this.i = i;
    this.j = j;
    this.k = k;
    this.x = (i - j) * Math.cos(ISO_ANGLE) * ISO_SCALE;
    this.y = (i + j) * Math.sin(ISO_ANGLE) * ISO_SCALE - (k * Z_HEIGHT_STEP);
    this.visited = false;
  }

  isInside(sx, sy) {
    return sx >= CANVAS_PADDING && sx <= CANVAS_WIDTH - CANVAS_PADDING &&
           sy >= CANVAS_PADDING && sy <= CANVAS_HEIGHT - CANVAS_PADDING;
  }
}

class Connection {
  constructor(a, b, jitter) {
    this.a = a;
    this.b = b;
    this.localJitter = jitter;
  }

  draw(ctx, bgCol, strokeCol, gridOffsetX, gridOffsetY) {
    const sx1 = this.a.x + gridOffsetX;
    const sy1 = this.a.y + gridOffsetY;
    const sx2 = this.b.x + gridOffsetX;
    const sy2 = this.b.y + gridOffsetY;

    if (!this.a.isInside(sx1, sy1) && !this.b.isInside(sx2, sy2)) return;

    const midY = (sy1 + sy2) / 2.0;
    const vFactor = constrainVal(mapVal(midY, 0, CANVAS_HEIGHT, 0.0, 1.0), 0.0, 1.0);

    const gauge = lerpVal(TOP_GAUGE, BOT_GAUGE, vFactor);
    const pen = Math.max(1.0, lerpVal(TOP_PEN, BOT_PEN, vFactor));
    const angle = Math.atan2(this.b.y - this.a.y, this.b.x - this.a.x) + this.localJitter;
    const d = distVal(this.a.x, this.a.y, this.b.x, this.b.y);
    const hw = gauge / 2.0;

    ctx.save();
    ctx.translate(this.a.x, this.a.y);
    ctx.rotate(angle);

    // Pipe solid occlusion body
    ctx.fillStyle = bgCol;
    ctx.fillRect(0, -hw, d, gauge);

    // Pipe brutalist edges
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = pen;
    ctx.strokeRect(0, -hw, d, gauge);

    ctx.restore();
  }
}

class IsoCrawler {
  constructor(grid, i, j, k) {
    this.grid = grid;
    this.current = grid[i][j][k];
    this.current.visited = true;
    this.stack = [];
    this.lastAxis = -1;
    this.active = true;
  }

  update(allConnections, rng) {
    if (!this.active) return;
    const next = this.getNeighbor(this.current, rng);
    if (next !== null) {
      next.visited = true;
      this.stack.push(this.current);
      const jitter = (rng() * 2 - 1) * JITTER_STRENGTH;
      allConnections.push(new Connection(this.current, next, jitter));
      if (next.i !== this.current.i) this.lastAxis = 0;
      else if (next.j !== this.current.j) this.lastAxis = 1;
      else this.lastAxis = 2;
      this.current = next;
    } else if (this.stack.length > 0) {
      this.current = this.stack.pop();
      this.lastAxis = -1;
    } else {
      this.active = false;
    }
  }

  getNeighbor(c, rng) {
    const neighbors = [];
    const offsets = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1]
    ];
    for (let axis = 0; axis < 3; axis++) {
      if (axis === this.lastAxis) continue;
      for (let dir = 0; dir < 2; dir++) {
        const idx = axis * 2 + dir;
        const ni = c.i + offsets[idx][0];
        const nj = c.j + offsets[idx][1];
        const nk = c.k + offsets[idx][2];
        if (ni >= 0 && nj >= 0 && nk >= 0 && ni < GRID_COLS && nj < GRID_ROWS && nk < GRID_TIERS) {
          if (!this.grid[ni][nj][nk].visited) {
            neighbors.push(this.grid[ni][nj][nk]);
          }
        }
      }
    }
    return neighbors.length > 0 ? neighbors[Math.floor(rng() * neighbors.length)] : null;
  }
}

async function renderBrutalist(options = {}) {
  const seed = options.seed || Date.now();
  const paletteIndex = options.paletteIndex !== undefined ? options.paletteIndex : DEFAULT_PALETTE_INDEX;
  const bgIndex = options.bgIndex !== undefined ? options.bgIndex : DEFAULT_BG_INDEX;
  const strokeIndex = options.strokeIndex !== undefined ? options.strokeIndex : DEFAULT_STROKE_INDEX;

  const palette = COLOR_PALETTES[paletteIndex % COLOR_PALETTES.length];
  const bgColor = palette[bgIndex % palette.length];
  const strokeColor = palette[strokeIndex % palette.length];

  const rng = createPrng(seed);
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Fill canvas background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const grid = [];
  for (let i = 0; i < GRID_COLS; i++) {
    grid[i] = [];
    for (let j = 0; j < GRID_ROWS; j++) {
      grid[i][j] = [];
      for (let k = 0; k < GRID_TIERS; k++) {
        grid[i][j][k] = new IsoCell(i, j, k);
      }
    }
  }

  const midI = GRID_COLS / 2.0;
  const midJ = GRID_ROWS / 2.0;
  const midK = GRID_TIERS / 2.0;
  const gridOffsetX = (CANVAS_WIDTH / 2.0) - (midI - midJ) * Math.cos(ISO_ANGLE) * ISO_SCALE;
  const gridOffsetY = (CANVAS_HEIGHT / 2.0) - ((midI + midJ) * Math.sin(ISO_ANGLE) * ISO_SCALE - (midK * Z_HEIGHT_STEP));

  const crawlers = [];
  const allConnections = [];

  for (let ti = 0; ti < SPAWN_DIVISIONS; ti++) {
    for (let tj = 0; tj < SPAWN_DIVISIONS; tj++) {
      for (let tk = 0; tk < GRID_TIERS; tk += 2) {
        const si = Math.floor(mapVal(ti, 0, SPAWN_DIVISIONS - 1, 0, GRID_COLS - 1));
        const sj = Math.floor(mapVal(tj, 0, SPAWN_DIVISIONS - 1, 0, GRID_ROWS - 1));
        crawlers.push(new IsoCrawler(grid, si, sj, tk));
      }
    }
  }

  for (let step = 0; step < MAX_CRAWLER_STEPS; step++) {
    for (const ic of crawlers) {
      ic.update(allConnections, rng);
    }
  }

  // Render with Z-order Occlusion
  ctx.save();
  ctx.translate(gridOffsetX, gridOffsetY);
  for (let k = 0; k < GRID_TIERS; k++) {
    for (const conn of allConnections) {
      if (Math.max(conn.a.k, conn.b.k) === k) {
        conn.draw(ctx, bgColor, strokeColor, gridOffsetX, gridOffsetY);
      }
    }
  }
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderBrutalist,
  COLOR_PALETTES
};
