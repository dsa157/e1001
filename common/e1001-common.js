/**
 * ============================================================================
 * Seeed reTerminal E1001 - Common p5.js Core Library
 * Version: 2026.09.21.21.35.00
 * Description: Reusable core modules, display constants, 5 curated monochromatic
 *              palettes, deterministic seed handling, 1-bit dithering, and
 *              keyboard navigation for all Seeed E1001 p5.js projects.
 *
 * Target Hardware Profile:
 * - Device: Seeed Studio reTerminal E1001 (ESP32-S3)
 * - Resolution: 800 x 480 pixels
 * - Color Mode: 1-bit Monochrome / 4-Level Grayscale Reflective E-Paper
 * ============================================================================
 */

// ============================================================================
// HARDWARE DISPLAY CONSTANTS (ZERO MAGIC NUMBERS)
// ============================================================================

const E1001_WIDTH = 800;    // default: 800 (Native E1001 width)
const E1001_HEIGHT = 480;   // default: 480 (Native E1001 height)
const E1001_CENTER_X = 400; // default: 400 (Native center X)
const E1001_CENTER_Y = 240; // default: 240 (Native center Y)

// ============================================================================
// 5 CURATED MONOCHROMATIC / GRAYSCALE PALETTES (Adobe Kuler Themes)
// E1001 Rule: Strictly monochrome & grayscale contrast steps (1-bit / 4-level e-paper)
// ============================================================================

const E1001_PALETTES = [
  // Palette 0: "Monochrome Minimalist" (Pure contrast scale from stark white to deep ink)
  ["#FFFFFF", "#D6D6D6", "#8C8C8C", "#404040", "#000000"],

  // Palette 1: "Charcoal & Mist" (Cool slate and charcoal e-ink gradations)
  ["#F4F6F7", "#D5D8DC", "#85929E", "#34495E", "#17202A"],

  // Palette 2: "High Contrast 1-Bit" (Strict binary pure white and pure black for sharpest e-ink)
  ["#FFFFFF", "#FFFFFF", "#000000", "#000000", "#000000"],

  // Palette 3: "Carbon Slate" (Architectural dense carbon and metallic graphite tones)
  ["#EAEDED", "#ABB2B9", "#566573", "#273746", "#0D1117"],

  // Palette 4: "Stipple Ink Tones" (Fine paper parchment with varying density micro-pigment tones)
  ["#F8F9F9", "#CCD1D1", "#7F8C8D", "#2C3E50", "#111111"]
];

const E1001_PALETTE_NAMES = [
  "0: Monochrome Minimalist",
  "1: Charcoal & Mist",
  "2: High Contrast 1-Bit",
  "3: Carbon Slate",
  "4: Stipple Ink Tones"
];

// ============================================================================
// E1001 COMMON UTILITIES & ENGINE CLASS
// ============================================================================

class E1001Engine {
  constructor(options = {}) {
    this.width = options.width || E1001_WIDTH;
    this.height = options.height || E1001_HEIGHT;
    this.seed = options.seed || 1001;
    this.paletteIndex = options.paletteIndex || 0;
    this.backgroundIndex = options.backgroundIndex || 0;
    this.ditherEnabled = false;
  }

  init(containerId = "eink-canvas-container") {
    const canvas = createCanvas(this.width, this.height);
    canvas.parent(containerId);
    pixelDensity(1);
    this.reseed(this.seed);
    this.bindGlobalKeyboard();
  }

  reseed(newSeed = null) {
    this.seed = newSeed !== null ? newSeed : floor(random(1, 999999));
    randomSeed(this.seed);
    noiseSeed(this.seed);
  }

  getActivePalette() {
    return E1001_PALETTES[this.paletteIndex % E1001_PALETTES.length];
  }

  getBackgroundColor() {
    const palette = this.getActivePalette();
    return color(palette[this.backgroundIndex % palette.length]);
  }

  setPalette(index) {
    this.paletteIndex = parseInt(index, 10);
  }

  setBackground(index) {
    this.backgroundIndex = parseInt(index, 10);
  }

  toggleDither() {
    this.ditherEnabled = !this.ditherEnabled;
    return this.ditherEnabled;
  }

  applyDitherPass() {
    if (!this.ditherEnabled) return;
    loadPixels();
    const w = width;
    const h = height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const oldLum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
        const newLum = oldLum < 128 ? 0 : 255;
        const err = oldLum - newLum;

        pixels[idx] = newLum;
        pixels[idx + 1] = newLum;
        pixels[idx + 2] = newLum;

        this._distributeError(x + 1, y, err * (7 / 16), w, h);
        this._distributeError(x - 1, y + 1, err * (3 / 16), w, h);
        this._distributeError(x, y + 1, err * (5 / 16), w, h);
        this._distributeError(x + 1, y + 1, err * (1 / 16), w, h);
      }
    }
    updatePixels();
  }

  _distributeError(x, y, err, w, h) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = (y * w + x) * 4;
    pixels[idx] = constrain(pixels[idx] + err, 0, 255);
    pixels[idx + 1] = constrain(pixels[idx + 1] + err, 0, 255);
    pixels[idx + 2] = constrain(pixels[idx + 2] + err, 0, 255);
  }

  exportImage(prefix = "e1001_art") {
    saveCanvas(, "png");
  }

  bindGlobalKeyboard() {
    window.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key.toLowerCase() === "r") {
        this.reseed();
        redraw();
      } else if (e.key.toLowerCase() === "d") {
        this.toggleDither();
        redraw();
      }
    });
  }
}
