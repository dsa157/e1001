/**
 * ============================================================================
 * Seeed reTerminal E1001 - World News Canvas Renderer (news)
 * Version: 2026.09.29.21.40.00
 * Description: High-contrast editorial news layout for Seeed reTerminal E1001.
 *              Renders 6 curated headline strip cards with source badge,
 *              bold headline, relative timestamp, and crypto-style header.
 *              Between live refreshes, cycles through sets of 6 from up to 30
 *              stored articles. Live refresh fetches a fresh batch every 6 min.
 * Attribution: Created for Seeed reTerminal E1001 Dashboard Hub
 * ============================================================================
 */

const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// Top-level configuration parameters (Zero magic numbers)
const CANVAS_WIDTH = 800;                     // default: 800 (Native display width)
const CANVAS_HEIGHT = 480;                    // default: 480 (Native display height)
const DEFAULT_PALETTE_INDEX = 0;              // default: 0 (Range: 0-4)
const MAX_REQUESTS_PER_HOUR = 10;             // default: 10 (Strict rate limit)
const MIN_CACHE_TTL_MS = 6 * 60 * 1000;       // default: 360000ms (6 minutes = max 10/hr)
const MAX_HEADLINES_DISPLAY = 6;              // default: 6 (Stories per page)
const STORIES_TOTAL = 30;                     // default: 30 (Max articles to cache and cycle through)
const START_Y = 104;                          // default: 104 (Starting Y for headline rows)
const ROW_HEIGHT = 60;                        // default: 60 (Row spacing in px for 6-story layout)
const CARD_HEIGHT = 52;                       // default: 52 (Card container height for 6-story layout)
const HEADLINE_FONT_SIZE = 16;                // default: 16 (Headline font size in px)
const BADGE_WIDTH = 76;                       // default: 76 (Source badge pill width)
const BADGE_HEIGHT = 24;                      // default: 24 (Source badge pill height)
const CACHE_FILE_PATH = path.join(__dirname, '..', '..', 'modules', 'news', 'news_cache.json'); // default: modules/news/news_cache.json
const CURRENTS_API_URL = 'https://api.currentsapi.services/v1/latest-news?language=en'; // default: Currents API latest-news

// 5 Curated Adobe Kuler Grayscale / High-Contrast Palettes
const COLOR_PALETTES = [
  ['#FFFFFF', '#000000', '#4A4A4A', '#808080', '#E0E0E0'], // 0: Monochrome Minimalist
  ['#F0F2F5', '#111827', '#374151', '#6B7280', '#D1D5DB'], // 1: Charcoal & Mist
  ['#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000'], // 2: High Contrast 1-Bit
  ['#1E2022', '#F0F5F9', '#C9D6DF', '#52616B', '#1E2022'], // 3: Carbon Slate
  ['#FFFFFF', '#1A1A1A', '#4D4D4D', '#8C8C8C', '#CCCCCC']  // 4: Stipple Ink Tones
];

// In-Memory & Disk Cache Structure
let newsCache = {
  lastQueryTime: 0,
  hourlyTimestamps: [],
  data: null
};

// Page cycling state: tracks which set of 6 to display between live refreshes
let currentPageIndex = 0;  // default: 0 (increments each render call)

// Load disk cache on startup if present
function loadDiskCache() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.data)) {
        newsCache = {
          lastQueryTime: parsed.lastQueryTime || 0,
          hourlyTimestamps: parsed.hourlyTimestamps || [],
          data: parsed.data
        };
      }
    }
  } catch (err) {
    console.warn('[NewsRenderer] Could not load disk cache:', err.message);
  }
}

function saveDiskCache() {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(newsCache, null, 2), 'utf8');
  } catch (err) {
    console.warn('[NewsRenderer] Could not save disk cache:', err.message);
  }
}

loadDiskCache();

/**
 * Format time string according to 12h/24h setting
 */
function formatTime(date, use24h) {
  if (use24h) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } else {
    const h = date.getHours() % 12 || 12;
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    return `${h}:${String(date.getMinutes()).padStart(2, '0')} ${ampm}`;
  }
}

/**
 * Format short relative publication time (e.g. 15m, 2h, 1d)
 */
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

/**
 * Extract clean, compact source label for badge
 */
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

/**
 * Truncate single line text with ellipsis
 */
function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.trim() + '…';
}

/**
 * Fetch World News Data with strict <= 10 req/hour rate limiting
 */
