# WLEDashboard Operational User Guide & Deployment Manual

Welcome to WLEDashboard, a high performance, local first control surface for WLED LED controllers.

---

## 1. System Requirements & Architecture

* **API Server**: Node.js 22+ with Fastify, SQLite WAL mode, and WebSocket server (`:8301`).
* **Web Client**: Vite + React 19 single page application with spring physics engine.
* **Network Discovery**: Multicast DNS (`_wled._tcp`) via `bonjour-service`.
* **Direct Streaming**: WLED 0.14+ WebSocket proxy (`ws://<device_ip>/ws`) for sub millisecond state updates.

---

## 2. Views & Feature Reference

### Dashboard (`/`)

* **Device Cards**: Live power toggle, dynamic brightness slider with fill glow, primary color picker, and segment preview bar.
* **Category Filters**: Interactive stat pills (`Devices`, `Online`, `Offline`, `ON`, `OFF`) for instant device filtering.
* **Identify Mode**: Pulsing gold alert effect with state snapshot restoration.

### 3D Spatial View (`/spatial`)

* **3D Canvas**: Three.js & React Three Fiber WebGL viewport rendering rooms, wireframe boundaries, and physical 3D LED light strip bar meshes.
* **3D Light Alignment**: Click "Align 3D" to adjust height elevation presets (Ceiling, Wall Mid, Floor), X/Y/Z offsets, physical length, and 3D Y axis rotation angle.
* **Room Editor & Device Transfer**: Edit room dimensions and transfer light anchors atomically between rooms.

### Effect Studio (`/studio`)

* **Preset Browser**: Browse WLED built in effect catalog, adjust speed and intensity, choose WLED palettes, and apply live configs to devices or groups.
* **Timeline Animator**: Multi track keyframe sequence builder with playhead scrub bar (0ms to 60,000ms), play/pause controls, keyframe inspector, and database saving.
* **Palette Creator**: Multi stop linear gradient designer supporting up to 8 custom color stops with live linear gradient previews.

### Group Management (`/groups`)

* **Group Types**: Zone, Scene, Sync, and Custom clusters with nested child group support.

### Automation & Schedules (`/automation`)

* **Schedules**: Fixed time, sunrise, or sunset automated execution.
* **Routines**: Multi step sequential timeline routines with step delays.

### Settings (`/settings`)

* **Location Map Picker**: Visual OpenStreetMap pin drop with 15km privacy radius circle for automatic sun times calculation.
* **Unit System**: Switch room dimensions between Imperial (`ft`) and Metric (`m`).
* **In-App Update Notification**: Real time check against GitHub Releases with 1 click copy command.
* **Backup & Restore**: Full JSON database snapshot covering all 17 tables with version mismatch inspection and merge or replace modes.

---

## 3. Docker Deployment & Container Lifecycle

### 3.1 Initial Deployment

Deploy WLEDashboard using the pre-built multi architecture container image:

```bash
docker compose up -d
```

* **Default Port**: WLEDashboard listens on port `8301` to eliminate collisions with common homelab services like Z Wave JS UI, Grafana, and Uptime Kuma.
* **Data Volume**: SQLite database records, routines, spatial layouts, and settings are persisted in the `wledashboard_data` named volume mapped to `/app/data`.

### 3.2 Updating the Container (Zero Downtime)

To update to the latest release without losing any configuration or database records:

```bash
docker compose pull && docker compose up -d
```

* **Data Preservation**: Tearing down and recreating the container never affects persistent SQLite data stored inside the `wledashboard_data` volume.
* **Avoid `-v` on Teardown**: Never execute `docker compose down -v` during updates, as the `-v` flag removes named volumes and will delete your SQLite database.
* **Preserving Port 3001 Bookmarks**: If upgrading from versions prior to v0.21.0 and you wish to retain existing browser bookmarks on port 3001, map `3001:8301` under the `ports:` section of your `docker-compose.yml`.
* **Opt-In Automated Updates with Watchtower**: To automate background image updates, uncomment the `com.centurylinklabs.watchtower.enable=true` label in `docker-compose.yml`.

### 3.3 Backup and Configuration Restore

WLEDashboard provides a complete JSON backup and restore mechanism covering all 17 database tables:

* **Exporting a Backup**: Navigate to Settings and locate Backup & Restore, then select Download Backup. A timestamped JSON file is saved locally with zero downtime.
* **Restoring Configuration**: Click Select Backup File to review record counts and schema versions before committing any changes.
* **Merge Mode vs Replace Mode**: Merge mode safely upserts backup records without deleting unreferenced data. Replace mode clears existing user tables prior to restore and requires explicit secondary confirmation.
* **Restoring Older Backups onto Newer Releases**: When importing a backup created on an older version of WLEDashboard (such as v0.14.0 onto v0.21.0), the preview panel displays a version mismatch alert. Tables and columns introduced in newer releases remain clean and empty rather than causing schema collisions. In Merge mode, existing data for newer features is preserved.
