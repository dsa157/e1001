# E1001 E-Ink Weather Dashboard Implementation Plan

Design and build a high-contrast, bold, and parameterizable Weather Dashboard optimized for the Seeed reTerminal E1001 (800x480 e-paper display) using p5.js and the free Open-Meteo API.

---

## Key Requirements & Architectural Decisions

- **Hardware Profile**: Seeed Studio reTerminal E1001 (ESP32-S3), 800 &times; 480 pixels native resolution, 1-bit / 4-level grayscale reflective E-Paper display.
- **Weather API**: Open-Meteo API (`https://api.open-meteo.com/v1/forecast`), which is 100% free, requires no API key, and provides hourly and daily forecast data with WMO weather codes, min/max temperatures, precipitation probability, and wind metrics.
- **Location Detection**: Automatic browser Geolocation with fallback to IP-based lookup (`https://get.geojs.io/v1/ip/geo.json`), Open-Meteo Geocoding API search, and customizable manual latitude/longitude parameters.
- **Time Format**: Default 12-hour format (with AM/PM), toggleable to 24-hour mode via top-level parameter and UI control.
- **E-Paper Optimization**: Sharp vector-drawn weather glyphs (Sun, Moon, Cloud, Rain, Storm, Snow, Fog, Wind) designed specifically for 1-bit / 4-level grayscale e-ink displays to avoid blurry anti-aliasing artifacts.

---

## Layout Structure (800 &times; 480 Full Bleed)

### 1. Header Section (`Y: 16..120px`)
- **Left**: Current location name, vector weather icon, large bold current temperature, condition string (e.g., *"Sunny"*, *"Partly Cloudy"*), humidity, and wind speed.
- **Right**: Current time (12hr with AM/PM or 24hr), current date (e.g., *"Monday, September 21, 2026"*), and time mode badge.
- **Separator**: Crisp e-ink divider line with decorative terminal accents.

### 2. Body Section (`Y: 135..410px`)
- **5-Day Forecast Grid**: 5 cleanly spaced cards across the 800px width.
- **Card Content**:
  - Day of the week (e.g., *"TODAY"*, *"TUE"*, *"WED"* in bold caps) + calendar date.
  - Large vector weather glyph.
  - Condition description.
  - High & Low temperature bar with numerical values.
  - Precipitation chance (e.g., *"💧 20%"*) and wind speed.
- **Dynamic Trend Line**: Connecting the 5-day temperature curve across the cards for visual elegance.

### 3. Footer Section (`Y: 422..466px`)
- **Left / Center**: Weather data source indicator (*"Open-Meteo"*), last sync timestamp, and status.
- **Right**: Bold battery icon with real-time level fill percentage (e.g., `[▮▮▮▮▯] 85%`), battery casing, and low-power warning indicator.

---

## Typography & Parameters (Zero Magic Numbers)

- All font sizes, font families, line weights, card dimensions, paddings, refresh intervals, coordinate defaults, temperature units (°F / °C), and time modes (12h / 24h) are parameterized at the top of `sketch.js` with default values in comments.
- 5 curated Adobe Kuler monochromatic / grayscale palettes suitable for e-ink display:
  - `0: Monochrome Minimalist`
  - `1: Charcoal & Mist`
  - `2: High Contrast 1-Bit`
  - `3: Carbon Slate`
  - `4: Stipple Ink Tones`
- Background color selector parameter.
- Global deterministic seed initialization.

---

## File Structure

- `index.html`: Responsive wrapper with e-ink bezel preview and developer control bar.
- `sketch.js`: p5.js weather dashboard engine with Open-Meteo integration, vector icon generator, and E-paper rendering.
- `style.css`: Dashboard container styles supporting standard E1001 bezel styling.
- `package.json`: NPM package metadata with local serve scripts.
- `IMPLEMENTATION_PLAN.md`: Full architectural specification and requirement reference.
