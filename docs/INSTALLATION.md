# Explorer Installation Guide

Complete guide for installing all prerequisites needed to run the Explorer.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Docker Installation](#docker-installation)
3. [Docker Compose Installation](#docker-compose-installation)
4. [Node.js Installation (for Development)](#nodejs-installation-for-development)
5. [Verification](#verification)
6. [Quick Start](#quick-start)

---

## System Requirements

- **OS**: Linux (Ubuntu/Debian recommended), macOS, or Windows with WSL2
- **RAM**: Minimum 2GB, recommended 4GB+
- **Disk**: At least 5GB free space
- **Network**: Internet connection for downloading dependencies

---

## Docker Installation

### Ubuntu/Debian

**Option 1: Official Docker Installation Script (Recommended - Most Reliable)**

```bash
# Download and run official Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
sudo docker run hello-world

# Log out and back in for group changes to take effect
# After logging back in, you can run docker without sudo
```

**Option 2: Manual Installation (Alternative)**

If the script doesn't work, try manual installation:

```bash
# Update package index
sudo apt update

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Remove old Docker versions if any
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Detect distribution
DISTRO=$(lsb_release -is | tr '[:upper:]' '[:lower:]')
CODENAME=$(lsb_release -cs)

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DISTRO} \
  ${CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index again
sudo apt update

# Install Docker Engine
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify
sudo docker run hello-world
```

### macOS

**Option 1: Docker Desktop (Recommended)**

1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop
2. Install the `.dmg` file
3. Launch Docker Desktop from Applications
4. Follow the setup wizard

**Option 2: Homebrew**

```bash
brew install --cask docker
```

### Windows

1. Install WSL2 (Windows Subsystem for Linux 2)
2. Download Docker Desktop from: https://www.docker.com/products/docker-desktop
3. Install and launch Docker Desktop
4. Ensure WSL2 integration is enabled in Docker Desktop settings

### Verify Docker Installation

```bash
docker --version
docker run hello-world
```

---

## Docker Compose Installation

Docker Compose is included with Docker Desktop (macOS/Windows) and Docker Engine 20.10+ (Linux).

### Ubuntu/Debian (if not included)

```bash
# Docker Compose is included in docker-compose-plugin
# Verify installation:
docker compose version
```

### Manual Installation (if needed)

```bash
# Download latest release
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

---

## Node.js Installation (for Development)

**Note:** Node.js is only needed if you want to run Explorer in development mode (`npm run dev`). For production Docker deployment, Node.js is included in the container.

### Ubuntu/Debian

**Option 1: Using NodeSource (Recommended for Node 20+)**

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

**Option 2: Using nvm (Node Version Manager)**

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20

# Verify
node --version
npm --version
```

### macOS

**Option 1: Homebrew**

```bash
brew install node@20
```

**Option 2: nvm**

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.zshrc

# Install Node.js 20
nvm install 20
nvm use 20
```

### Windows

1. Download Node.js installer from: https://nodejs.org/
2. Choose LTS version (20.x recommended)
3. Run installer and follow wizard
4. Verify: Open PowerShell and run `node --version`

---

## Verification

Run these commands to verify all prerequisites are installed:

```bash
# Check Docker
docker --version
docker compose version

# Check Node.js (if installed for development)
node --version  # Should be v20.x or higher
npm --version

# Check Git (usually pre-installed)
git --version
```

**Expected output:**
```
Docker version 24.x.x
Docker Compose version v2.x.x
node v20.x.x
npm 10.x.x
git version 2.x.x
```

---

## Quick Start

Once all prerequisites are installed:

### 1. Clone the Repository

```bash
git clone <explorer-repo-url>
cd explorer
```

### 2. Build and Run with Docker

```bash
# Build the image
docker build -t explorer .

# Run the container
docker run -d \
  --name explorer \
  -p 4175:4175 \
  -e NODE_ENV=production \
  explorer
```

### 3. Or Run in Development Mode

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### 4. Access Explorer

Open your browser: `http://localhost:4175`

---

## Troubleshooting

### Docker permission denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

### Docker daemon not running

```bash
# Linux
sudo systemctl start docker
sudo systemctl enable docker

# macOS/Windows: Start Docker Desktop application
```

### Port already in use

```bash
# Check what's using port 4175
sudo lsof -i :4175  # Linux/macOS
netstat -ano | findstr :4175  # Windows

# Kill the process or use a different port
docker run -p 4176:4175 ...
```

### Node.js version too old

```bash
# Update using nvm
nvm install 20
nvm use 20

# Or reinstall from NodeSource (Linux)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## Next Steps

After installation, see [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Production deployment configuration
- Adding stores to Explorer
- Enabling Explorer access on stores

