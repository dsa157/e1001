/**
 * ============================================================================
 * Seeed reTerminal E1001 - World News Screen (p5.js)
 * Version: 2026.09.29.21.40.00
 * 
 * Description:
 * High-contrast editorial World News screen for Seeed reTerminal E1001 (800x480).
 * Features 6 rounded headline strip cards with high-contrast source pills,
 * bold headlines, right-aligned relative time badges, 36px title matching time,
 * 20px subhead matching date, persistent cache, and <= 10 req/hr rate limiting.
 * Between live refreshes, cycles through sets of 6 from up to 30 cached articles.
 * 
 * Attribution:
 * Created for Seeed reTerminal E1001 Dashboard Hub
 * ============================================================================
 */

// ==========================================
// CONFIGURATION & PARAMETERS (No Magic Numbers)
// ==========================================

// Display Dimensions (E1001 native resolution)
const CANVAS_WIDTH = 800;                     // Default: 800 (Native screen width in px)
const CANVAS_HEIGHT = 480;                    // Default: 480 (Native screen height in px)

// Layout Parameters
const MAX_HEADLINES_DISPLAY = 6;              // Default: 6 (Stories per page)
const STORIES_TOTAL = 30;                     // Default: 30 (Max articles to cache/cycle through)
const START_Y = 104;                          // Default: 104 (Starting Y for headline rows)
const ROW_HEIGHT = 60;                        // Default: 60 (Row spacing in px for 6-story layout)
const CARD_HEIGHT = 52;                       // Default: 52 (Card container height for 6-story layout)
const HEADLINE_FONT_SIZE = 16;                // Default: 16 (Headline font size in px)
const BADGE_WIDTH = 76;                       // Default: 76 (Source badge pill width)
const BADGE_HEIGHT = 24;                      // Default: 24 (Source badge pill height)

// Seed & Time Settings
let GLOBAL_SEED = 1001;                       // Default: 1001
let USE_24H = false;                          // Default: false (12-hour AM/PM format)
let REFRESH_INTERVAL_SEC = 360;               // Default: 360 (6 minutes minimum = max 10/hour)

// 5 Curated Adobe Kuler Grayscale Palettes
const COLOR_PALETTES = [
  ['#FFFFFF', '#000000', '#4A4A4A', '#808080', '#E0E0E0'], // 0: Monochrome Minimalist
  ['#F0F2F5', '#111827', '#374151', '#6B7280', '#D1D5DB'], // 1: Charcoal & Mist
  ['#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000'], // 2: High Contrast 1-Bit
  ['#1E2022', '#F0F5F9', '#C9D6DF', '#52616B', '#1E2022'], // 3: Carbon Slate
  ['#FFFFFF', '#1A1A1A', '#4D4D4D', '#8C8C8C', '#CCCCCC']  // 4: Stipple Ink Tones
];

// Active Theme & Palette Index
let ACTIVE_PALETTE_INDEX = 0; // Default: 0
let BG_COLOR_INDEX = 0;       // Default: 0
let FG_COLOR_INDEX = 1;       // Default: 1
let MUTED_COLOR_INDEX = 2;    // Default: 2
let BORDER_COLOR_INDEX = 3;   // Default: 3

// News State
let newsArticles = [];        // All cached articles (up to STORIES_TOTAL)
let currentPageIndex = 0;     // Current page of 6 stories to display
let lastQueryTime = 0;
let requestCountLastHour = 0;
let isCached = true;
let canvasInstance = null;

function setup() {
  canvasInstance = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const container = document.getElementById('eink-canvas-container');
  if (container) {
    canvasInstance.parent(container);
  }
  textFont('Roboto, sans-serif');
  fetchNewsData();
  // Live refresh timer
  setInterval(fetchNewsData, REFRESH_INTERVAL_SEC * 1000);
  // Between-refresh page cycling: advance page every dwell period (same as module dwell)
  setInterval(() => {
    if (newsArticles.length > MAX_HEADLINES_DISPLAY) {
      advancePage();
      redrawScreen();
    }
  }, 30 * 1000); // default: 30s between page advances
}

