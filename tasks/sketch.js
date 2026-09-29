/**
 * ============================================================================
 * Seeed reTerminal E1001 - Google Tasks E-Ink Dashboard
 * Version: 2026.09.27.11.30.00
 * Description: High-contrast, parameterizable task manager dashboard designed
 *              for the Seeed reTerminal E1001 (800x480 e-paper display).
 *              Renders real-time task lists from Google Tasks API via local proxy,
 *              featuring completion progress gauge, category metrics, due date
 *              status badges, star glyphs, notes snippets, battery monitor,
 *              and 1-bit Floyd-Steinberg dithering.
 * ============================================================================
 */

// ============================================================================
// TOP-LEVEL CONFIGURATION PARAMETERS (ZERO MAGIC NUMBERS)
// Default values are documented in comments beside each parameter.
// ============================================================================

// Display Dimensions (Native Seeed reTerminal E1001)
const DISPLAY_WIDTH = 800;                 // default: 800 (Native screen width in px)
const DISPLAY_HEIGHT = 480;                // default: 480 (Native screen height in px)
const DISPLAY_CENTER_X = 400;              // default: 400 (Canvas center X)
const DISPLAY_CENTER_Y = 240;              // default: 240 (Canvas center Y)

// Seed & Deterministic Random Initialization
let GLOBAL_SEED = 1001;                    // default: 1001 (Deterministic random seed)

// Typography & Font Configuration (Strictly Roboto Bold Base)
const FONT_PRIMARY_NAME = "Roboto";        // default: "Roboto" (Primary typeface)
const FONT_FALLBACK_STACK = "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif"; // default: fallback stack
let fontRobotoBold = null;
let fontRobotoRegular = null;

// Font Sizes (Crisp & Legible for E-Paper Displays)
const FONT_SIZE_HEADER_TITLE = 20;         // default: 20 (Header task list title)
const FONT_SIZE_HEADER_CLOCK = 22;         // default: 22 (Header real-time clock)
const FONT_SIZE_HEADER_SUB = 12;           // default: 12 (Header date & sync status)
const FONT_SIZE_SIDEBAR_TITLE = 16;        // default: 16 (Sidebar section title)
const FONT_SIZE_SIDEBAR_HERO = 36;         // default: 36 (Progress percentage hero)
const FONT_SIZE_SIDEBAR_METRIC_NUM = 18;   // default: 18 (Sidebar count numbers)
const FONT_SIZE_SIDEBAR_METRIC_LBL = 11;   // default: 11 (Sidebar count labels)
const FONT_SIZE_TASK_TITLE = 15;           // default: 15 (Task item main text)
const FONT_SIZE_TASK_NOTES = 11;           // default: 11 (Task notes preview text)
const FONT_SIZE_TASK_BADGE = 10;           // default: 10 (Due date & priority badge)
const FONT_SIZE_FOOTER = 11;               // default: 11 (Footer metadata text)

// Layout Section Coordinates & Offsets
const HEADER_Y = 10;                       // default: 10 (Header start Y)
const HEADER_HEIGHT = 54;                  // default: 54 (Header height in px)
const BODY_Y = 70;                         // default: 70 (Main body start Y)
const BODY_HEIGHT = 362;                   // default: 362 (Body height in px)
const FOOTER_Y = 440;                      // default: 440 (Footer start Y)
const FOOTER_HEIGHT = 32;                  // default: 32 (Footer height in px)

// Sidebar & Feed Dimensions
const SIDEBAR_X = 14;                      // default: 14 (Sidebar X coordinate)
const SIDEBAR_WIDTH = 224;                 // default: 224 (Sidebar width in px)
const FEED_X = 248;                        // default: 248 (Task feed X coordinate)
const FEED_WIDTH = 538;                    // default: 538 (Task feed width in px)
const CARD_CORNER_RADIUS = 14;             // default: 14 (Border radius for cards)
const TASK_ROW_HEIGHT = 56;                // default: 56 (Height per task row)
const TASK_ROW_GAP = 8;                    // default: 8 (Gap between task rows)
const MAX_VISIBLE_TASKS = 5;               // default: 5 (Max tasks per screen page)

