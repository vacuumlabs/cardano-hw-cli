#!/bin/bash
# Build macOS arm64 artifacts. Must run on macOS (see build-macos-all.sh).

set -euo pipefail

cd ${0%/*}
cd ..

CARDANO_HW_CLI_PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

ARTIFACT_DIR=./build/macos/archive-arm64/cardano-hw-cli

# Remove old build
rm -rf ./build/macos/archive-arm64

# Prepare directories
mkdir -p ./build/macos/archive-arm64
mkdir -p "${ARTIFACT_DIR}"

# pkg ad-hoc signs the main executable on macOS by default
./scripts/prepare-pkg-native-deps.sh
yarn pkg ./dist/index.js -o "${ARTIFACT_DIR}/cardano-hw-cli" -c package.json -t node22-macos-arm64 --options "no-warnings=ExperimentalWarning"

# Copy native deps (pkg does not sign bundled .node files)
cp -R ./build/dependencies/macos-arm64/* "${ARTIFACT_DIR}/"

if [[ -f "${ARTIFACT_DIR}/HID.node" ]]; then
  codesign -s - --force "${ARTIFACT_DIR}/HID.node"
fi

# Archive
cd ./build/macos/archive-arm64
tar -czvf ./cardano-hw-cli-${CARDANO_HW_CLI_PACKAGE_VERSION}_mac-arm64.tar.gz ./cardano-hw-cli
cd ../../..
