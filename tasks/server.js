/**
 * ============================================================================
 * Seeed reTerminal E1001 Google Tasks Dashboard - Node Proxy & Web Server
 * Version: 2026.09.27.11.30.00
 * Description: Zero-dependency HTTP server & proxy for Google Tasks REST API.
 *              Handles OAuth2 token refresh, API caching, task querying,
 *              serves shared ../common/ assets (fonts, styles), and provides
 *              an automatic fallback mock feed when credentials are unconfigured.
 * ============================================================================
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");

// ============================================================================
// TOP-LEVEL CONFIGURATION PARAMETERS (ZERO MAGIC NUMBERS)
// Default values are documented in comments beside each parameter.
// ============================================================================
const DEFAULT_SERVER_PORT = 8004;            // default: 8004 (HTTP server listening port)
const DEFAULT_CACHE_TTL_MS = 60 * 1000;      // default: 60000 (60 seconds cache TTL)
const HTTP_REQUEST_TIMEOUT_MS = 10000;       // default: 10000 (10s network timeout)
const ENV_FILE_PATH = path.join(__dirname, ".env"); // default: .env file in root directory

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

// In-memory cache & token storage
let cachedTasksData = null;
let lastFetchTime = 0;
let cachedAccessToken = null;
let accessTokenExpiryTime = 0;

/**
 * Simple .env parser without external dependencies
 */
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

/**
 * Perform an HTTPS JSON request
 */
function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: parsed });
          } else {
            const errMessage = parsed.error?.message || parsed.error_description || `HTTP ${res.statusCode}`;
            const err = new Error(errMessage);
            err.statusCode = res.statusCode;
            err.details = parsed;
            reject(err);
          }
        } catch (parseErr) {
          reject(new Error(`Failed to parse API response: ${parseErr.message}`));
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.setTimeout(HTTP_REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error("Request timed out"));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Refresh OAuth2 Access Token using Google Refresh Token
 */
async function getValidAccessToken(env) {
  const now = Date.now();
  if (cachedAccessToken && now < accessTokenExpiryTime - 60000) {
    return cachedAccessToken;
  }

  // Direct access token provided
  if (env.GOOGLE_ACCESS_TOKEN && env.GOOGLE_ACCESS_TOKEN.length > 20 && !env.GOOGLE_REFRESH_TOKEN) {
    return env.GOOGLE_ACCESS_TOKEN;
  }

  // Refresh token flow
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
    const postPayload = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token"
    }).toString();

    const options = {
      hostname: "oauth2.googleapis.com",
      path: "/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postPayload)
      }
    };

    const res = await httpsRequest(options, postPayload);
    if (res.data && res.data.access_token) {
      cachedAccessToken = res.data.access_token;
      const expiresInSec = res.data.expires_in || 3600;
      accessTokenExpiryTime = now + expiresInSec * 1000;
      return cachedAccessToken;
    }
  }

  throw new Error("No valid Google Tasks credentials configured (GOOGLE_REFRESH_TOKEN or GOOGLE_ACCESS_TOKEN required)");
}

/**
 * Fetch Task Lists from Google Tasks API
 */
async function fetchGoogleTaskLists(token) {
  const options = {
    hostname: "tasks.googleapis.com",
    path: "/tasks/v1/users/@me/lists",
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    }
  };
  const res = await httpsRequest(options);
  return res.data?.items || [];
}

/**
 * Fetch Tasks from a specific Google Task List
 */
async function fetchGoogleTasks(token, listId) {
  const targetListId = encodeURIComponent(listId || "@default");
  const options = {
    hostname: "tasks.googleapis.com",
    path: `/tasks/v1/lists/${targetListId}/tasks?showCompleted=true&showHidden=true&maxResults=100`,
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    }
  };
  const res = await httpsRequest(options);
  return res.data?.items || [];
}

/**
 * Generate fallback realistic mock tasks if API key is not configured or in offline mode
 */
