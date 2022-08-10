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
yarn pkg ./dist/index.js -o ./build/windows/cardano-hw-cli/cardano-hw-cli -c package.json -t node18-win-x64

# Copy dependencies
cp -R ./build/dependencies/windows/* ./build/windows/cardano-hw-cli/

# Archive
cd ./build/windows
zip -r ./cardano-hw-cli-${CARDANO_HW_CLI_PACKAGE_VERSION}_windows-x64.zip ./
cd ../..
