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
4. Creates an unprivileged LXC container with 1 CPU core, 2048MB RAM, and 1024MB Swap to provide compilation headroom for the web frontend (runtime consumption is only ~45MB to 90MB), backed by 4GB disk storage.
5. Boots the container and provisions Node.js 22 LTS via the official NodeSource repository.
6. Clones WLEDashboard, installs dependencies, builds the production web frontend, and configures the `wledashboard.service` systemd unit.
7. Enables the service to start automatically on system boot and reports the access URL (`http://<IP>:8301`).

## Accessing the Container Shell (Proxmox Host CLI)

You can manage and interact with the WLEDashboard container directly from your Proxmox VE host shell:

### Interactive Shell (Root Login)
To drop directly into the container with full root access without entering a password:

```bash
pct enter <CTID>
```

To exit the container shell and return to the Proxmox host, type:
```bash
exit
```

### Virtual Serial Console
To connect to the virtual serial console (useful for viewing early boot messages or console output):

```bash
pct console <CTID>
```

* Press `Enter` to see the login prompt.
* To detach from the console and return to the host, press `Ctrl + O` (or `Ctrl + A` followed by `q`).

### Running Commands Directly from Host
To execute an ad-hoc command inside the container without entering an interactive shell:

```bash
pct exec <CTID> -- <command>
```

Examples:
* Check service status: `pct exec <CTID> -- systemctl status wledashboard`
* View live logs: `pct exec <CTID> -- journalctl -u wledashboard -f`
* Update WLEDashboard: `pct exec <CTID> -- update-wledashboard`

## Container Lifecycle Controls

Manage the container lifecycle directly from the Proxmox host shell:

* Start container: `pct start <CTID>`
* Stop container: `pct stop <CTID>`
* Reboot container: `pct reboot <CTID>`
* Check container status: `pct status <CTID>`

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
