#!/bin/bash

cd ${0%/*}
cd ..

CARDANO_HW_CLI_PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

# Remove old build
rm -R ./build/linux/archive-arm64 2> /dev/null

# Prepare directories
mkdir ./build/linux 2> /dev/null
mkdir ./build/linux/archive-arm64
mkdir ./build/linux/archive-arm64/cardano-hw-cli

# Build executable
yarn pkg ./dist/index.js -o ./build/linux/archive-arm64/cardano-hw-cli/cardano-hw-cli -c package.json -t node18-linux-arm64

# Copy dependencies
cp -R ./build/dependencies/linux/* ./build/linux/archive-arm64/cardano-hw-cli/

# Archive
cd ./build/linux/archive-arm64
tar -czvf ./cardano-hw-cli-${CARDANO_HW_CLI_PACKAGE_VERSION}_linux-arm64.tar.gz ./cardano-hw-cli
cd ../../..
