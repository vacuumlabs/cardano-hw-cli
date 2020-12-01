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
yarn nexe ./dist/index.js -o ./build/windows/cardano-hw-cli/cardano-hw-cli -t windows-x64-12.16.2
mv ./build/windows/cardano-hw-cli/cardano-hw-cli.exe ./build/windows/cardano-hw-cli/cardano-hw-cli 

# Copy dependencies
cp package.json ./build/windows/cardano-hw-cli/package.json
cp -R ./build/dependencies/windows/Release ./build/windows/cardano-hw-cli/Release

# Archive
cd ./build/windows
zip -r ./cardano-hw-cli-${CARDANO_HW_CLI_PACKAGE_VERSION}_windows-x64.zip ./
cd ../..
