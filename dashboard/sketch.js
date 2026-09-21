/**
 * ============================================================================
 * Seeed reTerminal E1001 - E-Ink Weather Dashboard
 * Version: 2026.09.21.23.42.00
 * Description: High-contrast, parameterizable weather dashboard designed for
 *              the Seeed reTerminal E1001 (800x480 e-paper display).
 *              Features 12h/24h clock, current temperature and conditions,
 *              5-day forecast grid with vector weather glyphs, and battery gauge
 *              powered by the free Open-Meteo API.
 * ============================================================================
 */

// ============================================================================
// TOP-LEVEL CONFIGURATION PARAMETERS (ZERO MAGIC NUMBERS)
// Default values are documented in comments beside each parameter.
// ============================================================================

// Display Dimensions (Native Seeed E1001)
const DISPLAY_WIDTH = 800;                 // default: 800 (Screen width in px)
const DISPLAY_HEIGHT = 480;                // default: 480 (Screen height in px)
const DISPLAY_CENTER_X = 400;              // default: 400 (Canvas center X)
const DISPLAY_CENTER_Y = 240;              // default: 240 (Canvas center Y)

// Seed & Random Initialization
let GLOBAL_SEED = 1001;                    // default: 1001 (Deterministic random seed)

// Typography & Font Configuration (Strictly Sans-Serif)
const FONT_PRIMARY = "Roboto";             // default: "Roboto" (Strictly sans-serif)
const FONT_FAMILY_STACK = "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"; // default: modern sans-serif stack
let fontRobotoRegular = null;
let fontRobotoBold = null;

// Font Sizes (Bold & Easy to Read)
const FONT_SIZE_TEMP_HERO = 56;            // default: 56 (Hero current temp size)
const FONT_SIZE_TIME_HERO = 44;            // default: 44 (Hero time clock size)
const FONT_SIZE_LOCATION = 24;             // default: 24 (Location title size)
const FONT_SIZE_CONDITION = 16;            // default: 16 (Condition subtitle size)
const FONT_SIZE_DATE = 16;                 // default: 16 (Header date size)
const FONT_SIZE_CARD_DAY = 18;             // default: 18 (Forecast card day name)
const FONT_SIZE_CARD_DATE = 12;            // default: 12 (Forecast card calendar date)
const FONT_SIZE_CARD_TEMP_MAX = 22;        // default: 22 (Forecast high temp)
const FONT_SIZE_CARD_TEMP_MIN = 16;        // default: 16 (Forecast low temp)
const FONT_SIZE_CARD_METRICS = 13;         // default: 13 (Card condition text)
const FONT_SIZE_FOOTER = 14;               // default: 14 (Footer text size)
const FONT_SIZE_BATTERY = 16;              // default: 16 (Battery text size)

// Layout Margins & Sizing
const MARGIN_X = 20;                       // default: 20 (Horizontal padding)
const HEADER_Y = 16;                       // default: 16 (Header top position)
const HEADER_HEIGHT = 105;                 // default: 105 (Header section height)
const BODY_Y = 135;                        // default: 135 (Forecast cards top position)
const BODY_HEIGHT = 275;                   // default: 275 (Forecast cards height)
const FOOTER_Y = 422;                      // default: 422 (Footer top position)
const FOOTER_HEIGHT = 44;                  // default: 44 (Footer section height)

// Forecast Grid Parameters
const FORECAST_DAYS_COUNT = 5;             // default: 5 (5-day forecast display)
const CARD_GAP = 12;                       // default: 12 (Gap between forecast cards)
const CARD_CORNER_RADIUS = 20;              // default: 8 (Forecast card border radius)
const ICON_SIZE_HERO = 54;                 // default: 54 (Header weather icon diameter)
const ICON_SIZE_CARD = 48;                 // default: 48 (Card weather icon diameter)

// Battery Gauge Parameters
const BATTERY_WIDTH = 48;                  // default: 48 (Battery icon width)
const BATTERY_HEIGHT = 22;                 // default: 22 (Battery icon height)
const BATTERY_NUB_WIDTH = 4;               // default: 4 (Battery terminal nub width)
const BATTERY_NUB_HEIGHT = 10;             // default: 10 (Battery terminal nub height)
let BATTERY_LEVEL = 23;                    // default: 85 (Simulated battery percentage 0-100)

// Units & Mode Configuration
let USE_24_HOUR_TIME = false;              // default: false (12-hour format default, true = 24-hour)
let TEMPERATURE_UNIT = "C";                // default: "C" ("C" for Celsius, "F" for Fahrenheit)
let ACTIVE_PALETTE_INDEX = 0;              // default: 0 (Active color palette index: 0-4)
let BACKGROUND_COLOR_INDEX = 0;            // default: 0 (Background tone index within active palette)
let DITHER_ENABLED = false;                // default: false (1-bit Floyd-Steinberg dithering)