// UI & Execution Parameters
let ACTIVE_PALETTE_INDEX = 0;              // default: 0 (Monochrome E-Paper)
let ACTIVE_BACKGROUND_INDEX = 0;           // default: 0 (Tone 0: Crisp Light background)
let TIME_MODE_24H = false;                 // default: false (12-hour AM/PM format)
let DITHER_ENABLED = false;                // default: false (1-bit dithering pass)
let BATTERY_PERCENTAGE = 92;               // default: 92 (Simulated battery gauge level)
let AUTO_REFRESH_INTERVAL_SEC = 60;        // default: 60 (Refresh timer in seconds)
let ACTIVE_FILTER = "all";                 // default: "all" (Filter: all, pending, today, completed)

// ============================================================================
// 5 CURATED MONOCHROMATIC & CONTRAST PALETTES (Adobe Kuler Themes)
// E-Paper Rule: Monochromatic tonal steps for maximum optical clarity
// ============================================================================
const PALETTES = [
  // Palette 0: "Monochrome E-Paper" (Default Crisp E-Ink Black, Charcoal, Silver, Pearl, White)
  ["#FFFFFF", "#F2F2F2", "#9E9E9E", "#424242", "#000000"],

  // Palette 1: "Charcoal & Mist" (Adobe Kuler cool slate tones and dark graphite ink)
  ["#F4F6F7", "#D5DBDB", "#85929E", "#34495E", "#1B2631"],

  // Palette 2: "Nordic Minimalist" (Adobe Kuler Nordic Frost, steel gray, and deep navy ink)
  ["#ECEFF1", "#CFD8DC", "#90A4AE", "#37474F", "#212121"],

  // Palette 3: "Carbon & Warm Slate" (Architectural warm paper tone with dense carbon pigment)
  ["#F9F9F6", "#E3E2DE", "#8C8B88", "#4A4947", "#1A1918"],

  // Palette 4: "High Contrast 1-Bit" (Pure binary black and white for physical e-paper refresh)
  ["#FFFFFF", "#FFFFFF", "#808080", "#000000", "#000000"]
];

const PALETTE_NAMES = [
  "0: Monochrome E-Paper",
  "1: Charcoal & Mist",
  "2: Nordic Minimalist",
  "3: Carbon & Warm Slate",
  "4: High Contrast 1-Bit"
];

// In-Memory Task Data State
let tasksState = {
  listTitle: "Google Tasks Feed",
  listId: "@default",
  items: [],
  lastUpdated: new Date(),
  isMock: true,
  isLoading: false,
  errorMessage: null
};

let refreshTimer = null;
let countdownSeconds = AUTO_REFRESH_INTERVAL_SEC;

// ============================================================================
// P5.JS LIFECYCLE METHODS
// ============================================================================

function preload() {
  try {
    fontRobotoRegular = loadFont("/common/fonts/Roboto-Regular.ttf", () => {}, () => {
      fontRobotoRegular = null;
    });
    fontRobotoBold = loadFont("/common/fonts/Roboto-Bold.ttf", () => {}, () => {
      fontRobotoBold = null;
    });
  } catch (e) {
    console.warn("Local fonts not found, using system sans-serif fallback");
  }
}

function setup() {
  const canvas = createCanvas(DISPLAY_WIDTH, DISPLAY_HEIGHT);
  canvas.parent("eink-canvas-container");
  pixelDensity(1);
  frameRate(30);

  // Apply deterministic seed
  applySeed(GLOBAL_SEED);

  // Setup UI control listeners
  setupUIEventListeners();

  // Fetch initial tasks feed
  fetchTasksData();

  // Setup auto-refresh interval
  setupAutoRefresh();
}

