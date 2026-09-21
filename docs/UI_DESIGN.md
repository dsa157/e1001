# UI Design Document: Seeed E1001 Analog Clock Screen

## 1. Display Specs & Layout Grid
- **Target Hardware**: Seeed Studio reTerminal E1001 (7.5" Monochrome / 4-Level Grayscale E-Paper)
- **Native Resolution**: 800px width x 480px height
- **Screen Centering**: Centered circular dial (radius 190px), flanked by contextual e-paper telemetry widgets (weekday/date pill and battery status).

## 2. Color Palettes (Adobe Kuler Inspired)
1. **Palette 0: Classic E-Ink Slate & Paper** (Monochrome / 4-level gray)
2. **Palette 1: Bauhaus Modernist** (Deep Charcoal, Warm Bone, Cadmium Red, Primary Gold, Bauhaus Blue)
3. **Palette 2: Nord Timeless** (Polar Night, Snow Storm, Frost Ice, Aurora Sage, Night Black)
4. **Palette 3: Vintage Watchmaker** (Horology Brass, Parchment Beige, Enamel Black, Blued Steel, Ivory Cream)
5. **Palette 4: Sandstorm Minimalist** (Dune Sand, Obsidian Brown, Terracotta, Desert Fog, Sun Gold)

## 3. UI Components
- **Top Navigation Bar**: Brand logo icon, title, quick palette dropdown, e-paper preview filter toggle, and Gravatar user profile.
- **Onboarding Guide Modal**: Interactive popup explaining resolution mapping, refresh interval, and controls.
- **Main Canvas Viewport**: Centered 800x480 frame with realistic e-paper bevel frame simulation.
- **Control Bar**: Palette switcher buttons, manual sync trigger, full screen toggle, and PNG export.
- **Governance Footer**: Copyright notice, Privacy Policy, Terms of Service, Pricing, and Support links.