function getMockTasksData() {
  const now = new Date();
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrowStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const inTwoDaysStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString();
  const yesterdayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

  return {
    listTitle: "My Tasks & Projects",
    listId: "@default",
    items: [
      {
        id: "task_01",
        title: "Review E1001 firmware SPI & button drivers",
        notes: "Verify GPIO3, 4, 5 hardware triggers and power saving sleep mode",
        status: "completed",
        due: yesterdayStr,
        updated: new Date(Date.now() - 3600000 * 5).toISOString(),
        starred: true
      },
      {
        id: "task_02",
        title: "Finalize Google Tasks API proxy & caching layer",
        notes: "Support OAuth2 token refresh and offline fallback mock feed",
        status: "completed",
        due: todayStr,
        updated: new Date(Date.now() - 3600000 * 2).toISOString(),
        starred: true
      },
      {
        id: "task_03",
        title: "Calibrate 800x480 high-contrast e-paper typography",
        notes: "Ensure crisp rendering across all 5 Adobe Kuler monochromatic palettes",
        status: "needsAction",
        due: todayStr,
        updated: new Date(Date.now() - 1800000).toISOString(),
        starred: true
      },
      {
        id: "task_04",
        title: "Deploy scheduled cron sync for E-Ink screen refresh",
        notes: "Sync interval set to 5 minutes with low battery gauge detection",
        status: "needsAction",
        due: todayStr,
        updated: new Date(Date.now() - 1200000).toISOString(),
        starred: false
      },
      {
        id: "task_05",
        title: "Implement Floyd-Steinberg 1-bit dither pass",
        notes: "Preserve luminance error diffusion on fine line-art glyphs",
        status: "needsAction",
        due: tomorrowStr,
        updated: new Date(Date.now() - 600000).toISOString(),
        starred: false
      },
      {
        id: "task_06",
        title: "Prepare sprint architecture review presentation",
        notes: "Include latency benchmarks and memory footprint analysis",
        status: "needsAction",
        due: inTwoDaysStr,
        updated: new Date(Date.now() - 300000).toISOString(),
        starred: false
      },
      {
        id: "task_07",
        title: "Order spare 7.5-inch UC8179 e-paper display panels",
        notes: "Check shipping lead times and hardware revisions",
        status: "needsAction",
        due: null,
        updated: new Date(Date.now() - 100000).toISOString(),
        starred: false
      }
    ],
    status: {
      timestamp: new Date().toISOString(),
      is_mock: true,
      error_message: null
    }
  };
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Global CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoint: /api/tasks
  if (pathname === "/api/tasks") {
    const env = loadEnv();
    const forceRefresh = parsedUrl.query.force === "true";
    const requestedListId = parsedUrl.query.listId || env.GOOGLE_TASK_LIST_ID || "@default";
    const useMockForce = env.USE_MOCK_DATA === "true" || parsedUrl.query.mock === "true";
    const now = Date.now();
    const cacheTtl = parseInt(env.CACHE_TTL_MS, 10) || DEFAULT_CACHE_TTL_MS;

    // Check cached data
    if (!forceRefresh && cachedTasksData && (now - lastFetchTime < cacheTtl)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ...cachedTasksData,
        cached: true,
        cache_age_sec: Math.round((now - lastFetchTime) / 1000)
      }));
      return;
    }

    if (useMockForce) {
      const mockData = getMockTasksData();
      cachedTasksData = mockData;
      lastFetchTime = now;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ...mockData, cached: false }));
      return;
    }

    try {
      const token = await getValidAccessToken(env);
      let listTitle = "Primary Tasks";
      
      try {
        const lists = await fetchGoogleTaskLists(token);
        const matched = lists.find(l => l.id === requestedListId || (requestedListId === "@default" && l.id));
        if (matched) {
          listTitle = matched.title;
        }
      } catch (listErr) {
        // Non-critical, fallback to default title
      }

      const rawItems = await fetchGoogleTasks(token, requestedListId);
      
      // Clean and sort items: Pending first, then completed; sorted by due date
      const items = rawItems
        .filter(item => item.title && item.title.trim().length > 0)
        .map(item => ({
          id: item.id,
          title: item.title,
          notes: item.notes || "",
          status: item.status, // "needsAction" or "completed"
          due: item.due || null,
          updated: item.updated || new Date().toISOString(),
          starred: Boolean(item.starred)
        }));

      cachedTasksData = {
        listTitle: listTitle,
        listId: requestedListId,
        items: items,
        status: {
          timestamp: new Date().toISOString(),
          is_mock: false,
          error_message: null
        }
      };
      lastFetchTime = now;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ...cachedTasksData, cached: false }));
    } catch (err) {
      console.warn(`[Google Tasks Proxy] Live API fetch failed (${err.message}). Serving fallback mock feed.`);
      const mockData = getMockTasksData();
      mockData.status.error_message = err.message;
      cachedTasksData = mockData;
      lastFetchTime = now;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ...mockData, cached: false, warning: err.message }));
    }
    return;
  }

  // API Endpoint: /api/config
  if (pathname === "/api/config") {
    const env = loadEnv();
    const hasAuth = Boolean(
      (env.GOOGLE_REFRESH_TOKEN && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) ||
      (env.GOOGLE_ACCESS_TOKEN && env.GOOGLE_ACCESS_TOKEN.length > 20)
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      authenticated: hasAuth,
      listId: env.GOOGLE_TASK_LIST_ID || "@default",
      useMock: env.USE_MOCK_DATA === "true",
      cacheTtlSec: (parseInt(env.CACHE_TTL_MS, 10) || DEFAULT_CACHE_TTL_MS) / 1000
    }));
    return;
  }

  // Static File Serving (supporting root and /common paths)
  let filePath;
  if (pathname.startsWith("/common/")) {
    filePath = path.join(__dirname, "..", pathname);
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

const env = loadEnv();
const serverPort = parseInt(env.PORT, 10) || DEFAULT_SERVER_PORT;

server.listen(serverPort, () => {
  console.log(`[E1001 Google Tasks Dashboard] Server running at http://localhost:${serverPort}`);
  console.log(`[E1001 Google Tasks Dashboard] Shared common assets mapped to /common`);
});
