# !/bin/bash

cd ${0%/*}
cd ..

./scripts/build-common.sh
./scripts/build-linux-deb-package.sh
./scripts/build-linux-tar-gz.sh
./scripts/build-windows.sh
./scripts/build-macos.sh

rm -R build/release 2> /dev/null
mkdir build/release

find ./build/linux -name '*.deb' -exec cp {} ./build/release \;
find ./build/linux -name '*.tar.gz' -exec cp {} ./build/release \;
find ./build/macos -name '*.tar.gz' -exec cp {} ./build/release \;
find ./build/windows -name '*.zip' -exec cp {} ./build/release \;