// Location & Weather API Configuration
let LOCATION_NAME = "Bangkok, TH";         // default: "Bangkok, TH" (Default location name)
let LATITUDE = 13.7563;                    // default: 13.7563 (Bangkok Latitude)
let LONGITUDE = 100.5018;                  // default: 100.5018 (Bangkok Longitude)
const AUTO_REFRESH_INTERVAL_MS = 600000;   // default: 600000 (10 minutes weather refresh)

// ============================================================================
// 5 CURATED ADOBE KULER MONOCHROMATIC & GRAYSCALE PALETTES
// Tone index layout: [0: Stark Light, 1: Soft Light, 2: Mid Tone, 3: Deep Dark, 4: Pure Ink]
// ============================================================================

const COLOR_PALETTES = [
  // Palette 0: "Monochrome Minimalist" (Pure contrast scale from stark white to deep black)
  ["#FFFFFF", "#E0E0E0", "#9E9E9E", "#424242", "#000000"],

  // Palette 1: "Charcoal & Mist" (Cool slate and charcoal e-ink gradations)
  ["#F8F9FA", "#D5D8DC", "#85929E", "#34495E", "#17202A"],

  // Palette 2: "High Contrast 1-Bit" (Strict binary pure white and pure black for highest e-ink sharpness)
  ["#FFFFFF", "#FFFFFF", "#000000", "#000000", "#000000"],

  // Palette 3: "Carbon Slate" (Architectural dense carbon and metallic graphite tones)
  ["#EAEDED", "#ABB2B9", "#566573", "#273746", "#0D1117"],

  // Palette 4: "Stipple Ink Tones" (Fine paper parchment with varying density micro-pigment tones)
  ["#FAF9F6", "#D0D3D4", "#7F8C8D", "#2C3E50", "#111111"]
];

const PALETTE_NAMES = [
  "0: Monochrome Minimalist",
  "1: Charcoal & Mist",
  "2: High Contrast 1-Bit",
  "3: Carbon Slate",
  "4: Stipple Ink Tones"
];

// ============================================================================
// STATE & DATA STORAGE
// ============================================================================

let weatherData = null;
let lastUpdatedTime = null;
let isLoadingWeather = false;
let weatherErrorMessage = null;

// Built-in Mock Weather Data (Zero Network Dependency Fallback)
const DEFAULT_MOCK_WEATHER = {
  current: {
    tempC: 31,
    weatherCode: 1, // Mainly Clear
    condition: "Mainly Clear",
    humidity: 62,
    windSpeedKmH: 14,
    isDay: 1
  },
  daily: [
    { day: "TODAY", date: "Sep 21", tempMaxC: 34, tempMinC: 26, weatherCode: 1, condition: "Mainly Clear", precipProb: 15, windSpeed: 14 },
    { day: "TUE", date: "Sep 22", tempMaxC: 33, tempMinC: 25, weatherCode: 2, condition: "Partly Cloudy", precipProb: 25, windSpeed: 16 },
    { day: "WED", date: "Sep 23", tempMaxC: 32, tempMinC: 25, weatherCode: 61, condition: "Light Rain", precipProb: 65, windSpeed: 18 },
    { day: "THU", date: "Sep 24", tempMaxC: 30, tempMinC: 24, weatherCode: 80, condition: "Rain Showers", precipProb: 80, windSpeed: 20 },
    { day: "FRI", date: "Sep 25", tempMaxC: 32, tempMinC: 25, weatherCode: 3, condition: "Overcast", precipProb: 35, windSpeed: 12 }
  ]
};

// ============================================================================
// P5.JS CORE LIFECYCLE FUNCTIONS
// ============================================================================

function setup() {
  const canvas = createCanvas(DISPLAY_WIDTH, DISPLAY_HEIGHT);
  canvas.parent("eink-canvas-container");
  pixelDensity(1);
  useFont(false);

  // Initialize deterministic seed
  reseed(GLOBAL_SEED);

  // Load initial fallback data first, then detect actual location
  weatherData = JSON.parse(JSON.stringify(DEFAULT_MOCK_WEATHER));
  lastUpdatedTime = new Date();

  // Automatically detect actual location (GPS / IP lookup) and fetch weather
  detectCurrentLocation();

  // Query actual browser/hardware battery level if available
  if (navigator.getBattery) {
    navigator.getBattery().then((battery) => {
      BATTERY_LEVEL = Math.round(battery.level * 100);
      const sliderBattery = document.getElementById("battery-slider");
      const labelBattery = document.getElementById("battery-value-label");
      if (sliderBattery) sliderBattery.value = BATTERY_LEVEL;
      if (labelBattery) labelBattery.innerText = `${BATTERY_LEVEL}%`;
      redraw();

      battery.addEventListener("levelchange", () => {
        BATTERY_LEVEL = Math.round(battery.level * 100);
        if (sliderBattery) sliderBattery.value = BATTERY_LEVEL;
        if (labelBattery) labelBattery.innerText = `${BATTERY_LEVEL}%`;
        redraw();
      });
    }).catch((e) => console.log("Battery API note:", e));
  }

  // Setup periodic refresh
  setInterval(() => {
    fetchLiveWeather(LATITUDE, LONGITUDE, LOCATION_NAME);
  }, AUTO_REFRESH_INTERVAL_MS);

  // Bind HTML controls and keyboard shortcuts
  setupUIEventListeners();
  noLoop(); // E-paper display redraws on state updates or timer ticks
  redraw();
}

