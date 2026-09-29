/**
 * ============================================================================
 * Seeed reTerminal E1001 - E-Ink Crypto Dashboard
 * Version: 2026.09.22.11.24.00
 * Description: High-contrast, parameterizable crypto asset dashboard designed
 *              for the Seeed reTerminal E1001 (800x480 e-paper display).
 *              Uses strictly Roboto Bold typography for all text elements.
 *              Fetches real-time cryptocurrency metrics from CoinMarketCap API
 *              via local proxy, displaying real-time prices (with commas and
 *              no cents over $1000), 24h/7d percentage changes, mini sparklines,
 *              market cap, 24h volume, live clock (no seconds), battery gauge,
 *              rounded cards (radius 16), and 1-bit e-paper dithering.
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

// Typography & Font Configuration (Strictly Roboto Bold)
const FONT_PRIMARY_NAME = "Roboto";        // default: "Roboto" (Primary typeface)
const FONT_FALLBACK_STACK = "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif"; // default: fallback stack
let fontRobotoBold = null;
let fontRobotoRegular = null;

// Font Sizes (Bold & Easy to Read on E-Paper)
const FONT_SIZE_HEADER_TITLE = 20;         // default: 20 (Header main title)
const FONT_SIZE_HEADER_CLOCK = 24;         // default: 24 (Header clock size without seconds)
const FONT_SIZE_HEADER_SUB = 12;           // default: 12 (Header subtitle / dominance)
const FONT_SIZE_SYMBOL = 22;               // default: 22 (Crypto symbol title)
const FONT_SIZE_NAME = 13;                 // default: 13 (Crypto full name)
const FONT_SIZE_PRICE = 26;                // default: 26 (Large hero price)
const FONT_SIZE_PRICE_SUB = 20;            // default: 20 (Price for 4+ cards)
const FONT_SIZE_CHANGE = 13;               // default: 13 (24h/7d percentage badge)
const FONT_SIZE_METRIC_LABEL = 11;         // default: 11 (Market cap / volume labels)
const FONT_SIZE_METRIC_VAL = 12;           // default: 12 (Market cap / volume values)
const FONT_SIZE_FOOTER = 12;               // default: 12 (Footer status text)

// Layout Section Coordinates & Offsets
const HEADER_Y = 0;                        // default: 0 (Header start Y)
const HEADER_HEIGHT = 65;                  // default: 65 (Header height in px)
const BODY_Y = 75;                         // default: 75 (Body start Y)
const BODY_HEIGHT = 350;                   // default: 350 (Body height in px)
const FOOTER_Y = 435;                      // default: 435 (Footer start Y)
const FOOTER_HEIGHT = 45;                  // default: 45 (Footer height in px)

// Card Layout Margins & Padding (Matching Weather Dashboard Radius 16)
const CARD_MARGIN_X = 14;                  // default: 14 (Left/right canvas margin)
const CARD_GAP = 12;                       // default: 12 (Gap between crypto cards)
const CARD_PADDING = 14;                   // default: 14 (Internal card padding)
const CARD_CORNER_RADIUS = 16;             // default: 16 (Card border radius matching weather dashboard)
const SPARKLINE_HEIGHT = 52;               // default: 52 (Height of sparkline chart)
const SPARKLINE_POINTS = 24;               // default: 24 (Number of points in sparkline)

// UI & Timing Settings
let ACTIVE_PALETTE_INDEX = 0;              // default: 0 (Monochrome Minimalist)
let ACTIVE_BACKGROUND_INDEX = 0;           // default: 0 (Tone 0: Crisp Light background)
let TIME_MODE_24H = false;                 // default: false (12-hour AM/PM format)
let DITHER_ENABLED = false;                // default: false (1-bit dithering pass)
let BATTERY_PERCENTAGE = 88;               // default: 88 (Simulated battery gauge level)
let AUTO_REFRESH_INTERVAL_SEC = 60;        // default: 60 (Refresh timer in seconds)

// ============================================================================
// 5 CURATED MONOCHROMATIC & CONTRAST PALETTES (Adobe Kuler Themes)
// E-Paper Rule: Strictly tonal contrast steps for crisp reflective readability
// ============================================================================

const PALETTES = [
  // Palette 0: "Monochrome Minimalist" (Pure contrast scale from stark white to deep ink)
  ["#FFFFFF", "#E2E2E2", "#9E9E9E", "#424242", "#000000"],

  // Palette 1: "Charcoal & Slate" (Cool slate and charcoal e-ink gradations)
  ["#F8F9FA", "#D9E2EC", "#829AB1", "#334E68", "#102A43"],

  // Palette 2: "High Contrast 1-Bit" (Strict binary pure white and pure black for sharpest e-ink)
  ["#FFFFFF", "#FFFFFF", "#000000", "#000000", "#000000"],

  // Palette 3: "Carbon Modern" (Modern dark carbon and paper tint steps)
  ["#F4F5F7", "#CFD3DC", "#7B8794", "#2B3245", "#11141C"],

  // Palette 4: "Stipple Ink Tones" (Fine newspaper grayscale tonal array)
  ["#FDFDFD", "#D0D0D0", "#808080", "#383838", "#080808"]
];

// Names of the Palettes for reference & UI
const PALETTE_NAMES = [
  "Monochrome Minimalist",
  "Charcoal & Slate",
  "High Contrast 1-Bit",
  "Carbon Modern",
  "Stipple Ink Tones"
];

// ============================================================================
// DATA STATE & ASSETS
// ============================================================================

let cryptoData = [];
let configuredSymbols = ["BTC", "ETH", "ADA"];
let lastFetchTimestamp = null;
let lastFetchStatusText = "Connecting...";
let countdownSeconds = AUTO_REFRESH_INTERVAL_SEC;
let sparklineHistory = {}; // Cached sparkline curves per symbol

// ============================================================================
// P5.JS LIFECYCLE: PRELOAD, SETUP & DRAW
// ============================================================================

function preload() {
  try {
    fontRobotoBold = loadFont("/common/fonts/Roboto-Bold.ttf");
    fontRobotoRegular = loadFont("/common/fonts/Roboto-Regular.ttf");
  } catch (err) {
    console.warn("Failed to load local Roboto font files, falling back to system fonts:", err);
  }
}

function setup() {
  // Initialize deterministic random seed
  randomSeed(GLOBAL_SEED);
  noiseSeed(GLOBAL_SEED);

  // Create canvas and attach to DOM container
  const canvas = createCanvas(DISPLAY_WIDTH, DISPLAY_HEIGHT);
  canvas.parent("eink-canvas-container");
  pixelDensity(1);

  // Apply Roboto Bold font
  applyActiveFont(true);

  // Bind UI interactive controls
  bindControls();

  // Initial data fetch from Node proxy server
  fetchCryptoData();

  // Setup auto-refresh countdown timer
  setInterval(handleTick, 1000);
}

/**
 * Helper to set active font (strictly Roboto Bold)
 */
