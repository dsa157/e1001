# Requirements Document: Seeed E1001 Analog Clock Screen

## 1. Overview
Design and implement a specialized screen renderer and dashboard for the Seeed Studio reTerminal E1001 7.5" e-paper display (800x480 resolution). The screen displays an analog clock that updates precisely every minute, optimized for e-ink refresh behavior, high legibility, and aesthetics.

## 2. Functional Requirements
- **FR-1: Analog Clock Face**: Render hour, minute, and optional subtle seconds/marker ticks centered on an 800x480 frame canvas.
- **FR-2: Minute-Interval Update Schedule**: Calculate time offset to sync updates on exact minute boundaries (00 seconds) and set recurring 60-second ticks.
- **FR-3: Palette Customization**: Support 5 Adobe Kuler curated color/grayscale palettes with configurable palette index and background color selection.
- **FR-4: E-Paper Mode Simulation**: Provide 1-bit monochrome and 4-level grayscale simulation modes for realistic e-paper previewing.
- **FR-5: Onboarding Walkthrough**: Intuitive initial guidance for first-time users detailing screen controls, live preview, and export/rendering options.
- **FR-6: Responsive / Mobile-First Presentation**: The container view scales cleanly on mobile devices while maintaining exact 800x480 rendering fidelity on the canvas.
- **FR-7: Profile & Navigation**: Include a Gravatar-compatible user avatar profile icon and complete governance footer with standard links.

## 3. Non-Functional Requirements
- **NFR-1: No Magic Numbers**: All geometry, dimensions, font sizes, hand lengths, and timings are parameterized at the top of the codebase with documented defaults.
- **NFR-2: Reproducibility**: Deterministic pseudorandom generator seeded with a global seed value.
- **NFR-3: Performance**: Lightweight, zero heavy runtime dependencies, instant load time.
