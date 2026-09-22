#!/bin/bash

cd ${0%/*}
cd ..

./scripts/build-common.sh
./scripts/build-linux-deb-package.sh
./scripts/build-linux-x64-tar-gz.sh
./scripts/build-windows.sh
# linux-arm64 is built only by yarn build-linux-tar-arm64, on a Linux arm64
# host. A cross-build from this script would share that artifact's filename
# and is not what CI executes.

rm -R build/release 2> /dev/null
mkdir -p build/release

find ./build/linux -name '*.deb' -exec cp {} ./build/release \;
find ./build/linux -name '*.tar.gz' -exec cp {} ./build/release \;
find ./build/windows -name '*.zip' -exec cp {} ./build/release \;
cp ./scripts/autocomplete.sh ./build/release/autocomplete.sh