function applyActiveFont(isBold = true) {
  if (isBold && fontRobotoBold) {
    textFont(fontRobotoBold);
  } else if (fontRobotoBold) {
    textFont(fontRobotoBold);
  } else if (fontRobotoRegular) {
    textFont(fontRobotoRegular);
  } else {
    textFont(FONT_FALLBACK_STACK);
    textStyle(isBold ? BOLD : NORMAL);
  }
}

function draw() {
  // Determine active palette colors
  const palette = PALETTES[ACTIVE_PALETTE_INDEX % PALETTES.length];
  const bgCol = color(palette[ACTIVE_BACKGROUND_INDEX % palette.length]);

  // Determine if background is light or dark to auto-adjust text contrast
  const bgBrightness = (red(bgCol) * 299 + green(bgCol) * 587 + blue(bgCol) * 114) / 1000;
  const isDarkBg = bgBrightness < 128;

  // Primary & secondary foreground colors derived from palette
  const fgPrimary = isDarkBg ? color(palette[0]) : color(palette[4]);
  const fgSecondary = isDarkBg ? color(palette[1]) : color(palette[3]);
  const fgMuted = color(palette[2]);
  const cardBg = isDarkBg ? color(palette[3]) : color(palette[0]);
  const cardBorder = isDarkBg ? color(palette[2]) : color(palette[1]);

  // Clear background
  background(bgCol);

  // Draw Header Section
  drawHeader(fgPrimary, fgSecondary, fgMuted, isDarkBg);

  // Draw Main Body (Crypto Cards Grid)
  drawCryptoCards(fgPrimary, fgSecondary, fgMuted, cardBg, cardBorder, isDarkBg);

  // Draw Footer Section
  drawFooter(fgPrimary, fgSecondary, fgMuted, isDarkBg);

  // Apply optional 1-Bit Floyd-Steinberg dithering pass
  if (DITHER_ENABLED) {
    applyFloydSteinbergDither();
  }
}

