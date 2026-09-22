#!/bin/bash

cd ${0%/*}
cd ..

./scripts/build-common.sh
./scripts/build-linux-deb-package.sh
./scripts/build-linux-x64-tar-gz.sh
./scripts/build-windows.sh
# linux-arm64 is not included here. Build it with yarn build-linux-tar-arm64
# on Linux arm64 (that is the CI job that also runs the binary).

if [[ "$(uname -s)" == "Darwin" ]]; then
  MAC_ARCH="$(uname -m)"
  if [[ "${MAC_ARCH}" == "arm64" ]]; then
    ./scripts/build-macos-arm64.sh
  elif [[ "${MAC_ARCH}" == "x86_64" ]]; then
    ./scripts/build-macos-x64.sh
  fi
else
  echo "Skipping macOS artifacts (build on macOS — Linux cross-compiled pkg binaries fail at runtime)."
fi

rm -R build/release 2> /dev/null
mkdir build/release

find ./build/linux -name '*.deb' -exec cp {} ./build/release \;
find ./build/linux -name '*.tar.gz' -exec cp {} ./build/release \;
find ./build/macos -name '*.tar.gz' -exec cp {} ./build/release \;
find ./build/windows -name '*.zip' -exec cp {} ./build/release \;
cp ./scripts/autocomplete.sh ./build/release/autocomplete.sh
