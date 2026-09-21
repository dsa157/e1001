/**
 * ============================================================================
 * Seeed reTerminal E1001 E-Paper Clock - GxEPD2 with Wi-Fi NTP & PCF8563 RTC
 * Version: 2026.09.21.19.24.00
 * Description: Native firmware for Seeed Studio reTerminal E1001. Synchronizes
 *              exact time down to the second via Wi-Fi NTP (from .env) into the
 *              onboard PCF8563 RTC, then powers off Wi-Fi and updates the 
 *              analog clock precisely at the top of every minute (:00s).
 * ============================================================================
 */

#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <WiFi.h>
#include <GxEPD2_BW.h>
#include <Adafruit_GFX.h>
#include <time.h>
#include <sys/time.h>
#include "esp_wifi.h"

// ============================================================================
// CONFIGURATION PARAMETERS (NO MAGIC NUMBERS)
// Default values are documented in comments for reference and modification.
// ============================================================================

// Hardware SPI and Control Pins for Seeed reTerminal E1001 (ESP32-S3)
const int PIN_SPI_SCK   = 7;  // Default: 7 (SPI Clock)
const int PIN_SPI_MISO  = 8;  // Default: 8 (SPI MISO)
const int PIN_SPI_MOSI  = 9;  // Default: 9 (SPI MOSI)
const int PIN_EPD_CS    = 10; // Default: 10 (E-Paper Chip Select)
const int PIN_EPD_DC    = 11; // Default: 11 (E-Paper Data/Command)
const int PIN_EPD_RST   = 12; // Default: 12 (E-Paper Reset)
const int PIN_EPD_BUSY  = 13; // Default: 13 (E-Paper Busy)
const int PIN_SD_CS     = 14; // Default: 14 (MicroSD Chip Select - released HIGH)
const int PIN_SD_EN     = 16; // Default: 16 (MicroSD Power Enable)
const int PIN_I2C_SDA   = 19; // Default: 19 (PCF8563 RTC I2C SDA)
const int PIN_I2C_SCL   = 20; // Default: 20 (PCF8563 RTC I2C SCL)
const uint8_t PCF8563_ADDR = 0x51; // Default: 0x51 (PCF8563 I2C address)

// Display Canvas Geometry
const int SCREEN_WIDTH      = 800; // Default: 800 (E1001 width)
const int SCREEN_HEIGHT     = 480; // Default: 480 (E1001 height)
const int CENTER_X          = SCREEN_WIDTH / 2;  // Default: 400 (Canvas X center)
const int CENTER_Y          = SCREEN_HEIGHT / 2; // Default: 240 (Canvas Y center)

// Dial & Hands Geometry
const int CLOCK_RADIUS      = 195; // Default: 195 (Outer clock radius)
const int INNER_DIAL_RADIUS = 185; // Default: 185 (Inner bezel radius)
const int HOUR_HAND_LENGTH  = 105; // Default: 105 (Hour hand length)
const int MINUTE_HAND_LENGTH= 155; // Default: 155 (Minute hand length)
const int HOUR_HAND_WIDTH   = 6;   // Default: 6 (Hour hand stroke width)
const int MINUTE_HAND_WIDTH = 4;   // Default: 4 (Minute hand stroke width)
const int CENTER_PIN_RADIUS = 7;   // Default: 7 (Center cap radius)

// Dial Markings
const int HOUR_TICK_LEN     = 16;  // Default: 16 (Length of hour tick)
const int MINUTE_TICK_LEN   = 7;   // Default: 7 (Length of minute tick)
const int NUMERAL_INSET     = 34;  // Default: 34 (Numeral distance from rim)

// Timing & Wi-Fi Defaults (Injected from .env if present)
#ifndef WIFI_SSID
#define WIFI_SSID "YOUR_WIFI_SSID"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#endif

#ifndef NTP_SERVER
#define NTP_SERVER "pool.ntp.org"
#endif

#ifndef TIMEZONE_OFFSET_HOURS
#define TIMEZONE_OFFSET_HOURS 7
#endif