function draw() {
  // Center all drawing logic inside the 800x480 coordinate space
  push();
  
  // Background base
  const palette = getActivePalette();
  const bgCol = color(palette[ACTIVE_BACKGROUND_INDEX % palette.length]);
  background(bgCol);

  // Render Dashboard Sections
  drawHeader(palette);
  drawSidebarSummary(palette);
  drawTaskFeed(palette);
  drawFooter(palette);

  pop();

  // Apply Floyd-Steinberg dithering if enabled
  if (DITHER_ENABLED) {
    applyFloydSteinbergDither();
  }

  // Draw smooth progress animation if loading
  if (tasksState.isLoading) {
    drawLoadingIndicator(palette);
  }
}

// ============================================================================
// DASHBOARD RENDERING COMPONENTS
// ============================================================================

/**
 * Draw Top Header: Title, Real-Time Clock, Sync Badge, Battery Gauge
 */
function drawHeader(palette) {
  const textColor = color(palette[4]);
  const subColor = color(palette[3]);
  const borderColor = color(palette[2]);
  const cardBg = color(palette[1]);

  push();
  translate(14, HEADER_Y);

  // Header Card Container
  fill(cardBg);
  stroke(borderColor);
  strokeWeight(1.5);
  rect(0, 0, DISPLAY_WIDTH - 28, HEADER_HEIGHT, CARD_CORNER_RADIUS);

  // 1. Google Tasks Icon & Title
  drawTasksAppGlyph(16, 15, palette);

  noStroke();
  fill(textColor);
  setFont(true, FONT_SIZE_HEADER_TITLE);
  textAlign(LEFT, CENTER);
  text(tasksState.listTitle || "My Tasks", 52, 22);

  setFont(false, FONT_SIZE_HEADER_SUB);
  fill(subColor);
  const filterLabel = ACTIVE_FILTER === "all" ? "All Tasks" :
                      ACTIVE_FILTER === "pending" ? "Pending Only" :
                      ACTIVE_FILTER === "today" ? "Due Today" : "Completed";
  text(`View: ${filterLabel} • ${tasksState.items.length} total items`, 52, 39);

  // 2. Center Clock & Date
  const now = new Date();
  const timeStr = formatClockTime(now, TIME_MODE_24H);
  const dateStr = formatDateShort(now);

  textAlign(CENTER, CENTER);
  setFont(true, FONT_SIZE_HEADER_CLOCK);
  fill(textColor);
  text(timeStr, (DISPLAY_WIDTH - 28) / 2, 21);

  setFont(false, FONT_SIZE_HEADER_SUB);
  fill(subColor);
  text(dateStr, (DISPLAY_WIDTH - 28) / 2, 39);

  // 3. Right Status Badges & Battery Gauge
  const rightX = DISPLAY_WIDTH - 28 - 16;
  drawBatteryGauge(rightX - 52, 19, BATTERY_PERCENTAGE, palette);

  // Live vs Mock Feed Badge
  const badgeWidth = 70;
  const badgeHeight = 20;
  const badgeX = rightX - 52 - badgeWidth - 12;
  const badgeY = 17;

  stroke(borderColor);
  strokeWeight(1);
  fill(tasksState.isMock ? color(palette[2]) : color(palette[4]));
  rect(badgeX, badgeY, badgeWidth, badgeHeight, 5);

  noStroke();
  fill(tasksState.isMock ? color(palette[4]) : color(palette[0]));
  setFont(true, FONT_SIZE_TASK_BADGE);
  textAlign(CENTER, CENTER);
  text(tasksState.isMock ? "OFFLINE" : "LIVE FEED", badgeX + badgeWidth / 2, badgeY + badgeHeight / 2 + 1);

  pop();
}

/**
 * Draw Left Sidebar: Task Completion Radial Gauge & Quick Metrics
 */
