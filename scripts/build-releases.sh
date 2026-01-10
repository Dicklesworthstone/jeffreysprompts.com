#!/usr/bin/env bash
# Build jfp CLI binaries for all supported platforms
#
# Usage: ./scripts/build-releases.sh [--output-dir PATH]
#
# Platforms:
#   - linux-x64
#   - linux-arm64
#   - darwin-x64
#   - darwin-arm64
#   - windows-x64

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Default output directory
OUTPUT_DIR="./releases"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --output-dir|-o)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}Building jfp CLI for all platforms...${NC}\n"

# Platform configurations
# Format: target:output_name
PLATFORMS=(
  "bun-linux-x64:jfp-linux-x64"
  "bun-linux-arm64:jfp-linux-arm64"
  "bun-darwin-x64:jfp-darwin-x64"
  "bun-darwin-arm64:jfp-darwin-arm64"
  "bun-windows-x64:jfp-windows-x64.exe"
)

# Build for each platform
for platform_config in "${PLATFORMS[@]}"; do
  TARGET="${platform_config%%:*}"
  OUTPUT_NAME="${platform_config##*:}"
  OUTPUT_PATH="$OUTPUT_DIR/$OUTPUT_NAME"

  echo -e "${YELLOW}Building for $TARGET...${NC}"

  if bun build --compile --target="$TARGET" ./jfp.ts --outfile "$OUTPUT_PATH" 2>/dev/null; then
    SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
    echo -e "${GREEN}  ✓ $OUTPUT_NAME ($SIZE)${NC}"
  else
    echo -e "${YELLOW}  ⚠ Failed to build for $TARGET (may not be supported on this system)${NC}"
  fi
done

echo ""

# Generate checksums
echo -e "${BLUE}Generating checksums...${NC}"
CHECKSUM_FILE="$OUTPUT_DIR/SHA256SUMS.txt"

hash_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
    return 0
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
    return 0
  fi
  echo "No SHA256 tool available (sha256sum/shasum)." >&2
  return 1
}

> "$CHECKSUM_FILE"

for file in "$OUTPUT_DIR"/jfp-*; do
  if [[ ! -f "$file" ]]; then
    continue
  fi
  if [[ "$file" == *.sha256 ]]; then
    continue
  fi
  hash="$(hash_file "$file")" || exit 1
  base="$(basename "$file")"
  printf "%s  %s\n" "$hash" "$base" >> "$CHECKSUM_FILE"
  printf "%s\n" "$hash" > "${file}.sha256"
done

echo -e "${GREEN}✓ Generated $CHECKSUM_FILE${NC}"

# Show summary
echo ""
echo -e "${GREEN}Build complete!${NC}"
echo ""
echo "Files:"
ls -lh "$OUTPUT_DIR"/ | tail -n +2

echo ""
echo "Checksums:"
cat "$CHECKSUM_FILE"
