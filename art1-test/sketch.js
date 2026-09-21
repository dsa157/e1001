/* ============================================================================
 * Seeed reTerminal E1001 Generative Algorithmic Art Sketch (p5.js)
 * Version: 2026.09.21.21.35.00
 * Description: Full-bleed generative artwork suite designed specifically for the
 * Seeed Studio reTerminal E1001 (800x480 E-Ink display).
 * Features 3 selectable designs switchable via UI or Hardware Buttons (GPIO3, 4, 5).
 * Leverages shared common E1001 core library (../common/e1001-common.js).
 *
 * Target Hardware Profile:
 * - Device: Seeed Studio reTerminal E1001 (ESP32-S3)
 * - Resolution: 800 x 480 pixels (Full-bleed, borderless, textless)
 * - Hardware Buttons: GPIO3 (Action/Reseed), GPIO4 (Next), GPIO5 (Prev)
 * ============================================================================ */

// ============================================================================
// TOP-LEVEL CONFIGURATION PARAMETERS (ZERO MAGIC NUMBERS)
// ============================================================================

// Global Seed for deterministic reproducibility
const GLOBAL_SEED = 1001; // default: 1001

// Canvas Dimensions (Native E1001 E-Ink resolution from common core)
const CANVAS_WIDTH = typeof E1001_WIDTH !== "undefined" ? E1001_WIDTH : 800;   // default: 800
const CANVAS_HEIGHT = typeof E1001_HEIGHT !== "undefined" ? E1001_HEIGHT : 480; // default: 480

// Active Design Index: 0 = Harmonic Contours, 1 = Flow Streamlines, 2 = Sacred Rosette
let currentDesignIndex = 0; // default: 0

// Active Palette Index (0 to 4)
let activePaletteIndex = 0; // default: 0

// Background Color Index within the active palette (0 to 4)
let backgroundColorIndex = 0; // default: 0 (Tone 0: Lightest/White)

// Dithering Mode for 1-bit E-Ink preview
let enableOneBitDither = false; // default: false

// Algorithmic Generation Parameters
const CONTOUR_LEVELS = 30;         // default: 30 (Number of topological harmonic contour layers)
const CONTOUR_STEPS = 240;         // default: 240 (Angular resolution per contour curve)
const FLOW_RIBBON_COUNT = 40;      // default: 40 (Number of parametric stream ribbons)
const FLOW_CURVE_POINTS = 200;     // default: 200 (Points per stream ribbon)
const ROSETTE_PETALS = 16;         // default: 16 (Symmetry order for sacred geometric rosette)
const ROSETTE_RINGS = 28;          // default: 28 (Concentric phyllotaxis harmonic rings)
const STROKE_WEIGHT_BOLD = 2.0;    // default: 2.0 (Bold stroke weight for accent curves)
const STROKE_WEIGHT_THIN = 1.0;    // default: 1.0 (Fine stroke weight for detailed lines)

// 5 Curated Monochromatic Palettes (Inherited from shared common core)
const COLOR_PALETTES = typeof E1001_PALETTES !== "undefined" ? E1001_PALETTES : [
  ["#FFFFFF", "#D6D6D6", "#8C8C8C", "#404040", "#000000"],
  ["#F4F6F7", "#D5D8DC", "#85929E", "#34495E", "#17202A"],
  ["#FFFFFF", "#FFFFFF", "#000000", "#000000", "#000000"],
  ["#EAEDED", "#ABB2B9", "#566573", "#273746", "#0D1117"],
  ["#F8F9F9", "#CCD1D1", "#7F8C8D", "#2C3E50", "#111111"]
];

// Current seed state
let currentSeed = GLOBAL_SEED;

// ============================================================================
// P5.JS SETUP & INITIALIZATION
// ============================================================================

function setup() {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  canvas.parent("eink-canvas-container");
  pixelDensity(1);

  initializeSeed(currentSeed);
  setupUIHandlers();
  noLoop();
}

function initializeSeed(seedVal) {
  randomSeed(seedVal);
  noiseSeed(seedVal);
}

function draw() {
  redrawArt();
}

function redrawArt() {
  initializeSeed(currentSeed);

  const activePalette = COLOR_PALETTES[activePaletteIndex];
  const bgColor = color(activePalette[backgroundColorIndex]);

  background(bgColor);

  push();
  translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

  const seedPhase = (currentSeed % 1000) * 0.00628;

  if (currentDesignIndex === 0) {
    drawHarmonicContours(activePalette, seedPhase);
  } else if (currentDesignIndex === 1) {
    drawFlowStreamlines(activePalette, seedPhase);
  } else if (currentDesignIndex === 2) {
    drawSacredRosette(activePalette, seedPhase);
  }

  pop();

  if (enableOneBitDither) {
    applyFloydSteinbergDither();
  }
}

// ============================================================================
// DESIGN 0: FULL-BLEED HARMONIC TOPOLOGICAL CONTOURS (SEED-MODULATED)
// ============================================================================