function drawSidebarSummary(palette) {
  const textColor = color(palette[4]);
  const subColor = color(palette[3]);
  const borderColor = color(palette[2]);
  const cardBg = color(palette[1]);

  push();
  translate(SIDEBAR_X, BODY_Y);

  // Sidebar Card
  fill(cardBg);
  stroke(borderColor);
  strokeWeight(1.5);
  rect(0, 0, SIDEBAR_WIDTH, BODY_HEIGHT, CARD_CORNER_RADIUS);

  // Title
  noStroke();
  fill(textColor);
  setFont(true, FONT_SIZE_SIDEBAR_TITLE);
  textAlign(LEFT, TOP);
  text("TASK OVERVIEW", 16, 16);

  // Metrics computation
  const total = tasksState.items.length;
  const completed = tasksState.items.filter(t => t.status === "completed").length;
  const pending = total - completed;
  const todayDueCount = tasksState.items.filter(t => isDueTodayOrOverdue(t)).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 1. Completion Ring Gauge
  const gaugeCenterX = SIDEBAR_WIDTH / 2;
  const gaugeCenterY = 100;
  const gaugeRadius = 46;

  // Background Ring Arc
  strokeWeight(8);
  stroke(palette[2]);
  noFill();
  ellipse(gaugeCenterX, gaugeCenterY, gaugeRadius * 2, gaugeRadius * 2);

  // Filled Completion Arc
  if (percent > 0) {
    stroke(palette[4]);
    strokeCap(ROUND);
    const startAngle = -HALF_PI;
    const endAngle = -HALF_PI + (TWO_PI * (percent / 100));
    arc(gaugeCenterX, gaugeCenterY, gaugeRadius * 2, gaugeRadius * 2, startAngle, endAngle);
  }

  // Hero Percentage Inside Ring
  noStroke();
  fill(textColor);
  setFont(true, FONT_SIZE_SIDEBAR_HERO);
  textAlign(CENTER, CENTER);
  text(`${percent}%`, gaugeCenterX, gaugeCenterY - 2);

  setFont(false, FONT_SIZE_SIDEBAR_METRIC_LBL);
  fill(subColor);
  text("COMPLETED", gaugeCenterX, gaugeCenterY + 22);

  // 2. Detailed Metric Counters (2x2 Grid)
  const metricY = 175;
  const colW = (SIDEBAR_WIDTH - 32) / 2;

  // Pending Metric
  drawMetricBlock(16, metricY, colW, 64, "PENDING", pending, palette, true);
  // Due Today Metric
  drawMetricBlock(16 + colW + 8, metricY, colW, 64, "DUE TODAY", todayDueCount, palette, todayDueCount > 0);

  // Completed Metric
  drawMetricBlock(16, metricY + 72, colW, 64, "FINISHED", completed, palette, false);
  // Total Metric
  drawMetricBlock(16 + colW + 8, metricY + 72, colW, 64, "TOTAL", total, palette, false);

  // Decorative Stipple Line
  drawStippleLine(16, BODY_HEIGHT - 38, SIDEBAR_WIDTH - 32, palette);

  // Bottom Notice
  fill(subColor);
  setFont(false, 10);
  textAlign(CENTER, CENTER);
  text("Press [R] to reseed • [D] dither", SIDEBAR_WIDTH / 2, BODY_HEIGHT - 18);

  pop();
}

/**
 * Draw Metric Counter Box
 */
function drawMetricBlock(x, y, w, h, label, value, palette, highlight) {
  push();
  translate(x, y);

  stroke(palette[2]);
  strokeWeight(1);
  fill(highlight ? palette[0] : palette[1]);
  rect(0, 0, w, h, 8);

  noStroke();
  fill(palette[4]);
  setFont(true, FONT_SIZE_SIDEBAR_METRIC_NUM);
  textAlign(CENTER, TOP);
  text(value, w / 2, 10);

  fill(palette[3]);
  setFont(true, FONT_SIZE_SIDEBAR_METRIC_LBL);
  textAlign(CENTER, BOTTOM);
  text(label, w / 2, h - 8);

  pop();
}

/**
 * Draw Right Task Feed: Interactive Task Cards with Badges
 */
