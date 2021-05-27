#!/bin/bash

cd ${0%/*}
cd ..

CARDANO_HW_CLI_PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

PACKAGE='cardano-hw-cli'
VERSION=$CARDANO_HW_CLI_PACKAGE_VERSION'-1' # majorVersion.minorVersion.patchVersion-packageRevision
ARCHITECTURE='amd64'
MAINTAINER='Peter Benc <peter.benc@vacuumlabs.com>, David Tran Duc <david.tran.duc@vacuumlabs.com>'
DESCRIPTION='Cardano hw cli
 Command line tool for ledger/trezor transaction signing'

# Remove old build
rm -R ./build/linux/deb 2> /dev/null

# Prepare directories
mkdir ./build/linux 2> /dev/null
mkdir ./build/linux/deb
mkdir ./build/linux/deb/${PACKAGE}_${VERSION}
mkdir ./build/linux/deb/${PACKAGE}_${VERSION}/usr
mkdir ./build/linux/deb/${PACKAGE}_${VERSION}/usr/bin
mkdir ./build/linux/deb/${PACKAGE}_${VERSION}/usr/share
mkdir ./build/linux/deb/${PACKAGE}_${VERSION}/usr/share/cardano-hw-cli
mkdir ./build/linux/deb/${PACKAGE}_${VERSION}/DEBIAN

# Build executable
yarn nexe ./dist/index.js -o ./build/linux/deb/cardano-hw-cli -t linux-x64-12.16.2

# Copy files to package structure
cp -R ./build/dependencies/linux/Release ./build/linux/deb/${PACKAGE}_${VERSION}/usr/share/cardano-hw-cli
cp ./_package.json ./build/linux/deb/${PACKAGE}_${VERSION}/usr/share/cardano-hw-cli/package.json
cp ./build/linux/deb/cardano-hw-cli ./build/linux/deb/${PACKAGE}_${VERSION}/usr/share/cardano-hw-cli
ln -s /usr/share/cardano-hw-cli/cardano-hw-cli ./build/linux/deb/${PACKAGE}_${VERSION}/usr/bin

# Build package
CONTROL="Package: $PACKAGE
Version: $VERSION
Architecture: $ARCHITECTURE
Maintainer: $MAINTAINER
Description: $DESCRIPTION"

echo "$CONTROL" >> ./build/linux/deb/${PACKAGE}_${VERSION}/DEBIAN/control

dpkg-deb --build ./build/linux/deb/${PACKAGE}_${VERSION}