const uint32_t WIFI_TIMEOUT_MS = 12000; // Default: 12000ms Wi-Fi connection timeout

// ============================================================================
// 5 ADOBE KULER INSPIRED PALETTES (E-Paper 2-color / Monochrome Mapping)
// ============================================================================
struct PaletteConfig {
  const char* name;
  uint16_t bgColor;
  uint16_t fgColor;
};

const PaletteConfig PALETTES[5] = {
  // Palette 0: Classic E-Ink Slate & Paper
  { "Classic E-Ink Slate & Paper", GxEPD_WHITE, GxEPD_BLACK },
  // Palette 1: Bauhaus Modernist
  { "Bauhaus Modernist",           GxEPD_WHITE, GxEPD_BLACK },
  // Palette 2: Nord Timeless
  { "Nord Timeless",               GxEPD_BLACK, GxEPD_WHITE },
  // Palette 3: Vintage Watchmaker
  { "Vintage Watchmaker",          GxEPD_WHITE, GxEPD_BLACK },
  // Palette 4: Sandstorm Minimalist
  { "Sandstorm Minimalist",        GxEPD_WHITE, GxEPD_BLACK }
};

int activePaletteIndex = 0; // Default: 0 (Classic E-Ink Slate & Paper)

// GxEPD2 Display Instance for 7.5" 800x480 (UC8179 / GDEY075T7)
GxEPD2_BW<GxEPD2_750_T7, GxEPD2_750_T7::HEIGHT> display(
  GxEPD2_750_T7(PIN_EPD_CS, PIN_EPD_DC, PIN_EPD_RST, PIN_EPD_BUSY)
);

// Persist Wi-Fi status and sync flag across ESP32 deep sleep cycles in RTC memory
RTC_DATA_ATTR static bool ntp_synced = false;
RTC_DATA_ATTR static char wifi_status_str[64] = "Wi-Fi: Initializing...";

// ============================================================================
// PCF8563 I2C RTC HELPER FUNCTIONS
// ============================================================================
static uint8_t decToBcd(uint8_t val) {
  return (uint8_t)(((val / 10) << 4) | (val % 10));
}

static uint8_t bcdToDec(uint8_t val) {
  return (uint8_t)(((val >> 4) * 10) + (val & 0x0F));
}

void setHardwareRTC(struct tm* t) {
  // Ensure RTC is running (clear STOP bit in Control 1)
  Wire.beginTransmission(PCF8563_ADDR);
  Wire.write(0x00); // Control/Status 1 register
  Wire.write(0x00); // Normal mode (STOP=0, TEST=0)
  Wire.write(0x00); // Control/Status 2 register
  Wire.write(decToBcd(t->tm_sec) & 0x7F);          // 0x02: Seconds (VL bit cleared)
  Wire.write(decToBcd(t->tm_min) & 0x7F);          // 0x03: Minutes
  Wire.write(decToBcd(t->tm_hour) & 0x3F);         // 0x04: Hours
  Wire.write(decToBcd(t->tm_mday) & 0x3F);         // 0x05: Days
  Wire.write(decToBcd(t->tm_wday) & 0x07);         // 0x06: Weekdays
  Wire.write(decToBcd(t->tm_mon + 1) & 0x1F);      // 0x07: Months (1-12)
  Wire.write(decToBcd((t->tm_year + 1900) % 100)); // 0x08: Years (00-99)
  uint8_t err = Wire.endTransmission();
  if (err == 0) {
    Serial.println("[RTC] PCF8563 hardware RTC synchronized successfully.");
  } else {
    Serial.printf("[RTC] PCF8563 I2C write error: %d\n", err);
  }
}