function draw() {
  // Center rendering coordinate anchor
  push();

  // Background selection from palette
  const activePalette = COLOR_PALETTES[ACTIVE_PALETTE_INDEX % COLOR_PALETTES.length];
  const bgColor = activePalette[BACKGROUND_COLOR_INDEX % activePalette.length];
  background(bgColor);

  // Draw Header Section
  drawHeader(activePalette);

  // Draw 5-Day Forecast Grid
  drawForecastGrid(activePalette);

  // Draw Footer Section with Battery Gauge
  drawFooter(activePalette);

  // Apply 1-Bit Dither pass if enabled for high-contrast e-paper
  if (DITHER_ENABLED) {
    applyDitheringPass();
  }

  pop();
}

// ============================================================================
// HEADER SECTION RENDERING
// ============================================================================

function drawHeader(palette) {
  const textColor = palette[4];       // Darkest ink
  const subTextColor = palette[3];    // Secondary dark
  const borderTone = palette[2];      // Mid tone

  const headerLeftX = MARGIN_X + 10;
  const headerRightX = DISPLAY_WIDTH - MARGIN_X - 10;
  const currentTemp = formatTemp(weatherData.current.tempC);
  const condition = weatherData.current.condition || "Clear";

  // --- LEFT HEADER: Current Temperature & Location ---
  push();
  textAlign(LEFT, TOP);

  // Location Name
  fill(textColor);
  noStroke();
  useFont(true);
  textSize(FONT_SIZE_LOCATION);
  text(LOCATION_NAME.toUpperCase(), headerLeftX, HEADER_Y);

  // Current Weather Icon (Vector glyph)
  const iconX = headerLeftX + 28;
  const iconY = HEADER_Y + 54;
  drawWeatherIcon(iconX, iconY, ICON_SIZE_HERO, weatherData.current.weatherCode, palette, weatherData.current.isDay);

  // Big Bold Current Temperature
  fill(textColor);
  useFont(true);
  textSize(FONT_SIZE_TEMP_HERO);
  text(currentTemp, headerLeftX + 68, HEADER_Y + 28);

  // Weather Condition Subtitle & Humidity
  fill(subTextColor);
  useFont(false);
  textSize(FONT_SIZE_CONDITION);
  const metaText = `${condition}  •  Humidity: ${weatherData.current.humidity}%`;
  text(metaText, headerLeftX + 68, HEADER_Y + 84);
  pop();

  // --- RIGHT HEADER: 12h/24h Time & Date ---
  push();
  textAlign(RIGHT, TOP);

  // Current formatted time
  const timeString = getFormattedTime(new Date(), USE_24_HOUR_TIME);
  fill(textColor);
  useFont(true);
  textSize(FONT_SIZE_TIME_HERO);
  text(timeString, headerRightX, HEADER_Y + 5);

  // Current formatted full date
  const dateString = getFormattedFullDate(new Date());
  fill(subTextColor);
  useFont(true);
  textSize(FONT_SIZE_DATE);
  text(dateString, headerRightX, HEADER_Y + 58);
  pop();
}

// ============================================================================
// BODY SECTION RENDERING (5-DAY FORECAST GRID)
// ============================================================================

function drawForecastGrid(palette) {
  const days = weatherData.daily.slice(0, FORECAST_DAYS_COUNT);
  const totalAvailableWidth = DISPLAY_WIDTH - (MARGIN_X * 2);
  const totalGaps = (FORECAST_DAYS_COUNT - 1) * CARD_GAP;
  const cardWidth = (totalAvailableWidth - totalGaps) / FORECAST_DAYS_COUNT;

  // Draw 5 Forecast Cards
  for (let i = 0; i < FORECAST_DAYS_COUNT; i++) {
    const dayData = days[i];
    const cardX = MARGIN_X + i * (cardWidth + CARD_GAP);
    const cardY = BODY_Y;

    drawForecastCard(cardX, cardY, cardWidth, BODY_HEIGHT, dayData, i === 0, palette);
  }
}

