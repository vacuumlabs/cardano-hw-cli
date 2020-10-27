#!/bin/bash

cd ${0%/*}
cd ..

yarn build

rm -rf ./build-linux-tar

mkdir build-linux-tar
cd ./build
tar -czvf ../build-linux-tar/cardano-hw-cli.tar.gz .
cd ..