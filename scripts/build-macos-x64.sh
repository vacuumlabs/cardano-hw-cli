#!/bin/bash
# Build macOS x64 artifacts. Must run on an Intel Mac (pkg cannot build x64 on Apple Silicon).

set -euo pipefail

cd ${0%/*}
cd ..

CARDANO_HW_CLI_PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

ARTIFACT_DIR=./build/macos/archive-x64/cardano-hw-cli

# Remove old build
rm -rf ./build/macos/archive-x64

# Prepare directories
mkdir -p ./build/macos/archive-x64
mkdir -p "${ARTIFACT_DIR}"

# pkg ad-hoc signs the main executable on macOS by default
yarn pkg ./dist/index.js -o "${ARTIFACT_DIR}/cardano-hw-cli" -c package.json -t node22-macos-x64 --options "no-warnings=ExperimentalWarning"

# Copy native deps (pkg does not sign bundled .node files)
cp -R ./build/dependencies/macos-x64/* "${ARTIFACT_DIR}/"

if [[ -f "${ARTIFACT_DIR}/HID.node" ]]; then
  codesign -s - --force "${ARTIFACT_DIR}/HID.node"
fi

# Archive
cd ./build/macos/archive-x64
tar -czvf ./cardano-hw-cli-${CARDANO_HW_CLI_PACKAGE_VERSION}_mac-x64.tar.gz ./cardano-hw-cli
cd ../../..