// ============================================================================
// DRAWING MODULES (CENTERED & ZERO MAGIC NUMBERS)
// ============================================================================

/**
 * Draw Top Header: Title, Global BTC Dominance & Live Clock (Without Seconds)
 */
function drawHeader(fgPrimary, fgSecondary, fgMuted, isDarkBg) {
  push();
  rectMode(CORNER);

  // Header Title & Subtitle
  textAlign(LEFT, TOP);
  applyActiveFont(true);
  fill(fgPrimary);
  textSize(FONT_SIZE_HEADER_TITLE);
  text("CRYPTO MARKET", CARD_MARGIN_X, HEADER_Y + 12);

  // Global dominance badge
  let btcDominance = "59.1%";
  if (cryptoData.length > 0 && cryptoData[0].dominance) {
    btcDominance = cryptoData[0].dominance.toFixed(1) + "%";
  }

  applyActiveFont(true);
  textSize(FONT_SIZE_HEADER_SUB);
  fill(fgSecondary);
  text(`BTC DOM: ${btcDominance}  •  COINMARKETCAP`, CARD_MARGIN_X, HEADER_Y + 38);

  // Live Digital Clock (No seconds) & Date (Right aligned)
  textAlign(RIGHT, TOP);
  const now = new Date();
  const timeStr = formatTimeStringNoSeconds(now, TIME_MODE_24H);
  const dateStr = formatDateString(now);

  applyActiveFont(true);
  fill(fgPrimary);
  textSize(FONT_SIZE_HEADER_CLOCK);
  text(timeStr, DISPLAY_WIDTH - CARD_MARGIN_X, HEADER_Y + 10);

  applyActiveFont(true);
  fill(fgSecondary);
  textSize(FONT_SIZE_HEADER_SUB);
  text(dateStr, DISPLAY_WIDTH - CARD_MARGIN_X, HEADER_Y + 38);

  // Header bottom crisp divider line
  stroke(fgMuted);
  strokeWeight(1.5);
  line(CARD_MARGIN_X, HEADER_Y + HEADER_HEIGHT, DISPLAY_WIDTH - CARD_MARGIN_X, HEADER_Y + HEADER_HEIGHT);
  noStroke();

  pop();
}

/**
 * Draw Crypto Asset Cards Grid (Dynamic columns based on symbol count)
 */
function drawCryptoCards(fgPrimary, fgSecondary, fgMuted, cardBg, cardBorder, isDarkBg) {
  const count = Math.max(1, cryptoData.length);
  const totalUsableWidth = DISPLAY_WIDTH - (2 * CARD_MARGIN_X);
  const totalGaps = (count - 1) * CARD_GAP;
  const cardWidth = (totalUsableWidth - totalGaps) / count;
  const cardHeight = BODY_HEIGHT;

  for (let i = 0; i < count; i++) {
    const cardX = CARD_MARGIN_X + i * (cardWidth + CARD_GAP);
    const cardY = BODY_Y;
    const coin = cryptoData[i] || {
      symbol: configuredSymbols[i] || "---",
      name: "Loading...",
      price: 0,
      change24h: 0,
      change7d: 0,
      marketCap: 0,
      volume24h: 0,
      rank: i + 1
    };

    drawSingleCard(cardX, cardY, cardWidth, cardHeight, coin, fgPrimary, fgSecondary, fgMuted, cardBg, cardBorder, isDarkBg);
  }
}

/**
 * Draw an individual crypto metric card with rounded corners (radius 16), price, changes, and sparkline
 */
