#!/bin/bash

cd ${0%/*}
cd ..

CARDANO_HW_CLI_PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

# Remove old build
rm -R ./build/linux/archive-x64 2> /dev/null

# Prepare directories
mkdir ./build/linux 2> /dev/null
mkdir ./build/linux/archive-x64
mkdir ./build/linux/archive-x64/cardano-hw-cli

# Build executable
yarn pkg ./dist/index.js -o ./build/linux/archive-x64/cardano-hw-cli/cardano-hw-cli -c package.json -t node18-linux-x64

# Copy dependencies
cp -R ./build/dependencies/linux/* ./build/linux/archive-x64/cardano-hw-cli/

# Archive
cd ./build/linux/archive-x64
tar -czvf ./cardano-hw-cli-${CARDANO_HW_CLI_PACKAGE_VERSION}_linux-x64.tar.gz ./cardano-hw-cli
cd ../../..
