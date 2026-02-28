/**
 * GET /install-cli.sh
 *
 * Returns a bash script that downloads and installs the jfp CLI binary.
 * Performs platform detection and SHA256 verification.
 *
 * Usage: curl -fsSL https://jeffreysprompts.com/install-cli.sh | bash
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Primary release host (Cloudflare R2 public bucket).
// Keep GitHub Releases as fallback in case the R2 object is missing.
const RELEASE_BASE_URL = "https://pub-346a8b7b59de4fa1ae66eb2e1d84d53d.r2.dev/jfp/v0.1.0";
const RELEASE_FALLBACK_URL =
  "https://github.com/Dicklesworthstone/jeffreysprompts.com/releases/latest/download";

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

# Create a temp file (portable across macOS/Linux)
make_temp_file() {
  if command_exists mktemp; then
    mktemp -t jfp.XXXXXX 2>/dev/null || mktemp "\${TMPDIR:-/tmp}/jfp.XXXXXX"
  else
    error "mktemp not found. Please install coreutils."
  fi
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

# Download with fallback host
download_with_fallback() {
  local primary_url="$1"
  local fallback_url="$2"
  local dest="$3"

  if download "$primary_url" "$dest"; then
    return 0
  fi

  warn "Primary download failed, trying fallback host"
  download "$fallback_url" "$dest"
}

# Install from prebuilt release artifact
install_from_release() {
  local download_url="$1"
  local install_path="$2"
  local fallback_url temp_file checksum_url checksum_file expected_hash actual_hash

  fallback_url="${RELEASE_FALLBACK_URL}/$(basename "$download_url")"

  temp_file="$(make_temp_file)"

  if ! download_with_fallback "$download_url" "$fallback_url" "$temp_file"; then
    rm -f "$temp_file"
    return 1
  fi

  checksum_url="\${download_url}.sha256"
  local fallback_checksum_url="\${fallback_url}.sha256"
  checksum_file="$(make_temp_file)"
  if download_with_fallback "$checksum_url" "$fallback_checksum_url" "$checksum_file" 2>/dev/null; then
    info "Verifying SHA256 checksum..."
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
      rm -f "$temp_file" "$checksum_file"
      error "Checksum verification failed!\\n  Expected: $expected_hash\\n  Actual:   $actual_hash"
    elif [ -n "$expected_hash" ]; then
      success "Checksum verified"
    fi
  else
    warn "No checksum file available, skipping verification"
  fi
  rm -f "$checksum_file"

  info "Installing to $install_path..."
  mv "$temp_file" "$install_path"
  chmod +x "$install_path"
  return 0
}

# Fallback when prebuilt binaries are unavailable:
# clone the repo and compile with Bun on the user's machine.
install_from_source() {
  local install_path="$1"
  local temp_dir repo_dir

  if ! command_exists git; then
    error "Prebuilt binaries are unavailable and git is not installed."
  fi
  if ! command_exists bun; then
    error "Prebuilt binaries are unavailable and Bun is not installed. Install Bun: https://bun.sh/"
  fi

  temp_dir="$(mktemp -d -t jfp-src.XXXXXX 2>/dev/null || mktemp -d "\${TMPDIR:-/tmp}/jfp-src.XXXXXX")"
  repo_dir="$temp_dir/repo"

  info "Falling back to source build using Bun..."
  info "Cloning repository..."
  git clone --depth 1 https://github.com/Dicklesworthstone/jeffreysprompts.com.git "$repo_dir" >/dev/null 2>&1

  info "Building jfp binary from source (this may take a minute)..."
  (
    cd "$repo_dir"
    bun install --frozen-lockfile >/dev/null
    bun build --compile ./jfp.ts --outfile jfp >/dev/null
  )

  if [ ! -f "$repo_dir/jfp" ]; then
    rm -rf "$temp_dir"
    error "Source build failed: jfp binary was not produced."
  fi

  info "Installing to $install_path..."
  mv "$repo_dir/jfp" "$install_path"
  chmod +x "$install_path"
  rm -rf "$temp_dir"
  return 0
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

  info "Attempting prebuilt binary install..."
  if ! install_from_release "$download_url" "$install_path"; then
    warn "Prebuilt binary not available at release URL."
    install_from_source "$install_path"
  fi

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
  echo '    curl -fsSL "https://jeffreysprompts.com/install.sh" | bash  # Install all skills'
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
