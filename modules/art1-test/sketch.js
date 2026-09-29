/* ============================================================================
 * Seeed reTerminal E1001 Generative Algorithmic Art Sketch (p5.js)
 * Version: 2026.09.21.22.22.00
 * Description: Full-bleed generative artwork suite designed specifically for the
 * Seeed Studio reTerminal E1001 (800x480 E-Ink display).
 * Features 3 selectable designs switchable via UI, Hardware Buttons, or Auto-Cycle.
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

// Total number of selectable generative designs
const TOTAL_DESIGNS = 3; // default: 3

// Active Design Index: 0 = Harmonic Contours, 1 = Flow Streamlines, 2 = Sacred Rosette
let currentDesignIndex = 0; // default: 0

// Auto-Cycle Interval in seconds for switching to the next pattern with a new variation seed
const AUTO_CYCLE_INTERVAL_SEC = 15; // default: 15 (Interval in seconds to advance to next pattern)
const ENABLE_AUTO_CYCLE = true;      // default: true (Enable/disable automatic pattern rotation)

// Active Palette Index (0 to 4)
let activePaletteIndex = 0; // default: 0

// Background Color Index within the active palette (0 to 4)
let backgroundColorIndex = 0; // default: 0 (Tone 0: Lightest/White)

// Dithering Mode for 1-bit E-Ink preview
let enableOneBitDither = false; // default: false

// Algorithmic Generation Parameter Ranges (Seed-Modulated for Rich Variations)
const CONTOUR_LEVELS_MIN = 30;         // default: 20 (Min topological harmonic contour layers)
const CONTOUR_LEVELS_MAX = 70;         // default: 45 (Max topological harmonic contour layers)
const CONTOUR_STEPS_MIN = 180;         // default: 180 (Min angular resolution per contour curve)
const CONTOUR_STEPS_MAX = 300;         // default: 300 (Max angular resolution per contour curve)

const FLOW_RIBBON_COUNT_MIN = 25;      // default: 25 (Min parametric stream ribbons)
const FLOW_RIBBON_COUNT_MAX = 55;      // default: 55 (Max parametric stream ribbons)
const FLOW_CURVE_POINTS_MIN = 150;     // default: 150 (Min points per stream ribbon)
const FLOW_CURVE_POINTS_MAX = 250;     // default: 250 (Max points per stream ribbon)
const FLOW_CROSS_LINES_MIN = 10;       // default: 10 (Min cross-cutting harmonic streamlines)
const FLOW_CROSS_LINES_MAX = 22;       // default: 22 (Max cross-cutting harmonic streamlines)

const ROSETTE_PETALS_MIN = 5;         // default: 10 (Min symmetry order for sacred rosette)
const ROSETTE_PETALS_MAX = 15;         // default: 24 (Max symmetry order for sacred rosette)
const ROSETTE_RINGS_MIN = 18;          // default: 18 (Min concentric harmonic rosette rings)
const ROSETTE_RINGS_MAX = 36;          // default: 36 (Max concentric harmonic rosette rings)
const ROSETTE_SHELL_DEPTH_MIN = 3;     // default: 3 (Min harmonic petal shell depths)
const ROSETTE_SHELL_DEPTH_MAX = 7;     // default: 7 (Max harmonic petal shell depths)

const STROKE_WEIGHT_BOLD_MIN = 1.6;    // default: 1.6 (Min bold stroke weight for accent curves)
const STROKE_WEIGHT_BOLD_MAX = 2.8;    // default: 2.8 (Max bold stroke weight for accent curves)
const STROKE_WEIGHT_THIN_MIN = 0.8;    // default: 0.8 (Min fine stroke weight for detailed lines)
const STROKE_WEIGHT_THIN_MAX = 1.3;    // default: 1.3 (Max fine stroke weight for detailed lines)

// 5 Curated Monochromatic Palettes (Inherited from shared common core)
// Palette 0: "Monochrome Minimalist" - Crisp pure black & white with balanced intermediate mid-grays
// Palette 1: "Charcoal & Mist" - Slate-tinted deep charcoals and soft foggy whites
// Palette 2: "High Contrast 1-Bit" - Strict binary e-ink black & white for maximal readability
// Palette 3: "Carbon Slate" - Deep graphite tones, cool iron grays, and parchment whites
// Palette 4: "Stipple Ink Tones" - Classic lithographic ink wash steps
const COLOR_PALETTES = typeof E1001_PALETTES !== "undefined" ? E1001_PALETTES : [
  ["#FFFFFF", "#D6D6D6", "#8C8C8C", "#404040", "#000000"],
  ["#F4F6F7", "#D5D8DC", "#85929E", "#34495E", "#17202A"],
  ["#FFFFFF", "#FFFFFF", "#000000", "#000000", "#000000"],
  ["#EAEDED", "#ABB2B9", "#566573", "#273746", "#0D1117"],
  ["#F8F9F9", "#CCD1D1", "#7F8C8D", "#2C3E50", "#111111"]
];

// Current seed state
let currentSeed = GLOBAL_SEED;

// Auto-cycle timer reference
let autoCycleTimer = null;

// ============================================================================
// P5.JS SETUP & INITIALIZATION
// ============================================================================

function setup() {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  canvas.parent("eink-canvas-container");
  pixelDensity(1);

  initializeSeed(currentSeed);
  setupUIHandlers();
  startAutoCycleTimer();
  noLoop();
}

function initializeSeed(seedVal) {
  randomSeed(seedVal);
  noiseSeed(seedVal);
}

function generateNewSeed() {
  return Math.floor(Math.random() * 999999) + 1;
}

function draw() {
  redrawArt();
}

function redrawArt() {
  initializeSeed(currentSeed);

  const seedDisplay = document.getElementById("seed-display");
  if (seedDisplay) {
    seedDisplay.textContent = `Seed: ${currentSeed}`;
  }

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
// DESIGN 0: FULL-BLEED HARMONIC TOPOLOGICAL CONTOURS (SEED-MODULATED RANGES)
// ============================================================================

function drawHarmonicContours(palette, seedPhase) {
  noFill();

  const contourLevels = floor(random(CONTOUR_LEVELS_MIN, CONTOUR_LEVELS_MAX + 1));
  const contourSteps = floor(random(CONTOUR_STEPS_MIN, CONTOUR_STEPS_MAX + 1));
  const strokeBold = random(STROKE_WEIGHT_BOLD_MIN, STROKE_WEIGHT_BOLD_MAX);
  const strokeThin = random(STROKE_WEIGHT_THIN_MIN, STROKE_WEIGHT_THIN_MAX);

  for (let l = 0; l < contourLevels; l++) {
    const tNorm = (l + 1) / contourLevels;
    const toneIndex = (l % 4) + 1;
    stroke(color(palette[toneIndex]));
    strokeWeight((l % 5 === 0) ? strokeBold : strokeThin);

    const aBase = 12.0 + tNorm * 370.0;
    const bBase = 8.0 + tNorm * 220.0;

    beginShape();
    for (let i = 0; i <= contourSteps; i++) {
      const theta = (TWO_PI / contourSteps) * i;

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
    strokeWeight(strokeThin);
    ellipse(0, 0, r * 2 * (400 / 240) * 0.65, r * 2);
  }

  fill(color(palette[4]));
  noStroke();
  ellipse(0, 0, 8, 8);
}

// ============================================================================
// DESIGN 1: MULTI-LAYER PARAMETRIC FLOW STREAMLINES (SEED-MODULATED RANGES)
// ============================================================================

function drawFlowStreamlines(palette, seedPhase) {
  noFill();

  const halfW = CANVAS_WIDTH / 2;
  const halfH = CANVAS_HEIGHT / 2;

  const ribbonCount = floor(random(FLOW_RIBBON_COUNT_MIN, FLOW_RIBBON_COUNT_MAX + 1));
  const curvePoints = floor(random(FLOW_CURVE_POINTS_MIN, FLOW_CURVE_POINTS_MAX + 1));
  const crossLines = floor(random(FLOW_CROSS_LINES_MIN, FLOW_CROSS_LINES_MAX + 1));
  const strokeBold = random(STROKE_WEIGHT_BOLD_MIN, STROKE_WEIGHT_BOLD_MAX);
  const strokeThin = random(STROKE_WEIGHT_THIN_MIN, STROKE_WEIGHT_THIN_MAX);

  for (let r = 0; r < ribbonCount; r++) {
    const tNorm = r / (ribbonCount - 1);
    const yStart = map(tNorm, 0, 1, -halfH + 18, halfH - 18);
    const toneIdx = (r % 4) + 1;
    stroke(color(palette[toneIdx]));
    strokeWeight((r % 4 === 0) ? strokeBold : strokeThin);

    beginShape();
    for (let i = 0; i <= curvePoints; i++) {
      const x = map(i, 0, curvePoints, -halfW + 10, halfW - 10);
      const xNorm = x * 0.0075;

      const wave1 = sin(xNorm * 1.8 + tNorm * 5.5 + seedPhase) * 28.0;
      const wave2 = cos(xNorm * 3.4 - tNorm * 3.8 - seedPhase * 0.6) * 16.0;
      const wave3 = sin(xNorm * 0.8 + seedPhase) * 18.0 * sin(tNorm * PI);
      const y = yStart + wave1 + wave2 + wave3;

      vertex(x, y);
    }
    endShape();
  }

  strokeWeight(strokeThin);
  for (let c = 0; c < crossLines; c++) {
    const xBase = map(c, 0, crossLines - 1, -halfW + 35, halfW - 35);
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
// DESIGN 2: SACRED GEOMETRIC PHYLLOTAXIS & HYPERBOLIC ROSETTE (SEED-MODULATED RANGES)
// ============================================================================

function drawSacredRosette(palette, seedPhase) {
  noFill();

  const rosettePetals = floor(random(ROSETTE_PETALS_MIN, ROSETTE_PETALS_MAX + 1));
  const rosetteRings = floor(random(ROSETTE_RINGS_MIN, ROSETTE_RINGS_MAX + 1));
  const shellDepth = floor(random(ROSETTE_SHELL_DEPTH_MIN, ROSETTE_SHELL_DEPTH_MAX + 1));
  const strokeBold = random(STROKE_WEIGHT_BOLD_MIN, STROKE_WEIGHT_BOLD_MAX);
  const strokeThin = random(STROKE_WEIGHT_THIN_MIN, STROKE_WEIGHT_THIN_MAX);

  for (let p = 0; p < rosettePetals; p++) {
    const baseAngle = (TWO_PI / rosettePetals) * p + seedPhase * 0.2;
    const toneIdx = (p % 4) + 1;
    stroke(color(palette[toneIdx]));
    strokeWeight((p % 3 === 0) ? strokeBold : strokeThin);

    for (let s = 1; s <= shellDepth; s++) {
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

  for (let k = 1; k <= rosetteRings; k++) {
    const r = k * 7.5;
    const toneIdx = (k % 4) + 1;
    stroke(color(palette[toneIdx]));
    strokeWeight(strokeThin);

    beginShape();
    const verticesCount = 120;
    for (let v = 0; v <= verticesCount; v++) {
      const angle = (TWO_PI / verticesCount) * v;
      const mod = sin(angle * rosettePetals + seedPhase) * (3.0 + k * 0.25);
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
// AUTO-CYCLE LOGIC & DOM EVENT HANDLERS (AUTO-RESEED ON ANY BUTTON PRESS)
// ============================================================================

function advanceToNextPattern() {
  currentDesignIndex = (currentDesignIndex + 1) % TOTAL_DESIGNS;
  const designSelect = document.getElementById("design-select");
  if (designSelect) {
    designSelect.value = currentDesignIndex;
  }
  currentSeed = generateNewSeed();
  redraw();
}

function startAutoCycleTimer() {
  if (autoCycleTimer) {
    clearInterval(autoCycleTimer);
    autoCycleTimer = null;
  }
  if (ENABLE_AUTO_CYCLE && AUTO_CYCLE_INTERVAL_SEC > 0) {
    const intervalMs = AUTO_CYCLE_INTERVAL_SEC * 1000;
    autoCycleTimer = setInterval(() => {
      advanceToNextPattern();
    }, intervalMs);
  }
}

function setupUIHandlers() {
  const designSelect = document.getElementById("design-select");
  if (designSelect) {
    designSelect.value = currentDesignIndex;
    designSelect.addEventListener("change", (e) => {
      currentDesignIndex = parseInt(e.target.value, 10);
      currentSeed = generateNewSeed();
      startAutoCycleTimer();
      redraw();
    });
  }

  const paletteSelect = document.getElementById("palette-select");
  if (paletteSelect) {
    paletteSelect.value = activePaletteIndex;
    paletteSelect.addEventListener("change", (e) => {
      activePaletteIndex = parseInt(e.target.value, 10);
      currentSeed = generateNewSeed();
      startAutoCycleTimer();
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
      currentDesignIndex = (currentDesignIndex - 1 + TOTAL_DESIGNS) % TOTAL_DESIGNS;
      if (designSelect) designSelect.value = currentDesignIndex;
      currentSeed = generateNewSeed();
      startAutoCycleTimer();
      redraw();
    });
  }

  const btnNext = document.getElementById("btn-next");
  if (btnNext) {
    btnNext.addEventListener("click", () => {
      currentDesignIndex = (currentDesignIndex + 1) % TOTAL_DESIGNS;
      if (designSelect) designSelect.value = currentDesignIndex;
      currentSeed = generateNewSeed();
      startAutoCycleTimer();
      redraw();
    });
  }

  const btnReseed = document.getElementById("btn-reseed");
  if (btnReseed) {
    btnReseed.addEventListener("click", () => {
      currentSeed = generateNewSeed();
      startAutoCycleTimer();
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
      currentDesignIndex = (currentDesignIndex + 1) % TOTAL_DESIGNS;
      if (designSelect) designSelect.value = currentDesignIndex;
      currentSeed = generateNewSeed();
      startAutoCycleTimer();
      redraw();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      currentDesignIndex = (currentDesignIndex - 1 + TOTAL_DESIGNS) % TOTAL_DESIGNS;
      if (designSelect) designSelect.value = currentDesignIndex;
      currentSeed = generateNewSeed();
      startAutoCycleTimer();
      redraw();
    }
  });
}