function drawForecastCard(x, y, w, h, data, isToday, palette) {
  push();
  const cardBgTone = isToday ? palette[1] : palette[0];
  const borderTone = isToday ? palette[4] : palette[2];
  const textColor = palette[4];
  const subTextColor = palette[3];

  // Card Outer Background & Border
  rectMode(CORNER);
  fill(cardBgTone);
  stroke(borderTone);
  strokeWeight(isToday ? 2.5 : 1.5);
  rect(x, y, w, h, CARD_CORNER_RADIUS);

  // Card Header Tag (Day Name)
  textAlign(CENTER, TOP);
  fill(textColor);
  noStroke();
  useFont(true);
  textSize(FONT_SIZE_CARD_DAY);
  text(data.day, x + w / 2, y + 14);

  // Calendar Date
  fill(subTextColor);
  useFont(false);
  textSize(FONT_SIZE_CARD_DATE);
  text(data.date, x + w / 2, y + 38);

  // Card Weather Glyph
  const iconCenterX = x + w / 2;
  const iconCenterY = y + 90;
  drawWeatherIcon(iconCenterX, iconCenterY, ICON_SIZE_CARD, data.weatherCode, palette, 1);

  // Short condition description
  fill(textColor);
  useFont(true);
  textSize(FONT_SIZE_CARD_METRICS);
  text(data.condition, x + w / 2, y + 132);

  // High & Low Temperatures
  const highStr = `${Math.round(convertTempUnit(data.tempMaxC, TEMPERATURE_UNIT))}°`;
  const lowStr = `${Math.round(convertTempUnit(data.tempMinC, TEMPERATURE_UNIT))}°`;

  // High Temp (Bold & Large)
  fill(textColor);
  useFont(true);
  textSize(FONT_SIZE_CARD_TEMP_MAX);
  text(highStr, x + w / 2 - 20, y + 168);

  // Low Temp (Subtle)
  fill(subTextColor);
  useFont(false);
  textSize(FONT_SIZE_CARD_TEMP_MIN);
  text(lowStr, x + w / 2 + 22, y + 172);

  // Solid Black Card Separator
  drawCardSeparator(x + 16, y + 204, w - 32, palette);

  // "TODAY" Highlight Ribbon if it's the current day
  if (isToday) {
    fill(palette[4]);
    rect(x + 16, y + h - 28, w - 32, 18, 4);
    fill(palette[0]);
    useFont(true);
    textSize(10);
    textAlign(CENTER, CENTER);
    text("CURRENT", x + w / 2, y + h - 19);
  }

  pop();
}

function drawCardSeparator(x, y, w, palette) {
  push();
  stroke(palette[4]);
  strokeWeight(2);
  line(x, y, x + w, y);
  pop();
}

// ============================================================================
// FOOTER SECTION RENDERING WITH BATTERY INDICATOR
// ============================================================================

function drawFooter(palette) {
  const textColor = palette[4];
  const subTextColor = palette[3];

  // Left Footer: Data Source & Live Refresh Status
  push();
  textAlign(LEFT, CENTER);
  fill(subTextColor);
  noStroke();
  textSize(FONT_SIZE_FOOTER);
  useFont(false);
  const timeStampStr = lastUpdatedTime ? lastUpdatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now";
  const statusStr = isLoadingWeather ? "⏳ Syncing weather..." : `• Open-Meteo Free API  |  Last Sync: ${timeStampStr}`;
  text(statusStr, MARGIN_X + 8, FOOTER_Y + FOOTER_HEIGHT / 2);
  pop();

  // Right Footer: Battery Level Indicator (Rule: bottom footer shows battery level on right)
  const batteryRightX = DISPLAY_WIDTH - MARGIN_X - 10;
  const batteryCenterY = FOOTER_Y + FOOTER_HEIGHT / 2;
  drawBatteryIndicator(batteryRightX, batteryCenterY, BATTERY_LEVEL, palette);
}

