# v0.22.1 Release Walkthrough

## Summary
Version 0.22.1 delivers an ergonomic overhaul to the Docker Compose deployment configuration. The active service configuration has been streamlined into a 12 line turnkey block that requires zero user edits, zero template variable substitutions, and zero decision making to spin up. All advanced power user configurations, including port 3001 bookmark preservation mappings, Watchtower automated updates, native Linux host networking, and host folder bind mounts, have been decoupled from the primary service block and relocated into a clearly annotated reference section at the bottom of the file.

## What Is New & Improved

### 1. Turnkey Docker Compose Architecture
* Instant Zero Edit Deployment: The primary `docker-compose.yml` service definition is now clean, direct, and self contained. Users can paste the compose file and execute `docker compose up -d` immediately without modifying any lines or providing environment files.
* Direct Port Specification: Replaced complex variable fallback expressions (`${PORT:-8301}:${PORT:-8301}`) with direct explicit port strings (`8301:8301`) across all configuration templates.
* Elimination of Mid Service Comments: Removed all commented out optional directives and instructional notes from inside the service block, eliminating user ambiguity about whether manual uncommenting is required before launch.

### 2. Dedicated Power User Reference Section
* Clean Separation of Concerns: Advanced configuration recipes are now grouped in a clearly demarcated reference block at the bottom of `docker-compose.yml`.
* Recipe Catalog for Advanced Users:
  * Port 3001 Bookmark Preservation: Documented `3001:8301` mapping instructions for users migrating from pre v0.21.0 releases who wish to retain browser bookmarks.
  * Watchtower Opt In: Documented label syntax (`com.centurylinklabs.watchtower.enable=true`) for users managing automated container updates via Watchtower.
  * Linux Host Mode: Documented `network_mode: host` instructions for native mDNS multicast discovery on bare metal Linux and Proxmox LXC hosts.
  * Host Folder Bind Mounts: Documented host directory volume syntax (`/path/to/data:/app/data`) for setups requiring direct host filesystem persistence instead of Docker named volumes.

### 3. Cross Project Documentation Alignment
* Synchronized Deployment Templates: Aligned root `docker-compose.yml`, internal build template (`apps/docker/docker-compose.yml`), root `README.md`, and in app Guides data (`guidesData.js`) to present identical turnkey definitions.
* Production Bundle Validation: Validated production frontend asset compilation with zero warnings or errors.
* Complete Test Integrity: Verified all 29 automated unit and integration tests across `@wledashboard/api` and `@wledashboard/web` pass with zero failures.

## Operational Notes
* Existing container deployments running on v0.22.0 continue to operate without modification.
* New deployments can use the simplified `docker-compose.yml` directly out of the box.
