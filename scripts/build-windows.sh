#!/bin/bash
# This script can be run from linux and executable should be runnable on windows

cd ${0%/*}
cd ..

CARDANO_HW_CLI_PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

# Remove old build
rm -R build/windows 2> /dev/null

# Prepare directories
mkdir ./build/windows
mkdir ./build/windows/cardano-hw-cli

# Build executable
# TODO update version when Nexe supports 12.19.1 (or higher) https://github.com/nexe/nexe/issues/821
yarn nexe ./dist/index.js -o ./build/windows/cardano-hw-cli/cardano-hw-cli -t windows-x64-12.18.2

# Copy dependencies
cp _package.json ./build/windows/cardano-hw-cli/package.json
cp -R ./build/dependencies/windows/Release ./build/windows/cardano-hw-cli/Release

# Archive
cd ./build/windows
zip -r ./cardano-hw-cli-${CARDANO_HW_CLI_PACKAGE_VERSION}_windows-x64.zip ./
cd ../..
