/**
 * GET /install-cli.sh
 *
 * Returns a bash script that downloads and installs the jfp CLI binary.
 * Performs platform detection and SHA256 verification.
 *
 * Usage: curl -fsSL https://jeffreysprompts.com/install-cli.sh | bash
 */

import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = 3600; // Revalidate every hour

// Base URL for releases (update when release hosting is configured)
const RELEASE_BASE_URL = "https://github.com/Dicklesworthstone/jeffreysprompts.com/releases/latest/download";

// Generate CLI installer script
function generateCLIInstaller(): string {
  return `#!/usr/bin/env bash
# JeffreysPrompts CLI Installer
# Downloads and installs the jfp CLI binary for your platform
#
# Usage: curl -fsSL https://jeffreysprompts.com/install-cli.sh | bash

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

info() { echo -e "\${BLUE}[INFO]\${NC} $1"; }
success() { echo -e "\${GREEN}[OK]\${NC} $1"; }
warn() { echo -e "\${YELLOW}[WARN]\${NC} $1"; }
error() { echo -e "\${RED}[ERROR]\${NC} $1"; exit 1; }

# Detect platform
detect_platform() {
  local os arch uname_s uname_m
  uname_s="$(uname -s)"

  if [[ "$uname_s" == Linux* ]]; then
    os="linux"
  elif [[ "$uname_s" == Darwin* ]]; then
    os="darwin"
  elif [[ "$uname_s" == MINGW* || "$uname_s" == MSYS* || "$uname_s" == CYGWIN* ]]; then
    os="windows"
  else
    error "Unsupported operating system: $uname_s"
  fi

  uname_m="$(uname -m)"
  if [[ "$uname_m" == "x86_64" || "$uname_m" == "amd64" ]]; then
    arch="x64"
  elif [[ "$uname_m" == "aarch64" || "$uname_m" == "arm64" ]]; then
    arch="arm64"
  else
    error "Unsupported architecture: $uname_m"
  fi

  echo "\${os}-\${arch}"
}

# Get download URL for platform
get_download_url() {
  local platform="$1"
  local base_url="${RELEASE_BASE_URL}"

  if [[ "$platform" == "linux-x64" ]]; then
    echo "\${base_url}/jfp-linux-x64"
  elif [[ "$platform" == "linux-arm64" ]]; then
    echo "\${base_url}/jfp-linux-arm64"
  elif [[ "$platform" == "darwin-x64" ]]; then
    echo "\${base_url}/jfp-darwin-x64"
  elif [[ "$platform" == "darwin-arm64" ]]; then
    echo "\${base_url}/jfp-darwin-arm64"
  elif [[ "$platform" == "windows-x64" ]]; then
    echo "\${base_url}/jfp-windows-x64.exe"
  else
    error "No binary available for platform: $platform"
  fi
}

# Get binary name for platform
get_binary_name() {
  local platform="$1"
  if [[ "$platform" == windows-* ]]; then
    echo "jfp.exe"
  else
    echo "jfp"
  fi
}

# Determine install directory
get_install_dir() {
  if [ -n "\${JFP_INSTALL_DIR:-}" ]; then
    echo "\${JFP_INSTALL_DIR}"
  elif [ -d "$HOME/.local/bin" ]; then
    echo "$HOME/.local/bin"
  elif [ -d "/usr/local/bin" ] && [ -w "/usr/local/bin" ]; then
    echo "/usr/local/bin"
  else
    echo "$HOME/.local/bin"
  fi
}

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Download file
download() {
  local url="$1"
  local dest="$2"

  if command_exists curl; then
    curl -fsSL "$url" -o "$dest"
  elif command_exists wget; then
    wget -q "$url" -O "$dest"
  else
    error "Neither curl nor wget found. Please install one of them."
  fi
}

# Main installation
main() {
  echo ""
  echo "  ╔═══════════════════════════════════════╗"
  echo "  ║   JeffreysPrompts CLI Installer       ║"
  echo "  ╚═══════════════════════════════════════╝"
  echo ""

  # Detect platform
  local platform
  platform="$(detect_platform)"
  info "Detected platform: $platform"

  # Get URLs and paths
  local download_url binary_name install_dir install_path
  download_url="$(get_download_url "$platform")"
  binary_name="$(get_binary_name "$platform")"
  install_dir="$(get_install_dir)"
  install_path="\${install_dir}/\${binary_name}"

  info "Download URL: $download_url"
  info "Install path: $install_path"

  # Create install directory if needed
  if [ ! -d "$install_dir" ]; then
    info "Creating directory: $install_dir"
    mkdir -p "$install_dir"
  fi

  # Download binary
  info "Downloading jfp..."
  local temp_file
  temp_file="$(mktemp)"
  trap "rm -f '$temp_file'" EXIT

  if ! download "$download_url" "$temp_file"; then
    error "Failed to download jfp binary"
  fi

  # Download and verify checksum if available
  local checksum_url="\${download_url}.sha256"
  local checksum_file
  checksum_file="$(mktemp)"

  if download "$checksum_url" "$checksum_file" 2>/dev/null; then
    info "Verifying SHA256 checksum..."
    local expected_hash actual_hash
    expected_hash="$(cat "$checksum_file" | awk '{print $1}')"

    if command_exists sha256sum; then
      actual_hash="$(sha256sum "$temp_file" | awk '{print $1}')"
    elif command_exists shasum; then
      actual_hash="$(shasum -a 256 "$temp_file" | awk '{print $1}')"
    else
      warn "No SHA256 tool found, skipping verification"
      expected_hash=""
    fi

    if [ -n "$expected_hash" ] && [ "$expected_hash" != "$actual_hash" ]; then
      error "Checksum verification failed!\\n  Expected: $expected_hash\\n  Actual:   $actual_hash"
    elif [ -n "$expected_hash" ]; then
      success "Checksum verified"
    fi
    rm -f "$checksum_file"
  else
    warn "No checksum file available, skipping verification"
  fi

  # Install binary
  info "Installing to $install_path..."
  mv "$temp_file" "$install_path"
  chmod +x "$install_path"

  # Verify installation
  if [ -x "$install_path" ]; then
    success "jfp installed successfully!"
    echo ""

    # Check if install_dir is in PATH
    if [[ ":\${PATH}:" == *":\${install_dir}:"* ]]; then
      info "Run 'jfp --help' to get started"
    else
      warn "\\$install_dir is not in your PATH"
      echo ""
      echo "  Add it to your shell config:"
      echo ""
      echo "    # For bash (~/.bashrc):"
      printf '    export PATH="$PATH:%s"\\n' "$install_dir"
      echo ""
      echo "    # For zsh (~/.zshrc):"
      printf '    export PATH="$PATH:%s"\\n' "$install_dir"
      echo ""
    fi
  else
    error "Installation failed"
  fi

  echo ""
  echo "  Quick start:"
  echo "    jfp list          # List all prompts"
  echo "    jfp search <term> # Search prompts"
  echo "    jfp show <id>     # View a prompt"
  echo "    curl -fsSL \"https://jeffreysprompts.com/install.sh\" | bash  # Install all skills"
  echo ""
}

main "$@"
`;
}

export async function GET(): Promise<NextResponse> {
  const script = generateCLIInstaller();

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Content-Disposition": 'inline; filename="install-cli.sh"',
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
