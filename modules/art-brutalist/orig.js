/**
 * ============================================================================
 * 3D-Isometric Brutalist Pipe Network for Seeed reTerminal E1001 (p5.js)
 * Version: 2026.09.29.20.43.00
 * 
 * Description:
 * Generative 3D isometric brutalist architectural pipe structure.
 * Simulates spatial crawler growth through a multi-tier isometric 3D voxel grid.
 * Renders heavy industrial conduits with vertical perspective tapering,
 * gauge depth, local jitter, and Z-order occlusion.
 * Produces a full-frame static high-contrast composition on each run seeded by timestamp.
 * 
 * Attribution:
 * Created by: https://www.instagram.com/dsa157.art
 * Converted from Processing Java to p5.js for Seeed reTerminal E1001.
 * ============================================================================
 */

// ==========================================
// CONFIGURATION & PARAMETERS (No Magic Numbers)
// ==========================================

// Global Seed: Current timestamp for unique generative state each run
let GLOBAL_SEED = Date.now(); // Default: Date.now()

// Canvas Dimensions (E1001 display aspect ratio/resolution)
let CANVAS_WIDTH = 800;   // Default: 800 (E1001 native display width)
let CANVAS_HEIGHT = 480;  // Default: 480 (E1001 native display height)
let CANVAS_PADDING = -60; // Default: -60 (Negative padding ensures dense edge-to-edge frame filling)

// Brutalist Pipe Geometry Parameters
let TOP_GAUGE = 46.0;          // Default: 46.0 (Maximum pipe gauge / width in px)
let BOT_GAUGE = 8.0;           // Default: 8.0 (Minimum pipe gauge at depth in px)
let TOP_PEN = 6.0;             // Default: 6.0 (Maximum stroke pen weight in px)
let BOT_PEN = 1.0;             // Default: 1.0 (Minimum stroke pen weight in px)
let JITTER_STRENGTH = 0.25;    // Default: 0.25 (Angular jitter per connection)
let MAX_CRAWLER_STEPS = 1400;  // Default: 1400 (Simulation steps to fully populate network and corners)

// 3D Isometric Lattice Parameters
let ISO_ANGLE = Math.PI / 6;   // Default: Math.PI / 6 (30 degrees standard isometric)
let ISO_SCALE = 26.0;          // Default: 26.0 (Isometric grid cell scale factor)
let Z_HEIGHT_STEP = 38.0;      // Default: 38.0 (Vertical spacing between tiers)
let GRID_COLS = 32;            // Default: 32 (X dimension voxel count)
let GRID_ROWS = 32;            // Default: 32 (Y dimension voxel count)
let GRID_TIERS = 6;            // Default: 6 (Z dimension tier count)
let SPAWN_DIVISIONS = 5;       // Default: 5 (Spawning grid density across tiers: 5x5x3 = 75 crawlers)

// Adobe Kuler Color Palettes (5 curated palettes)
// Palette 0: "E-Ink Minimalist Monochrome" - Stark structural black and white
// Palette 1: "Japanese Woodblock / Wabi-Sabi" - Sumi ink, vermilion, and warm washi
// Palette 2: "Retro Bauhaus Modern" - Vintage deep navy, amber, and terracotta
// Palette 3: "Nordic Frost & Slate" - Deep graphite, slate greys, and icy cyan
// Palette 4: "Sand & Terracotta Coast" - Ocean navy, terracotta, and warm sand
const COLOR_PALETTES = [
    ['#000000', '#222222', '#555555', '#AAAAAA', '#FFFFFF'], // 0: E-Ink Minimalist Monochrome
    ['#1A1A1A', '#C55144', '#7D8C86', '#D4A373', '#F4F1EA'], // 1: Japanese Woodblock / Wabi-Sabi
    ['#2E4057', '#048A81', '#F4D35E', '#EE964B', '#F95738'], // 2: Retro Bauhaus Modern
    ['#111418', '#222831', '#393E46', '#00ADB5', '#EEEEEE'], // 3: Nordic Frost & Slate
    ['#1D3557', '#457B9D', '#A8DADC', '#E63946', '#F1FAEE']  // 4: Sand & Terracotta Coast
];

// Active Palette & Background Selection
let ACTIVE_PALETTE_INDEX = 0; // Default: 0 (Index 0-4 to choose active palette)
let BG_COLOR_INDEX = 4;       // Default: 4 (Index 0-4 within active palette for background)
let PIPE_FILL_INDEX = 4;      // Default: 4 (Pipe body occlusion fill tone)
let STROKE_COLOR_INDEX = 0;   // Default: 0 (Pipe edge outline stroke tone)