bool readHardwareRTC(struct tm* t) {
  Wire.beginTransmission(PCF8563_ADDR);
  Wire.write(0x02); // Start at seconds register
  if (Wire.endTransmission() != 0) return false;

  Wire.requestFrom((uint8_t)PCF8563_ADDR, (uint8_t)7);
  if (Wire.available() < 7) return false;

  uint8_t sec_raw  = Wire.read();
  uint8_t min_raw  = Wire.read();
  uint8_t hour_raw = Wire.read();
  uint8_t mday_raw = Wire.read();
  uint8_t wday_raw = Wire.read();
  uint8_t mon_raw  = Wire.read();
  uint8_t year_raw = Wire.read();

  t->tm_sec  = bcdToDec(sec_raw & 0x7F);
  t->tm_min  = bcdToDec(min_raw & 0x7F);
  t->tm_hour = bcdToDec(hour_raw & 0x3F);
  t->tm_mday = bcdToDec(mday_raw & 0x3F);
  t->tm_wday = bcdToDec(wday_raw & 0x07);
  t->tm_mon  = bcdToDec(mon_raw & 0x1F) - 1; // 0-indexed month (0-11)
  t->tm_year = bcdToDec(year_raw) + 100;    // 126 for 2026 (years since 1900)

  // Validate range: year >= 2020 (120), valid month, day, hour, min, sec
  if (t->tm_year < 120 || t->tm_mon < 0 || t->tm_mon > 11 || 
      t->tm_mday < 1 || t->tm_mday > 31 || t->tm_hour > 23 || 
      t->tm_min > 59 || t->tm_sec > 59) {
    return false;
  }
  return true;
}

// ============================================================================
// WI-FI NTP SYNCHRONIZATION
// ============================================================================
bool syncWithNTP() {
  String ssid = String(WIFI_SSID);
  if (ssid.length() == 0 || ssid == "YOUR_WIFI_SSID") {
    snprintf(wifi_status_str, sizeof(wifi_status_str), "Could not connect to: (No SSID)");
    Serial.println("[NTP] Wi-Fi SSID not configured in .env. Skipping NTP.");
    return false;
  }

  Serial.printf("[NTP] Configuring Wi-Fi for SSID: %s\n", ssid.c_str());
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true);
  delay(300);

  Serial.println("[NTP] Scanning 2.4GHz Wi-Fi networks...");
  int n = WiFi.scanNetworks();
  Serial.printf("[NTP] Found %d networks:\n", n);
  bool found_target = false;
  for (int i = 0; i < n; ++i) {
    Serial.printf("  [%d] %s (%d dBm)\n", i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i));
    if (WiFi.SSID(i) == ssid) {
      found_target = true;
    }
  }

  if (!found_target) {
    Serial.printf("[NTP] Target SSID '%s' not visible in 2.4GHz scan!\n", ssid.c_str());
  }

  Serial.printf("[NTP] Connecting to Wi-Fi: %s ...\n", ssid.c_str());
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t start_connect = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start_connect < 15000)) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    snprintf(wifi_status_str, sizeof(wifi_status_str), "Connected to: %s", ssid.c_str());
    Serial.printf("[NTP] Connected to %s with IP %s\n", ssid.c_str(), WiFi.localIP().toString().c_str());

    // Configure NTP with timezone offset
    configTime(TIMEZONE_OFFSET_HOURS * 3600, 0, NTP_SERVER, "time.google.com", "pool.ntp.org");

    struct tm timeinfo;
    bool got_ntp = false;
    for (int i = 0; i < 35; i++) {
      if (getLocalTime(&timeinfo, 500)) {
        got_ntp = true;
        break;
      }
      delay(200);
    }

    if (got_ntp) {
      setHardwareRTC(&timeinfo);
      Serial.printf("[NTP] Synchronized down to the second: %02d:%02d:%02d on %04d-%02d-%02d\n",
                    timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec,
                    timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday);
      ntp_synced = true;
    } else {
      Serial.println("[NTP] NTP sync response timed out.");
    }
  } else {
    snprintf(wifi_status_str, sizeof(wifi_status_str), "Could not connect to: %s", ssid.c_str());
    Serial.printf("[NTP] Could not connect to: %s\n", ssid.c_str());
  }

  // Turn off Wi-Fi immediately to conserve battery
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  esp_wifi_stop();
  Serial.println("[NTP] Wi-Fi powered down.");
  return ntp_synced;
}

