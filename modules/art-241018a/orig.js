/**
 * Generative Modular Grid Art for E1001 E-Ink Display
 * 
 * Version: 2026.09.29.18.17.24
 * 
 * Description:
 * Generative geometric modular patterns of arcs and lines configured for the E1001 display.
 * Generates a distinct static composition on each execution using a configurable seed.
 * Grid modules connect corner-to-corner using concentric arcs and segmented lines.
 * 
 * Attribution:
 * Original Creator: takawo (https://openprocessing.org/@takawo)
 * Adapted for E1001 static generation.
 */

// ==========================================
// CONFIGURATION & PARAMETERS (No Magic Numbers)
// ==========================================

// Global Seed: set to a fixed number for exact reproducibility or let Math.random() pick one
let GLOBAL_SEED = Math.floor(Math.random() * 1000000); // Default: Math.floor(Math.random() * 1000000)

// Canvas Dimensions (E1001 display aspect ratio/resolution)
let CANVAS_WIDTH = 800;   // Default: 800 (E1001 native display width)
let CANVAS_HEIGHT = 480;  // Default: 480 (E1001 native display height)

// Grid & Layout Parameters
let MARGIN = 40;                     // Default: 40 (Canvas margin around the grid)
let CELL_BASE_MULTIPLIER = 5;        // Default: 5 (Base pixel unit for grid cells)
let MIN_GRID_CELL_FACTOR = 2;        // Default: 2 (Minimum cell size factor)
let MAX_GRID_CELL_FACTOR = 12;       // Default: 12 (Random multiplier ceiling for cell size)
let STROKE_WEIGHT_RATIO = 0.08;      // Default: 0.08 (Stroke weight relative to cell size)
let ARC_PROBABILITY = 0.55;          // Default: 0.55 (Probability of an Arc vs Line module)
let ARC_CONCENTRIC_COUNT = 3;        // Default: 3 (Number of concentric arc rings)
let ARC_DIAMETER_SCALE = 2;          // Default: 2 (Diameter scale multiplier for arcs)
let CORNER_COUNT = 4;                // Default: 4 (4 corners per grid module)

// Adobe Kuler Color Palettes (5 pleasing palettes)
// Palette 0: "E-Ink Minimalist Monochrome" - High contrast shades for crisp e-ink rendering
// Palette 1: "Japanese Woodblock / Wabi-Sabi" - Earthy, refined tonal balance
// Palette 2: "Retro Bauhaus Modern" - Vibrant vintage geometric tones
// Palette 3: "Nordic Frost & Slate" - Cool slate greys and cyan accent
// Palette 4: "Sand & Terracotta Coast" - Warm oceanic and terracotta hues
const COLOR_PALETTES = [
    ['#1A1A1A', '#4A4A4A', '#808080', '#D0D0D0', '#F7F7F7'], // 0: E-Ink Minimalist Monochrome
    ['#2B2B2B', '#C55144', '#7D8C86', '#D4A373', '#F4F1EA'], // 1: Japanese Woodblock / Wabi-Sabi
    ['#2E4057', '#048A81', '#F4D35E', '#EE964B', '#F95738'], // 2: Retro Bauhaus Modern
    ['#222831', '#393E46', '#948B77', '#00ADB5', '#EEEEEE'], // 3: Nordic Frost & Slate
    ['#1D3557', '#457B9D', '#A8DADC', '#E63946', '#F1FAEE']  // 4: Sand & Terracotta Coast
];

// Active Palette & Background Selection
let ACTIVE_PALETTE_INDEX = 0; // Default: 0 (Index 0-4 to select active palette)
let BG_COLOR_INDEX = 4;       // Default: 4 (Index 0-4 within active palette for background)
let FG_COLOR_INDICES = [0, 1, 2, 3]; // Default: [0, 1, 2, 3] (Indices used for foreground elements)

// ==========================================
// STATE VARIABLES
// ==========================================
let canvas = null;
let modules = [];
let size = 0;
let strokeWeightValue = 0;
let mgX = 0;
let mgY = 0;

function setup() {
    canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const container = document.getElementById('eink-canvas-container');
    if (container) {
        canvas.parent(container);
    }
    noLoop();
    generateArt();
}

function draw() {
    // Static render produced during setup() / generateArt()
}

