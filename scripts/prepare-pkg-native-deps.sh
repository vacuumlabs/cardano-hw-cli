#!/bin/bash
# pkg cannot load node-hid via bindings' default Release/ path inside a snapshot.
# Copy native bindings to node-hid/build/*.node so they match pkg asset paths.
set -euo pipefail

cd "${0%/*}/.."

NODE_HID_BUILD="./node_modules/node-hid/build"
RELEASE_DIR="${NODE_HID_BUILD}/Release"

if [[ ! -d "${RELEASE_DIR}" ]]; then
  echo "node-hid build output not found at ${RELEASE_DIR}; run yarn install first." >&2
  exit 1
fi

mkdir -p "${NODE_HID_BUILD}"

if [[ -f "${RELEASE_DIR}/HID.node" ]]; then
  cp "${RELEASE_DIR}/HID.node" "${NODE_HID_BUILD}/HID.node"
fi

if [[ -f "${RELEASE_DIR}/HID_hidraw.node" ]]; then
  cp "${RELEASE_DIR}/HID_hidraw.node" "${NODE_HID_BUILD}/HID_hidraw.node"
fi
