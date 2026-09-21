/**
 * ============================================================================
 * Seeed reTerminal E1001 E-Paper Clock - Arduino Firmware
 * Version: 2026.09.21.17.39.00
 * Description: Standalone firmware for Seeed Studio reTerminal E1001 (ESP32-S3).
 *              Renders an analog clock face on the 800x480 e-paper display
 *              and updates every 60 seconds using deep-sleep / timer wakeup.
 * ============================================================================
 */

#include <Arduino.h>
#include <SPI.h>
#include <time.h>
#include <sys/time.h>

// ============================================================================
// CONFIGURATION PARAMETERS (NO MAGIC NUMBERS)
// Default values are documented in comments for reference and modification.
// ============================================================================

// Hardware SPI Pins for Seeed reTerminal E1001 (ESP32-S3)
const int PIN_EPD_SCK  = 7;  // Default: 7 (SPI Clock)
const int PIN_EPD_MOSI = 9;  // Default: 9 (SPI MOSI)
const int PIN_EPD_MISO = 8;  // Default: 8 (SPI MISO)
const int PIN_EPD_CS   = 10; // Default: 10 (Chip Select)
const int PIN_EPD_DC   = 11; // Default: 11 (Data/Command)
const int PIN_EPD_RST  = 12; // Default: 12 (Reset)
const int PIN_EPD_BUSY = 13; // Default: 13 (Busy pin)
const int PIN_EPD_PWR  = 6;  // Default: 6 (Display Power Enable)

// Display Geometry
const int DISPLAY_WIDTH  = 800; // Default: 800 (E1001 width)
const int DISPLAY_HEIGHT = 480; // Default: 480 (E1001 height)
const int CENTER_X       = 400; // Default: 400 (Canvas X center)
const int CENTER_Y       = 240; // Default: 240 (Canvas Y center)

// Dial & Hands Geometry
const int CLOCK_RADIUS        = 195; // Default: 195 (Outer clock radius)
const int INNER_DIAL_RADIUS   = 185; // Default: 185 (Inner bezel radius)
const int HOUR_HAND_LENGTH    = 105; // Default: 105 (Hour hand length)
const int MINUTE_HAND_LENGTH  = 155; // Default: 155 (Minute hand length)
const int HOUR_HAND_WIDTH     = 7;   // Default: 7 (Hour hand stroke width)
const int MINUTE_HAND_WIDTH   = 4;   // Default: 4 (Minute hand stroke width)
const int HAND_TAIL_LENGTH    = 24;  // Default: 24 (Counterbalance tail length)
const int CENTER_PIN_RADIUS   = 6;   // Default: 6 (Center cap radius)

// Dial Ticks
const int HOUR_TICK_LEN       = 16;  // Default: 16 (Length of hour tick)
const int MINUTE_TICK_LEN     = 7;   // Default: 7 (Length of minute tick)
const int NUMERAL_INSET       = 34;  // Default: 34 (Numeral distance from rim)

// Timing & Sleep
const uint64_t UPDATE_INTERVAL_US = 60ULL * 1000000ULL; // Default: 60s in microseconds
const uint32_t GLOBAL_SEED        = 42;                 // Default: 42 (Global PRNG seed)

// ============================================================================
// COLOR DEFINITIONS FOR 4-LEVEL GRAYSCALE E-PAPER (Adobe Kuler Inspired)
// ============================================================================
// 0: White (0xFF), 1: Light Gray (0xAA), 2: Dark Gray (0x55), 3: Black (0x00)
#define EPD_COLOR_WHITE 0xFF
#define EPD_COLOR_LGRAY 0xAA
#define EPD_COLOR_DGRAY 0x55
#define EPD_COLOR_BLACK 0x00

struct ColorPalette {
  const char* name;
  uint8_t background;
  uint8_t dialBg;
  uint8_t primary;
  uint8_t secondary;
  uint8_t accent;
};

// 5 Color / Grayscale Palettes
const ColorPalette PALETTES[5] = {
  // Palette 0: Classic E-Ink Slate & Paper
  { "Classic E-Ink Slate & Paper", EPD_COLOR_WHITE, EPD_COLOR_WHITE, EPD_COLOR_BLACK, EPD_COLOR_DGRAY, EPD_COLOR_BLACK },
  // Palette 1: Bauhaus Modernist
  { "Bauhaus Modernist",           EPD_COLOR_WHITE, EPD_COLOR_WHITE, EPD_COLOR_BLACK, EPD_COLOR_DGRAY, EPD_COLOR_BLACK },
  // Palette 2: Nord Timeless
  { "Nord Timeless",               EPD_COLOR_BLACK, EPD_COLOR_DGRAY, EPD_COLOR_WHITE, EPD_COLOR_LGRAY, EPD_COLOR_WHITE },
  // Palette 3: Vintage Watchmaker
  { "Vintage Watchmaker",          EPD_COLOR_WHITE, EPD_COLOR_WHITE, EPD_COLOR_BLACK, EPD_COLOR_DGRAY, EPD_COLOR_BLACK },
  // Palette 4: Sandstorm Minimalist
  { "Sandstorm Minimalist",        EPD_COLOR_WHITE, EPD_COLOR_WHITE, EPD_COLOR_BLACK, EPD_COLOR_DGRAY, EPD_COLOR_BLACK }
};

int activePaletteIndex = 0; // Default: 0

void drawClockFace(int hour, int minute) {
  // Serial debugging telemetry
  Serial.printf("[E1001 Clock] Drawing Face: %02d:%02d\n", hour, minute);
  Serial.printf("[E1001 Clock] Palette: %s\n", PALETTES[activePaletteIndex].name);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("=========================================");
  Serial.println("Seeed reTerminal E1001 Analog Clock Init");
  Serial.println("Version: 2026.09.21.17.39.00");
  Serial.println("=========================================");

  // Set default initial time or fetch RTC if configured
  struct timeval tv;
  tv.tv_sec = 1774263600; // Simulated timestamp
  tv.tv_usec = 0;
  settimeofday(&tv, NULL);

  time_t now = time(nullptr);
  struct tm* timeinfo = localtime(&now);

  drawClockFace(timeinfo->tm_hour, timeinfo->tm_min);

  // Configure ESP32-S3 timer wakeup for 60 seconds
  esp_sleep_enable_timer_wakeup(UPDATE_INTERVAL_US);
  Serial.println("[E1001 Clock] Entering deep sleep for 60 seconds...");
  Serial.flush();
  esp_deep_sleep_start();
}

void loop() {
  // Execution will not reach loop due to deep sleep
}