function drawBatteryIndicator(rightEdgeX, centerY, levelPercent, palette) {
  push();
  const textColor = palette[4];
  const bodyColor = palette[4];
  const emptyColor = palette[1];
  const barHeight = BATTERY_HEIGHT;
  const barWidth = BATTERY_WIDTH;

  const batteryBodyX = rightEdgeX - BATTERY_NUB_WIDTH - barWidth;
  const batteryBodyY = centerY - barHeight / 2;

  // Battery percentage label on the left of the battery icon
  textAlign(RIGHT, CENTER);
  fill(textColor);
  noStroke();
  useFont(true);
  textSize(FONT_SIZE_BATTERY);
  text(`${Math.round(levelPercent)}%`, batteryBodyX - 10, centerY);

  // Battery Outer Casing
  rectMode(CORNER);
  stroke(bodyColor);
  strokeWeight(2);
  noFill();
  rect(batteryBodyX, batteryBodyY, barWidth, barHeight, 4);

  // Battery Positive Terminal Nub
  fill(bodyColor);
  noStroke();
  const nubX = batteryBodyX + barWidth;
  const nubY = centerY - BATTERY_NUB_HEIGHT / 2;
  rect(nubX, nubY, BATTERY_NUB_WIDTH, BATTERY_NUB_HEIGHT, 2);

  // Battery Internal Level Fill
  const innerPad = 3;
  const maxInnerW = barWidth - (innerPad * 2);
  const innerH = barHeight - (innerPad * 2);
  const fillWidth = constrain((levelPercent / 100) * maxInnerW, 0, maxInnerW);

  if (fillWidth > 0) {
    fill(bodyColor);
    noStroke();
    rect(batteryBodyX + innerPad, batteryBodyY + innerPad, fillWidth, innerH, 2);
  }

  // Warning exclamation if low battery (< 20%)
  if (levelPercent <= 20) {
    fill(palette[0]);
    useFont(true);
    textSize(12);
    textAlign(CENTER, CENTER);
    text("!", batteryBodyX + barWidth / 2, centerY);
  }
  pop();
}

// ============================================================================
// PRELOAD OFFICIAL LUCIDE SVG ICONS & ROBOTO FONTS
// ============================================================================

let lucideIcons = {};

function preload() {
  fontRobotoRegular = loadFont("assets/fonts/Roboto-Regular.ttf");
  fontRobotoBold = loadFont("assets/fonts/Roboto-Bold.ttf");
  lucideIcons.sun = loadImage("assets/icons/sun.svg");
  lucideIcons.cloudSun = loadImage("assets/icons/cloud-sun.svg");
  lucideIcons.cloud = loadImage("assets/icons/cloud.svg");
  lucideIcons.cloudRain = loadImage("assets/icons/cloud-rain.svg");
  lucideIcons.cloudLightning = loadImage("assets/icons/cloud-lightning.svg");
  lucideIcons.cloudSnow = loadImage("assets/icons/cloud-snow.svg");
  lucideIcons.cloudFog = loadImage("assets/icons/cloud-fog.svg");
  lucideIcons.moon = loadImage("assets/icons/moon.svg");
}

function useFont(isBold = false) {
  if (isBold && fontRobotoBold) {
    textFont(fontRobotoBold);
  } else if (!isBold && fontRobotoRegular) {
    textFont(fontRobotoRegular);
  } else {
    textFont(FONT_PRIMARY);
    textStyle(isBold ? BOLD : NORMAL);
  }
}

// ============================================================================
// CRISP OFFICIAL LUCIDE ICONS (SVG ASSETS)
// ============================================================================

function drawWeatherIcon(cx, cy, size, weatherCode, palette, isDay = 1) {
  push();
  translate(cx, cy);
  imageMode(CENTER);

  let iconImg = lucideIcons.cloud;
  if (weatherCode === 0) {
    iconImg = isDay ? lucideIcons.sun : lucideIcons.moon;
  } else if (weatherCode === 1 || weatherCode === 2) {
    iconImg = isDay ? lucideIcons.cloudSun : lucideIcons.cloud;
  } else if (weatherCode === 3) {
    iconImg = lucideIcons.cloud;
  } else if (weatherCode >= 45 && weatherCode <= 48) {
    iconImg = lucideIcons.cloudFog;
  } else if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) {
    iconImg = lucideIcons.cloudRain;
  } else if (weatherCode >= 71 && weatherCode <= 77) {
    iconImg = lucideIcons.cloudSnow;
  } else if (weatherCode >= 95) {
    iconImg = lucideIcons.cloudLightning;
  }

  if (iconImg) {
    image(iconImg, 0, 0, size, size);
  }
  pop();
}

function drawVectorSun(x, y, r, ink) {
  push();
  translate(x, y);
  stroke(ink);
  strokeWeight(2.5);
  fill(ink);
  ellipse(0, 0, r * 0.9, r * 0.9);

  // Sun rays
  const rayCount = 8;
  const rayInner = r * 0.65;
  const rayOuter = r * 1.05;
  for (let i = 0; i < rayCount; i++) {
    const angle = (TWO_PI / rayCount) * i;
    const x1 = cos(angle) * rayInner;
    const y1 = sin(angle) * rayInner;
    const x2 = cos(angle) * rayOuter;
    const y2 = sin(angle) * rayOuter;
    line(x1, y1, x2, y2);
  }
  pop();
}

function drawVectorMoon(x, y, r, ink) {
  push();
  translate(x, y);
  stroke(ink);
  strokeWeight(2);
  fill(ink);
  // Crescent moon silhouette
  beginShape();
  arc(0, 0, r * 1.2, r * 1.2, -HALF_PI, HALF_PI);
  bezierVertex(r * 0.2, r * 0.6, r * 0.2, -r * 0.6, 0, -r * 0.6);
  endShape(CLOSE);
  pop();
}

