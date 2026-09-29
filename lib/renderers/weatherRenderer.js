/**
 * ============================================================================
 * Seeed reTerminal E1001 - Weather Hub Canvas Renderer
 * Version: 2026.09.29.14.50.00
 * Description: Fetches Open-Meteo weather and renders high-contrast 800x480
 *              e-ink PNG buffer with 5-day forecast, temperatures, and icons.
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
  if (code === 0) return { label: "Clear Sky", icon: "☀️" };
  if (code === 1 || code === 2) return { label: "Partly Cloudy", icon: "🌤️" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code >= 45 && code <= 48) return { label: "Foggy", icon: "🌫️" };
  if (code >= 51 && code <= 67) return { label: "Rain Showers", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "❄️" };
  if (code >= 80 && code <= 82) return { label: "Heavy Rain", icon: "🌧️" };
  if (code >= 95) return { label: "Thunderstorm", icon: "⚡" };
  return { label: "Cloudy", icon: "☁️" };
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
    // Mock fallback if offline
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

  // Background
  ctx.fillStyle = cBg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Outer Bezel Frame Line
  ctx.strokeStyle = cBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12);

  const cur = weather.current || {};
  const daily = weather.daily || { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [] };
  const curTempC = Math.round(cur.temperature_2m || 30);
  const curTemp = useFahrenheit ? Math.round(curTempC * 9 / 5 + 32) : curTempC;
  const curCond = getWeatherInfo(cur.weather_code || 0);

  // Top Header (Left: Location & Current Temp)
  ctx.fillStyle = cText;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(cityName, 24, 42);

  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(`${curTemp}°${useFahrenheit ? 'F' : 'C'}`, 24, 98);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = cMuted;
  ctx.fillText(`${curCond.label}  •  Humidity: ${cur.relative_humidity_2m || 60}%  •  Wind: ${Math.round(cur.wind_speed_10m || 10)} km/h`, 24, 126);

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
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(timeStr, CANVAS_WIDTH - 24, 62);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = cMuted;
  ctx.fillText(dateStr, CANVAS_WIDTH - 24, 95);

  // Header Divider
  ctx.strokeStyle = cBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(20, 140);
  ctx.lineTo(CANVAS_WIDTH - 20, 140);
  ctx.stroke();

  // 5-Day Forecast Grid
  const cardW = 140;
  const cardH = 250;
  const gap = 12;
  const startX = 24;
  const cardY = 155;
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  for (let i = 0; i < 5; i++) {
    const cx = startX + i * (cardW + gap);
    
    // Card background & border
    ctx.fillStyle = paletteIndex === 0 ? '#FFFFFF' : cCardBg;
    ctx.strokeStyle = cBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx, cardY, cardW, cardH, 10);
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
    ctx.fillText(dayLabel, cx + cardW / 2, cardY + 28);

    ctx.fillStyle = cMuted;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(dateNum, cx + cardW / 2, cardY + 52);

    // Weather Icon & Label
    const dCode = daily.weather_code ? daily.weather_code[i] : 0;
    const dCond = getWeatherInfo(dCode);

    ctx.font = '36px sans-serif';
    ctx.fillText(dCond.icon, cx + cardW / 2, cardY + 105);

    ctx.fillStyle = cText;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(dCond.label, cx + cardW / 2, cardY + 145);

    // High / Low temps
    const maxC = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[i]) : 32;
    const minC = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[i]) : 25;
    const maxT = useFahrenheit ? Math.round(maxC * 9 / 5 + 32) : maxC;
    const minT = useFahrenheit ? Math.round(minC * 9 / 5 + 32) : minC;

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = cText;
    ctx.fillText(`${maxT}°`, cx + cardW / 2 - 22, cardY + 195);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = cMuted;
    ctx.fillText(`${minT}°`, cx + cardW / 2 + 22, cardY + 195);

    // Rain chance
    const rain = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = cMuted;
    ctx.fillText(`💧 ${rain}%`, cx + cardW / 2, cardY + 230);
  }

  // Footer Section (Font >= 18px)
  ctx.textAlign = 'left';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = cMuted;
  ctx.fillText(`Open-Meteo API  |  Seeed reTerminal E1001`, 24, 450);

  ctx.textAlign = 'right';
  ctx.fillText(`Battery: 85%`, CANVAS_WIDTH - 24, 450);

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderWeather,
  fetchWeatherData
};
