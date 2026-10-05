#!/bin/bash
set -euo pipefail

echo "▶ Building..."
npm run build

if [ ! -f dist/index.html ]; then
  echo "❌ Build failed: dist/index.html missing"
  exit 1
fi

echo "▶ Copying .htaccess..."
cp .htaccess dist/.htaccess

echo "▶ Verifying .htaccess in dist..."
if [ ! -f dist/.htaccess ]; then
  echo "❌ .htaccess not copied into dist/"
  exit 1
fi

echo "▶ Zipping..."
rm -f dist.zip
cd dist && zip -r ../dist.zip . && cd ..

if [ ! -f dist.zip ]; then
  echo "❌ Zip failed"
  exit 1
fi

SIZE=$(du -h dist.zip | cut -f1)
echo "✅ Done. dist.zip ($SIZE) ready — upload to cPanel and extract."