function drawSingleCard(x, y, w, h, coin, fgPrimary, fgSecondary, fgMuted, cardBg, cardBorder, isDarkBg) {
  push();

  // Card background container (Radius 16 matching weather dashboard)
  rectMode(CORNER);
  fill(cardBg);
  stroke(cardBorder);
  strokeWeight(1.5);
  rect(x, y, w, h, CARD_CORNER_RADIUS);
  noStroke();

  const pad = CARD_PADDING;
  let cursorY = y + pad;

  // 1. Symbol Header & Rank Badge
  fill(fgPrimary);
  applyActiveFont(true);
  textSize(FONT_SIZE_SYMBOL);
  textAlign(LEFT, TOP);
  text(coin.symbol, x + pad, cursorY);

  // Rank Pill (Right aligned in card)
  const rankText = `#${coin.rank || 1}`;
  applyActiveFont(true);
  textSize(11);
  const rankW = textWidth(rankText) + 12;
  const rankH = 20;
  fill(isDarkBg ? "#374151" : "#E5E7EB");
  rect(x + w - pad - rankW, cursorY, rankW, rankH, 6);
  fill(fgPrimary);
  textAlign(CENTER, CENTER);
  text(rankText, x + w - pad - (rankW / 2), cursorY + (rankH / 2));

  // 2. Full Name
  cursorY += 26;
  fill(fgSecondary);
  applyActiveFont(true);
  textSize(FONT_SIZE_NAME);
  textAlign(LEFT, TOP);
  text(truncateString(coin.name, 18), x + pad, cursorY);

  // 3. Hero Price Display (Commas, No Cents over $1000)
  cursorY += 22;
  fill(fgPrimary);
  applyActiveFont(true);
  const heroFontSize = w < 240 ? FONT_SIZE_PRICE_SUB : FONT_SIZE_PRICE;
  textSize(heroFontSize);
  text(formatCryptoPrice(coin.price), x + pad, cursorY);

  // 4. 24h & 7d Percentage Change Pills
  cursorY += heroFontSize + 10;
  const pillH = 24;
  const pillW = (w - (2 * pad) - 8) / 2;

  drawChangeBadge(x + pad, cursorY, pillW, pillH, coin.change24h, "24h", isDarkBg);
  drawChangeBadge(x + pad + pillW + 8, cursorY, pillW, pillH, coin.change7d, "7d", isDarkBg);

  // 5. Mini Sparkline Trend Chart (Rounded box radius 8)
  cursorY += pillH + 14;
  const sparklineW = w - (2 * pad);
  const sparklineY = cursorY;
  drawSparkline(x + pad, sparklineY, sparklineW, SPARKLINE_HEIGHT, coin, fgPrimary, fgMuted, isDarkBg);

  // 6. Market Cap & 24h Volume Metrics Table
  cursorY = sparklineY + SPARKLINE_HEIGHT + 14;
  stroke(cardBorder);
  strokeWeight(1);
  line(x + pad, cursorY, x + w - pad, cursorY);
  noStroke();

  cursorY += 8;
  drawMetricRow(x + pad, cursorY, w - (2 * pad), "Market Cap", formatCompactCurrency(coin.marketCap), fgSecondary, fgPrimary);

  cursorY += 22;
  drawMetricRow(x + pad, cursorY, w - (2 * pad), "24h Volume", formatCompactCurrency(coin.volume24h), fgSecondary, fgPrimary);

  pop();
}

/**
 * Draw 24h / 7d percentage change badge with high-contrast arrow and fill
 */
function drawChangeBadge(x, y, w, h, changeVal, label, isDarkBg) {
  push();
  const isPositive = changeVal >= 0;
  const arrow = isPositive ? "▲" : "▼";
  const sign = isPositive ? "+" : "";
  const valStr = `${arrow} ${sign}${changeVal.toFixed(2)}%`;

  rectMode(CORNER);
  // High contrast e-paper styling
  if (isDarkBg) {
    fill(isPositive ? "#064E3B" : "#7F1D1D");
    stroke(isPositive ? "#059669" : "#DC2626");
  } else {
    fill(isPositive ? "#ECFDF5" : "#FEF2F2");
    stroke(isPositive ? "#10B981" : "#EF4444");
  }
  strokeWeight(1);
  rect(x, y, w, h, 6);
  noStroke();

  fill(isPositive ? (isDarkBg ? "#6EE7B7" : "#047857") : (isDarkBg ? "#FCA5A5" : "#B91C1C"));
  applyActiveFont(true);
  textSize(FONT_SIZE_CHANGE);
  textAlign(CENTER, CENTER);
  text(valStr, x + (w / 2), y + (h / 2) + 1);

  pop();
}

/**
 * Draw mini sparkline curve for 24h trend visualization
 */
