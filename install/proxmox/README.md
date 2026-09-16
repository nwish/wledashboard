# Proxmox VE Helper Script for WLEDashboard

This directory provides automated installation scripts to deploy WLEDashboard as an unprivileged Linux Container (LXC) on Proxmox Virtual Environment (PVE).

## Overview

Deploying WLEDashboard inside a native Debian 12 LXC container provides several key advantages:

* Minimal Overhead: Native LXC consumes approximately 45MB to 90MB of RAM, avoiding virtual machine hypervisor overhead.
* 1:1 Parity with Docker: Compiles the exact same Node.js 22 LTS production environment, Fastify server, Vite client bundle, and SQLite data layer.
* Automatic Service Management: Runs as a native `systemd` service (`wledashboard.service`) with auto-restart on boot.
* Direct Local Subnet Access: Standard bridge networking gives the container a dedicated LAN IP address on your primary subnet, allowing seamless mDNS auto-discovery and UDP sync across all physical WLED controllers.

## One-Line Installation

Execute the following command directly in your Proxmox VE host shell (or via the PVE Web Shell):

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/upioneer/WLEDashboard/master/install/proxmox/wledashboard.sh)"
```

### What This Script Does

1. Verifies that the host is running Proxmox VE (`pveversion`).
2. Identifies the next available Container ID (`CTID`).
3. Downloads the latest official Debian 12 Bookworm template if not already cached.
4. Creates an unprivileged LXC container with 1 CPU core, 1024MB RAM, and 4GB disk storage.
5. Boots the container and provisions Node.js 22 LTS via the official NodeSource repository.
6. Clones WLEDashboard, installs dependencies, builds the production web frontend, and configures the `wledashboard.service` systemd unit.
7. Enables the service to start automatically on system boot and reports the access URL (`http://<IP>:8301`).

## Updating WLEDashboard in LXC

To update your container installation to the latest release, execute the following command from the Proxmox host shell:

```bash
pct exec <CTID> -- update-wledashboard
```

Alternatively, attach to the container console and run:

```bash
update-wledashboard
```

## Service Management

From inside the LXC container:

* Check service status: `systemctl status wledashboard`
* Restart service: `systemctl restart wledashboard`
* View real-time logs: `journalctl -u wledashboard -f`
* Data location: `/opt/wledashboard/data/wledashboard.db`