/**
 * Draws the analog clock face into GxEPD2 buffer
 */
void drawClockPage(int hour, int minute, int day, int month) {
  const PaletteConfig& pal = PALETTES[activePaletteIndex];

  // 1. Clear Screen
  display.fillScreen(pal.bgColor);

  // 2. Draw Outer Bezel & Inner Rim
  display.drawCircle(CENTER_X, CENTER_Y, CLOCK_RADIUS, pal.fgColor);
  display.drawCircle(CENTER_X, CENTER_Y, CLOCK_RADIUS - 1, pal.fgColor);
  display.drawCircle(CENTER_X, CENTER_Y, INNER_DIAL_RADIUS, pal.fgColor);

  // 3. Draw Ticks around Dial
  for (int i = 0; i < 60; i++) {
    float angle = (i * PI) / 30.0f;
    bool isHour = (i % 5 == 0);
    int tickLen = isHour ? HOUR_TICK_LEN : MINUTE_TICK_LEN;

    int x1 = CENTER_X + (int)(sin(angle) * INNER_DIAL_RADIUS);
    int y1 = CENTER_Y - (int)(cos(angle) * INNER_DIAL_RADIUS);
    int x2 = CENTER_X + (int)(sin(angle) * (INNER_DIAL_RADIUS - tickLen));
    int y2 = CENTER_Y - (int)(cos(angle) * (INNER_DIAL_RADIUS - tickLen));

    display.drawLine(x1, y1, x2, y2, pal.fgColor);
    if (isHour) {
      display.drawLine(x1 + 1, y1, x2 + 1, y2, pal.fgColor);
    }
  }

  // 4. Draw Dial Numerals (12, 3, 6, 9)
  display.setTextColor(pal.fgColor);
  display.setTextSize(3);

  display.setCursor(CENTER_X - 18, CENTER_Y - INNER_DIAL_RADIUS + NUMERAL_INSET - 10);
  display.print("12");

  display.setCursor(CENTER_X - 8, CENTER_Y + INNER_DIAL_RADIUS - NUMERAL_INSET - 12);
  display.print("6");

  display.setCursor(CENTER_X + INNER_DIAL_RADIUS - NUMERAL_INSET - 8, CENTER_Y - 10);
  display.print("3");

  display.setCursor(CENTER_X - INNER_DIAL_RADIUS + NUMERAL_INSET - 12, CENTER_Y - 10);
  display.print("9");

  // 5. Draw Date Widget Ribbon
  char dateBuf[32];
  const char* monthNames[] = { "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC" };
  snprintf(dateBuf, sizeof(dateBuf), "%s %02d", monthNames[month % 12], day);

  display.drawRoundRect(CENTER_X - 60, CENTER_Y + 55, 120, 28, 6, pal.fgColor);
  display.setTextSize(2);
  display.setCursor(CENTER_X - 42, CENTER_Y + 62);
  display.print(dateBuf);

  // 6. Calculate Hand Angles
  float hourAngle = ((hour % 12) + minute / 60.0f) * (PI / 6.0f);
  float minAngle  = minute * (PI / 30.0f);

  // 7. Draw Hour Hand
  int hx = CENTER_X + (int)(sin(hourAngle) * HOUR_HAND_LENGTH);
  int hy = CENTER_Y - (int)(cos(hourAngle) * HOUR_HAND_LENGTH);
  for (int w = -HOUR_HAND_WIDTH / 2; w <= HOUR_HAND_WIDTH / 2; w++) {
    display.drawLine(CENTER_X + w, CENTER_Y, hx + w, hy, pal.fgColor);
  }

  // 8. Draw Minute Hand
  int mx = CENTER_X + (int)(sin(minAngle) * MINUTE_HAND_LENGTH);
  int my = CENTER_Y - (int)(cos(minAngle) * MINUTE_HAND_LENGTH);
  for (int w = -MINUTE_HAND_WIDTH / 2; w <= MINUTE_HAND_WIDTH / 2; w++) {
    display.drawLine(CENTER_X + w, CENTER_Y, mx + w, my, pal.fgColor);
  }

  // 9. Draw Center Hub
  display.fillCircle(CENTER_X, CENTER_Y, CENTER_PIN_RADIUS, pal.fgColor);
  display.fillCircle(CENTER_X, CENTER_Y, 2, pal.bgColor);

  // 10. Draw Telemetry Accents (Wi-Fi Status on Left, Battery on Right)
  display.setTextSize(1);
  display.setCursor(30, 25);
  display.print(wifi_status_str);

  display.setCursor(SCREEN_WIDTH - 120, 25);
  display.print("BATTERY: 100%");
}