function drawVectorCloud(x, y, r, ink, fillTone) {
  push();
  translate(x, y);
  stroke(ink);
  strokeWeight(2.2);
  fill(fillTone);

  // Overlapping crisp cloud puff circles
  ellipse(-r * 0.45, 0, r * 0.75, r * 0.75);
  ellipse(r * 0.45, 0, r * 0.65, r * 0.65);
  ellipse(0, -r * 0.35, r * 0.95, r * 0.95);
  // Base flat pill
  rectMode(CENTER);
  noStroke();
  rect(0, r * 0.1, r * 1.2, r * 0.5);
  stroke(ink);
  line(-r * 0.6, r * 0.35, r * 0.6, r * 0.35);
  pop();
}

function drawVectorRainDrops(x, y, r, ink, count = 3) {
  push();
  translate(x, y);
  stroke(ink);
  strokeWeight(2.2);
  strokeCap(ROUND);

  const startX = -r * 0.5;
  const stepX = (r * 1.0) / (count + 1);
  for (let i = 1; i <= count; i++) {
    const dropX = startX + stepX * i;
    const dropY = (i % 2 === 0) ? -2 : 4;
    line(dropX, dropY, dropX - 4, dropY + 12);
  }
  pop();
}

function drawVectorSnowFlakes(x, y, r, ink) {
  push();
  translate(x, y);
  stroke(ink);
  strokeWeight(2);
  const flakePositions = [
    { x: -r * 0.35, y: 0 },
    { x: 0, y: 8 },
    { x: r * 0.35, y: 2 }
  ];
  flakePositions.forEach(p => {
    line(p.x - 4, p.y, p.x + 4, p.y);
    line(p.x, p.y - 4, p.x, p.y + 4);
    line(p.x - 3, p.y - 3, p.x + 3, p.y + 3);
    line(p.x - 3, p.y + 3, p.x + 3, p.y - 3);
  });
  pop();
}

function drawVectorLightning(x, y, r, ink) {
  push();
  translate(x, y);
  fill(ink);
  noStroke();
  beginShape();
  vertex(0, -r * 0.4);
  vertex(-r * 0.3, r * 0.1);
  vertex(-r * 0.05, r * 0.1);
  vertex(-r * 0.25, r * 0.7);
  vertex(r * 0.3, 0);
  vertex(r * 0.05, 0);
  vertex(r * 0.25, -r * 0.4);
  endShape(CLOSE);
  pop();
}

function drawVectorFog(x, y, r, ink) {
  push();
  translate(x, y);
  stroke(ink);
  strokeWeight(2.5);
  strokeCap(ROUND);
  line(-r * 0.8, -r * 0.3, r * 0.8, -r * 0.3);
  line(-r * 0.6, 0, r * 0.6, 0);
  line(-r * 0.75, r * 0.3, r * 0.75, r * 0.3);
  line(-r * 0.4, r * 0.6, r * 0.4, r * 0.6);
  pop();
}

// ============================================================================
// WEATHER API INTEGRATION & GEOLOCATION (FREE OPEN-METEO API)
// ============================================================================