async function fetchWorldNews(apiKey = process.env.CURRENTS_API_KEY) {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  // Prune timestamps older than 1 hour
  newsCache.hourlyTimestamps = (newsCache.hourlyTimestamps || []).filter(t => t > oneHourAgo);

  const timeSinceLast = now - (newsCache.lastQueryTime || 0);
  const requestCountLastHour = newsCache.hourlyTimestamps.length;

  // Return cached data if under TTL or rate limit ceiling
  if (newsCache.data && newsCache.data.length > 0) {
    if (timeSinceLast < MIN_CACHE_TTL_MS || requestCountLastHour >= MAX_REQUESTS_PER_HOUR) {
      return {
        articles: newsCache.data,
        cached: true,
        lastQueryTime: newsCache.lastQueryTime,
        requestCountLastHour
      };
    }
  }

  // Attempt live API query
  if (apiKey && apiKey.length > 5) {
    try {
      console.log(`[NewsRenderer] Fetching live news from Currents API (Hourly count: ${requestCountLastHour + 1}/${MAX_REQUESTS_PER_HOUR})...`);
      const response = await fetch(CURRENTS_API_URL, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        const json = await response.json();
        if (json.status === 'ok' && Array.isArray(json.news) && json.news.length > 0) {
          const articles = json.news.map(item => ({
            id: item.id,
            title: item.title ? item.title.trim() : 'Untitled News',
            description: item.description ? item.description.trim() : '',
            author: item.author ? item.author.trim() : 'World News',
            category: Array.isArray(item.category) && item.category.length > 0 ? item.category[0].toUpperCase() : 'WORLD',
            published: item.published,
            url: item.url
          }));

          newsCache.lastQueryTime = now;
          newsCache.hourlyTimestamps.push(now);
          newsCache.data = articles;
          saveDiskCache();

          return {
            articles,
            cached: false,
            lastQueryTime: now,
            requestCountLastHour: newsCache.hourlyTimestamps.length
          };
        }
      } else {
        console.warn(`[NewsRenderer] Currents API HTTP error ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.warn('[NewsRenderer] Currents API fetch failed:', err.message);
    }
  }

  // If cache exists from past runs, use it
  if (newsCache.data && newsCache.data.length > 0) {
    return {
      articles: newsCache.data,
      cached: true,
      lastQueryTime: newsCache.lastQueryTime,
      requestCountLastHour: newsCache.hourlyTimestamps.length
    };
  }

  // Fallback mock articles if completely offline and fresh
  const fallback = [
    { title: 'Global Renewable Energy Deployment Reaches Historic Milestone', author: 'ENERGY', published: new Date().toISOString() },
    { title: 'International Space Agency Unveils Lunar Orbit Research Habitat', author: 'SCIENCE', published: new Date().toISOString() },
    { title: 'Breakthrough in Low-Power Silicon Semiconductors Announced', author: 'TECH', published: new Date().toISOString() },
    { title: 'Major Global Maritime Trade Routes Complete Digital Navigation Transition', author: 'REUTERS', published: new Date().toISOString() },
    { title: 'New Quantum Computing Architecture Demonstrates Room-Temperature Coherence', author: 'SCIENCE', published: new Date().toISOString() },
    { title: 'Global Atmospheric Monitoring Network Deploys Next-Gen Sensors', author: 'CLIMATE', published: new Date().toISOString() },
    { title: 'High-Speed Rail Expansion Links Major Regional Logistics Corridors', author: 'TRANSIT', published: new Date().toISOString() },
    { title: 'Deep Ocean Exploration Fleet Maps Uncharted Pacific Seabed Trenches', author: 'OCEANIC', published: new Date().toISOString() }
  ];

  return {
    articles: fallback,
    cached: true,
    lastQueryTime: now,
    requestCountLastHour: 0
  };
}

/**
 * Render World News Screen to 800x480 PNG Buffer
 * Cycles through pages of 6 stories from cached pool between live refreshes.
 */
async function renderNews(options = {}) {
  const paletteIndex = options.paletteIndex !== undefined ? options.paletteIndex : DEFAULT_PALETTE_INDEX;
  const palette = COLOR_PALETTES[paletteIndex] || COLOR_PALETTES[0];
  const newsResult = await fetchWorldNews(options.apiKey || process.env.CURRENTS_API_KEY);

  // Pool: up to STORIES_TOTAL articles from the cache
  const pool = newsResult.articles.slice(0, STORIES_TOTAL);
  const totalPages = Math.max(1, Math.ceil(pool.length / MAX_HEADLINES_DISPLAY));

  // Advance page on each render call (cycles through sets of 6)
  currentPageIndex = currentPageIndex % totalPages;
  const pageStart = currentPageIndex * MAX_HEADLINES_DISPLAY;
  const articles = pool.slice(pageStart, pageStart + MAX_HEADLINES_DISPLAY);
  currentPageIndex = (currentPageIndex + 1) % totalPages;

  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  const cBg = palette[0];
  const cText = palette[1];
  const cMuted = palette[2];
  const cBorder = palette[3];
  const cCardBg = paletteIndex === 3 ? '#2A2D32' : (paletteIndex === 0 ? '#F8F9FA' : '#EAECEF');

  // 1. Background Fill
  ctx.fillStyle = cBg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. Outer Bezel Border
  ctx.strokeStyle = cBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12);

  // 3. Time format determination
  const now = new Date();
  const use24h = options.use24h || false;
  const timeStr = formatTime(now, use24h);

  // 4. Header Left: "World News" title in same font size as time (36px bold)
  ctx.fillStyle = cText;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('World News', 24, 52);

  // Subheading: "Updated" & page indicator (20px matching date)
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = cMuted;
  const lastQueryDate = new Date(newsResult.lastQueryTime || Date.now());
  const nextUpdateDate = new Date((newsResult.lastQueryTime || Date.now()) + MIN_CACHE_TTL_MS);
  const lastQueryTimeStr = formatTime(lastQueryDate, use24h);
  const nextUpdateTimeStr = formatTime(nextUpdateDate, use24h);
  const displayPage = ((currentPageIndex - 1 + totalPages) % totalPages) + 1;
  const statusTag = `Updated ${lastQueryTimeStr} • Next ${nextUpdateTimeStr}  [Page ${displayPage}/${totalPages}]`;
  ctx.fillText(statusTag, 24, 84);

  // 5. Header Right: Clock & Date (exact match with crypto module header)
  ctx.textAlign = 'right';
  ctx.fillStyle = cText;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(timeStr, CANVAS_WIDTH - 24, 52);

  const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
  const dateStr = now.toLocaleDateString('en-US', dateOptions);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = cMuted;
  ctx.fillText(dateStr, CANVAS_WIDTH - 24, 84);

  // 6. Header Divider Line
  ctx.strokeStyle = cBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(24, 94);
  ctx.lineTo(CANVAS_WIDTH - 24, 94);
  ctx.stroke();

  // 7. 6 Editorial Headline Strip Cards (cycling pages from total pool)
  const cardWidth = CANVAS_WIDTH - 48; // 752px
  const headlineStartX = 24 + 10 + BADGE_WIDTH + 14; // ~124px
  const maxHeadlineWidth = cardWidth - (headlineStartX - 24) - 56; // ~572px

  articles.forEach((art, idx) => {
    const y = START_Y + idx * ROW_HEIGHT;

    // Card Container
    ctx.fillStyle = cCardBg;
    ctx.strokeStyle = cBorder;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(24, y, cardWidth, CARD_HEIGHT, 6);
    ctx.fill();
    ctx.stroke();

    // Source Badge Pill (High-contrast inverted), centered in taller card
    const badgeX = 32;
    const badgeY = y + (CARD_HEIGHT - BADGE_HEIGHT) / 2;
    ctx.fillStyle = cText;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, BADGE_WIDTH, BADGE_HEIGHT, 4);
    ctx.fill();

    // Source Badge Text
    ctx.fillStyle = cBg;
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px sans-serif';
    const sourceText = getSourceBadge(art);
    ctx.fillText(sourceText, badgeX + BADGE_WIDTH / 2, badgeY + BADGE_HEIGHT / 2 + 4);

    // Headline Text (Bold 16px, vertically centered in card)
    ctx.fillStyle = cText;
    ctx.textAlign = 'left';
    ctx.font = `bold ${HEADLINE_FONT_SIZE}px sans-serif`;
    const headline = truncateText(ctx, art.title || '', maxHeadlineWidth);
    ctx.fillText(headline, headlineStartX, y + CARD_HEIGHT / 2 + 5);

    // Relative Time Badge (Right aligned)
    ctx.fillStyle = cMuted;
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px sans-serif';
    const relTime = getShortRelTime(art.published);
    if (relTime) {
      ctx.fillText(relTime, 24 + cardWidth - 12, y + CARD_HEIGHT / 2 + 5);
    }
  });

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderNews,
  fetchWorldNews,
  COLOR_PALETTES
};
