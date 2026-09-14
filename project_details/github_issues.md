# GitHub Issues Registry

Immutable record of community reported issues, feature requests, root causes, and resolutions.

## Issue #1: WLED firmware version not updating after OTA update

* Issue: #1
* Title: WLED firmware version not updating after OTA update
* URL: https://github.com/upioneer/WLEDashboard/issues/1
* Reporter: @ccalbreath (https://github.com/ccalbreath)
* Date Reported: March 13, 2026
* Reported Version: v0.18.0
* Resolved Version: v0.19.0
* Type: Bug Report

### Problem Description
When a user updates the firmware on an ESP32 or ESP8266 WLED controller via Over The Air (OTA) flashing, WLEDashboard continues to display the older firmware version rather than updating to the newly flashed version.

### Root Cause
1. SQL COALESCE ordering bug in apps/api/src/services/deviceService.js: The query used firmware_ver = COALESCE(NULLIF(firmware_ver, ''), ?) which checked the existing database column first. Because the database already held a non empty string from the initial discovery, COALESCE always retained the old version and ignored the new value passed in parameter ?.
2. Missing poll change detection: The polling engine compared live power and brightness states but never checked whether firmware_ver, led_count, or mac_address had changed on the device.
3. Controller schema constraints: UpdateDeviceSchema in apps/api/src/routes/devices.js and updateDevice() in deviceService.js did not support updating firmware_ver.
4. Client state store: patchLiveState() in apps/web/src/stores/deviceStore.js discarded incoming firmware version updates from WebSocket payloads.
5. UI fallback missing: UI components only read the static device.firmware_ver column and did not fall back to device.liveState.info.ver.

### Resolution
* Corrected SQL precedence in deviceService.js to firmware_ver = COALESCE(NULLIF(?, ''), firmware_ver) so incoming polled values take priority over stored values.
* Added change detection in deviceService.js polling loop to automatically detect and persist updates to firmware_ver, led_count, and mac_address in SQLite whenever WLED reports updated values.
* Added firmware_ver to UpdateDeviceSchema and updated updateDevice() to persist firmware updates via API.
* Updated patchLiveState() in deviceStore.js to immediately update device.firmware_ver and device.led_count when WebSocket info payloads arrive.
* Added fallback checks across DeviceCard.jsx, Dashboard.jsx, DeviceManager.jsx, and firmware.js to read from device.liveState?.info?.ver when present.
* Added automated database regression test in apps/api/test/database.test.js.

## Issue #2: Spatial View unchecking "Orbital Intro" throws "Failed to update setting"

* Issue: #2
* Title: Spatial View unchecking Orbital Intro throws Failed to update setting
* URL: https://github.com/upioneer/WLEDashboard/issues/2
* Reporter: @shr00mie (https://github.com/shr00mie)
* Date Reported: March 13, 2026
* Reported Version: v0.18.0
* Resolved Version: v0.19.0
* Type: Bug Report

### Problem Description
In 3D Spatial View, navigating to settings or toggling the Orbital Intro option off produced an error toast notification stating "Failed to update setting" and the setting failed to persist.

### Root Cause
1. Route schema validation failure: The Fastify route schema in apps/api/src/routes/settings.js defined PatchSchema = z.record(z.string()). When the frontend sent boolean { orbital_intro: false }, Zod validation rejected the request with HTTP 400 Bad Request ("Expected string, received boolean").
2. String boolean type coercion: In SpatialView.jsx and SpatialCanvas.jsx, settings retrieved from SQLite are stored as strings. Components were checking setting !== 'false', which could misinterpret actual boolean false or undefined states.

### Resolution
* Expanded PatchSchema in apps/api/src/routes/settings.js to z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])), converting booleans, numbers, and nulls to string equivalents before saving into SQLite.
* Added safe boolean normalization helper in SpatialView.jsx and SpatialCanvas.jsx: val === true || val === 'true' || (val !== false && val !== 'false' && val !== undefined && val !== null).
* Added comprehensive integration test in apps/api/test/settings.test.js validating boolean, number, string, and null payloads.
