#!/bin/bash

cd ${0%/*}
cd ..

CARDANO_HW_CLI_PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

# Remove old build
rm -R ./build/linux/archive 2> /dev/null

# Prepare directories
mkdir ./build/linux 2> /dev/null
mkdir ./build/linux/archive
mkdir ./build/linux/archive/cardano-hw-cli

# Build executable
yarn nexe ./dist/index.js -o ./build/linux/archive/cardano-hw-cli/cardano-hw-cli -t linux-x64-12.16.2

# Copy dependencies
cp _package.json ./build/linux/archive/cardano-hw-cli/package.json
cp -R ./build/dependencies/linux/Release ./build/linux/archive/cardano-hw-cli/Release

# Archive
cd ./build/linux/archive
tar -czvf ./cardano-hw-cli-${CARDANO_HW_CLI_PACKAGE_VERSION}_linux-x64.tar.gz ./cardano-hw-cli
cd ../../..
