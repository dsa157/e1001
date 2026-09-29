# Seeed reTerminal E1001 &bull; Projects & Shared Framework

Parent repository and shared infrastructure for **Seeed Studio reTerminal E1001** creative coding and e-paper display projects.

---

## Directory Structure
- `common/`: Shared core libraries and styles across all E1001 sketches:
  - `e1001-common.js`: Core engine, 800&times;480 hardware parameters, 5 curated monochromatic palettes, deterministic seed management, 1-bit Floyd-Steinberg dithering.
  - `e1001-style.css`: Unified e-paper bezel container, glassmorphism toolbar, and responsive typography.
- `firmware/`: Shared ESPHome templates and drivers for flashing to the E1001 device (GPIO3, GPIO4, GPIO5 buttons, SPI bus configuration, UC8179 controller).
- `modules/`: Plug-and-play screen modules:
  - `weather/`: E-Ink Weather Dashboard with Open-Meteo API integration.
  - `crypto/`: Cryptocurrency asset tracker with CoinMarketCap integration.
  - `qlocktwo/`: Multilingual typographic word clock with direct 1-bit rendering endpoint.
  - `tasks/`: Google Tasks productivity dashboard.
  - `art1-test/`: Generative art project with 3 aspect-fitted borderless designs.
- `config.json`: Master registry and cycle duration scheduler for all modules.
- `.env.example`: Master environment variables and API keys configuration.

---

## Hardware Specifications
- **Display**: 7.5" 800 &times; 480 Reflective Monochrome / Grayscale E-Paper
- **Controller**: UC8179 / GxEPD2
- **SPI Pins**: `CLK=GPIO7`, `MOSI=GPIO9`, `CS=GPIO10`, `DC=GPIO11`, `RST=GPIO12`, `BUSY=GPIO13`
- **Buttons**: `Action=GPIO3`, `Next=GPIO4`, `Prev=GPIO5`

---

## Local Development Server
To serve all projects from the parent workspace on port **8001**:
```bash
npm run serve
```
Access submodules at `http://localhost:8001/modules/<module-name>/` (e.g., [http://localhost:8001/modules/weather/](http://localhost:8001/modules/weather/)).
