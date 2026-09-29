/**
 * ============================================================================
 * Seeed reTerminal E1001 - QLOCKTWO Hub Renderer Adapter
 * Version: 2026.09.29.14.50.00
 * Description: Wraps QLOCKTWO matrix calculation and renders to 800x480 buffer.
 * ============================================================================
 */

const path = require('path');
const { calculateQlockState } = require(path.join(__dirname, '../../modules/qlocktwo/lib/qlockEngine'));
const { renderToBuffer, COLOR_PALETTES } = require(path.join(__dirname, '../../modules/qlocktwo/lib/renderer'));

// Configuration parameters (Zero magic numbers)
const DEFAULT_LANGUAGE = 'en';              // default: 'en' (Options: de, en, nl, it, es, fr, da, ru, sv)
const DEFAULT_PALETTE_INDEX = 0;           // default: 0 (Range: 0-4)
const CANVAS_WIDTH = 800;                  // default: 800 (Native display width)
const CANVAS_HEIGHT = 480;                 // default: 480 (Native display height)

/**
 * Render QLOCKTWO frame to PNG Buffer
 * @param {Object} options 
 * @returns {Promise<Buffer>}
 */
async function renderQlocktwo(options = {}) {
  const lang = options.language || DEFAULT_LANGUAGE;
  const paletteIndex = options.paletteIndex !== undefined ? options.paletteIndex : DEFAULT_PALETTE_INDEX;
  const width = options.width || CANVAS_WIDTH;
  const height = options.height || CANVAS_HEIGHT;
  const seed = options.seed || 1001;

  const now = new Date();
  const qlockState = calculateQlockState(now, lang);

  return renderToBuffer(qlockState, {
    paletteIndex,
    width,
    height,
    seed,
    showFooter: false
  });
}

module.exports = {
  renderQlocktwo,
  COLOR_PALETTES
};