function generateArt() {
    // Initialize random generator with global seed for reproducibility
    randomSeed(GLOBAL_SEED);
    noiseSeed(GLOBAL_SEED);

    const seedBadge = document.getElementById('seed-display');
    if (seedBadge) {
        seedBadge.textContent = 'Seed: ' + GLOBAL_SEED;
    }

    let activePalette = COLOR_PALETTES[ACTIVE_PALETTE_INDEX % COLOR_PALETTES.length];
    let bgColor = activePalette[BG_COLOR_INDEX % activePalette.length];
    background(bgColor);
    noFill();

    modules = [];
    size = CELL_BASE_MULTIPLIER * (Math.ceil(random() * MAX_GRID_CELL_FACTOR) + MIN_GRID_CELL_FACTOR);
    strokeWeightValue = max(1, size * STROKE_WEIGHT_RATIO);
    strokeWeight(strokeWeightValue);

    let totalX = floor((width - MARGIN * 2) / size);
    let totalY = floor((height - MARGIN * 2) / size);

    // Center the overall code output on the canvas
    mgX = (width - totalX * size) / 2;
    mgY = (height - totalY * size) / 2;

    for (let i = 0; i < totalX; i++) {
        for (let j = 0; j < totalY; j++) {
            let m = new Module(i, j, activePalette);
            modules.push(m);
            m.display();
        }
    }
}

function mousePressed() {
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        let fs = fullscreen();
        fullscreen(!fs);
    }
}

function windowResized() {
    // Regenerate on resize if needed
    generateArt();
}

function keyPressed() {
    let k = key.toLowerCase();
    if (k === 's') {
        saveCanvas(canvas, 'e1001_art_seed_' + GLOBAL_SEED + '.png');
    }
    if (k === 'r') {
        // Generate new random seed on refresh
        GLOBAL_SEED = Math.floor(Math.random() * 1000000);
        generateArt();
    }
}

class Module {
    constructor(indexX, indexY, palette) {
        this.indexX = indexX;
        this.indexY = indexY;
        this.palette = palette;
        this.x = this.indexX * size + mgX;
        this.y = this.indexY * size + mgY;
        
        let colorIdx = FG_COLOR_INDICES[Math.floor(random() * FG_COLOR_INDICES.length)];
        this.elementColor = this.palette[colorIdx % this.palette.length];
        this.element = random() < ARC_PROBABILITY ? new Arc(this.x, this.y) : new Line(this.x, this.y);
    }

    display() {
        noFill();
        stroke(this.elementColor);
        this.element.display();
    }
}

class Arc {
    constructor(topLeftX, topLeftY) {
        this.topLeftX = topLeftX;
        this.topLeftY = topLeftY;
        this.center = Math.floor(random() * CORNER_COUNT);
    }

    display() {
        let cx = this.center % 3 === 0 ? this.topLeftX : this.topLeftX + size;
        let cy = this.center < 2 ? this.topLeftY : this.topLeftY + size;
        let begin = this.center * HALF_PI;
        let stepFraction = 1.0 / ARC_CONCENTRIC_COUNT;

        for (let scl = 1.0; scl > 0; scl -= stepFraction) {
            arc(cx, cy, size * ARC_DIAMETER_SCALE * scl, size * ARC_DIAMETER_SCALE * scl, begin, begin + HALF_PI);
        }
    }
}

class Line {
    constructor(topLeftX, topLeftY) {
        this.topLeftX = topLeftX;
        this.topLeftY = topLeftY;
        this.init();
    }

    getX(index) {
        return index === 0 || index === 3 ? this.topLeftX : this.topLeftX + size;
    }

    getY(index) {
        return index === 0 || index === 1 ? this.topLeftY : this.topLeftY + size;
    }

    init() {
        let list = [];
        for (let i = 0; i < CORNER_COUNT; i++) {
            list.push(i);
        }
        let beginIndex = Math.floor(random() * CORNER_COUNT);
        this.begin = createVector(this.getX(beginIndex), this.getY(beginIndex));
        list.splice(beginIndex, 1);
        let endIndex = list[Math.floor(random() * (CORNER_COUNT - 1))];
        this.end = createVector(this.getX(endIndex), this.getY(endIndex));
    }

    display() {
        line(this.begin.x, this.begin.y, this.end.x, this.end.y);
    }
}