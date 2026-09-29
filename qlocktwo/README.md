# QLOCKTWO for Seeed reTerminal E1001

A typographic word clock application and standalone ESPHome firmware designed specifically for the **Seeed reTerminal E1001** 7.5" monochrome e-paper frame (800×480).

Part of the [dsa157/e1001](https://github.com/dsa157/e1001.git) project suite.

---

## Key Features & E1001 Innovations

### 1. Dual-Tier Architecture
- **Standalone ESPHome Firmware (`e1001_qlocktwo.yaml`)**: Runs directly on the ESP32-S3 microcontroller to drive the Waveshare 7.5" e-paper display (`7.50inv2`) without requiring external server dependencies.
- **Node.js Canvas & Web Server (`server.js`)**: An Express backend providing live web previews, interactive simulation, JSON state APIs (`/api/state`), and dynamic direct image rendering (`/render.png`, `/api/screen.png`).

### 2. 25% Gray E-Ink Dithering & Uniform Typography
- On 1-bit monochrome e-paper displays, unlit characters are rendered at the exact same **28px font size** as illuminated letters using a **25% dot-grid dither mask** (`px % 2 == 0 && py % 2 == 0`).
- This produces a faint, elegant gray appearance for unlit letters while keeping illuminated words 100% solid black (or white in dark mode), preserving typographic alignment.

### 3. NXP PCF8563 Hardware RTC Integration
- Integrates the onboard **NXP PCF8563 Real-Time Clock** over I2C (`SDA: GPIO19`, `SCL: GPIO20`, `0x51`).
- **Instant Boot Time Recovery**: On cold boot, the device reads directly from the battery-backed hardware RTC, eliminating startup delays and avoiding the default 7:00 (epoch UTC+7) display artifact.
- **Silent SNTP Synchronization**: Network time syncs via SNTP and updates the PCF8563 RTC in the background without causing mid-minute display redrawing.

### 4. Precision Top-of-Minute Refresh Cadence
- E-Paper refreshes strictly once per minute at **`:00s`** to conserve display cycles.
- Hardware buttons provide immediate interactivity without interrupting the scheduled top-of-minute cadence:
  - **GPIO4 (Top Button)**: Cycle active language (English, German, French, Spanish, Italian, Dutch).
  - **GPIO5 (Middle Button)**: Toggle color theme (Paper Light vs Charcoal Dark).
  - **GPIO3 (Bottom Button)**: Force manual screen refresh.

### 5. Hidden Unlit Minute Indicators
- 4-corner minute dots (`+1`, `+2`, `+3`, `+4` minutes) only render when illuminated, keeping the frame clean and uncluttered.

---

## Getting Started (Node.js App)

### Installation
Ensure you have `pnpm` installed:

```bash
pnpm install
```

### Running Development Server
```bash
pnpm run dev
```

- **Interactive Web Interface**: [http://localhost:3000](http://localhost:3000)
- **Direct Image Rendering**: [http://localhost:3000/render.png](http://localhost:3000/render.png)
- **JSON State API**: [http://localhost:3000/api/state](http://localhost:3000/api/state)

---

## Flashing ESPHome Firmware

To flash the standalone firmware to a connected reTerminal E1001 over USB:

```bash
/Users/dsa157/Development/e1001/.venv/bin/esphome run e1001_qlocktwo.yaml --device /dev/cu.usbserial-110
```

---

## Attributions & Credits

- **Repository**: [https://github.com/dsa157/e1001.git](https://github.com/dsa157/e1001.git) (directory `qlocktwo`)
- **Original Implementation**: Based on the HTML/jQuery implementation by **Nathan Pearson** ([ndpdev/qlocktwo](https://github.com/ndpdev/qlocktwo.git)).
- **Design Inspiration**: Concept originally created by [Biegert & Funk](http://www.qlocktwo.com).