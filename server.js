/**
 * ============================================================================
 * Seeed reTerminal E1001 - Master Dashboard Hub & Image Stream Server
 * Version: 2026.09.29.21.49.00
 * Description: Orchestrates multi-module display cycling, serves live 800x480
 *              1-bit / grayscale image stream (/api/screen.png) to Seeed E1001,
 *              and provides a web dashboard with real-time controls.
 *              GPIO3 (action) toggles palette between index 1 and 2.
 *              Screen PNG is cached per-module; re-renders only on module switch.
 *              Qlocktwo also re-renders at top of every minute.
 * ============================================================================
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

// Top-level configuration parameters (Zero magic numbers)
const CONFIG_FILE_PATH = path.join(__dirname, 'config.json'); // default: root config.json
const ENV_FILE_PATH = path.join(__dirname, '.env');           // default: root .env
const DEFAULT_PORT = 8000;                                   // default: 8000
const CANVAS_WIDTH = 800;                                    // default: 800 (E1001 width)
const CANVAS_HEIGHT = 480;                                   // default: 480 (E1001 height)
const TIMER_TICK_MS = 1000;                                  // default: 1000ms tick

// Module renderers
const { renderQlocktwo } = require('./lib/renderers/qlocktwoRenderer');
const { renderWeather } = require('./lib/renderers/weatherRenderer');
const { renderCrypto } = require('./lib/renderers/cryptoRenderer');
const { renderArt1 } = require('./lib/renderers/art1Renderer');
const { renderArt241018a } = require('./lib/renderers/art241018aRenderer');
const { renderUmlaut } = require('./lib/renderers/umlautRenderer');
const { renderBrutalist } = require('./lib/renderers/brutalistRenderer');
const { renderNews, fetchWorldNews } = require('./lib/renderers/newsRenderer');
const { renderTasks } = require('./lib/renderers/tasksRenderer');
const { to1BitPng } = require('./lib/png1bit');

// Simple .env parser without external dependencies
function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_FILE_PATH)) {
    const lines = fs.readFileSync(ENV_FILE_PATH, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
        process.env[key] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();

// In-Memory Hub State: Initialized with environment defaults
let hubConfig = {
  settings: {
    server_port: parseInt(env.HUB_PORT, 10) || DEFAULT_PORT,
    display_width: parseInt(env.DISPLAY_WIDTH, 10) || CANVAS_WIDTH,
    display_height: parseInt(env.DISPLAY_HEIGHT, 10) || CANVAS_HEIGHT,
    cycle_enabled: env.CYCLE_ENABLED !== 'false',
    default_dwell_seconds: parseInt(env.DEFAULT_DWELL_SECONDS, 10) || 30,
    active_palette_index: parseInt(env.ACTIVE_PALETTE_INDEX, 10) || 0,
    time_format: parseInt(env.TIME_FORMAT, 10) || 12,
    weather_units: (env.WEATHER_UNITS || 'C').toUpperCase(),
    global_seed: parseInt(env.GLOBAL_SEED, 10) || 1001
  },
  modules: []
};

// Load config from disk (config.json loaded AFTER .env, overriding/augmenting defaults)
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf8'));
      hubConfig = {
        ...data,
        settings: {
          ...hubConfig.settings,
          ...(data.settings || {})
        },
        modules: data.modules || []
      };
    }
  } catch (err) {
    console.error('[MasterHub] Error reading config.json:', err.message);
  }
}

loadConfig();

// Cycle State
let activeModuleIndex = 0;
let dwellRemaining = 30;
let isCyclePaused = false;
let moduleActionStates = {}; // Per-module state (e.g. art style, unit toggles)

// Render Cache: holds the last rendered PNG buffer per module.
// Re-rendered only when: module changes, palette changes, or (qlocktwo) minute ticks.
let renderCache = {
  moduleId: null,       // Module ID of the cached render
  paletteIndex: null,   // Palette index at time of cache
  buffer: null,         // Cached 1-bit PNG buffer (post-dither)
  renderedAt: 0         // Timestamp of last render
};

/**
 * Invalidate the render cache, forcing a fresh render on the next /api/screen.png request.
 */
function invalidateRenderCache(reason) {
  renderCache.buffer = null;
  renderCache.moduleId = null;
  if (reason) console.log(`[MasterHub] Render cache invalidated: ${reason}`);
}

