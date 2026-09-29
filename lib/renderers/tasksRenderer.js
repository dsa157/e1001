/**
 * ============================================================================
 * Seeed reTerminal E1001 - Tasks Hub Canvas Renderer
 * Version: 2026.09.29.14.50.00
 * Description: Renders Google Tasks checklist and pending items onto 800x480 buffer.
 * ============================================================================
 */

const { createCanvas } = require('@napi-rs/canvas');

// Top-level configuration parameters (Zero magic numbers)
const CANVAS_WIDTH = 800;                  // default: 800 (Native display width)
const CANVAS_HEIGHT = 480;                 // default: 480 (Native display height)
const DEFAULT_PALETTE_INDEX = 0;           // default: 0 (Range: 0-4)

// 5 Curated Adobe Kuler Grayscale Palettes
const COLOR_PALETTES = [
  ['#FFFFFF', '#111827', '#4B5563', '#9CA3AF', '#E5E7EB'], // 0: Monochrome Minimalist
  ['#F3F4F6', '#1F2937', '#4B5563', '#9CA3AF', '#D1D5DB'], // 1: Charcoal & Mist
  ['#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000'], // 2: High Contrast 1-Bit
  ['#1E2022', '#F0F5F9', '#C9D6DF', '#52616B', '#1E2022'], // 3: Carbon Slate
  ['#FFFFFF', '#1A1A1A', '#4D4D4D', '#8C8C8C', '#CCCCCC']  // 4: Stipple Ink Tones
];

// Fallback Task list
const DEFAULT_TASKS = [
  { id: "1", title: "Review E1001 Display Refresh Firmware", completed: false, due: "Today" },
  { id: "2", title: "Optimize Open-Meteo Weather Polling Interval", completed: true, due: "Yesterday" },
  { id: "3", title: "Verify CoinMarketCap API Rate Limits", completed: false, due: "Tomorrow" },
  { id: "4", title: "Test 1-Bit Floyd-Steinberg Dithering Engine", completed: false, due: "Oct 2" },
  { id: "5", title: "Deploy Master Dashboard Streamer to Seeed Device", completed: false, due: "Oct 5" }
];

/**
 * Render Tasks Screen to PNG Buffer
 */
async function renderTasks(options = {}) {
  const paletteIndex = options.paletteIndex !== undefined ? options.paletteIndex : DEFAULT_PALETTE_INDEX;
  const palette = COLOR_PALETTES[paletteIndex] || COLOR_PALETTES[0];
  const tasks = options.tasks || DEFAULT_TASKS;

  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  const cBg = palette[0];
  const cText = palette[1];
  const cMuted = palette[2];
  const cBorder = palette[3];
  const cCardBg = paletteIndex === 3 ? '#2A2D32' : '#F9FAFB';

  // Background
  ctx.fillStyle = cBg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Outer Bezel Frame
  ctx.strokeStyle = cBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12);

  // Header (Left)
  ctx.fillStyle = cText;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText("Google Tasks • Priority List", 24, 42);

  const pendingCount = tasks.filter(t => !t.completed).length;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = cMuted;
  ctx.fillText(`${pendingCount} Pending Tasks  •  ${tasks.length - pendingCount} Completed`, 24, 68);

  // Header (Right)
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = cText;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(timeStr, CANVAS_WIDTH - 24, 42);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = cMuted;
  ctx.fillText("Synced with Google API", CANVAS_WIDTH - 24, 68);

  // Header Divider
  ctx.strokeStyle = cBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(20, 85);
  ctx.lineTo(CANVAS_WIDTH - 20, 85);
  ctx.stroke();

  // Task Items
  const startY = 105;
  const rowH = 62;
  const gap = 8;

  tasks.slice(0, 5).forEach((t, i) => {
    const y = startY + i * (rowH + gap);

    // Row Container
    ctx.fillStyle = paletteIndex === 0 ? '#FFFFFF' : cCardBg;
    ctx.strokeStyle = cBorder;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(24, y, CANVAS_WIDTH - 48, rowH, 8);
    ctx.fill();
    ctx.stroke();

    // Checkbox
    ctx.strokeStyle = t.completed ? cMuted : cText;
    ctx.lineWidth = 2;
    ctx.strokeRect(40, y + 18, 24, 24);
    if (t.completed) {
      ctx.fillStyle = cText;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("✓", 52, y + 36);
    }

    // Title
    ctx.textAlign = 'left';
    ctx.fillStyle = t.completed ? cMuted : cText;
    ctx.font = t.completed ? '18px sans-serif' : 'bold 18px sans-serif';
    ctx.fillText(t.title, 76, y + 36);

    // Due Tag
    if (t.due) {
      ctx.textAlign = 'right';
      ctx.fillStyle = cMuted;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`📅 ${t.due}`, CANVAS_WIDTH - 40, y + 36);
    }
  });

  // Footer Section
  ctx.textAlign = 'left';
  ctx.font = '13px sans-serif';
  ctx.fillStyle = cMuted;
  ctx.fillText("Google Tasks API  •  Seeed reTerminal E1001", 24, 460);

  ctx.textAlign = 'right';
  ctx.fillText("Battery: [▮▮▮▮▯] 85%", CANVAS_WIDTH - 24, 460);

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderTasks
};