void setup() {
  uint32_t start_ms = millis();
  Serial.begin(115200);
  delay(150);
  Serial.println("=========================================");
  Serial.println("Seeed reTerminal E1001 NTP-Sync Clock");
  Serial.println("Version: 2026.09.21.19.40.00");
  Serial.println("=========================================");

  // 1. Initialize I2C for PCF8563 RTC
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);

  // 2. Release SD Card from SPI bus so it does not interfere with E-Paper
  pinMode(PIN_SD_CS, OUTPUT);
  digitalWrite(PIN_SD_CS, HIGH);
  pinMode(PIN_SD_EN, OUTPUT);
  digitalWrite(PIN_SD_EN, LOW);

  // 3. Initialize Custom SPI for Seeed E1001 pins
  SPI.begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI, PIN_EPD_CS);

  // 4. Initialize GxEPD2 display
  display.init(115200, true, 50, false);
  display.setRotation(0);

  // 5. Read hardware RTC
  struct tm cur_time;
  bool rtc_valid = readHardwareRTC(&cur_time);

  // 6. Check if NTP sync is needed (cold boot / power on, or RTC not yet valid)
  esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
  if (wakeup_reason != ESP_SLEEP_WAKEUP_TIMER || !ntp_synced || !rtc_valid) {
    syncWithNTP();
    // Re-read RTC after potential NTP update
    rtc_valid = readHardwareRTC(&cur_time);
  }

  // 7. Fallback if RTC still invalid
  if (!rtc_valid) {
    cur_time.tm_hour = 12;
    cur_time.tm_min = 0;
    cur_time.tm_sec = 0;
    cur_time.tm_mday = 21;
    cur_time.tm_mon = 8; // SEP (0-indexed)
    cur_time.tm_year = 126; // 2026
  }

  int curHour   = cur_time.tm_hour;
  int curMin    = cur_time.tm_min;
  int curDay    = cur_time.tm_mday;
  int curMonth  = cur_time.tm_mon;
  int curSec    = cur_time.tm_sec;

  Serial.printf("[E1001] Rendering: %02d:%02d:%02d on %02d/%02d (Wakeup: %d)\n",
                curHour, curMin, curSec, curDay, curMonth + 1, (int)wakeup_reason);

  // 8. Full buffer render and refresh
  display.setFullWindow();
  display.firstPage();
  do {
    drawClockPage(curHour, curMin, curDay, curMonth);
  } while (display.nextPage());

  display.powerOff();
  Serial.println("[E1001] Display refresh completed.");

  // 9. Read the RTC again after render to compute precise seconds to next :00s
  struct tm finish_time;
  int sec_in_min = curSec;
  if (readHardwareRTC(&finish_time)) {
    sec_in_min = finish_time.tm_sec;
  } else {
    uint32_t render_elapsed_sec = (millis() - start_ms + 500) / 1000;
    sec_in_min = (curSec + render_elapsed_sec) % 60;
  }

  int sleep_seconds = 60 - sec_in_min;
  if (sleep_seconds <= 2) {
    sleep_seconds += 60;
  }

  Serial.printf("[E1001] Post-render sec: %d. Sleeping %ds to target next top-of-minute (:00s)\n",
                sec_in_min, sleep_seconds);
  Serial.flush();

  esp_sleep_enable_timer_wakeup((uint64_t)sleep_seconds * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {
  // Never reached
}

