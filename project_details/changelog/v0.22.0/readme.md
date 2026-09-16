# v0.22.0 Release Walkthrough

## Summary
Version 0.22.0 introduces an enterprise grade Global Backup and Restore system alongside streamlined container update workflows. The backup engine expands from legacy core tables to encompass all 17 SQLite tables spanning devices, groups, automations, schedules, routines, 3D spatial twin hierarchies, studio keyframe animations, custom palettes, and matrix pixel art. A pre import inspection panel in Settings alerts users when importing older backup files onto newer instances, previews record counts across all tables, and offers safe Merge or secondary confirmed Replace execution modes. Additionally, container upgrade procedures are documented and made seamless via in app copyable compose commands, opt in Watchtower configurations, and port 3001 bookmark preservation mappings.

## What Is New & Improved

### 1. Full 17 Table Global Configuration Backup and Restore
* Comprehensive Database Coverage: Expanded export and import services to snapshot all 17 user configurable SQLite tables (`devices`, `groups`, `group_members`, `group_children`, `settings`, `presets`, `schedules`, `routines`, `routine_steps`, `dwellings`, `floors`, `rooms`, `anchors`, `animations`, `palettes`, `matrices`, `matrix_drawings`).
* Older Release Backward Compatibility: Implemented resilient parameter sanitization and default fallback normalization. Importing historical backups created on v0.14.0 or v0.2.0 cleanly populates default column values without parameter binding exceptions.
* Foreign Key Safe Cascading: In Replace mode, deletions execute in reverse dependency order before repopulating to guarantee foreign key integrity without constraint failures.
* Passive Zero Downtime Export: Generating a backup creates a timestamped JSON file directly in the browser with no background server restart or database lockup.

### 2. Interactive Restore Preview & Safety Safeguards
* Cross Version Gap Detection: The restore preview panel detects the schema version of selected backup files. When restoring an older archive onto a newer instance, an amber warning informs users that newer features absent from the backup will remain empty.
* Pre Import Record Count Grid: Displays parsed record counts per table before writing to the database, allowing users to verify file contents before executing a restore.
* Dual Execution Modes:
  * Merge Mode (Default): Safely upserts records from the backup file while leaving existing unreferenced records untouched.
  * Replace Mode: Purges existing user tables and repopulates them cleanly from the backup.
* Two Click Destruction Safeguard: Replace mode requires an explicit secondary confirmation click before data deletion can proceed.

### 3. Container Update Guidance & Opt In Watchtower Automation
* One Click Copy Command: Added an interactive update command row to the in app update notification banner in Settings, enabling one click copying of `docker compose pull && docker compose up -d`.
* Opt In Watchtower Policy: Updated root and deployment docker compose templates to comment out the Watchtower label by default, ensuring automatic container recreation is strictly opt in.
* Bookmark Preservation: Documented port mapping configurations (`3001:8301`) for users upgrading from pre v0.21.0 deployments who wish to preserve existing browser bookmarks.

### 4. Operational Documentation & User Guides
* User Guide Operational Expansion: Added Section 3.3 ("Backup and Configuration Restore") to the operational manual (`user_guide.md`) detailing snapshot procedures, mode semantics, and version gap behavior.
* In App Guide Integration: Added a dedicated Backup and Restore section and search tags to the Networking and Docker guide in the Guides catalog (`guidesData.js`).
* Roadmap Tracking: Logged Phase 15 into the project roadmap for future granular module selection during restore operations.

### 5. Automated Test Coverage & Verification
* Dedicated Backup Test Suite: Added `apps/api/test/config.test.js` validating schema export envelopes, merge upsert consistency, legacy backup tolerance, and replace teardowns.
* Zero Regression Verification: All 29 unit and integration tests across `@wledashboard/api` and `@wledashboard/web` pass cleanly.
* Production Bundle Validation: Validated production builds of frontend assets with zero syntax or bundling errors.

## Operational Notes
* Upgrading to v0.22.0 is fully non destructive. Existing data stored in persistent Docker volumes (`wledashboard_data`) is maintained without migration requirements.
* When importing older backups onto v0.22.0, newer tables (such as 3D spatial rooms or routines) will remain unchanged in Merge mode, or empty in Replace mode.