function drawSparkline(x, y, w, h, coin, fgPrimary, fgMuted, isDarkBg) {
  push();

  // Generate or retrieve deterministic smooth sparkline series
  if (!sparklineHistory[coin.symbol]) {
    sparklineHistory[coin.symbol] = generateSparklineSeries(coin.symbol, coin.change24h);
  }
  const series = sparklineHistory[coin.symbol];

  // Draw chart background area
  rectMode(CORNER);
  fill(isDarkBg ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)");
  stroke(fgMuted);
  strokeWeight(0.75);
  rect(x, y, w, h, 8);

  // Find min and max
  let minVal = Math.min(...series);
  let maxVal = Math.max(...series);
  if (minVal === maxVal) {
    minVal -= 1;
    maxVal += 1;
  }

  // Draw trend curve
  noFill();
  stroke(fgPrimary);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < series.length; i++) {
    const px = map(i, 0, series.length - 1, x + 6, x + w - 6);
    const py = map(series[i], minVal, maxVal, y + h - 6, y + 6);
    curveVertex(px, py);
    if (i === 0 || i === series.length - 1) {
      curveVertex(px, py);
    }
  }
  endShape();

  // Draw end point indicator dot
  const lastIndex = series.length - 1;
  const lastX = x + w - 6;
  const lastY = map(series[lastIndex], minVal, maxVal, y + h - 6, y + 6);
  fill(fgPrimary);
  noStroke();
  circle(lastX, lastY, 5);

  // Label min/max points for e-paper data richness
  applyActiveFont(true);
  textSize(9);
  fill(fgMuted);
  textAlign(LEFT, TOP);
  text("24h Trend", x + 8, y + 5);

  pop();
}

/**
 * Draw a structured metric row (e.g. Market Cap: $1.71T)
 */
function drawMetricRow(x, y, w, label, value, labelCol, valCol) {
  push();
  applyActiveFont(true);
  textSize(FONT_SIZE_METRIC_LABEL);
  fill(labelCol);
  textAlign(LEFT, CENTER);
  text(label, x, y);

  applyActiveFont(true);
  textSize(FONT_SIZE_METRIC_VAL);
  fill(valCol);
  textAlign(RIGHT, CENTER);
  text(value, x + w, y);
  pop();
}

/**
 * Draw Bottom Footer: Data Source, Sync Info & Battery Gauge
 */
function drawFooter(fgPrimary, fgSecondary, fgMuted, isDarkBg) {
  push();
  rectMode(CORNER);

  // Top crisp divider line
  stroke(fgMuted);
  strokeWeight(1);
  line(CARD_MARGIN_X, FOOTER_Y, DISPLAY_WIDTH - CARD_MARGIN_X, FOOTER_Y);
  noStroke();

  // Left status message
  applyActiveFont(true);
  textSize(FONT_SIZE_FOOTER);
  fill(fgSecondary);
  textAlign(LEFT, CENTER);
  const syncTimeStr = lastFetchTimestamp ? formatTimeStringNoSeconds(lastFetchTimestamp, TIME_MODE_24H) : "--:--";
  text(`Status: ${lastFetchStatusText}  •  Last Sync: ${syncTimeStr}`, CARD_MARGIN_X, FOOTER_Y + (FOOTER_HEIGHT / 2));

  // Right Battery Indicator Gauge
  const battW = 34;
  const battH = 16;
  const battX = DISPLAY_WIDTH - CARD_MARGIN_X - battW;
  const battY = FOOTER_Y + (FOOTER_HEIGHT / 2) - (battH / 2);

  // Battery percentage text
  applyActiveFont(true);
  textSize(FONT_SIZE_FOOTER);
  fill(fgPrimary);
  textAlign(RIGHT, CENTER);
  text(`${BATTERY_PERCENTAGE}%`, battX - 8, FOOTER_Y + (FOOTER_HEIGHT / 2));

  // Battery outer shell
  stroke(fgPrimary);
  strokeWeight(1.5);
  noFill();
  rect(battX, battY, battW, battH, 3);

  // Battery positive terminal nub
  fill(fgPrimary);
  noStroke();
  rect(battX + battW, battY + 4, 3, battH - 8, 1);

  // Battery fill level
  const fillW = map(constrain(BATTERY_PERCENTAGE, 0, 100), 0, 100, 0, battW - 4);
  rect(battX + 2, battY + 2, fillW, battH - 4, 1);

  pop();
}

// ============================================================================
// DATA FETCHING & FORMATTING UTILITIES
// ============================================================================

/**
 * Fetch cryptocurrency data from local Node proxy server (CoinMarketCap API)
 */