function getEnabledModules() {
  return hubConfig.modules.filter(m => m.enabled !== false);
}

function getActiveModule() {
  const enabled = getEnabledModules();
  if (enabled.length === 0) return null;
  activeModuleIndex = activeModuleIndex % enabled.length;
  return enabled[activeModuleIndex];
}

function resetDwellForActiveModule() {
  const current = getActiveModule();
  dwellRemaining = (current && current.dwell_seconds) ? current.dwell_seconds : hubConfig.settings.default_dwell_seconds;
}

// Cycle tick timer
setInterval(() => {
  const enabled = getEnabledModules();
  if (enabled.length <= 1 || isCyclePaused || !hubConfig.settings.cycle_enabled) {
    return;
  }

  dwellRemaining -= 1;
  if (dwellRemaining <= 0) {
    const prevIndex = activeModuleIndex;
    activeModuleIndex = (activeModuleIndex + 1) % enabled.length;
    resetDwellForActiveModule();
    console.log(`[MasterHub] Auto-cycled to module: ${enabled[activeModuleIndex].id} (Dwell: ${dwellRemaining}s)`);
    if (prevIndex !== activeModuleIndex) {
      invalidateRenderCache(`module switch -> ${enabled[activeModuleIndex].id}`);
    }
  }
}, TIMER_TICK_MS);

// Qlocktwo top-of-minute refresh: invalidate cache at :00s so next poll gets fresh time
setInterval(() => {
  const current = getActiveModule();
  if (current && current.id === 'qlocktwo') {
    const now = new Date();
    if (now.getSeconds() === 0) {
      invalidateRenderCache('qlocktwo top-of-minute');
    }
  }
}, TIMER_TICK_MS);

// Initialize dwell for first module
resetDwellForActiveModule();
invalidateRenderCache('server start');

// --- EXPRESS SERVER ---
const app = express();
app.use(express.json());

// Serve Static Directories
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/modules', express.static(path.join(__dirname, 'modules')));
app.use('/common', express.static(path.join(__dirname, 'common')));

// Root Web UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- HUB API ENDPOINTS ---

/**
 * GET /api/news - World News JSON endpoint (cached & rate limited)
 */
