#!/bin/bash
# This script can be run from linux and executable should be runnable on macos

cd ${0%/*}
cd ..

CARDANO_HW_CLI_PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

# Remove old build
rm -R ./build/macos 2> /dev/null

# Prepare directories
mkdir ./build/macos 2> /dev/null
mkdir ./build/macos/cardano-hw-cli

# Build executable
yarn pkg ./dist/index.js -o ./build/macos/cardano-hw-cli/cardano-hw-cli -c package.json -t node18-macos

# Copy dependencies
cp -R ./build/dependencies/macos/* ./build/macos/cardano-hw-cli/

# Archive
cd ./build/macos
tar -czvf ./cardano-hw-cli-${CARDANO_HW_CLI_PACKAGE_VERSION}_mac-x64.tar.gz ./cardano-hw-cli
cd ../..
