#!/bin/bash
set -e

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (use sudo)"
  exit 1
fi

# Check for systemd support in WSL
if ! pidof systemd > /dev/null; then
    echo "Error: systemd is not running."
    echo "Please enable systemd in WSL by adding the following to /etc/wsl.conf:"
    echo ""
    echo "[boot]"
    echo "systemd=true"
    echo ""
    echo "Then restart WSL with 'wsl --shutdown' from PowerShell."
    exit 1
fi

NERDCTL_VERSION="1.7.6"

# Detect architecture
case $(uname -m) in
    x86_64) ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
    *) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

echo "Detected architecture: ${ARCH}"
echo "Downloading nerdctl-full-${NERDCTL_VERSION}..."
wget -q --show-progress "https://github.com/containerd/nerdctl/releases/download/v${NERDCTL_VERSION}/nerdctl-full-${NERDCTL_VERSION}-linux-${ARCH}.tar.gz" -O nerdctl-full.tar.gz

echo "Installing binaries to /usr/local..."
tar Cxzvvf /usr/local nerdctl-full.tar.gz

echo "Configuring systemd services..."
cp /usr/local/lib/systemd/system/*.service /etc/systemd/system/
systemctl daemon-reload

echo "Starting containerd..."
systemctl enable --now containerd

echo "Starting buildkit..."
systemctl enable --now buildkit

echo "Cleaning up..."
rm nerdctl-full.tar.gz

echo "----------------------------------------"
echo "Installation complete!"
echo "Verifying installation..."
nerdctl version
echo "----------------------------------------"
echo "You can now build images using: sudo nerdctl build ..."
