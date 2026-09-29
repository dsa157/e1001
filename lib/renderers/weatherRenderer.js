/**
 * ============================================================================
 * Seeed reTerminal E1001 - Weather Hub Canvas Renderer
 * Version: 2026.09.29.21.30.00
 * Description: Fetches Open-Meteo weather and renders high-contrast 800x480
 *              e-ink PNG buffer with vector-drawn geometric weather icons.
 * ============================================================================
 */

const { createCanvas } = require('@napi-rs/canvas');

// Top-level configuration parameters (Zero magic numbers)
const CANVAS_WIDTH = 800;                  // default: 800 (Native display width)
const CANVAS_HEIGHT = 480;                 // default: 480 (Native display height)
const DEFAULT_PALETTE_INDEX = 0;           // default: 0 (Range: 0-4)
const CACHE_TTL_MS = 15 * 60 * 1000;       // default: 15 minutes cache TTL
const DEFAULT_LAT = 13.7563;               // default: 13.7563 (Bangkok lat)
const DEFAULT_LON = 100.5018;              // default: 100.5018 (Bangkok lon)
const DEFAULT_CITY = "Bangkok";            // default: "Bangkok"

// 5 Curated Adobe Kuler Grayscale Palettes
const COLOR_PALETTES = [
  ['#FFFFFF', '#000000', '#4A4A4A', '#808080', '#E0E0E0'], // 0: Monochrome Minimalist
  ['#F0F2F5', '#111827', '#374151', '#6B7280', '#D1D5DB'], // 1: Charcoal & Mist
  ['#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000'], // 2: High Contrast 1-Bit
  ['#1E2022', '#F0F5F9', '#C9D6DF', '#52616B', '#1E2022'], // 3: Carbon Slate (Dark)
  ['#FFFFFF', '#1A1A1A', '#4D4D4D', '#8C8C8C', '#CCCCCC']  // 4: Stipple Ink Tones
];

// In-memory weather cache
let weatherCache = {
  timestamp: 0,
  data: null
};

// WMO Weather code mapper
function getWeatherInfo(code) {
  if (code === 0) return { label: "Clear Sky", type: "sun" };
  if (code === 1 || code === 2) return { label: "Partly Cloudy", type: "partly_cloudy" };
  if (code === 3) return { label: "Overcast", type: "cloudy" };
  if (code >= 45 && code <= 48) return { label: "Foggy", type: "fog" };
  if (code >= 51 && code <= 67) return { label: "Rain Showers", type: "rain" };
  if (code >= 71 && code <= 77) return { label: "Snow", type: "snow" };
  if (code >= 80 && code <= 82) return { label: "Heavy Rain", type: "heavy_rain" };
  if (code >= 95) return { label: "Thunderstorm", type: "thunderstorm" };
  return { label: "Cloudy", type: "cloudy" };
}

/**
 * Draw crisp geometric vector weather icons
 */
