# Architecture Document: Seeed E1001 Analog Clock Screen

## 1. System Architecture
The application is structured as a client-rendered HTML5 Canvas & SVG e-paper screen engine tailored for 800x480 resolution frames.

```
+-------------------------------------------------------------+
|                      Browser / Device Client                |
|  +-------------------------------------------------------+  |
|  |                UI Shell & Onboarding                  |  |
|  +-------------------------------------------------------+  |
|  +-------------------------------------------------------+  |
|  |           Clock Renderer Engine (app.js)              |  |
|  | - Parameterized Constants & Seeded RNG                |  |
|  | - 5 Adobe Kuler Palettes & E-Ink Shading Filters      |  |
|  | - Precise Minute-Boundary Synchronization Timer       |  |
|  | - Canvas 2D Analog Dial, Hands, & Typography          |  |
|  +-------------------------------------------------------+  |
|  +-------------------------------------------------------+  |
|  |       E-Paper Export (PNG / BMP / Webhook Payload)     |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

## 2. Component Design
- **Renderer (`app.js`)**: Encapsulates dial trigonometry, hour/minute hand rendering, date ribbon, and e-paper pixel dithering/quantization.
- **Timer Subsystem**: Synchronizes to the system clock so updates fire at `SS:00` without drift.
- **Color Engine**: Stores 5 distinct Adobe Kuler palettes with selectable indices and e-ink contrast simulation.
- **UI & Layout (`index.html`, `style.css`)**: Responsive layout with header navigation, Gravatar profile icon, canvas container, and governance footer.

## 3. Technology Stack
- **HTML5 Canvas & Semantic HTML**
- **Vanilla CSS3** (Mobile-first responsive flex/grid)
- **Vanilla JavaScript ES6+**
