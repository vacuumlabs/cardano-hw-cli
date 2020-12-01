#!/bin/bash

cd ${0%/*}
cd ..

yarn clean
yarn install
yarn build-js