function drawTaskFeed(palette) {
  const textColor = color(palette[4]);
  const subColor = color(palette[3]);
  const borderColor = color(palette[2]);
  const cardBg = color(palette[1]);

  push();
  translate(FEED_X, BODY_Y);

  // Feed Container
  fill(cardBg);
  stroke(borderColor);
  strokeWeight(1.5);
  rect(0, 0, FEED_WIDTH, BODY_HEIGHT, CARD_CORNER_RADIUS);

  // Section Header
  noStroke();
  fill(textColor);
  setFont(true, FONT_SIZE_SIDEBAR_TITLE);
  textAlign(LEFT, TOP);
  text("ACTIVE TASKS & ACTION ITEMS", 18, 16);

  // Filter Tasks
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    // Empty state
    textAlign(CENTER, CENTER);
    fill(subColor);
    setFont(true, 18);
    text("No tasks found in this view", FEED_WIDTH / 2, BODY_HEIGHT / 2 - 10);
    setFont(false, 13);
    text("Switch view filter or add new tasks in Google Tasks", FEED_WIDTH / 2, BODY_HEIGHT / 2 + 18);
    pop();
    return;
  }

  // Render Visible Task Rows
  let rowY = 46;
  const itemsToRender = filtered.slice(0, MAX_VISIBLE_TASKS);

  for (let i = 0; i < itemsToRender.length; i++) {
    const task = itemsToRender[i];
    drawTaskRow(14, rowY, FEED_WIDTH - 28, TASK_ROW_HEIGHT, task, palette);
    rowY += TASK_ROW_HEIGHT + TASK_ROW_GAP;
  }

  // Page summary footer inside feed container
  noStroke();
  fill(subColor);
  setFont(false, 11);
  textAlign(RIGHT, CENTER);
  text(`Showing ${itemsToRender.length} of ${filtered.length} tasks`, FEED_WIDTH - 18, BODY_HEIGHT - 18);

  pop();
}

/**
 * Draw Individual Task Row Card
 */
function drawTaskRow(x, y, w, h, task, palette) {
  push();
  translate(x, y);

  const isCompleted = task.status === "completed";
  const isOverdue = !isCompleted && isTaskOverdue(task);
  const isToday = !isCompleted && isDueToday(task);

  // Row Background
  stroke(palette[2]);
  strokeWeight(1);
  fill(isCompleted ? palette[1] : palette[0]);
  rect(0, 0, w, h, 10);

  // 1. Checkbox Glyph
  const cbX = 14;
  const cbY = h / 2 - 10;
  const cbSize = 20;

  if (isCompleted) {
    fill(palette[4]);
    stroke(palette[4]);
    strokeWeight(1.5);
    rect(cbX, cbY, cbSize, cbSize, 4);

    // White Checkmark
    stroke(palette[0]);
    strokeWeight(2.5);
    strokeCap(ROUND);
    noFill();
    line(cbX + 4, cbY + 10, cbX + 8, cbY + 14);
    line(cbX + 8, cbY + 14, cbX + 15, cbY + 6);
  } else {
    fill(palette[0]);
    stroke(palette[3]);
    strokeWeight(1.5);
    rect(cbX, cbY, cbSize, cbSize, 4);
  }

  // 2. Task Title & Notes
  const textLeft = cbX + cbSize + 14;
  const textRightLimit = w - 130;

  noStroke();
  if (isCompleted) {
    fill(palette[3]);
    setFont(false, FONT_SIZE_TASK_TITLE);
  } else {
    fill(palette[4]);
    setFont(true, FONT_SIZE_TASK_TITLE);
  }
  textAlign(LEFT, CENTER);
  
  const titleY = task.notes ? h / 2 - 8 : h / 2;
  const truncatedTitle = truncateString(task.title, 42);
  text(truncatedTitle, textLeft, titleY);

  // Strikethrough for completed tasks
  if (isCompleted) {
    const textWidthVal = textWidth(truncatedTitle);
    stroke(palette[3]);
    strokeWeight(1.5);
    line(textLeft, titleY, textLeft + textWidthVal, titleY);
  }

  // Notes Preview
  if (task.notes) {
    noStroke();
    fill(palette[2]);
    setFont(false, FONT_SIZE_TASK_NOTES);
    textAlign(LEFT, CENTER);
    const truncatedNotes = truncateString(task.notes, 52);
    text(truncatedNotes, textLeft, h / 2 + 11);
  }

  // 3. Right Badges (Star & Due Date)
  let badgeRight = w - 12;

  // Star Glyph
  if (task.starred) {
    drawStarGlyph(badgeRight - 12, h / 2, palette[4]);
    badgeRight -= 26;
  }

  // Due Date Badge
  if (task.due) {
    let badgeText = formatDueBadgeText(task.due);
    let badgeBg = palette[1];
    let badgeTextCol = palette[4];
    let badgeBorderCol = palette[2];

    if (isOverdue) {
      badgeText = "OVERDUE";
      badgeBg = palette[4];
      badgeTextCol = palette[0];
      badgeBorderCol = palette[4];
    } else if (isToday) {
      badgeText = "TODAY";
      badgeBg = palette[3];
      badgeTextCol = palette[0];
      badgeBorderCol = palette[3];
    }

    setFont(true, FONT_SIZE_TASK_BADGE);
    const bWidth = textWidth(badgeText) + 14;
    const bHeight = 20;
    const bX = badgeRight - bWidth;
    const bY = h / 2 - bHeight / 2;

    stroke(badgeBorderCol);
    strokeWeight(1);
    fill(badgeBg);
    rect(bX, bY, bWidth, bHeight, 5);

    noStroke();
    fill(badgeTextCol);
    textAlign(CENTER, CENTER);
    text(badgeText, bX + bWidth / 2, bY + bHeight / 2 + 1);
  }

  pop();
}

