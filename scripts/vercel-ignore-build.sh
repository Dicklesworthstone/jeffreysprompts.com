#!/bin/bash
# Vercel Ignore Build Step Script
# Exit 1 = Skip build (no relevant changes)
# Exit 0 = Proceed with build (relevant changes detected)
#
# This script reduces Vercel build credits by skipping builds when
# only non-essential files have changed.

echo "Checking if build is needed..."

# Always build on production branch
if [[ "$VERCEL_GIT_COMMIT_REF" == "main" || "$VERCEL_GIT_COMMIT_REF" == "master" ]]; then
  # For production, check if relevant files changed
  echo "Production branch detected, checking for relevant changes..."
else
  # For preview deployments, be more selective
  echo "Preview branch: $VERCEL_GIT_COMMIT_REF"
fi

# Get the list of changed files compared to the previous commit
# Use VERCEL_GIT_PREVIOUS_SHA if available, otherwise compare to HEAD~1
if [[ -n "$VERCEL_GIT_PREVIOUS_SHA" ]]; then
  CHANGED_FILES=$(git diff --name-only "$VERCEL_GIT_PREVIOUS_SHA" HEAD 2>/dev/null || echo "")
else
  CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")
fi

# If we can't determine changed files, proceed with build
if [[ -z "$CHANGED_FILES" ]]; then
  echo "Could not determine changed files, proceeding with build"
  exit 0
fi

echo "Changed files:"
echo "$CHANGED_FILES"

# Define patterns that should trigger a build
# These are paths relevant to the web app
BUILD_TRIGGERS=(
  "apps/web/"
  "packages/core/"
  "packages/cli/"
  "package.json"
  "bun.lock"
  "vercel.json"
  "tsconfig.json"
  ".env"
)

# Check if any changed file matches a build trigger
for file in $CHANGED_FILES; do
  for trigger in "${BUILD_TRIGGERS[@]}"; do
    if [[ "$file" == $trigger* ]]; then
      echo "Build trigger matched: $file (pattern: $trigger)"
      exit 0  # Proceed with build
    fi
  done
done

# Files that should NOT trigger a build
# (documentation, scripts, tests, config files not affecting the build)
echo "No build triggers matched. Changed files are non-essential."
echo "Skipping build to save credits."
exit 1  # Skip build
