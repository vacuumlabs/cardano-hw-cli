#!/bin/bash

cd ${0%/*}
cd ..

yarn build

rm -rf ./build-windows-zip

mkdir build-windows-zip
cd ./build
zip -r ../build-windows-zip/cardano-hw-cli.zip .
cd ..