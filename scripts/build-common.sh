#!/bin/bash

cd ${0%/*}
cd ..

yarn clean
# --ignore-engines needed because of old node version, can be removed after node update
yarn install --ignore-engines
yarn build-js