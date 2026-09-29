/**
 * ============================================================================
 * Seeed reTerminal E1001 Crypto Dashboard - Node Proxy & Web Server
 * Version: 2026.09.22.10.46.00
 * Description: Lightweight HTTP server and proxy for CoinMarketCap API.
 *              Loads API key and target symbols from .env, caches responses
 *              to preserve API quota, serves shared ../common/ assets (fonts,
 *              styles), and serves the p5.js frontend.
 * ============================================================================
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");

// Configuration parameters (Zero magic numbers)
const SERVER_PORT = 8003;                   // default: 8003 (HTTP server listening port)
const CACHE_TTL_MS = 60 * 1000;             // default: 60000 (60 seconds cache TTL)
const ENV_FILE_PATH = path.join(__dirname, ".env"); // default: .env file in root

// MIME types for static assets
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon"
};

// Simple .env parser without external dependencies
function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_FILE_PATH)) {
    const lines = fs.readFileSync(ENV_FILE_PATH, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  }
  return env;
}

// In-memory cache
let cachedData = null;
let lastFetchTime = 0;

/**
 * Fetch cryptocurrency quotes from CoinMarketCap API
 */
function fetchCoinMarketCap(apiKey, symbols) {
  return new Promise((resolve, reject) => {
    const symbolList = (symbols || "BTC,ETH,ADA").toUpperCase();
    const endpoint = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(symbolList)}`;

    const req = https.get(
      endpoint,
      {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          "Accept": "application/json"
        }
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300 && parsed.data) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.status?.error_message || `HTTP ${res.statusCode}`));
            }
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on("error", (err) => {
      reject(err);
    });

    req.setTimeout(8000, () => {
      req.destroy(new Error("CoinMarketCap API request timeout"));
    });
  });
}

/**
 * Generate fallback realistic mock crypto data if API key fails or quota is exhausted
 */
function getMockCryptoData(symbolsStr) {
  const symbols = (symbolsStr || "BTC,ETH,ADA").split(",").map((s) => s.trim().toUpperCase());
  const mockDb = {
    BTC: { id: 1, name: "Bitcoin", symbol: "BTC", cmc_rank: 1, quote: { USD: { price: 85495.50, percent_change_1h: -0.35, percent_change_24h: 4.94, percent_change_7d: 9.88, market_cap: 1717412100784, volume_24h: 58777193321, market_cap_dominance: 59.14 } } },
    ETH: { id: 1027, name: "Ethereum", symbol: "ETH", cmc_rank: 2, quote: { USD: { price: 2733.00, percent_change_1h: -0.46, percent_change_24h: 2.55, percent_change_7d: 9.17, market_cap: 333618995425, volume_24h: 25032346902, market_cap_dominance: 11.48 } } },
    ADA: { id: 2010, name: "Cardano", symbol: "ADA", cmc_rank: 14, quote: { USD: { price: 0.2468, percent_change_1h: -0.81, percent_change_24h: 6.36, percent_change_7d: 19.90, market_cap: 9077638746, volume_24h: 940222154, market_cap_dominance: 0.31 } } },
    SOL: { id: 5426, name: "Solana", symbol: "SOL", cmc_rank: 5, quote: { USD: { price: 178.40, percent_change_1h: 0.22, percent_change_24h: 3.12, percent_change_7d: 12.45, market_cap: 84210000000, volume_24h: 4890000000, market_cap_dominance: 2.85 } } },
    DOGE: { id: 74, name: "Dogecoin", symbol: "DOGE", cmc_rank: 8, quote: { USD: { price: 0.128, percent_change_1h: 0.11, percent_change_24h: 5.40, percent_change_7d: 8.20, market_cap: 18700000000, volume_24h: 1200000000, market_cap_dominance: 0.64 } } }
  };

  const data = {};
  for (const sym of symbols) {
    if (mockDb[sym]) {
      data[sym] = mockDb[sym];
    } else {
      data[sym] = {
        id: 9999,
        name: sym,
        symbol: sym,
        cmc_rank: 99,
        quote: { USD: { price: 1.00, percent_change_1h: 0.0, percent_change_24h: 1.5, percent_change_7d: 3.2, market_cap: 10000000, volume_24h: 500000, market_cap_dominance: 0.05 } }
      };
    }
  }

  return {
    data,
    status: {
      timestamp: new Date().toISOString(),
      error_code: 0,
      error_message: null,
      is_mock: true
    }
  };
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoint: /api/crypto
  if (pathname === "/api/crypto") {
    const env = loadEnv();
    const apiKey = env.COINMARKETCAP_API_KEY;
    const symbols = parsedUrl.query.symbols || env.SYMBOLS || "BTC,ETH,ADA";
    const forceRefresh = parsedUrl.query.force === "true";
    const now = Date.now();

    // Check cache
    if (!forceRefresh && cachedData && (now - lastFetchTime < CACHE_TTL_MS)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ...cachedData, cached: true, cache_age_sec: Math.round((now - lastFetchTime) / 1000) }));
      return;
    }

    try {
      if (!apiKey || apiKey === "your_coinmarketcap_api_key_here") {
        throw new Error("COINMARKETCAP_API_KEY is not configured in .env");
      }
      const liveData = await fetchCoinMarketCap(apiKey, symbols);
      cachedData = {
        ...liveData,
        symbols_requested: symbols.split(","),
        last_updated: new Date().toISOString()
      };
      lastFetchTime = now;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ...cachedData, cached: false }));
    } catch (err) {
      console.warn(`[Proxy Warning] API Fetch failed (${err.message}). Using fallback data.`);
      const mock = getMockCryptoData(symbols);
      cachedData = {
        ...mock,
        warning: err.message,
        symbols_requested: symbols.split(","),
        last_updated: new Date().toISOString()
      };
      lastFetchTime = now;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ...cachedData, cached: false, error: err.message }));
    }
    return;
  }

  // API Endpoint: /api/config
  if (pathname === "/api/config") {
    const env = loadEnv();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      symbols: env.SYMBOLS || "BTC,ETH,ADA",
      hasApiKey: Boolean(env.COINMARKETCAP_API_KEY && env.COINMARKETCAP_API_KEY.length > 10)
    }));
    return;
  }

  // Static File Serving (supporting root and /common paths)
  let filePath;
  if (pathname.startsWith("/common/")) {
    filePath = path.join(__dirname, "../..", pathname);
  } else {
    filePath = path.join(__dirname, pathname === "/" ? "index.html" : pathname);
  }

  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(SERVER_PORT, () => {
  console.log(`[E1001 Crypto Dashboard] Server running at http://localhost:${SERVER_PORT}`);
  console.log(`[E1001 Crypto Dashboard] Shared common assets mapped to /common`);
});
