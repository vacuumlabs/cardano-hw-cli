#!/bin/bash

cd ${0%/*}
cd ..

yarn clean
yarn install
yarn build-js

# Create _package.json with latest commit hash
rm _package.json 2> /dev/null
cp package.json _package.json
COMMIT_HASH=$(git rev-parse HEAD)
sed -i '2 i \ \ "commit":"'${COMMIT_HASH}'",' _package.json
