# v0.23.1 Release Walkthrough

## Summary
Version 0.23.1 delivers key state persistence fixes for Spotify and Weather sync toggling across Groups and Dashboard views in both physical and virtualized Demo Mode environments. Additionally, this release expands operational documentation for Proxmox VE LXC deployments with direct host CLI access procedures and lifecycle management controls, clarifies build memory headroom versus runtime footprints, refines the Community Special Thanks marquee copy in Settings, and codifies contributor platform precedence protocols.

## What Is New & Improved

### 1. Spotify & Weather Sync State Persistence Fixes
* API Schema Field Retention: Updated Fastify Zod validation schemas (`UpdateGroupSchema`, `CreateGroupSchema`, `UpdateDeviceSchema`, `CreateDeviceSchema`) to explicitly permit `spotify_sync_enabled` and `weather_sync_enabled` fields. Previously, payloads sent to `PATCH /api/groups/:id` and `PATCH /api/devices/:id` were stripped of these sync flags, immediately rolling back optimistic UI updates.
* Resilient Dynamic SQL Updates: Replaced nullable SQL `COALESCE` parameter binding in SQLite group updates with dynamic statement generation, ensuring numeric zero flags (`spotify_sync_enabled: 0`, `weather_sync_enabled: 0`) are reliably written and persisted.
* Demo Mode Group Mutation Support: Added in-memory group mutation handlers (`updateDemoGroup`, `deleteDemoGroup`, `createDemoGroup`) in `demoData.js` so group sync toggles and property modifications persist seamlessly while running in Interactive Demo Mode.
* Frontend Button & Toast Accuracy: Updated `GroupCard.jsx` and `DeviceCard.jsx` to pre-calculate next sync states before executing asynchronous updates, ensuring toast notifications and chip styles accurately reflect user intent.
* Music Iconography: Added an accessible SVG music note icon to the Spotify Sync button in `GroupCard.jsx` matching the existing Weather icon styling.
* Dashboard Media Filter Tab Hardening: Updated `MediaView` in `Dashboard.jsx` to utilize boolean-resilient filtering (`Boolean(d.spotify_sync_enabled) || Boolean(d.weather_sync_enabled)`), ensuring synced devices appear immediately in the Media tab regardless of integer or boolean formatting.

### 2. Proxmox VE Documentation & Update Workflow
* Host Shell Login Procedures: Documented direct root console access (`pct enter <CTID>`), virtual serial console connections (`pct console <CTID>`), and ad-hoc host command execution (`pct exec <CTID> -- <command>`) across root `README.md`, `install/proxmox/README.md`, and in-app Guides.
* Container Lifecycle Commands: Documented standard host lifecycle controls (`pct start`, `pct stop`, `pct reboot`, `pct status`).
* Build Headroom vs Runtime Footprint Clarification: Explicitly clarified across all deployment documentation that the 2048MB RAM and 1024MB Swap allocation is provisioned specifically by the helper script to guarantee sufficient V8 heap headroom during the one-time Vite frontend compilation step, while runtime memory consumption remains lean at ~45MB to 90MB.
* Multi-Platform Update Banner in Settings: Expanded the Settings update available alert banner with an interactive platform toggle between Docker Compose and Proxmox VE (LXC), providing direct one-click clipboard copying for both `docker compose pull && docker compose up -d` and `pct exec <CTID> -- update-wledashboard`.
* Guides Update Documentation: Updated in-app Guides with Proxmox VE LXC container upgrade instructions alongside standard Docker Compose procedures.

### 3. Community Special Thanks & Agent Protocols
* Marquee Copy Refinement: Reworded the explanatory description header in Settings > About Special Thanks to: *"Special thanks to community members whose feature requests, feedback, and bug reports help shape WLEDashboard. (Hover to pause)"*.
* Platform Precedence Protocol: Codified instructions in `.agents/AGENTS.md` and updated `project_details/playbooks/sync_contributors.cjs` ensuring that if a community contributor handle exists on both Reddit and GitHub, GitHub ALWAYS takes precedence (`platform: 'github'`).
* Zero Emoji Compliance: Replaced legacy unicode search emoji in `Groups.jsx` with an accessible SVG icon conforming to zero-emoji requirements.

### 4. Automated Regression Testing
* New Sync Toggle Test Suite: Added `apps/api/test/groups.test.js` with automated Fastify injection tests covering `POST /groups`, group sync toggling (0 to 1 and 1 to 0), Demo Mode group sync toggles, and device sync toggles.

## Operational Notes
* Upgrading to v0.23.1 is completely non-destructive and requires no manual database migrations.
* In-place container upgrades on Docker can be performed with `docker compose pull && docker compose up -d`.
* Proxmox LXC containers can be upgraded directly from the Proxmox host shell via `pct exec <CTID> -- update-wledashboard`.
