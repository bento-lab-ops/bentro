# Building BenTro Docker Images 🐳

This guide explains how to build Docker images for BenTro, including support for **Multi-Architecture** builds (running on both Intel/AMD and ARM/Raspberry Pi).

---

## ✅ Prerequisites

- **nerdctl** (recommended) or **docker** with `buildx` enabled.
- A running container runtime (Docker Desktop, Rancher Desktop, etc.).

---

## 🏗️ Single Architecture Build (Fast)

Builds only for the machine you are currently using (e.g., if you are on Windows/AMD64, it builds for `amd64`).

```bash
# Build
nerdctl build -t dnlouko/bentro-app:latest .

# Push
nerdctl push dnlouko/bentro-app:latest
```

---

## 🌍 Multi-Architecture Build (Manual)

Ideally, you use `nerdctl build --platform ... --push` to create a single manifest. However, if your tooling has limitations (e.g. older `nerdctl` without `manifest` command), follow this reliable manual process:

### 1. Build and Push for Each Architecture

We use cross-compilation (Docker `FROM --platform=$BUILDPLATFORM`) so you can build ARM images on Intel machines and vice-versa.

```bash
# Build AMD64 (Standard Servers)
nerdctl build --platform linux/amd64 -t dnlouko/bentro-app:v0.15.4-amd64 .
nerdctl push dnlouko/bentro-app:v0.15.4-amd64

# Build ARM64 (Raspberry Pi / Apple Silicon)
nerdctl build --platform linux/arm64 -t dnlouko/bentro-app:v0.15.4-arm64 .
nerdctl push dnlouko/bentro-app:v0.15.4-arm64
```

### 2. Create the "Universal" Tag (Manifest List)

Use `docker manifest` or a compatible tool to glue them together.

```bash
docker manifest create dnlouko/bentro-app:v0.15.4 \
    dnlouko/bentro-app:v0.15.4-amd64 \
    dnlouko/bentro-app:v0.15.4-arm64

docker manifest push dnlouko/bentro-app:v0.15.4
```

> **Note:** If `manifest` command is missing, you can simply tag the architecture matching your target cluster as the main tag:
> `nerdctl tag dnlouko/bentro-app:v0.15.4-arm64 dnlouko/bentro-app:v0.15.4`
> `nerdctl push dnlouko/bentro-app:v0.15.4`

---

## 🏷️ Versioning Strategy

We recommend tagging with the version number from `config.js` or `main.go`.

**Example:**
- `v0.15.4` (Specific Version)
- `latest` (Current Stable)

---

## 🔧 Troubleshooting

### Missing `nerdctl manifest` Command
If you are running on **WSL2 (ARM64)** or **Rancher Desktop** and see `unknown subcommand "manifest"`, you may need to manually upgrade `nerdctl` to the full version.

**Upgrade Instructions (WSL2 ARM64):**
```bash
# 1. Download release
wget https://github.com/containerd/nerdctl/releases/download/v2.0.0/nerdctl-full-2.0.0-linux-arm64.tar.gz

# 2. Install (Overwrite existing)
sudo tar Cxzvvf /usr/local nerdctl-full-2.0.0-linux-arm64.tar.gz

# 3. Verify
nerdctl version
```

