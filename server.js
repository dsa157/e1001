/**
 * ============================================================================
 * Seeed reTerminal E1001 - Master Dashboard Hub & Image Stream Server
 * Version: 2026.09.29.17.28.00
 * Description: Orchestrates multi-module display cycling, serves live 800x480
 *              1-bit / grayscale image stream (/api/screen.png) to Seeed E1001,
 *              and provides a web dashboard with real-time controls.
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
    activeModuleIndex = (activeModuleIndex + 1) % enabled.length;
    resetDwellForActiveModule();
    console.log(`[MasterHub] Auto-cycled to module: ${enabled[activeModuleIndex].id} (Dwell: ${dwellRemaining}s)`);
  }
}, TIMER_TICK_MS);

// Initialize dwell for first module
resetDwellForActiveModule();

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
 * GET /api/screen.png - Render and stream the active 800x480 PNG
 */
app.get('/api/screen.png', async (req, res) => {
  try {
    const current = getActiveModule();
    const moduleId = current ? current.id : 'weather';
    const paletteIndex = hubConfig.settings.active_palette_index !== undefined ? hubConfig.settings.active_palette_index : 0;
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
        paletteIndex,
        use24h: default24h
      });
        } else if (moduleId === 'art-241018a') {
      const state = moduleActionStates['art-241018a'] || {};
      buffer = await renderArt241018a({
        seed: state.seed || seed,
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
    } else {
      buffer = await renderWeather({ paletteIndex, useFahrenheit: defaultFahrenheit, use24h: default24h });
    }

    // Convert to compact 1-bit dithered PNG for e-ink and fast HTTP transfer (<10KB)
    if (req.query.raw !== '1') {
      buffer = await to1BitPng(buffer);
    }

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate'
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
    res.json({ success: true, message: `Action triggered for single module: ${current.id}` });
  } else {
    res.json({ success: false, message: 'No modules enabled' });
  }
});

/**
 * GET /api/action - Action Button Handler (GPIO3)
 */
app.all('/api/action', (req, res) => {
  const enabled = getEnabledModules();
  if (enabled.length >= 2) {
    // In multi-module mode: Short press toggles Pause/Resume of cycling
    isCyclePaused = !isCyclePaused;
    console.log(`[MasterHub] Action pressed -> Cycle paused: ${isCyclePaused}`);
    res.json({ success: true, isCyclePaused });
  } else if (enabled.length === 1) {
    // In single-module mode: Triggers native module refresh/seed action
    const current = enabled[0];
    if (current.id === 'art1-test') {
      moduleActionStates['art1-test'] = moduleActionStates['art1-test'] || {};
      moduleActionStates['art1-test'].seed = Math.floor(Math.random() * 100000) + 1;
    }
    res.json({ success: true, message: `Refreshed single module: ${current.id}` });
  } else {
    res.json({ success: false, message: 'No modules enabled' });
  }
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