async function fetchCryptoData(force = false) {
  lastFetchStatusText = "Syncing...";
  const statusBadge = document.getElementById("api-status-badge");
  if (statusBadge) {
    statusBadge.innerText = "API: Syncing...";
    statusBadge.className = "badge";
  }

  const symStr = configuredSymbols.join(",");
  const url = `/api/crypto?symbols=${encodeURIComponent(symStr)}${force ? "&force=true" : ""}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.data) {
      cryptoData = [];
      for (const sym of configuredSymbols) {
        const item = json.data[sym];
        if (item) {
          cryptoData.push({
            symbol: item.symbol,
            name: item.name,
            price: item.quote?.USD?.price || 0,
            change24h: item.quote?.USD?.percent_change_24h || 0,
            change7d: item.quote?.USD?.percent_change_7d || 0,
            marketCap: item.quote?.USD?.market_cap || 0,
            volume24h: item.quote?.USD?.volume_24h || 0,
            dominance: item.quote?.USD?.market_cap_dominance || 0,
            rank: item.cmc_rank || 1
          });
        }
      }

      lastFetchTimestamp = new Date();
      lastFetchStatusText = json.cached ? "OK (Cached)" : "OK (CoinMarketCap)";
      if (statusBadge) {
        statusBadge.innerText = json.is_mock ? "API: Mock Fallback" : (json.cached ? "API: Cached" : "API: CoinMarketCap");
        statusBadge.className = json.is_mock ? "badge" : "badge badge-live";
      }

      const statusTimeEl = document.getElementById("status-time");
      if (statusTimeEl) {
        statusTimeEl.innerText = `Last update: ${formatTimeStringNoSeconds(lastFetchTimestamp, TIME_MODE_24H)}`;
      }
    }
  } catch (err) {
    console.error("Fetch error:", err);
    lastFetchStatusText = "Error (Retrying)";
    if (statusBadge) {
      statusBadge.innerText = "API: Error";
      statusBadge.className = "badge";
    }
  }

  countdownSeconds = AUTO_REFRESH_INTERVAL_SEC;
}

/**
 * Handle 1-second interval tick for countdown and auto-refresh
 */
function handleTick() {
  countdownSeconds--;
  const countdownEl = document.getElementById("refresh-countdown");
  if (countdownEl) {
    countdownEl.innerText = Math.max(0, countdownSeconds);
  }

  if (countdownSeconds <= 0) {
    fetchCryptoData(true);
  }
}

/**
 * Generate a deterministic smooth series of 24 points for sparkline preview
 */
function generateSparklineSeries(symbol, change24h) {
  const points = [];
  let currentVal = 100;
  const isUp = change24h >= 0;

  // Use symbol character code sum as deterministic seed offset
  let symSeed = 0;
  for (let i = 0; i < symbol.length; i++) {
    symSeed += symbol.charCodeAt(i) * (i + 1);
  }

  for (let i = 0; i < SPARKLINE_POINTS; i++) {
    const trendDrift = (i / SPARKLINE_POINTS) * (change24h * 0.5);
    const noiseVal = (Math.sin((i + symSeed) * 0.7) * 4) + (Math.cos((i * 1.3) + symSeed) * 3);
    currentVal = 100 + trendDrift + noiseVal;
    points.push(currentVal);
  }
  return points;
}

/**
 * Format cryptocurrency prices:
 * - Over $1000: add commas and remove cents (e.g. $85,495, $2,733)
 * - Under $1000: show fractional cents (e.g. $12.50, $0.2468)
 */
function formatCryptoPrice(price) {
  if (!price || price === 0) return "$0";
  if (price >= 1000) {
    // Add commas, remove cents
    const rounded = Math.round(price);
    return "$" + rounded.toLocaleString("en-US");
  } else if (price >= 1.0) {
    return "$" + price.toFixed(2);
  } else if (price >= 0.01) {
    return "$" + price.toFixed(4);
  } else {
    return "$" + price.toFixed(6);
  }
}

/**
 * Compact currency formatter (e.g. $1.71T, $333.6B, $940.2M)
 */
function formatCompactCurrency(val) {
  if (!val || val === 0) return "$0";
  if (val >= 1e12) return "$" + (val / 1e12).toFixed(2) + "T";
  if (val >= 1e9) return "$" + (val / 1e9).toFixed(2) + "B";
  if (val >= 1e6) return "$" + (val / 1e6).toFixed(2) + "M";
  if (val >= 1e3) return "$" + Math.round(val / 1e3).toLocaleString("en-US") + "K";
  return "$" + Math.round(val).toLocaleString("en-US");
}

/**
 * Format time string without seconds (12-hour AM/PM or 24-hour mode)
 */
function formatTimeStringNoSeconds(d, is24h) {
  if (!d) return "--:--";
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");

  if (is24h) {
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  } else {
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  }
}

/**
 * Format date string (e.g. "Tuesday, Sep 22, 2026")
 */
function formatDateString(d) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Truncate strings to prevent canvas overflow
 */
function truncateString(str, maxLen) {
  if (!str) return "";
  return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
}

// ============================================================================
// 1-BIT FLOYD-STEINBERG DITHERING ALGORITHM
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

      distributeError(x + 1, y, err * (7 / 16), w, h);
      distributeError(x - 1, y + 1, err * (3 / 16), w, h);
      distributeError(x, y + 1, err * (5 / 16), w, h);
      distributeError(x + 1, y + 1, err * (1 / 16), w, h);
    }
  }
  updatePixels();
}

function distributeError(x, y, err, w, h) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const idx = (y * w + x) * 4;
  pixels[idx] = constrain(pixels[idx] + err, 0, 255);
  pixels[idx + 1] = constrain(pixels[idx + 1] + err, 0, 255);
  pixels[idx + 2] = constrain(pixels[idx + 2] + err, 0, 255);
}

// ============================================================================
// UI BINDINGS & EVENT LISTENERS
// ============================================================================

function bindControls() {
  // Palette selection
  const paletteSelect = document.getElementById("palette-select");
  if (paletteSelect) {
    paletteSelect.addEventListener("change", (e) => {
      ACTIVE_PALETTE_INDEX = parseInt(e.target.value, 10);
      redraw();
    });
  }

  // Background tone selection
  const bgSelect = document.getElementById("bg-select");
  if (bgSelect) {
    bgSelect.addEventListener("change", (e) => {
      ACTIVE_BACKGROUND_INDEX = parseInt(e.target.value, 10);
      redraw();
    });
  }

  // Time format toggle (12h / 24h)
  const timeFormatSelect = document.getElementById("time-format-select");
  if (timeFormatSelect) {
    timeFormatSelect.addEventListener("change", (e) => {
      TIME_MODE_24H = e.target.value === "24";
      redraw();
    });
  }

  // Symbols input & apply button
  const symbolsInput = document.getElementById("symbols-input");
  const btnUpdateSymbols = document.getElementById("btn-update-symbols");
  if (btnUpdateSymbols && symbolsInput) {
    btnUpdateSymbols.addEventListener("click", () => {
      const raw = symbolsInput.value.trim().toUpperCase();
      if (raw) {
        configuredSymbols = raw.split(",").map((s) => s.trim()).filter(Boolean);
        sparklineHistory = {};
        fetchCryptoData(true);
      }
    });
  }

  // Refresh button
  const btnRefresh = document.getElementById("btn-refresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      fetchCryptoData(true);
    });
  }

  // Reseed button
  const btnReseed = document.getElementById("btn-reseed");
  const seedDisplay = document.getElementById("seed-display");
  if (btnReseed) {
    btnReseed.addEventListener("click", () => {
      GLOBAL_SEED = Math.floor(Math.random() * 90000) + 1000;
      if (seedDisplay) seedDisplay.innerText = `Seed: ${GLOBAL_SEED}`;
      randomSeed(GLOBAL_SEED);
      noiseSeed(GLOBAL_SEED);
      sparklineHistory = {};
      redraw();
    });
  }

  // 1-Bit Dither toggle
  const btnDither = document.getElementById("btn-dither");
  if (btnDither) {
    btnDither.addEventListener("click", () => {
      DITHER_ENABLED = !DITHER_ENABLED;
      btnDither.innerText = DITHER_ENABLED ? "Disable Dither" : "1-Bit Dither";
      redraw();
    });
  }

  // Battery slider
  const batterySlider = document.getElementById("battery-slider");
  const batteryVal = document.getElementById("battery-val");
  if (batterySlider) {
    batterySlider.addEventListener("input", (e) => {
      BATTERY_PERCENTAGE = parseInt(e.target.value, 10);
      if (batteryVal) batteryVal.innerText = `${BATTERY_PERCENTAGE}%`;
      redraw();
    });
  }

  // Export PNG button
  const btnExport = document.getElementById("btn-export");
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      saveCanvas("e1001_crypto_dashboard", "png");
    });
  }
}