async function fetchNewsData() {
  try {
    const res = await fetch('/api/news');
    if (res.ok) {
      const data = await res.json();
      newsArticles = (data.articles || []).slice(0, STORIES_TOTAL);
      lastQueryTime = data.lastQueryTime || Date.now();
      requestCountLastHour = data.requestCountLastHour || 0;
      isCached = data.cached !== undefined ? data.cached : true;
      currentPageIndex = 0; // Reset to page 1 on fresh fetch
      redrawScreen();
      return;
    }
  } catch (err) {
    console.warn('Could not fetch from /api/news proxy, using fallback', err);
  }

  // Fallback data
  newsArticles = [
    { title: "Global Renewable Energy Deployment Reaches Historic Milestone", author: "ENERGY", published: new Date().toISOString() },
    { title: "International Space Agency Unveils Lunar Orbit Research Habitat", author: "SCIENCE", published: new Date().toISOString() },
    { title: "Breakthrough in Low-Power Silicon Semiconductors Announced", author: "TECH", published: new Date().toISOString() },
    { title: "Major Global Maritime Trade Routes Complete Digital Navigation Transition", author: "REUTERS", published: new Date().toISOString() },
    { title: "New Quantum Computing Architecture Demonstrates Room-Temperature Coherence", author: "SCIENCE", published: new Date().toISOString() },
    { title: "Global Atmospheric Monitoring Network Deploys Next-Gen Sensors", author: "CLIMATE", published: new Date().toISOString() },
    { title: "High-Speed Rail Expansion Links Major Regional Logistics Corridors", author: "TRANSIT", published: new Date().toISOString() },
    { title: "Deep Ocean Exploration Fleet Maps Uncharted Pacific Seabed Trenches", author: "OCEANIC", published: new Date().toISOString() },
    { title: "Global Leaders Agree on New Climate Finance Framework", author: "WORLD", published: new Date().toISOString() },
    { title: "Fusion Energy Startup Achieves Net Energy Gain in Test Reactor", author: "SCIENCE", published: new Date().toISOString() },
    { title: "AI Regulation Framework Adopted by Major Economies", author: "TECH", published: new Date().toISOString() },
    { title: "Pacific Ocean Plastic Cleanup Initiative Expands Coverage", author: "OCEANIC", published: new Date().toISOString() }
  ];
  currentPageIndex = 0;
  redrawScreen();
}

function draw() {
  // Static rendering managed via redrawScreen()
}

function formatTimeStr(date, use24h) {
  if (use24h) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } else {
    const h = date.getHours() % 12 || 12;
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    return `${h}:${String(date.getMinutes()).padStart(2, '0')} ${ampm}`;
  }
}