/**
 * Draw Bottom Footer: Device Status, Last Refresh, Active Palette
 */
function drawFooter(palette) {
  const textColor = color(palette[3]);

  push();
  translate(14, FOOTER_Y);

  noStroke();
  fill(textColor);
  setFont(false, FONT_SIZE_FOOTER);

  // Left Note
  textAlign(LEFT, CENTER);
  text(`Seeed reTerminal E1001 • Google Tasks Sync [${PALETTE_NAMES[ACTIVE_PALETTE_INDEX]}]`, 4, FOOTER_HEIGHT / 2);

  // Right Timestamp & Countdown
  textAlign(RIGHT, CENTER);
  const updatedStr = tasksState.lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  text(`Updated: ${updatedStr} • Refresh in ${countdownSeconds}s`, DISPLAY_WIDTH - 28 - 4, FOOTER_HEIGHT / 2);

  pop();
}

// ============================================================================
// VECTOR GLYPHS & ICON HELPERS
// ============================================================================

/**
 * Draw Google Tasks Styled App Icon
 */
function drawTasksAppGlyph(x, y, palette) {
  push();
  translate(x, y);

  stroke(palette[4]);
  strokeWeight(2);
  fill(palette[0]);
  rect(0, 0, 24, 24, 6);

  // Diagonal Checkmark
  stroke(palette[4]);
  strokeWeight(2.5);
  strokeCap(ROUND);
  noFill();
  line(5, 12, 10, 17);
  line(10, 17, 18, 7);

  pop();
}

/**
 * Draw Battery Gauge Icon
 */
function drawBatteryGauge(x, y, percent, palette) {
  push();
  translate(x, y);

  const bW = 28;
  const bH = 14;

  // Battery Body Outline
  stroke(palette[3]);
  strokeWeight(1.5);
  fill(palette[0]);
  rect(0, 0, bW, bH, 3);

  // Positive Terminal Pip
  fill(palette[3]);
  noStroke();
  rect(bW + 1, 3, 3, bH - 6, 1);

  // Fill Level
  const fillWidth = map(constrain(percent, 0, 100), 0, 100, 0, bW - 4);
  if (fillWidth > 1) {
    fill(palette[4]);
    rect(2, 2, fillWidth, bH - 4, 1.5);
  }

  // Label text
  fill(palette[3]);
  setFont(true, 10);
  textAlign(RIGHT, CENTER);
  text(`${percent}%`, -6, bH / 2);

  pop();
}

/**
 * Draw Star Priority Glyph
 */
function drawStarGlyph(x, y, starColor) {
  push();
  translate(x, y);

  fill(starColor);
  noStroke();
  beginShape();
  for (let i = 0; i < 5; i++) {
    const angleOuter = -HALF_PI + (i * TWO_PI / 5);
    const angleInner = angleOuter + (PI / 5);
    vertex(cos(angleOuter) * 7, sin(angleOuter) * 7);
    vertex(cos(angleInner) * 3.5, sin(angleInner) * 3.5);
  }
  endShape(CLOSE);

  pop();
}

