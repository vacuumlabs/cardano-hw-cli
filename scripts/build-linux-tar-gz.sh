#!/bin/bash

cd ${0%/*}
cd ..

yarn build

mkdir ./build/cardano-hw-cli-linux

cp -R ./build/Release ./build/cardano-hw-cli-linux
cp ./build/cardano-hw-cli ./build/cardano-hw-cli-linux
cp package.json ./build/cardano-hw-cli-linux

cd ./build
tar -czvf ./cardano-hw-cli.tar.gz ./cardano-hw-cli-linux
cd ..

rm -rf ./build/cardano-hw-cli-linux