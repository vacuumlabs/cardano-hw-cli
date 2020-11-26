#!/bin/bash
# This script can be run from linux and executable should be runnable on macos

cd ${0%/*}
cd ..

yarn clean
rm -R build/cardano-hw-cli-mac
rm ./build/cardano-hw-cli-mac.tar.gz
yarn install
yarn build-js

mkdir build/cardano-hw-cli-mac
yarn nexe dist/index.js -o ./build/cardano-hw-cli-mac/cardano-hw-cli -t mac-x64-12.16.2

cp package.json ./build/cardano-hw-cli-mac/package.json
cp -R ./build/macos-dependencies/Release ./build/cardano-hw-cli-mac/Release

cd ./build
tar -czvf ./cardano-hw-cli-mac.tar.gz ./cardano-hw-cli-mac
cd ..