/**
 * Draw Subtle Stipple Pattern Line
 */
function drawStippleLine(x, y, len, palette) {
  push();
  stroke(palette[2]);
  strokeWeight(1);
  for (let i = 0; i < len; i += 4) {
    point(x + i, y);
  }
  pop();
}

/**
 * Draw Loading Spinner Overlay
 */
function drawLoadingIndicator(palette) {
  push();
  const cx = DISPLAY_WIDTH / 2;
  const cy = DISPLAY_HEIGHT / 2;

  fill(0, 0, 0, 120);
  noStroke();
  rect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

  stroke(palette[0]);
  strokeWeight(4);
  strokeCap(ROUND);
  noFill();
  const rot = (millis() / 200) % TWO_PI;
  arc(cx, cy, 40, 40, rot, rot + PI * 1.3);

  noStroke();
  fill(palette[0]);
  setFont(true, 14);
  textAlign(CENTER, CENTER);
  text("Syncing Google Tasks...", cx, cy + 36);
  pop();
}

// ============================================================================
// DATA FILTERING & DATE FORMATTING UTILITIES
// ============================================================================

function getFilteredTasks() {
  if (!tasksState.items) return [];

  let items = tasksState.items;

  if (ACTIVE_FILTER === "pending") {
    items = items.filter(t => t.status === "needsAction");
  } else if (ACTIVE_FILTER === "completed") {
    items = items.filter(t => t.status === "completed");
  } else if (ACTIVE_FILTER === "today") {
    items = items.filter(t => isDueTodayOrOverdue(t));
  }

  return items;
}

function isDueToday(task) {
  if (!task.due) return false;
  const due = new Date(task.due);
  const now = new Date();
  return due.getFullYear() === now.getFullYear() &&
         due.getMonth() === now.getMonth() &&
         due.getDate() === now.getDate();
}

function isTaskOverdue(task) {
  if (!task.due) return false;
  const due = new Date(task.due);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return due.getTime() < todayStart;
}

function isDueTodayOrOverdue(task) {
  return isDueToday(task) || isTaskOverdue(task);
}