app.get('/api/news', async (req, res) => {
  try {
    const data = await fetchWorldNews(env.CURRENTS_API_KEY || process.env.CURRENTS_API_KEY);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/status - Current hub status
 */
app.get('/api/status', (req, res) => {
  const enabled = getEnabledModules();
  const current = getActiveModule();
  res.json({
    activeModule: current,
    activeModuleIndex,
    enabledCount: enabled.length,
    dwellRemaining,
    isCyclePaused,
    cycleEnabled: hubConfig.settings.cycle_enabled,
    settings: hubConfig.settings,
    modules: hubConfig.modules
  });
});

/**
 * GET /api/screen.png - Serve cached or freshly rendered 800x480 PNG.
 * Re-renders only when the active module changes.
 * Qlocktwo additionally re-renders at the top of every minute.
 * Pass ?force=1 to bypass the cache (e.g. for browser preview).
 */
app.get('/api/screen.png', async (req, res) => {
  try {
    const current = getActiveModule();
    const moduleId = current ? current.id : 'weather';
    const paletteIndex = hubConfig.settings.active_palette_index !== undefined ? hubConfig.settings.active_palette_index : 0;
    const forceRefresh = req.query.force === '1' || req.query.raw === '1';

    // Serve cached buffer if still valid (same module & palette, not forced)
    if (
      !forceRefresh &&
      renderCache.buffer &&
      renderCache.moduleId === moduleId &&
      renderCache.paletteIndex === paletteIndex
    ) {
      const buf = req.query.raw === '1' ? renderCache.rawBuffer || renderCache.buffer : renderCache.buffer;
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buf.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Render-Cache': 'HIT'
      });
      res.end(buf);
      return;
    }

    const seed = hubConfig.settings.global_seed || 1001;
    const weatherUnits = (hubConfig.settings.weather_units || env.WEATHER_UNITS || 'C').toUpperCase();
    const timeFormat = parseInt(hubConfig.settings.time_format || env.TIME_FORMAT || 12, 10);
    const defaultFahrenheit = weatherUnits === 'F';
    const default24h = timeFormat === 24;

    let buffer;
    if (moduleId === 'qlocktwo') {
      buffer = await renderQlocktwo({
        language: env.QLOCKTWO_LANGUAGE || 'en',
        paletteIndex,
        seed
      });
    } else if (moduleId === 'weather') {
      const state = moduleActionStates['weather'] || {};
      const isFahrenheit = state.useFahrenheit !== undefined ? state.useFahrenheit : defaultFahrenheit;
      const is24h = state.use24h !== undefined ? state.use24h : default24h;
      buffer = await renderWeather({
        paletteIndex,
        city: env.WEATHER_DEFAULT_CITY || 'Hanoi',
        useFahrenheit: isFahrenheit,
        use24h: is24h
      });
    } else if (moduleId === 'crypto') {
      buffer = await renderCrypto({
        apiKey: env.COINMARKETCAP_API_KEY || process.env.COINMARKETCAP_API_KEY,
        symbols: env.CRYPTO_SYMBOLS || 'BTC,ETH,SOL,ADA,BNB,XRP',
        paletteIndex,
        use24h: default24h
      });
    } else if (moduleId === 'art-241018a') {
      const state = moduleActionStates['art-241018a'] || {};
      buffer = await renderArt241018a({
        seed: state.seed || seed,
        paletteIndex
      });
    } else if (moduleId === 'umlaut') {
      const state = moduleActionStates['umlaut'] || {};
      buffer = await renderUmlaut({
        seed: state.seed || Date.now(),
        paletteIndex
      });
    } else if (moduleId === 'brutalist') {
      const state = moduleActionStates['brutalist'] || {};
      buffer = await renderBrutalist({
        seed: state.seed || Date.now(),
        paletteIndex
      });
    } else if (moduleId === 'art1-test') {
      const state = moduleActionStates['art1-test'] || {};
      buffer = await renderArt1({
        seed: state.seed || seed,
        styleIndex: state.styleIndex || 0,
        paletteIndex
      });
    } else if (moduleId === 'tasks') {
      buffer = await renderTasks({
        paletteIndex
      });
    } else if (moduleId === 'news') {
      buffer = await renderNews({
        apiKey: env.CURRENTS_API_KEY || process.env.CURRENTS_API_KEY,
        paletteIndex,
        use24h: default24h
      });
    } else {
      buffer = await renderWeather({ paletteIndex, useFahrenheit: defaultFahrenheit, use24h: default24h });
    }

    // Store raw buffer before dithering (for ?raw=1 requests)
    const rawBuffer = buffer;

    // Convert to compact 1-bit dithered PNG for e-ink and fast HTTP transfer (<10KB)
    if (req.query.raw !== '1') {
      buffer = await to1BitPng(buffer);
    }

    // Update render cache (store both raw and dithered)
    renderCache = {
      moduleId,
      paletteIndex,
      buffer,
      rawBuffer,
      renderedAt: Date.now()
    };
    console.log(`[MasterHub] Rendered: ${moduleId} (palette ${paletteIndex}, ${buffer.length} bytes)`);

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Render-Cache': 'MISS'
    });
    res.end(buffer);
  } catch (err) {
    console.error('[MasterHub] Error rendering screen.png:', err);
    res.status(500).send(`Error rendering screen: ${err.message}`);
  }
});

/**
 * GET /api/next - Next Button Handler (GPIO4)
 */
app.all('/api/next', (req, res) => {
  const enabled = getEnabledModules();
  if (enabled.length >= 2) {
    activeModuleIndex = (activeModuleIndex + 1) % enabled.length;
    resetDwellForActiveModule();
    invalidateRenderCache(`next button -> ${enabled[activeModuleIndex].id}`);
    console.log(`[MasterHub] Next module pressed -> Switched to: ${enabled[activeModuleIndex].id}`);
    res.json({ success: true, activeModule: enabled[activeModuleIndex], dwellRemaining });
  } else if (enabled.length === 1) {
    // Single module standalone action
    const current = enabled[0];
    if (current.id === 'weather') {
      moduleActionStates['weather'] = moduleActionStates['weather'] || {};
      moduleActionStates['weather'].useFahrenheit = !moduleActionStates['weather'].useFahrenheit;
    } else if (current.id === 'art-241018a' || current.id === 'art1-test') {
      moduleActionStates['art1-test'] = moduleActionStates['art1-test'] || {};
      moduleActionStates['art1-test'].styleIndex = ((moduleActionStates['art1-test'].styleIndex || 0) + 1) % 3;
    }
    invalidateRenderCache('next single-module action');
    res.json({ success: true, message: `Action triggered for single module: ${current.id}` });
  } else {
    res.json({ success: false, message: 'No modules enabled' });
  }
});

