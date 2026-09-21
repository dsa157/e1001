# ============================================================================
# PlatformIO Pre-Build Script: Inject .env Variables
# ============================================================================
import os
Import("env")

project_dir = env.get("PROJECT_DIR")
env_file = os.path.abspath(os.path.join(project_dir, "..", "..", ".env"))

if os.path.exists(env_file):
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key in ["WIFI_SSID", "WIFI_PASSWORD", "NTP_SERVER"]:
                    env.Append(CPPDEFINES=[(key, f'\\"{val}\\"')])
                elif key in ["TIMEZONE_OFFSET_HOURS", "DEFAULT_PALETTE_INDEX", "GLOBAL_SEED"]:
                    try:
                        env.Append(CPPDEFINES=[(key, int(val))])
                    except ValueError:
                        pass
