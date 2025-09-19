#!/bin/bash

cd ${0%/*}
cd ..

yarn clean
# --ignore-engines needed because of old node version, can be removed after node update
yarn install --ignore-engines
yarn build-js

# Update commit hash in package.json
COMMIT_HASH=$(git rev-parse HEAD)
sed -i '' '/"commit":.*,/d' package.json && sed -i '' '4 i \
  "commit": "'${COMMIT_HASH}'",\
' package.json