/**
 * ============================================================================
 * Generative Typographic Umlaut Art for Seeed reTerminal E1001 (p5.js)
 * Version: 2026.09.29.19.42.00
 * 
 * Description:
 * Generative typographic grid composition of rotated umlaut characters ('ë', 'ö', 'ä', 'ü')
 * rendered with DIFFERENCE blend mode to create overlapping negative-space geometries.
 * Produces a static high-contrast image on each run, seeded by the current timestamp.
 * 
 * Attribution:
 * Created by: https://www.instagram.com/dsa157.art
 * Converted from Processing Java to p5.js for Seeed reTerminal E1001.
 * ============================================================================
 */

// ==========================================
// CONFIGURATION & PARAMETERS (No Magic Numbers)
// ==========================================

// Global Seed: Uses current timestamp for unique generation each run, or custom numeric seed
let GLOBAL_SEED = Date.now(); // Default: Date.now()

// Canvas Dimensions (E1001 display aspect ratio/resolution)
let CANVAS_WIDTH = 800;   // Default: 800 (E1001 native display width)
let CANVAS_HEIGHT = 480;  // Default: 480 (E1001 native display height)

// Typography & Grid Configuration
let LETTERS = ['ë', 'ö', 'ä', 'ü'];              // Default: ['ë', 'ö', 'ä', 'ü']
let FONT_FAMILIES = ['Impact', 'Arial Black']; // Default: ['Impact', 'Arial Black', 'Helvetica', 'sans-serif']
let DEFAULT_FONT_SIZE = 160;                      // Default: 160 (Glyph size in px)
let X_SPACING = 80;                              // Default: 80 (Horizontal grid spacing)
let Y_SPACING = 80;                              // Default: 80 (Vertical grid spacing)
let MAX_ROTATION_DEG = 360;                      // Default: 360 (Max initial rotation angle)

// Adobe Kuler Color Palettes (5 pleasing palettes)
// Palette 0: "E-Ink Minimalist Monochrome" - High contrast stark black and white for crisp e-ink
// Palette 1: "Japanese Woodblock / Wabi-Sabi" - Earthy sumi ink, vermilion, and warm washi
// Palette 2: "Retro Bauhaus Modern" - Primary vintage geometric tones
// Palette 3: "Nordic Frost & Slate" - Deep graphite, slate greys, and icy white
// Palette 4: "Sand & Terracotta Coast" - Deep navy, terracotta, and warm paper tone
const COLOR_PALETTES = [
    ['#000000', '#222222', '#555555', '#AAAAAA', '#FFFFFF'], // 0: E-Ink Minimalist Monochrome
    ['#1A1A1A', '#C55144', '#7D8C86', '#D4A373', '#F4F1EA'], // 1: Japanese Woodblock / Wabi-Sabi
    ['#2E4057', '#048A81', '#F4D35E', '#EE964B', '#F95738'], // 2: Retro Bauhaus Modern
    ['#111418', '#222831', '#393E46', '#00ADB5', '#EEEEEE'], // 3: Nordic Frost & Slate
    ['#1D3557', '#457B9D', '#A8DADC', '#E63946', '#F1FAEE']  // 4: Sand & Terracotta Coast
];

// Active Palette & Background Selection
let ACTIVE_PALETTE_INDEX = 0; // Default: 0 (Index 0-4 to choose active palette)
let BG_COLOR_INDEX = 4;       // Default: 4 (Index 0-4 within active palette for background, 4 = light)
let FG_COLOR_INDEX = 4;       // Default: 4 (Index 0-4 within active palette for glyph fill in DIFFERENCE mode)

// ==========================================
// STATE VARIABLES
// ==========================================
let canvas = null;
let pg = null;
let characters = [];

class Character {
    constructor(x, y, char, angle) {
        this.x = x;
        this.y = y;
        this.myChar = char;
        this.angle = angle;
    }

    display(buffer) {
        buffer.push();
        buffer.translate(this.x, this.y);
        buffer.rotate(radians(this.angle));
        buffer.textSize(DEFAULT_FONT_SIZE);
        buffer.text(this.myChar, 0, 0);
        buffer.pop();
    }
}

function setup() {
    canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const container = document.getElementById('eink-canvas-container');
    if (container) {
        canvas.parent(container);
    }
    noLoop(); // Do not animate: return single static image each run
    generateArt();
}

function draw() {
    // Static render produced during setup() / generateArt()
}

function generateArt() {
    // Initialize PRNG with global seed for deterministic rendering
    randomSeed(GLOBAL_SEED);
    noiseSeed(GLOBAL_SEED);

    const seedBadge = document.getElementById('seed-display');
    if (seedBadge) {
        seedBadge.textContent = 'Seed: ' + GLOBAL_SEED;
    }

    const activePalette = COLOR_PALETTES[ACTIVE_PALETTE_INDEX % COLOR_PALETTES.length];
    const bgColor = activePalette[BG_COLOR_INDEX % activePalette.length];
    const fgColor = activePalette[FG_COLOR_INDEX % activePalette.length];

    // Pick font family deterministically from seed
    const fontIndex = Math.floor(random(0, FONT_FAMILIES.length));
    const fontName = FONT_FAMILIES[fontIndex];

    // Initialize or re-create PGraphics buffer for DIFFERENCE blend mode
    if (!pg) {
        pg = createGraphics(CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    pg.clear();
    pg.background(bgColor);
    pg.textFont(fontName);
    pg.textAlign(CENTER, CENTER);

    // Set DIFFERENCE blend mode for XOR overlapping negative-space effect
    pg.blendMode(DIFFERENCE);
    pg.fill(fgColor);
    pg.noStroke();

    // Center grid layout on canvas
    const cols = Math.floor(CANVAS_WIDTH / X_SPACING);
    const rows = Math.floor(CANVAS_HEIGHT / Y_SPACING);
    const gridTotalWidth = cols * X_SPACING;
    const gridTotalHeight = rows * Y_SPACING;
    const marginX = (CANVAS_WIDTH - gridTotalWidth) / 2 + (X_SPACING / 2);
    const marginY = (CANVAS_HEIGHT - gridTotalHeight) / 2 + (Y_SPACING / 2);

    characters = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = marginX + (c * X_SPACING);
            const y = marginY + (r * Y_SPACING);
            const letterIdx = Math.floor(random(0, LETTERS.length));
            const letter = LETTERS[letterIdx];
            const angle = random(0, MAX_ROTATION_DEG);
            const ch = new Character(x, y, letter, angle);
            characters.push(ch);
            ch.display(pg);
        }
    }

    // Render buffer to main canvas
    background(bgColor);
    image(pg, 0, 0);
}

// Global keypress listener for hotkeys
function keyPressed() {
    if (key === 'r' || key === 'R') {
        GLOBAL_SEED = Date.now();
        generateArt();
    } else if (key === 's' || key === 'S') {
        saveCanvas(canvas, 'e1001_umlaut_' + GLOBAL_SEED + '.png');
    }
}
