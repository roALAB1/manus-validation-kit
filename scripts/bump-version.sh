#!/bin/bash
#
# Simple script to bump version, update changelog, and create a release.
#
# Usage:
#   ./scripts/bump-version.sh <major|minor|patch>

set -e

# Check for argument
if [ -z "$1" ]; then
  echo "Usage: ./scripts/bump-version.sh <major|minor|patch>"
  exit 1
fi

# Check for clean working tree
if ! git diff-index --quiet HEAD --; then
  echo "Git working directory is not clean. Please commit or stash changes."
  exit 1
fi

# Fetch latest tags
git fetch --tags

# Get current version
CURRENT_VERSION=$(npm view . version)

# Bump version
NEW_VERSION=$(npm version $1 --no-git-tag-version)

# Update CHANGELOG.md
# (This is a placeholder - a more sophisticated script would use a tool)
echo "Updating CHANGELOG.md for ${NEW_VERSION}..."
# Prepend new version header to changelog
# Example: sed -i "" "3i\
## [${NEW_VERSION}] - $(date +%Y-%m-%d)\n" CHANGELOG.md

# Commit changes
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: Bump version to ${NEW_VERSION}"

# Create git tag
git tag -a "${NEW_VERSION}" -m "Release ${NEW_VERSION}"

# Push to GitHub
echo "Pushing to GitHub..."
git push origin main
git push origin "${NEW_VERSION}"

# Create GitHub Release
echo "Creating GitHub release..."
# Extract changelog notes for this version
# (This is a placeholder for a real implementation)
RELEASE_NOTES="Release notes for ${NEW_VERSION}"
gh release create "${NEW_VERSION}" --title "Release ${NEW_VERSION}" --notes "${RELEASE_NOTES}"

echo "\n✅ Version bumped to ${NEW_VERSION} and released! released successfully!"
