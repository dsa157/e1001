/**
 * ============================================================================
 * Seeed reTerminal E1001 - Crypto Hub Canvas Renderer
 * Version: 2026.09.29.14.50.00
 * Description: Fetches crypto prices and renders high-contrast 800x480
 *              e-ink PNG buffer with asset cards, prices, and 24h delta.
 * ============================================================================
 */

const { createCanvas } = require('@napi-rs/canvas');

// Top-level configuration parameters (Zero magic numbers)
const CANVAS_WIDTH = 800;                  // default: 800 (Native display width)
const CANVAS_HEIGHT = 480;                 // default: 480 (Native display height)
const DEFAULT_PALETTE_INDEX = 0;           // default: 0 (Range: 0-4)
const CACHE_TTL_MS = 60 * 1000;            // default: 60s cache TTL

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
 * Fetch cryptocurrency price data
 */
async function fetchCryptoData(apiKey = process.env.COINMARKETCAP_API_KEY) {
  const now = Date.now();
  if (cryptoCache.data && (now - cryptoCache.timestamp < CACHE_TTL_MS)) {
    return cryptoCache.data;
  }

  // If CoinMarketCap API key is provided
  if (apiKey && apiKey.length > 10) {
    try {
      const res = await fetch("https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=5", {
        headers: { "X-CMC_PRO_API_KEY": apiKey }
      });
      if (res.ok) {
        const json = await res.json();
        const items = json.data.map(c => ({
          symbol: c.symbol,
          name: c.name,
          price: c.quote.USD.price,
          change24h: c.quote.USD.percent_change_24h,
          marketCap: c.quote.USD.market_cap
        }));
        cryptoCache = { timestamp: now, data: items };
        return items;
      }
    } catch (e) {
      console.warn("[CryptoRenderer] CoinMarketCap fetch failed, trying CoinGecko fallback", e.message);
    }
  }

  // Free fallback via CoinGecko Public API
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple&order=market_cap_desc&per_page=5&page=1&sparkline=false");
    if (res.ok) {
      const json = await res.json();
      const items = json.map(c => ({
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        price: c.current_price,
        change24h: c.price_change_percentage_24h || 0,
        marketCap: c.market_cap
      }));
      cryptoCache = { timestamp: now, data: items };
      return items;
    }
  } catch (e) {
    console.warn("[CryptoRenderer] CoinGecko fetch failed, using fallback mock", e.message);
  }

  // Static Fallback
  return [
    { symbol: "BTC", name: "Bitcoin", price: 68420.50, change24h: 3.42, marketCap: 1350000000000 },
    { symbol: "ETH", name: "Ethereum", price: 2640.10, change24h: -1.15, marketCap: 318000000000 },
    { symbol: "SOL", name: "Solana", price: 154.80, change24h: 5.60, marketCap: 72000000000 },
    { symbol: "BNB", name: "Binance Coin", price: 590.25, change24h: 0.85, marketCap: 86000000000 },
    { symbol: "XRP", name: "Ripple", price: 0.584, change24h: -0.45, marketCap: 33000000000 }
  ];
}

/**
 * Render Crypto Dashboard Screen to PNG Buffer
 */
async function renderCrypto(options = {}) {
  const paletteIndex = options.paletteIndex !== undefined ? options.paletteIndex : DEFAULT_PALETTE_INDEX;
  const palette = COLOR_PALETTES[paletteIndex] || COLOR_PALETTES[0];
  const items = await fetchCryptoData();

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

  // Clean Header (Left: Title only)
  ctx.fillStyle = cText;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText("Crypto Asset Market", 24, 42);

  // Clean Header (Right: 12-Hour Clock)
  const now = new Date();
  const h12 = now.getHours() % 12 || 12;
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  const timeStr = `${h12}:${String(now.getMinutes()).padStart(2, '0')} ${ampm}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = cText;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(timeStr, CANVAS_WIDTH - 24, 42);

  // Header Divider
  ctx.strokeStyle = cBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(20, 62);
  ctx.lineTo(CANVAS_WIDTH - 20, 62);
  ctx.stroke();

  // Crypto Asset Rows / Cards
  const startY = 80;
  const rowH = 68;
  const gap = 8;

  items.slice(0, 4).forEach((item, idx) => {
    const y = startY + idx * (rowH + gap);

    // Row Container
    ctx.fillStyle = paletteIndex === 0 ? '#FFFFFF' : cCardBg;
    ctx.strokeStyle = cBorder;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(24, y, CANVAS_WIDTH - 48, rowH, 8);
    ctx.fill();
    ctx.stroke();

    // Symbol & Name (Font >= 18px)
    ctx.textAlign = 'left';
    ctx.fillStyle = cText;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(item.symbol, 40, y + 30);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = cMuted;
    ctx.fillText(item.name, 40, y + 54);

    // Price
    ctx.textAlign = 'right';
    ctx.fillStyle = cText;
    ctx.font = 'bold 24px sans-serif';
    const formattedPrice = item.price >= 1 ? `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${item.price.toFixed(4)}`;
    ctx.fillText(formattedPrice, CANVAS_WIDTH - 190, y + 42);

    // 24h Change Badge (Font >= 18px)
    const isPos = item.change24h >= 0;
    const changeStr = `${isPos ? '+' : ''}${item.change24h.toFixed(2)}%`;
    const badgeW = 120;
    const badgeX = CANVAS_WIDTH - 160;
    const badgeY = y + 14;
    const badgeH = 40;

    ctx.fillStyle = isPos ? (paletteIndex === 3 ? '#3E4451' : '#E8F5E9') : (paletteIndex === 3 ? '#2A2528' : '#FFEBEE');
    ctx.strokeStyle = isPos ? (paletteIndex === 3 ? '#81C784' : '#2E7D32') : (paletteIndex === 3 ? '#E57373' : '#C62828');
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = isPos ? '#1B5E20' : '#B71C1C';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(changeStr, badgeX + badgeW / 2, badgeY + 26);
  });

  // Footer Section (Font >= 18px)
  ctx.textAlign = 'left';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = cMuted;
  ctx.fillText("CoinMarketCap API  |  Seeed reTerminal E1001", 24, 455);

  ctx.textAlign = 'right';
  ctx.fillText("Battery: 85%", CANVAS_WIDTH - 24, 455);

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderCrypto,
  fetchCryptoData
};
