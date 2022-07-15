./build/macos/cardano-hw-cli/cardano-hw-cli transaction witness \
    --tx-file pkg-test/tx.raw \
    --hw-signing-file pkg-test/payment-ledger.hwsfile \
    --mainnet \
    --out-file pkg-test/ledger.witness


./build/macos/cardano-hw-cli/cardano-hw-cli transaction witness \
    --tx-file pkg-test/tx.raw \
    --hw-signing-file pkg-test/payment-trezor.hwsfile \
    --mainnet \
    --out-file pkg-test/trezor.witness