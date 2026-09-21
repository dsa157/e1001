# Seeed reTerminal E1001 &bull; p5.js Generative Art

Generative algorithmic sketch engineered for the **Seeed Studio reTerminal E1001** 800&times;480 E-Ink display.

---

## Hardware Profile
- **Target Device**: Seeed Studio reTerminal E1001 (ESP32-S3)
- **Resolution**: 800 &times; 480 pixels
- **Display Type**: 1-bit Monochrome / 4-Level Grayscale Reflective E-Paper
- **SPI Interface**: `DIN/MOSI: GPIO9`, `CLK/SCK: GPIO7`, `CS: GPIO10`, `DC: GPIO11`, `RST: GPIO12`, `BUSY: GPIO13`

---

## Features
1. **Zero Magic Numbers**: All geometry, noise scales, contour steps, particle counts, and harmonic multipliers parameterized at top of [sketch.js](file:///Users/dsa157/Development/e1001/art1-test/sketch.js).
2. **Deterministic Seed Control**: Global seed `GLOBAL_SEED` ensures repeatable initial visual conditions.
3. **5 Curated Monochromatic Palettes**:
   - `0: Monochrome Minimalist` (Pure white to deep carbon ink)
   - `1: Charcoal & Mist` (Cool slate gradations)
   - `2: High Contrast 1-Bit` (Binary pure black and white)
   - `3: Carbon Slate` (Dense graphite tones)
   - `4: Stipple Ink Tones` (Fine micro-pigment paper tones)
4. **Selectable Background Color**: Choose any tone from the active palette as the canvas background.
5. **Generative Modes**:
   - **Harmonic Contours**: Multi-layer topological isolines modulated by trigonometric harmonics and Perlin noise.
   - **Flow Field Vector**: Streamline particle integration across a vector potential.
   - **Stipple Particle Field**: Probabilistic density gradient simulation.
6. **1-Bit Floyd-Steinberg Dither Simulation**: Preview how grayscale gradients convert to 1-bit binary e-paper pixels.
7. **E-Ink PNG Export**: Export native 800&times;480 images ready for direct loading onto the E1001 framebuffer.

---

## Running Locally
To start the local preview server:
```bash
npm run dev
# or: npx serve -l 8001 .
```
Open [http://localhost:8001](http://localhost:8001) in your browser.