function drawVectorWeatherIcon(ctx, type, cx, cy, strokeCol, fillCol) {
  ctx.save();
  ctx.strokeStyle = strokeCol;
  ctx.fillStyle = fillCol || strokeCol;
  ctx.lineWidth = 2.5;

  if (type === "sun") {
    // Sun Center
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Radiating rays
    const rays = 8;
    for (let r = 0; r < rays; r++) {
      const angle = (r * Math.PI * 2) / rays;
      const x1 = cx + Math.cos(angle) * 19;
      const y1 = cy + Math.sin(angle) * 19;
      const x2 = cx + Math.cos(angle) * 26;
      const y2 = cy + Math.sin(angle) * 26;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  } else if (type === "partly_cloudy") {
    // Sun in background
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 8, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Cloud in foreground
    ctx.fillStyle = fillCol || '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 6, cy + 4, 10, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy + 2, 12, 0, Math.PI * 2);
    ctx.arc(cx + 16, cy + 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (type === "cloudy") {
    // Solid Cloud
    ctx.beginPath();
    ctx.arc(cx - 12, cy + 4, 10, 0, Math.PI * 2);
    ctx.arc(cx + 2, cy - 2, 14, 0, Math.PI * 2);
    ctx.arc(cx + 16, cy + 6, 8, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === "fog") {
    // Horizontal fog lines
    for (let l = -12; l <= 12; l += 8) {
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy + l);
      ctx.lineTo(cx + 20, cy + l);
      ctx.stroke();
    }
  } else if (type === "rain" || type === "heavy_rain") {
    // Cloud
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 4, 9, 0, Math.PI * 2);
    ctx.arc(cx + 2, cy - 9, 12, 0, Math.PI * 2);
    ctx.arc(cx + 14, cy - 2, 7, 0, Math.PI * 2);
    ctx.stroke();

    // Rain drops
    const drops = type === "heavy_rain" ? [-14, -4, 6, 16] : [-8, 4, 14];
    drops.forEach(dx => {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + 10);
      ctx.lineTo(cx + dx - 4, cy + 20);
      ctx.stroke();
    });
  } else if (type === "thunderstorm") {
    // Cloud
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 6, 9, 0, Math.PI * 2);
    ctx.arc(cx + 2, cy - 11, 12, 0, Math.PI * 2);
    ctx.arc(cx + 14, cy - 4, 7, 0, Math.PI * 2);
    ctx.stroke();

    // Lightning Bolt
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy + 4);
    ctx.lineTo(cx - 4, cy + 14);
    ctx.lineTo(cx + 4, cy + 14);
    ctx.lineTo(cx - 2, cy + 26);
    ctx.stroke();
  } else if (type === "snow") {
    // Cloud
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 4, 9, 0, Math.PI * 2);
    ctx.arc(cx + 2, cy - 9, 12, 0, Math.PI * 2);
    ctx.arc(cx + 14, cy - 2, 7, 0, Math.PI * 2);
    ctx.stroke();

    // Snowflake dots
    [-8, 4, 14].forEach(dx => {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + 15, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    // Default circle
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Fetch Open-Meteo weather data
 */
async function fetchWeatherData(lat = DEFAULT_LAT, lon = DEFAULT_LON) {
  const now = Date.now();
  if (weatherCache.data && (now - weatherCache.timestamp < CACHE_TTL_MS)) {
    return weatherCache.data;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    weatherCache = { timestamp: now, data };
    return data;
  } catch (err) {
    if (weatherCache.data) return weatherCache.data;
    return {
      current: { temperature_2m: 31, relative_humidity_2m: 65, weather_code: 1, wind_speed_10m: 12 },
      daily: {
        time: ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"],
        weather_code: [1, 2, 61, 3, 0],
        temperature_2m_max: [33, 32, 30, 31, 34],
        temperature_2m_min: [26, 25, 24, 25, 26],
        precipitation_probability_max: [20, 30, 80, 40, 10]
      }
    };
  }
}

/**
 * Render Weather Screen to PNG Buffer
 */
async function renderWeather(options = {}) {
  const paletteIndex = options.paletteIndex !== undefined ? options.paletteIndex : DEFAULT_PALETTE_INDEX;
  const palette = COLOR_PALETTES[paletteIndex] || COLOR_PALETTES[0];
  const useFahrenheit = options.useFahrenheit || false;
  const use24h = options.use24h || false;
  const cityName = options.city || DEFAULT_CITY;

  const weather = await fetchWeatherData(options.lat || DEFAULT_LAT, options.lon || DEFAULT_LON);

  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  const cBg = palette[0];
  const cText = palette[1];
  const cMuted = palette[2];
  const cBorder = palette[3];
  const cCardBg = paletteIndex === 3 ? '#2A2D32' : '#F7F8FA';

  // 1. Background
  ctx.fillStyle = cBg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. Bezel Border
  ctx.strokeStyle = cBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12);

  const current = weather.current || { temperature_2m: 28, relative_humidity_2m: 70, weather_code: 1, wind_speed_10m: 10 };
  const daily = weather.daily || {};

  const currTempC = Math.round(current.temperature_2m);
  const currTemp = useFahrenheit ? Math.round(currTempC * 9 / 5 + 32) : currTempC;
  const unitStr = useFahrenheit ? "°F" : "°C";

  const cond = getWeatherInfo(current.weather_code);

  // Top Header (Left: City & Current Weather)
  ctx.fillStyle = cText;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(cityName, 24, 52);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = cMuted;
  ctx.fillText(`${cond.label} • ${currTemp}${unitStr}`, 24, 84);

  // Top Header (Right: Clock & Date)
  const now = new Date();
  let timeStr = "";
  if (use24h) {
    timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  } else {
    const h = now.getHours() % 12 || 12;
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    timeStr = `${h}:${String(now.getMinutes()).padStart(2, '0')} ${ampm}`;
  }

  ctx.fillStyle = cText;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(timeStr, CANVAS_WIDTH - 24, 52);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
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

  // 5-Day Forecast Grid
  const cardW = 140;
  const cardH = 346;
  const gap = 12;
  const startX = 24;
  const cardY = 106;
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  for (let i = 0; i < 5; i++) {
    const cx = startX + i * (cardW + gap);
    
    // Card background & border
    ctx.fillStyle = paletteIndex === 0 ? '#FFFFFF' : cCardBg;
    ctx.strokeStyle = cBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx, cardY, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    // Day Header
    const forecastDate = new Date();
    forecastDate.setDate(now.getDate() + i);
    const dayLabel = i === 0 ? "TODAY" : dayNames[forecastDate.getDay()];
    const dateNum = `${forecastDate.getDate()} ${months[forecastDate.getMonth()]}`;

    ctx.textAlign = 'center';
    ctx.fillStyle = cText;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(dayLabel, cx + cardW / 2, cardY + 36);

    ctx.fillStyle = cMuted;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(dateNum, cx + cardW / 2, cardY + 64);

    // Vector Weather Icon & Label
    const dCode = daily.weather_code ? daily.weather_code[i] : 0;
    const dCond = getWeatherInfo(dCode);

    drawVectorWeatherIcon(ctx, dCond.type, cx + cardW / 2, cardY + 125, cText, cBg);

    ctx.fillStyle = cText;
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(dCond.label, cx + cardW / 2, cardY + 185);

    // High / Low temps
    const maxC = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[i]) : 32;
    const minC = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[i]) : 25;
    const maxT = useFahrenheit ? Math.round(maxC * 9 / 5 + 32) : maxC;
    const minT = useFahrenheit ? Math.round(minC * 9 / 5 + 32) : minC;

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = cText;
    ctx.fillText(`${maxT}°`, cx + cardW / 2 - 22, cardY + 245);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = cMuted;
    ctx.fillText(`${minT}°`, cx + cardW / 2 + 22, cardY + 245);

    // Rain chance
    const rain = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = cMuted;
    ctx.fillText(`Rain: ${rain}%`, cx + cardW / 2, cardY + 295);
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderWeather,
  fetchWeatherData
};