async function fetchLiveWeather(lat, lon, locationLabel) {
  isLoadingWeather = true;
  weatherErrorMessage = null;
  redraw();

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    // Map Open-Meteo response to our clean dashboard schema
    const currentCode = data.current.weather_code;
    const daysArr = [];
    const weekdayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i < Math.min(5, data.daily.time.length); i++) {
      const dateObj = new Date(data.daily.time[i] + "T00:00:00");
      const dayLabel = i === 0 ? "TODAY" : weekdayNames[dateObj.getDay()];
      const dateStr = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}`;
      const code = data.daily.weather_code[i];

      daysArr.push({
        day: dayLabel,
        date: dateStr,
        tempMaxC: data.daily.temperature_2m_max[i],
        tempMinC: data.daily.temperature_2m_min[i],
        weatherCode: code,
        condition: getWMOConditionName(code),
        precipProb: data.daily.precipitation_probability_max ? data.daily.precipitation_probability_max[i] || 0 : 0,
        windSpeed: Math.round(data.daily.wind_speed_10m_max ? data.daily.wind_speed_10m_max[i] || 10 : 10)
      });
    }

    weatherData = {
      current: {
        tempC: data.current.temperature_2m,
        weatherCode: currentCode,
        condition: getWMOConditionName(currentCode),
        humidity: data.current.relative_humidity_2m,
        windSpeedKmH: Math.round(data.current.wind_speed_10m),
        isDay: data.current.is_day !== undefined ? data.current.is_day : 1
      },
      daily: daysArr
    };

    if (locationLabel) {
      LOCATION_NAME = locationLabel;
    }
    lastUpdatedTime = new Date();
    isLoadingWeather = false;
    redraw();
  } catch (err) {
    console.warn("Could not fetch live weather, using reliable fallback:", err);
    isLoadingWeather = false;
    weatherErrorMessage = "Using offline data";
    redraw();
  }
}

async function searchLocation(query) {
  if (!query || query.trim() === "") return;
  const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  try {
    const res = await fetch(geocodeUrl);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const loc = data.results[0];
      const name = `${loc.name}, ${loc.country_code ? loc.country_code.toUpperCase() : ""}`;
      LATITUDE = loc.latitude;
      LONGITUDE = loc.longitude;
      await fetchLiveWeather(LATITUDE, LONGITUDE, name);
    } else {
      alert("Location not found. Please try another city.");
    }
  } catch (e) {
    console.error("Geocoding failed:", e);
  }
}

async function detectCurrentLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        LATITUDE = pos.coords.latitude;
        LONGITUDE = pos.coords.longitude;
        await fetchLiveWeather(LATITUDE, LONGITUDE, "Current Location");
      },
      async (err) => {
        console.warn("Browser GPS denied, attempting IP lookup fallback...", err);
        try {
          const ipRes = await fetch("https://get.geojs.io/v1/ip/geo.json");
          const ipData = await ipRes.json();
          LATITUDE = parseFloat(ipData.latitude);
          LONGITUDE = parseFloat(ipData.longitude);
          const name = `${ipData.city || "My Location"}, ${ipData.country_code || ""}`;
          await fetchLiveWeather(LATITUDE, LONGITUDE, name);
        } catch (ipErr) {
          console.error("IP fallback failed:", ipErr);
        }
      }
    );
  }
}

function getWMOConditionName(code) {
  if (code === 0) return "Clear Sky";
  if (code === 1) return "Mainly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

// ============================================================================
// FORMATTING & MATH UTILITIES
// ============================================================================

function convertTempUnit(celsius, unit) {
  if (unit === "F") {
    return (celsius * 9 / 5) + 32;
  }
  return celsius;
}

function formatTemp(celsius) {
  const val = Math.round(convertTempUnit(celsius, TEMPERATURE_UNIT));
  return `${val}°${TEMPERATURE_UNIT}`;
}

function getFormattedTime(date, is24Hr) {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");

  if (is24Hr) {
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  } else {
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    return `${hours}:${minutes} ${ampm}`;
  }
}

function getFormattedFullDate(date) {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayOfWeek = weekdays[date.getDay()];
  const month = months[date.getMonth()];
  const dayNum = date.getDate();
  const year = date.getFullYear();
  return `${dayOfWeek}, ${month} ${dayNum}, ${year}`;
}

function reseed(s = null) {
  GLOBAL_SEED = s !== null ? s : Math.floor(random(1, 999999));
  randomSeed(GLOBAL_SEED);
  noiseSeed(GLOBAL_SEED);
  const seedElem = document.getElementById("seed-display");
  if (seedElem) seedElem.innerText = `Seed: ${GLOBAL_SEED}`;
}

// ============================================================================
// 1-BIT DITHERING PASS (FLOYD-STEINBERG FOR E-PAPER)
// ============================================================================

function applyDitheringPass() {
  loadPixels();
  const w = width;
  const h = height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const oldLum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
      const newLum = oldLum < 128 ? 0 : 255;
      const err = oldLum - newLum;

      pixels[idx] = newLum;
      pixels[idx + 1] = newLum;
      pixels[idx + 2] = newLum;

      distributeDitherError(x + 1, y, err * (7 / 16), w, h);
      distributeDitherError(x - 1, y + 1, err * (3 / 16), w, h);
      distributeDitherError(x, y + 1, err * (5 / 16), w, h);
      distributeDitherError(x + 1, y + 1, err * (1 / 16), w, h);
    }
  }
  updatePixels();
}

function distributeDitherError(x, y, err, w, h) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const idx = (y * w + x) * 4;
  pixels[idx] = constrain(pixels[idx] + err, 0, 255);
  pixels[idx + 1] = constrain(pixels[idx + 1] + err, 0, 255);
  pixels[idx + 2] = constrain(pixels[idx + 2] + err, 0, 255);
}

// ============================================================================
// EVENT HANDLERS & HTML CONTROL BINDINGS
// ============================================================================

function setupUIEventListeners() {
  // Reseed / Refresh Weather Button
  const btnRefresh = document.getElementById("btn-refresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      fetchLiveWeather(LATITUDE, LONGITUDE, LOCATION_NAME);
    });
  }

  // Location Search
  const btnSearch = document.getElementById("btn-search");
  const inputLoc = document.getElementById("location-input");
  if (btnSearch && inputLoc) {
    btnSearch.addEventListener("click", () => searchLocation(inputLoc.value));
    inputLoc.addEventListener("keypress", (e) => {
      if (e.key === "Enter") searchLocation(inputLoc.value);
    });
  }

  // GPS Auto-detect
  const btnGeo = document.getElementById("btn-geolocate");
  if (btnGeo) {
    btnGeo.addEventListener("click", () => detectCurrentLocation());
  }

  // 12h / 24h Time Mode Toggles
  const btnTime12 = document.getElementById("btn-time-12");
  const btnTime24 = document.getElementById("btn-time-24");
  if (btnTime12 && btnTime24) {
    btnTime12.addEventListener("click", () => {
      USE_24_HOUR_TIME = false;
      btnTime12.classList.add("active");
      btnTime24.classList.remove("active");
      redraw();
    });
    btnTime24.addEventListener("click", () => {
      USE_24_HOUR_TIME = true;
      btnTime24.classList.add("active");
      btnTime12.classList.remove("active");
      redraw();
    });
  }

  // °C / °F Unit Toggles
  const btnUnitC = document.getElementById("btn-unit-c");
  const btnUnitF = document.getElementById("btn-unit-f");
  if (btnUnitC && btnUnitF) {
    btnUnitC.addEventListener("click", () => {
      TEMPERATURE_UNIT = "C";
      btnUnitC.classList.add("active");
      btnUnitF.classList.remove("active");
      redraw();
    });
    btnUnitF.addEventListener("click", () => {
      TEMPERATURE_UNIT = "F";
      btnUnitF.classList.add("active");
      btnUnitC.classList.remove("active");
      redraw();
    });
  }

  // Palette Selector
  const selectPalette = document.getElementById("palette-select");
  if (selectPalette) {
    selectPalette.addEventListener("change", (e) => {
      ACTIVE_PALETTE_INDEX = parseInt(e.target.value, 10);
      redraw();
    });
  }

  // Background Tone Selector
  const selectBg = document.getElementById("bg-select");
  if (selectBg) {
    selectBg.addEventListener("change", (e) => {
      BACKGROUND_COLOR_INDEX = parseInt(e.target.value, 10);
      redraw();
    });
  }

  // Battery Level Slider
  const sliderBattery = document.getElementById("battery-slider");
  const labelBattery = document.getElementById("battery-value-label");
  if (sliderBattery) {
    sliderBattery.addEventListener("input", (e) => {
      BATTERY_LEVEL = parseFloat(e.target.value);
      if (labelBattery) labelBattery.innerText = `${BATTERY_LEVEL}%`;
      redraw();
    });
  }

  // 1-Bit Dither Toggle
  const btnDither = document.getElementById("btn-dither");
  if (btnDither) {
    btnDither.addEventListener("click", () => {
      DITHER_ENABLED = !DITHER_ENABLED;
      btnDither.classList.toggle("active", DITHER_ENABLED);
      redraw();
    });
  }

  // Export PNG
  const btnExport = document.getElementById("btn-export");
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      saveCanvas("e1001_weather_dashboard", "png");
    });
  }

  // Global Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === "r") {
      fetchLiveWeather(LATITUDE, LONGITUDE, LOCATION_NAME);
    } else if (key === "t") {
      USE_24_HOUR_TIME = !USE_24_HOUR_TIME;
      if (btnTime12 && btnTime24) {
        btnTime12.classList.toggle("active", !USE_24_HOUR_TIME);
        btnTime24.classList.toggle("active", USE_24_HOUR_TIME);
      }
      redraw();
    } else if (key === "u") {
      TEMPERATURE_UNIT = TEMPERATURE_UNIT === "C" ? "F" : "C";
      if (btnUnitC && btnUnitF) {
        btnUnitC.classList.toggle("active", TEMPERATURE_UNIT === "C");
        btnUnitF.classList.toggle("active", TEMPERATURE_UNIT === "F");
      }
      redraw();
    } else if (key === "d") {
      DITHER_ENABLED = !DITHER_ENABLED;
      if (btnDither) btnDither.classList.toggle("active", DITHER_ENABLED);
      redraw();
    } else if (key === "b") {
      BATTERY_LEVEL = (BATTERY_LEVEL + 25) % 125;
      if (BATTERY_LEVEL > 100) BATTERY_LEVEL = 10;
      if (sliderBattery) sliderBattery.value = BATTERY_LEVEL;
      if (labelBattery) labelBattery.innerText = `${BATTERY_LEVEL}%`;
      redraw();
    } else if (key >= "1" && key <= "5") {
      ACTIVE_PALETTE_INDEX = parseInt(key, 10) - 1;
      if (selectPalette) selectPalette.value = ACTIVE_PALETTE_INDEX;
      redraw();
    } else if (key === "s") {
      saveCanvas("e1001_weather_dashboard", "png");
    }
  });
}
