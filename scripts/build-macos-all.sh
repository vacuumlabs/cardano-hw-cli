#!/bin/bash

set -euxo pipefail

cd ${0%/*}
cd ..

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "macOS artifacts must be built on macOS (Linux cross-compiled pkg binaries are broken at runtime)." >&2
  exit 1
fi

./scripts/build-common.sh

MAC_ARCH="$(uname -m)"
if [[ "${MAC_ARCH}" == "arm64" ]]; then
  echo "Building macOS arm64 artifacts (native architecture)."
  ./scripts/build-macos-arm64.sh
elif [[ "${MAC_ARCH}" == "x86_64" ]]; then
  echo "Building macOS x64 artifacts (native architecture)."
  ./scripts/build-macos-x64.sh
else
  echo "Unsupported macOS architecture: ${MAC_ARCH}" >&2
  exit 1
fi

mkdir -p build/release
find ./build/macos -name '*.tar.gz' -exec cp {} ./build/release \;
