/**
 * ============================================================================
 * Seeed reTerminal E1001 - Crypto Hub Canvas Renderer
 * Version: 2026.09.29.21.40.00
 * Description: Fetches crypto prices from CoinMarketCap quotes API (BTC,ETH,SOL,ADA,BNB,XRP)
 *              and renders high-contrast 800x480 e-ink PNG buffer.
 *              Falls back to static mock data if no valid API key is configured.
 * ============================================================================
 */

const { createCanvas } = require('@napi-rs/canvas');

// Top-level configuration parameters (Zero magic numbers)
const CANVAS_WIDTH = 800;                  // default: 800 (Native display width)
const CANVAS_HEIGHT = 480;                 // default: 480 (Native display height)
const DEFAULT_PALETTE_INDEX = 0;           // default: 0 (Range: 0-4)
const CACHE_TTL_MS = 60 * 1000;            // default: 60s cache TTL
const DEFAULT_SYMBOLS = "BTC,ETH,SOL,ADA,BNB,XRP"; // default: 6 asset tracker

// 5 Curated Adobe Kuler Grayscale Palettes
const COLOR_PALETTES = [
  ['#FFFFFF', '#000000', '#4A4A4A', '#808080', '#E0E0E0'], // 0: Monochrome Minimalist
  ['#F0F2F5', '#111827', '#374151', '#6B7280', '#D1D5DB'], // 1: Charcoal & Mist
  ['#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000'], // 2: High Contrast 1-Bit
  ['#1E2022', '#F0F5F9', '#C9D6DF', '#52616B', '#1E2022'], // 3: Carbon Slate
  ['#FFFFFF', '#1A1A1A', '#4D4D4D', '#8C8C8C', '#CCCCCC']  // 4: Stipple Ink Tones
];

// In-memory cache
let cryptoCache = {
  timestamp: 0,
  data: null
};

/**
 * Fetch cryptocurrency price data via CoinMarketCap Quotes API
 */
