#!/bin/bash
# Deploy to Vercel with local-only assets (creatures, audio)
# Temporarily removes asset exclusions from .gitignore so Vercel CLI uploads them

set -e

# Remove creature/audio exclusions temporarily
sed -i '' '/^public\/assets\/creatures\/$/d; /^public\/audio\/$/d' .gitignore

echo "Deploying to Vercel (including local assets)..."
npx vercel --prod "$@"

# Restore .gitignore
git checkout .gitignore

echo "Done. .gitignore restored."