function getShortRelTime(pubDateStr) {
  if (!pubDateStr) return '';
  const pub = new Date(pubDateStr);
  const diffMs = Date.now() - pub.getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${Math.max(1, diffMins)}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function getSourceBadge(art) {
  let src = (art.author || art.category || 'WORLD').trim().toUpperCase();
  if (src.includes('USA TODAY')) return 'USA TODAY';
  if (src.includes('REUTERS')) return 'REUTERS';
  if (src.includes('ASSOCIATED PRESS') || src === 'AP') return 'AP NEWS';
  if (src.includes('BLOOMBERG')) return 'BLOOMBERG';
  if (src.includes('BBC')) return 'BBC';
  if (src.includes('CNN')) return 'CNN';
  if (src.includes('WASHINGTON POST') || src.includes('WAPO')) return 'WAPO';
  if (src.includes('NEW YORK TIMES') || src.includes('NYT')) return 'NYT';
  if (src.includes('SCIENCE')) return 'SCIENCE';
  if (src.includes('TECH')) return 'TECH';
  if (src.includes('ENERGY')) return 'ENERGY';
  if (src.length > 10) src = src.substring(0, 9) + '…';
  return src;
}

function truncateString(txt, maxWidth) {
  if (textWidth(txt) <= maxWidth) return txt;
  let truncated = txt;
  while (truncated.length > 0 && textWidth(truncated + '…') > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.trim() + '…';
}

/**
 * Advance to the next page of 6 stories from the cached pool
 */
function advancePage() {
  const totalPages = Math.max(1, Math.ceil(newsArticles.length / MAX_HEADLINES_DISPLAY));
  currentPageIndex = (currentPageIndex + 1) % totalPages;
}

function redrawScreen() {
  const palette = COLOR_PALETTES[ACTIVE_PALETTE_INDEX % COLOR_PALETTES.length];
  const cBg = palette[BG_COLOR_INDEX % palette.length];
  const cText = palette[FG_COLOR_INDEX % palette.length];
  const cMuted = palette[MUTED_COLOR_INDEX % palette.length];
  const cBorder = palette[BORDER_COLOR_INDEX % palette.length];
  const cCardBg = ACTIVE_PALETTE_INDEX === 3 ? '#2A2D32' : (ACTIVE_PALETTE_INDEX === 0 ? '#F8F9FA' : '#EAECEF');

  // Page selection: pick 6 articles from the current page
  const totalPages = Math.max(1, Math.ceil(newsArticles.length / MAX_HEADLINES_DISPLAY));
  const pageStart = currentPageIndex * MAX_HEADLINES_DISPLAY;
  const displayArticles = newsArticles.slice(pageStart, pageStart + MAX_HEADLINES_DISPLAY);

  // 1. Background
  background(cBg);

  // 2. Bezel Border
  stroke(cBorder);
  strokeWeight(2);
  noFill();
  rect(6, 6, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12);

  // 3. Time formatting
  const now = new Date();
  const timeStr = formatTimeStr(now, USE_24H);

  // 4. Header Left: "World News" title (36px bold)
  noStroke();
  fill(cText);
  textAlign(LEFT, BASELINE);
  textSize(36);
  textStyle(BOLD);
  text('World News', 24, 52);

  // Subheading: "Updated" & page indicator (20px matching date)
  textSize(20);
  fill(cMuted);
  const lastQueryDate = new Date(lastQueryTime || Date.now());
  const nextUpdateDate = new Date((lastQueryTime || Date.now()) + (REFRESH_INTERVAL_SEC * 1000));
  const lastQueryTimeStr = formatTimeStr(lastQueryDate, USE_24H);
  const nextUpdateTimeStr = formatTimeStr(nextUpdateDate, USE_24H);
  const statusTag = `Updated ${lastQueryTimeStr} • Next ${nextUpdateTimeStr}  [Page ${currentPageIndex + 1}/${totalPages}]`;
  text(statusTag, 24, 84);

  // 5. Header Right: Clock & Date (exact match with crypto module header)
  textAlign(RIGHT, BASELINE);
  fill(cText);
  textSize(36);
  textStyle(BOLD);
  text(timeStr, CANVAS_WIDTH - 24, 52);

  const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
  const dateStr = now.toLocaleDateString('en-US', dateOptions);
  textSize(20);
  fill(cMuted);
  text(dateStr, CANVAS_WIDTH - 24, 84);

  // 6. Header Divider Line
  stroke(cBorder);
  strokeWeight(1.5);
  line(24, 94, CANVAS_WIDTH - 24, 94);

  // 7. 6 Editorial Headline Strip Cards (page cycling)
  const cardWidth = CANVAS_WIDTH - 48; // 752px
  const headlineStartX = 24 + 10 + BADGE_WIDTH + 14; // ~124px
  const maxHeadlineWidth = cardWidth - (headlineStartX - 24) - 56; // ~572px

  displayArticles.forEach((art, idx) => {
    const y = START_Y + idx * ROW_HEIGHT;

    // Card Container
    fill(cCardBg);
    stroke(cBorder);
    strokeWeight(1.2);
    rect(24, y, cardWidth, CARD_HEIGHT, 6);

    // Source Badge Pill (Inverted Contrast)
    noStroke();
    const badgeX = 32;
    const badgeY = y + (CARD_HEIGHT - BADGE_HEIGHT) / 2;
    fill(cText);
    rect(badgeX, badgeY, BADGE_WIDTH, BADGE_HEIGHT, 4);

    // Source Badge Text
    fill(cBg);
    textAlign(CENTER, CENTER);
    textSize(11);
    textStyle(BOLD);
    const sourceText = getSourceBadge(art);
    text(sourceText, badgeX + BADGE_WIDTH / 2, badgeY + BADGE_HEIGHT / 2);

    // Headline Text (Bold 16px, vertically centered)
    fill(cText);
    textAlign(LEFT, CENTER);
    textSize(HEADLINE_FONT_SIZE);
    textStyle(BOLD);
    const headline = truncateString(art.title || '', maxHeadlineWidth);
    text(headline, headlineStartX, y + CARD_HEIGHT / 2);

    // Relative Time Badge (Right aligned)
    fill(cMuted);
    textAlign(RIGHT, CENTER);
    textSize(13);
    const relTime = getShortRelTime(art.published);
    if (relTime) {
      text(relTime, 24 + cardWidth - 12, y + CARD_HEIGHT / 2);
    }
  });
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    fetchNewsData();
  } else if (key === 's' || key === 'S') {
    saveCanvas(canvasInstance, 'e1001_world_news.png');
  }
}