function drawHarmonicContours(palette, seedPhase) {
  noFill();

  for (let l = 0; l < CONTOUR_LEVELS; l++) {
    const tNorm = (l + 1) / CONTOUR_LEVELS;
    const toneIndex = (l % 4) + 1;
    stroke(color(palette[toneIndex]));
    strokeWeight((l % 5 === 0) ? STROKE_WEIGHT_BOLD : STROKE_WEIGHT_THIN);

    const aBase = 12.0 + tNorm * 370.0;
    const bBase = 8.0 + tNorm * 220.0;

    beginShape();
    for (let i = 0; i <= CONTOUR_STEPS; i++) {
      const theta = (TWO_PI / CONTOUR_STEPS) * i;

      const w1 = sin(theta * 5.0 + l * 0.38 + seedPhase) * cos(theta * 3.0 + seedPhase * 0.5) * 16.0 * tNorm;
      const w2 = sin(theta * 2.0 + l * 0.16 - seedPhase * 0.7) * 12.0 * tNorm;
      const w3 = cos(theta * 7.0 - l * 0.28 + seedPhase * 1.2) * 8.0 * tNorm;

      const curA = aBase + w1 + w2;
      const curB = bBase + w1 + w3;

      const px = cos(theta) * curA;
      const py = sin(theta) * curB;

      vertex(px, py);
    }
    endShape(CLOSE);
  }

  for (let r = 12; r <= 150; r += 20) {
    const ringTone = color(palette[(r / 20) % palette.length]);
    stroke(ringTone);
    strokeWeight(STROKE_WEIGHT_THIN);
    ellipse(0, 0, r * 2 * (400 / 240) * 0.65, r * 2);
  }

  fill(color(palette[4]));
  noStroke();
  ellipse(0, 0, 8, 8);
}

// ============================================================================
// DESIGN 1: MULTI-LAYER PARAMETRIC FLOW STREAMLINES (SEED-MODULATED)
// ============================================================================

function drawFlowStreamlines(palette, seedPhase) {
  noFill();

  const halfW = CANVAS_WIDTH / 2;
  const halfH = CANVAS_HEIGHT / 2;

  for (let r = 0; r < FLOW_RIBBON_COUNT; r++) {
    const tNorm = r / (FLOW_RIBBON_COUNT - 1);
    const yStart = map(tNorm, 0, 1, -halfH + 18, halfH - 18);
    const toneIdx = (r % 4) + 1;
    stroke(color(palette[toneIdx]));
    strokeWeight((r % 4 === 0) ? STROKE_WEIGHT_BOLD : STROKE_WEIGHT_THIN);

    beginShape();
    for (let i = 0; i <= FLOW_CURVE_POINTS; i++) {
      const x = map(i, 0, FLOW_CURVE_POINTS, -halfW + 10, halfW - 10);
      const xNorm = x * 0.0075;

      const wave1 = sin(xNorm * 1.8 + tNorm * 5.5 + seedPhase) * 28.0;
      const wave2 = cos(xNorm * 3.4 - tNorm * 3.8 - seedPhase * 0.6) * 16.0;
      const wave3 = sin(xNorm * 0.8 + seedPhase) * 18.0 * sin(tNorm * PI);
      const y = yStart + wave1 + wave2 + wave3;

      vertex(x, y);
    }
    endShape();
  }

  strokeWeight(STROKE_WEIGHT_THIN);
  for (let c = 0; c < 16; c++) {
    const xBase = map(c, 0, 15, -halfW + 35, halfW - 35);
    stroke(color(palette[(c % 3) + 2]));

    beginShape();
    for (let j = 0; j <= 100; j++) {
      const y = map(j, 0, 100, -halfH + 12, halfH - 12);
      const yNorm = y * 0.015;
      const x = xBase + sin(yNorm * 2.2 + c * 0.45 + seedPhase) * 22.0 * cos(yNorm * 0.8);
      vertex(x, y);
    }
    endShape();
  }
}

// ============================================================================
// DESIGN 2: SACRED GEOMETRIC PHYLLOTAXIS & HYPERBOLIC ROSETTE (SEED-MODULATED)
// ============================================================================

function drawSacredRosette(palette, seedPhase) {
  noFill();

  for (let p = 0; p < ROSETTE_PETALS; p++) {
    const baseAngle = (TWO_PI / ROSETTE_PETALS) * p + seedPhase * 0.2;
    const toneIdx = (p % 4) + 1;
    stroke(color(palette[toneIdx]));
    strokeWeight((p % 3 === 0) ? STROKE_WEIGHT_BOLD : STROKE_WEIGHT_THIN);

    for (let s = 1; s <= 5; s++) {
      const maxR = 140 + s * 16;
      beginShape();
      for (let a = 0; a <= 100; a++) {
        const phi = (TWO_PI / 100) * a;
        const rad = maxR * sin(phi * 3.0 + seedPhase * 0.5) * cos(phi * 2.0);
        const curAngle = baseAngle + phi * 0.5;

        const px = cos(curAngle) * rad * 1.45;
        const py = sin(curAngle) * rad;
        vertex(px, py);
      }
      endShape();
    }
  }

  for (let k = 1; k <= ROSETTE_RINGS; k++) {
    const r = k * 7.5;
    const toneIdx = (k % 4) + 1;
    stroke(color(palette[toneIdx]));
    strokeWeight(STROKE_WEIGHT_THIN);

    beginShape();
    const verticesCount = 120;
    for (let v = 0; v <= verticesCount; v++) {
      const angle = (TWO_PI / verticesCount) * v;
      const mod = sin(angle * ROSETTE_PETALS + seedPhase) * (3.0 + k * 0.25);
      const rad = r + mod;

      const px = cos(angle) * rad * 1.55;
      const py = sin(angle) * rad;
      vertex(px, py);
    }
    endShape(CLOSE);
  }

  fill(color(palette[4]));
  noStroke();
  ellipse(0, 0, 10, 10);
}

