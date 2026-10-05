#!/bin/sh
# Genera dist/public_html/ y dist/public_html.zip listos para subir a un hosting compartido.
set -eu
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist/public_html
cp index.html dist/public_html/
cp -R src dist/public_html/src
(cd dist/public_html && zip -qr ../public_html.zip . -x '*.DS_Store')
echo "Listo: dist/public_html/ y dist/public_html.zip"