/**
 * GET /api/prev - Prev Button Handler (GPIO5)
 */
app.all('/api/prev', (req, res) => {
  const enabled = getEnabledModules();
  if (enabled.length >= 2) {
    activeModuleIndex = (activeModuleIndex - 1 + enabled.length) % enabled.length;
    resetDwellForActiveModule();
    invalidateRenderCache(`prev button -> ${enabled[activeModuleIndex].id}`);
    console.log(`[MasterHub] Prev module pressed -> Switched to: ${enabled[activeModuleIndex].id}`);
    res.json({ success: true, activeModule: enabled[activeModuleIndex], dwellRemaining });
  } else if (enabled.length === 1) {
    // Single module standalone action
    const current = enabled[0];
    if (current.id === 'weather') {
      moduleActionStates['weather'] = moduleActionStates['weather'] || {};
      moduleActionStates['weather'].use24h = !moduleActionStates['weather'].use24h;
    } else if (current.id === 'art-241018a' || current.id === 'art1-test') {
      hubConfig.settings.active_palette_index = (hubConfig.settings.active_palette_index + 1) % 5;
    }
    invalidateRenderCache('prev single-module action');
    res.json({ success: true, message: `Action triggered for single module: ${current.id}` });
  } else {
    res.json({ success: false, message: 'No modules enabled' });
  }
});

/**
 * GET /api/action - Action Button Handler (GPIO3)
 * Toggles active palette between index 1 and 2
 */
app.all('/api/action', (req, res) => {
  // Toggle palette between 1 and 2 regardless of module count
  const currentPalette = hubConfig.settings.active_palette_index || 0;
  hubConfig.settings.active_palette_index = (currentPalette === 1) ? 2 : 1;
  invalidateRenderCache(`action (GPIO3) palette -> ${hubConfig.settings.active_palette_index}`);
  console.log(`[MasterHub] Action (GPIO3) pressed -> Palette toggled to: ${hubConfig.settings.active_palette_index}`);
  res.json({ success: true, active_palette_index: hubConfig.settings.active_palette_index });
});

/**
 * POST /api/select - Directly switch to a specific module
 */
app.post('/api/select', (req, res) => {
  const { id } = req.body;
  const enabled = getEnabledModules();
  const idx = enabled.findIndex(m => m.id === id);
  if (idx !== -1) {
    activeModuleIndex = idx;
    resetDwellForActiveModule();
    invalidateRenderCache(`select -> ${enabled[activeModuleIndex].id}`);
    res.json({ success: true, activeModule: enabled[activeModuleIndex] });
  } else {
    res.status(404).json({ success: false, message: 'Module not found or not enabled' });
  }
});

/**
 * POST /api/toggle-module - Toggle module enabled status
 */
app.post('/api/toggle-module', (req, res) => {
  const { id, enabled } = req.body;
  const target = hubConfig.modules.find(m => m.id === id);
  if (target) {
    target.enabled = Boolean(enabled);
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(hubConfig, null, 2));
    activeModuleIndex = 0;
    resetDwellForActiveModule();
    invalidateRenderCache(`toggle-module ${id} -> ${enabled}`);
    res.json({ success: true, modules: hubConfig.modules });
  } else {
    res.status(404).json({ success: false, message: 'Module not found' });
  }
});

// Start Server
const port = hubConfig.settings.server_port || DEFAULT_PORT;
app.listen(port, () => {
  console.log(`================================================================`);
  console.log(` Seeed reTerminal E1001 Master Dashboard Hub`);
  console.log(` Server URL:        http://localhost:${port}`);
  console.log(` E-Ink Stream URL:  http://localhost:${port}/api/screen.png`);
  console.log(` Enabled Modules:   ${getEnabledModules().map(m => m.id).join(', ')}`);
  console.log(`================================================================`);
});