async function fetchCryptoData(apiKey = process.env.COINMARKETCAP_API_KEY, symbols = DEFAULT_SYMBOLS) {
  const now = Date.now();
  if (cryptoCache.data && (now - cryptoCache.timestamp < CACHE_TTL_MS)) {
    return cryptoCache.data;
  }

  const cleanKey = (apiKey || process.env.COINMARKETCAP_API_KEY || '').trim();
  const cleanSymbols = (symbols || DEFAULT_SYMBOLS).trim();

  // Primary: CoinMarketCap Quotes API
  if (cleanKey.length > 10) {
    try {
      const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(cleanSymbols)}`;
      const res = await fetch(url, {
        headers: { "X-CMC_PRO_API_KEY": cleanKey }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const symbolList = cleanSymbols.split(',').map(s => s.trim().toUpperCase());
          const items = [];
          for (const sym of symbolList) {
            const coin = json.data[sym];
            if (coin && coin.quote && coin.quote.USD) {
              items.push({
                symbol: coin.symbol,
                name: coin.name,
                price: coin.quote.USD.price,
                change24h: coin.quote.USD.percent_change_24h,
                marketCap: coin.quote.USD.market_cap
              });
            }
          }
          if (items.length > 0) {
            cryptoCache = { timestamp: now, data: items };
            return items;
          }
        }
      }
    } catch (e) {
      console.warn("[CryptoRenderer] CoinMarketCap quotes fetch failed:", e.message);
    }
  }

  // Fallback: Static mock data (no live network calls without a valid API key)
  console.warn("[CryptoRenderer] No valid API key or fetch failed — using static mock data.");
  return [
    { symbol: "BTC", name: "Bitcoin", price: 68420.50, change24h: 3.42, marketCap: 1350000000000 },
    { symbol: "ETH", name: "Ethereum", price: 2640.10, change24h: -1.15, marketCap: 318000000000 },
    { symbol: "SOL", name: "Solana", price: 154.80, change24h: 5.60, marketCap: 72000000000 },
    { symbol: "ADA", name: "Cardano", price: 0.385, change24h: 2.10, marketCap: 13800000000 },
    { symbol: "BNB", name: "BNB", price: 590.25, change24h: 0.85, marketCap: 86000000000 },
    { symbol: "XRP", name: "XRP", price: 0.584, change24h: -0.45, marketCap: 33000000000 }
  ];
}

/**
 * Render Crypto Dashboard Screen to PNG Buffer
 */
async function renderCrypto(options = {}) {
  const paletteIndex = options.paletteIndex !== undefined ? options.paletteIndex : DEFAULT_PALETTE_INDEX;
  const palette = COLOR_PALETTES[paletteIndex] || COLOR_PALETTES[0];
  const items = await fetchCryptoData(options.apiKey || process.env.COINMARKETCAP_API_KEY, options.symbols || DEFAULT_SYMBOLS);

  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  const cBg = palette[0];
  const cText = palette[1];
  const cMuted = palette[2];
  const cBorder = palette[3];
  const cCardBg = paletteIndex === 3 ? '#2A2D32' : '#F7F8FA';

  // Background
  ctx.fillStyle = cBg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Outer Bezel Frame
  ctx.strokeStyle = cBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12);

  // Clean Header (Left: Title)
  ctx.fillStyle = cText;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText("Crypto Market", 24, 52);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = cMuted;
  ctx.fillText("Live Asset Tracker", 24, 84);

  // Top Header (Right: Live Clock & Date)
  const now = new Date();
  const use24h = options.use24h || false;
  let timeStr = "";
  if (use24h) {
    timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  } else {
    const h = now.getHours() % 12 || 12;
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    timeStr = `${h}:${String(now.getMinutes()).padStart(2, '0')} ${ampm}`;
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = cText;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(timeStr, CANVAS_WIDTH - 24, 52);

  const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
  const dateStr = now.toLocaleDateString('en-US', dateOptions);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = cMuted;
  ctx.fillText(dateStr, CANVAS_WIDTH - 24, 84);

  // Header Divider Line
  ctx.strokeStyle = cBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(24, 94);
  ctx.lineTo(CANVAS_WIDTH - 24, 94);
  ctx.stroke();

  // Grid of Crypto Cards (2 columns x 3 rows for up to 6 coins)
  const displayItems = items.slice(0, 6);
  const cols = 2;
  const colW = (CANVAS_WIDTH - 48 - 14) / 2; // ~369px
  const rowH = 110;
  const startY = 104;
  const gapY = 10;
  const startX = 24;

  displayItems.forEach((item, idx) => {
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    const x = startX + c * (colW + 14);
    const y = startY + r * (rowH + gapY);

    // Row Container
    ctx.fillStyle = paletteIndex === 0 ? '#FFFFFF' : cCardBg;
    ctx.strokeStyle = cBorder;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(x, y, colW, rowH, 8);
    ctx.fill();
    ctx.stroke();

    // Symbol & Name
    ctx.textAlign = 'left';
    ctx.fillStyle = cText;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(item.symbol, x + 16, y + 36);

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = cMuted;
    ctx.fillText(item.name, x + 16, y + 60);

    // Price with formatted decimals
    ctx.textAlign = 'right';
    ctx.fillStyle = cText;
    ctx.font = 'bold 24px sans-serif';
    const formattedPrice = item.price >= 1 
      ? `$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
      : `$${item.price.toFixed(4)}`;
    ctx.fillText(formattedPrice, x + colW - 16, y + 36);

    // 24h Change Pill
    const chg = item.change24h || 0;
    const chgSign = chg >= 0 ? '+' : '';
    const chgStr = `${chgSign}${chg.toFixed(2)}%`;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = cText;
    ctx.fillText(chgStr, x + colW - 16, y + 60);
  });

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderCrypto,
  fetchCryptoData,
  COLOR_PALETTES
};