function formatDueBadgeText(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const now = new Date();
  
  if (isDueToday({ due: dateString })) return "TODAY";
  
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (d.getFullYear() === tomorrow.getFullYear() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getDate() === tomorrow.getDate()) {
    return "TOMORROW";
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatClockTime(date, is24H) {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");

  if (is24H) {
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  } else {
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }
}

function formatDateShort(date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function truncateString(str, maxLen) {
  if (!str) return "";
  return str.length > maxLen ? str.substring(0, maxLen - 1) + "…" : str;
}

// ============================================================================
// API FETCH & SYNC CONTROLLER
// ============================================================================

async function fetchTasksData(force = false) {
  tasksState.isLoading = true;
  redraw();

  try {
    const response = await fetch(`/api/tasks?force=${force}`);
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    const data = await response.json();

    tasksState.listTitle = data.listTitle || "My Tasks";
    tasksState.listId = data.listId || "@default";
    tasksState.items = data.items || [];
    tasksState.lastUpdated = new Date(data.status?.timestamp || Date.now());
    tasksState.isMock = Boolean(data.status?.is_mock || data.is_mock);
    tasksState.errorMessage = data.warning || null;

    updateApiStatusBadge(tasksState.isMock, tasksState.errorMessage);
  } catch (err) {
    console.error("Failed to fetch Google Tasks:", err);
    tasksState.errorMessage = err.message;
    updateApiStatusBadge(true, err.message);
  } finally {
    tasksState.isLoading = false;
    countdownSeconds = AUTO_REFRESH_INTERVAL_SEC;
    redraw();
  }
}

function updateApiStatusBadge(isMock, errorMsg) {
  const badge = document.getElementById("api-status-badge");
  if (!badge) return;

  if (isMock) {
    badge.className = "badge badge-mock";
    badge.textContent = errorMsg ? "Feed: Mock (API Offline)" : "Feed: Mock Data";
  } else {
    badge.className = "badge badge-live";
    badge.textContent = "Feed: Google Tasks Live";
  }
}

function setupAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);

  refreshTimer = setInterval(() => {
    countdownSeconds--;
    const el = document.getElementById("refresh-countdown");
    if (el) el.textContent = countdownSeconds;

    if (countdownSeconds <= 0) {
      fetchTasksData(false);
    }
  }, 1000);
}

// ============================================================================
// FLOYD-STEINBERG 1-BIT DITHER PASS (E-INK HARDWARE SIMULATION)
// ============================================================================

function applyFloydSteinbergDither() {
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
// UI CONTROLS & EVENT BINDINGS
// ============================================================================

function setupUIEventListeners() {
  // Palette Select
  const palSelect = document.getElementById("palette-select");
  if (palSelect) {
    palSelect.addEventListener("change", (e) => {
      ACTIVE_PALETTE_INDEX = parseInt(e.target.value, 10);
      redraw();
    });
  }

  // Background Select
  const bgSelect = document.getElementById("bg-select");
  if (bgSelect) {
    bgSelect.addEventListener("change", (e) => {
      ACTIVE_BACKGROUND_INDEX = parseInt(e.target.value, 10);
      redraw();
    });
  }

  // View Filter
  const filterSelect = document.getElementById("filter-select");
  if (filterSelect) {
    filterSelect.addEventListener("change", (e) => {
      ACTIVE_FILTER = e.target.value;
      redraw();
    });
  }

  // Time Format
  const timeSelect = document.getElementById("time-format-select");
  if (timeSelect) {
    timeSelect.addEventListener("change", (e) => {
      TIME_MODE_24H = e.target.value === "24";
      redraw();
    });
  }

  // Refresh Button
  const btnRefresh = document.getElementById("btn-refresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      fetchTasksData(true);
    });
  }

  // Reseed Button
  const btnReseed = document.getElementById("btn-reseed");
  if (btnReseed) {
    btnReseed.addEventListener("click", () => {
      GLOBAL_SEED = floor(random(1, 999999));
      applySeed(GLOBAL_SEED);
      const seedDisp = document.getElementById("seed-display");
      if (seedDisp) seedDisp.textContent = `Seed: ${GLOBAL_SEED}`;
      redraw();
    });
  }

  // Dither Toggle Button
  const btnDither = document.getElementById("btn-dither");
  if (btnDither) {
    btnDither.addEventListener("click", () => {
      DITHER_ENABLED = !DITHER_ENABLED;
      btnDither.classList.toggle("active", DITHER_ENABLED);
      btnDither.textContent = DITHER_ENABLED ? "Dither: On" : "Dither: Off";
      redraw();
    });
  }

  // Export Canvas PNG
  const btnExport = document.getElementById("btn-export");
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      saveCanvas("e1001_google_tasks", "png");
    });
  }

  // Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key.toLowerCase() === "r") {
      GLOBAL_SEED = floor(random(1, 999999));
      applySeed(GLOBAL_SEED);
      redraw();
    } else if (e.key.toLowerCase() === "d") {
      DITHER_ENABLED = !DITHER_ENABLED;
      const dBtn = document.getElementById("btn-dither");
      if (dBtn) {
        dBtn.classList.toggle("active", DITHER_ENABLED);
        dBtn.textContent = DITHER_ENABLED ? "Dither: On" : "Dither: Off";
      }
      redraw();
    }
  });
}

function applySeed(seedVal) {
  randomSeed(seedVal);
  noiseSeed(seedVal);
}

function getActivePalette() {
  return PALETTES[ACTIVE_PALETTE_INDEX % PALETTES.length];
}

function setFont(isBold, size) {
  if (isBold && fontRobotoBold) {
    textFont(fontRobotoBold);
  } else if (!isBold && fontRobotoRegular) {
    textFont(fontRobotoRegular);
  } else {
    textFont(FONT_PRIMARY_NAME);
  }
  textSize(size);
}
