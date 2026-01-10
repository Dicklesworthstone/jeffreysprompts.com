#!/bin/bash
set -e

echo "Building CLI binary..."
bun build --compile ./jfp.ts --outfile jfp

echo "Build complete: ./jfp"
./jfp --version