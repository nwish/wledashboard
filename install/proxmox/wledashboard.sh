#!/usr/bin/env bash
# Copyright (c) 2026 upioneer / WLEDashboard
# License: MIT
# Proxmox VE Helper Script: WLEDashboard LXC Container Creator
# Run this script directly on your Proxmox VE host.

set -Eeuo pipefail

YW=$(echo "\033[33m")
BL=$(echo "\033[36m")
RD=$(echo "\033[01;31m")
GN=$(echo "\033[1;92m")
CL=$(echo "\033[m")

info() {
  echo -e "${BL}[INFO]${CL} $1"
}

success() {
  echo -e "${GN}[OK]${CL} $1"
}

warn() {
  echo -e "${YW}[WARN]${CL} $1"
}

error() {
  echo -e "${RD}[ERROR]${CL} $1"
}

# Ensure running on Proxmox VE host
if ! command -v pveversion >/dev/null 2>&1; then
  error "This script must be executed on a Proxmox VE host."
  exit 1
fi

echo -e "${BL}======================================================${CL}"
echo -e "${BL}          WLEDashboard Proxmox VE Installer           ${CL}"
echo -e "${BL}======================================================${CL}"

# Determine next available Container ID
CTID=$(pvesh get /cluster/nextid)
HOSTNAME="wledashboard"
CORES="1"
RAM="1024"
SWAP="512"
DISK_SIZE="4G"
BRIDGE="vmbr0"

# Find default storage for containers
STORAGE=$(pvesm status -content rootdir | awk 'NR>1 {print $1; exit}')
if [ -z "$STORAGE" ]; then
  STORAGE="local-lvm"
fi

# Find template storage
TMPL_STORAGE=$(pvesm status -content vztmpl | awk 'NR>1 {print $1; exit}')
if [ -z "$TMPL_STORAGE" ]; then
  TMPL_STORAGE="local"
fi

info "Container Configuration:"
echo -e "  Container ID:  ${GN}${CTID}${CL}"
echo -e "  Hostname:      ${GN}${HOSTNAME}${CL}"
echo -e "  Cores:         ${GN}${CORES}${CL}"
echo -e "  RAM:           ${GN}${RAM} MB${CL}"
echo -e "  Swap:          ${GN}${SWAP} MB${CL}"
echo -e "  Disk Size:     ${GN}${DISK_SIZE}${CL}"
echo -e "  Root Storage:  ${GN}${STORAGE}${CL}"
echo -e "  Network:       ${GN}DHCP on ${BRIDGE}${CL}"

read -r -p "Proceed with container creation? [Y/n] " CONFIRM
CONFIRM=${CONFIRM:-Y}
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  info "Installation aborted by user."
  exit 0
fi

# Update appliance template cache
info "Updating Proxmox template cache..."
pveam update >/dev/null 2>&1 || true

# Locate Debian 12 (bookworm) standard template
DEBIAN_TMPL=$(pveam available -section system | awk '{print $2}' | grep -E '^debian-12-standard_.*_amd64\.tar\.(zst|xz|gz)$' | sort -V | tail -n1)

if [ -z "$DEBIAN_TMPL" ]; then
  error "Unable to locate Debian 12 LXC template in Proxmox appliance repository."
  exit 1
fi

# Check if template is already downloaded, if not download it
if ! pveam list "$TMPL_STORAGE" | grep -q "$DEBIAN_TMPL"; then
  info "Downloading Debian 12 template ($DEBIAN_TMPL) to storage $TMPL_STORAGE..."
  pveam download "$TMPL_STORAGE" "$DEBIAN_TMPL"
fi

TMPL_PATH="${TMPL_STORAGE}:vztmpl/${DEBIAN_TMPL}"

# Create unprivileged LXC container
info "Creating LXC container $CTID..."
pct create "$CTID" "$TMPL_PATH" \
  --hostname "$HOSTNAME" \
  --cores "$CORES" \
  --memory "$RAM" \
  --swap "$SWAP" \
  --rootfs "${STORAGE}:${DISK_SIZE}" \
  --net0 "name=eth0,bridge=${BRIDGE},ip=dhcp,type=veth" \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1 \
  --start 0

# Start container
info "Starting LXC container $CTID..."
pct start "$CTID"

# Wait for network initialization inside container
info "Waiting for container network to acquire IP..."
for i in {1..30}; do
  if pct exec "$CTID" -- ip -4 addr show eth0 2>/dev/null | grep -q 'inet '; then
    break
  fi
  sleep 1
done

IP=$(pct exec "$CTID" -- ip -4 addr show eth0 | awk '/inet / {print $2}' | cut -d/ -f1 | head -n1)

if [ -z "$IP" ]; then
  warn "Container started but IP address was not immediately detected. Check router DHCP lease."
  IP="<CONTAINER_IP>"
else
  success "Container acquired IP: $IP"
fi

# Run in-container setup script
info "Executing WLEDashboard setup script inside container..."
INSTALL_URL="https://raw.githubusercontent.com/upioneer/WLEDashboard/master/install/proxmox/wledashboard-install.sh"
pct exec "$CTID" -- bash -c "curl -fsSL '$INSTALL_URL' | bash"

echo ""
echo -e "${GN}======================================================${CL}"
echo -e "${GN}       WLEDashboard Installed Successfully!           ${CL}"
echo -e "${GN}======================================================${CL}"
echo -e "Access the web dashboard in your browser at:"
echo -e "  ${BL}http://${IP}:8301${CL}"
echo ""
echo -e "Container Details:"
echo -e "  Container ID:  $CTID"
echo -e "  Status:        Running (auto-starts on boot)"
echo -e "  Data Path:     /opt/wledashboard/data"
echo ""
echo -e "To update WLEDashboard in the future, run:"
echo -e "  ${YW}pct exec $CTID -- update-wledashboard${CL}"
echo -e "======================================================"