// ============================================================================
// 1-BIT FLOYD-STEINBERG DITHERING SIMULATOR
// ============================================================================

function applyFloydSteinbergDither() {
  loadPixels();
  const w = width;
  const h = height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const oldR = pixels[idx];
      const oldG = pixels[idx + 1];
      const oldB = pixels[idx + 2];
      const oldLum = 0.299 * oldR + 0.587 * oldG + 0.114 * oldB;

      const newLum = oldLum < 128 ? 0 : 255;
      const err = oldLum - newLum;

      pixels[idx] = newLum;
      pixels[idx + 1] = newLum;
      pixels[idx + 2] = newLum;

      distributeDitherError(x + 1, y, err * (7 / 16), w, h);
      distributeDitherError(x - 1, y + 1, err * (3 / 16), w, h);
      distributeDitherError(x, y + 1, err * (5 / 16), w, h);
      distributeDitherError(x + 1, y + 1, err * (1 / 16), w, h);
    }
  }
  updatePixels();
}

function distributeDitherError(x, y, err, w, h) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const idx = (y * w + x) * 4;
  pixels[idx] = constrain(pixels[idx] + err, 0, 255);
  pixels[idx + 1] = constrain(pixels[idx + 1] + err, 0, 255);
  pixels[idx + 2] = constrain(pixels[idx + 2] + err, 0, 255);
}

// ============================================================================
// DOM EVENT HANDLERS & NAVIGATION CONTROLS (AUTO-RESEED ON ANY BUTTON PRESS)
// ============================================================================

function setupUIHandlers() {
  const designSelect = document.getElementById("design-select");
  if (designSelect) {
    designSelect.value = currentDesignIndex;
    designSelect.addEventListener("change", (e) => {
      currentDesignIndex = parseInt(e.target.value, 10);
      currentSeed = floor(random(1, 999999));
      redraw();
    });
  }

  const paletteSelect = document.getElementById("palette-select");
  if (paletteSelect) {
    paletteSelect.value = activePaletteIndex;
    paletteSelect.addEventListener("change", (e) => {
      activePaletteIndex = parseInt(e.target.value, 10);
      currentSeed = floor(random(1, 999999));
      redraw();
    });
  }

  const bgSelect = document.getElementById("bg-select");
  if (bgSelect) {
    bgSelect.value = backgroundColorIndex;
    bgSelect.addEventListener("change", (e) => {
      backgroundColorIndex = parseInt(e.target.value, 10);
      redraw();
    });
  }

  const btnPrev = document.getElementById("btn-prev");
  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      currentDesignIndex = (currentDesignIndex - 1 + 3) % 3;
      if (designSelect) designSelect.value = currentDesignIndex;
      currentSeed = floor(random(1, 999999));
      redraw();
    });
  }

  const btnNext = document.getElementById("btn-next");
  if (btnNext) {
    btnNext.addEventListener("click", () => {
      currentDesignIndex = (currentDesignIndex + 1) % 3;
      if (designSelect) designSelect.value = currentDesignIndex;
      currentSeed = floor(random(1, 999999));
      redraw();
    });
  }

  const btnReseed = document.getElementById("btn-reseed");
  if (btnReseed) {
    btnReseed.addEventListener("click", () => {
      currentSeed = floor(random(1, 999999));
      redraw();
    });
  }

  const btnDither = document.getElementById("btn-dither");
  if (btnDither) {
    btnDither.addEventListener("click", () => {
      enableOneBitDither = !enableOneBitDither;
      btnDither.classList.toggle("btn-active", enableOneBitDither);
      redraw();
    });
  }

  const btnExport = document.getElementById("btn-export");
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      saveCanvas(`e1001_art_design_${currentDesignIndex}_seed_${currentSeed}`, "png");
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      currentDesignIndex = (currentDesignIndex + 1) % 3;
      if (designSelect) designSelect.value = currentDesignIndex;
      currentSeed = floor(random(1, 999999));
      redraw();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      currentDesignIndex = (currentDesignIndex - 1 + 3) % 3;
      if (designSelect) designSelect.value = currentDesignIndex;
      currentSeed = floor(random(1, 999999));
      redraw();
    }
  });
}
