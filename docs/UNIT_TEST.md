# Unit Test Specification: Seeed E1001 Analog Clock Screen

## 1. Test Matrix
| Test ID | Area | Description | Expected Outcome |
|---|---|---|---|
| **UT-01** | Geometry | Center clock position on 800x480 canvas | Center X = 400, Center Y = 240 |
| **UT-02** | Time Calc | Angle calculations for 12:00, 03:30, 06:45 | Hand angles map precisely to corresponding radians |
| **UT-03** | Timer Sync | Synchronization to minute boundary (`:00`) | Timeout calculated as `(60 - current_seconds) * 1000` |
| **UT-04** | Palettes | Palette index out of bounds fallback | Safe clamping to [0..4] without exceptions |
| **UT-05** | Seed RNG | Global seed reproducibility check | Seeded pseudo-RNG produces identical sequence |
| **UT-06** | Export | Canvas to Blob/DataURL generation | Generates valid 800x480 image buffer |