// ==========================================
// STATE & DATA STRUCTURES
// ==========================================
let canvas = null;
let grid = [];
let allConnections = [];
let crawlers = [];
let gridOffsetX = 0;
let gridOffsetY = 0;
let totalCells = 0;
let visitedCount = 0;

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

    display(bgCol, strokeCol) {
        const sx1 = this.a.x + gridOffsetX;
        const sy1 = this.a.y + gridOffsetY;
        const sx2 = this.b.x + gridOffsetX;
        const sy2 = this.b.y + gridOffsetY;

        if (!this.a.isInside(sx1, sy1) && !this.b.isInside(sx2, sy2)) return;

        const midY = (sy1 + sy2) / 2.0;
        const vFactor = constrain(map(midY, 0, CANVAS_HEIGHT, 0.0, 1.0), 0.0, 1.0);

        const gauge = lerp(TOP_GAUGE, BOT_GAUGE, vFactor);
        const pen = max(1.0, lerp(TOP_PEN, BOT_PEN, vFactor));
        const angle = Math.atan2(this.b.y - this.a.y, this.b.x - this.a.x) + this.localJitter;
        const d = dist(this.a.x, this.a.y, this.b.x, this.b.y);
        const hw = gauge / 2.0;

        push();
        translate(this.a.x, this.a.y);
        rotate(angle);

        // Pipe solid occlusion body
        noStroke();
        fill(bgCol);
        rect(0, -hw, d, gauge);

        // Pipe brutalist edges
        stroke(strokeCol);
        strokeWeight(pen);
        noFill();
        line(0, -hw, d, -hw);
        line(0, hw, d, hw);
        line(0, -hw, 0, hw);
        line(d, -hw, d, hw);
        pop();
    }
}

class IsoCrawler {
    constructor(i, j, k) {
        this.current = grid[i][j][k];
        this.current.visited = true;
        visitedCount++;
        this.stack = [];
        this.lastAxis = -1;
        this.active = true;
    }

    update() {
        if (!this.active) return;
        const next = this.getNeighbor(this.current);
        if (next !== null) {
            next.visited = true;
            visitedCount++;
            this.stack.push(this.current);
            const jitter = random(-JITTER_STRENGTH, JITTER_STRENGTH);
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

    getNeighbor(c) {
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
                    if (!grid[ni][nj][nk].visited) {
                        neighbors.push(grid[ni][nj][nk]);
                    }
                }
            }
        }
        return neighbors.length > 0 ? neighbors[Math.floor(random(neighbors.length))] : null;
    }
}

function setup() {
    canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const container = document.getElementById('eink-canvas-container');
    if (container) {
        canvas.parent(container);
    }
    noLoop(); // Single static run
    generateArt();
}

function draw() {
    // Static render produced during setup() / generateArt()
}

function generateArt() {
    randomSeed(GLOBAL_SEED);
    noiseSeed(GLOBAL_SEED);

    const seedBadge = document.getElementById('seed-display');
    if (seedBadge) {
        seedBadge.textContent = 'Seed: ' + GLOBAL_SEED;
    }

    const activePalette = COLOR_PALETTES[ACTIVE_PALETTE_INDEX % COLOR_PALETTES.length];
    const bgColor = activePalette[BG_COLOR_INDEX % activePalette.length];
    const pipeFillColor = activePalette[PIPE_FILL_INDEX % activePalette.length];
    const strokeColor = activePalette[STROKE_COLOR_INDEX % activePalette.length];

    background(bgColor);

    totalCells = GRID_COLS * GRID_ROWS * GRID_TIERS;
    visitedCount = 0;
    allConnections = [];
    grid = [];

    // Initialize 3D Isometric Grid
    for (let i = 0; i < GRID_COLS; i++) {
        grid[i] = [];
        for (let j = 0; j < GRID_ROWS; j++) {
            grid[i][j] = [];
            for (let k = 0; k < GRID_TIERS; k++) {
                grid[i][j][k] = new IsoCell(i, j, k);
            }
        }
    }

    // Center grid in canvas
    const midI = GRID_COLS / 2.0;
    const midJ = GRID_ROWS / 2.0;
    const midK = GRID_TIERS / 2.0;
    gridOffsetX = (CANVAS_WIDTH / 2.0) - (midI - midJ) * Math.cos(ISO_ANGLE) * ISO_SCALE;
    gridOffsetY = (CANVAS_HEIGHT / 2.0) - ((midI + midJ) * Math.sin(ISO_ANGLE) * ISO_SCALE - (midK * Z_HEIGHT_STEP));

    crawlers = [];
    for (let ti = 0; ti < SPAWN_DIVISIONS; ti++) {
        for (let tj = 0; tj < SPAWN_DIVISIONS; tj++) {
            for (let tk = 0; tk < GRID_TIERS; tk += 2) {
                const si = Math.floor(map(ti, 0, SPAWN_DIVISIONS - 1, 0, GRID_COLS - 1));
                const sj = Math.floor(map(tj, 0, SPAWN_DIVISIONS - 1, 0, GRID_ROWS - 1));
                crawlers.push(new IsoCrawler(si, sj, tk));
            }
        }
    }

    // Run crawler simulation to full density across all tiers and borders
    for (let step = 0; step < MAX_CRAWLER_STEPS; step++) {
        for (let ic of crawlers) {
            ic.update();
        }
    }

    // Render with Z-order Occlusion
    push();
    translate(gridOffsetX, gridOffsetY);
    for (let k = 0; k < GRID_TIERS; k++) {
        for (let conn of allConnections) {
            if (Math.max(conn.a.k, conn.b.k) === k) {
                conn.display(pipeFillColor, strokeColor);
            }
        }
    }
    pop();
}

function keyPressed() {
    if (key === 'r' || key === 'R') {
        GLOBAL_SEED = Date.now();
        generateArt();
    } else if (key === 's' || key === 'S') {
        saveCanvas(canvas, 'e1001_brutalist_' + GLOBAL_SEED + '.png');
    }
}
