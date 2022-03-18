# Transaction example
This example is modified example found in cardano docs, to work with HW wallets:
- https://github.com/input-output-hk/cardano-node/blob/master/doc/stake-pool-operations/keys_and_addresses.md
- https://github.com/input-output-hk/cardano-node/blob/master/doc/stake-pool-operations/simple_transaction.md

## Prepare HW wallet
Connect your HW wallet to your computer.

## Get protocol parameters
```
cardano-cli query protocol-parameters \
--mainnet \
--out-file protocol.json
```
should create `protocol.json` file.

## Verification payment key and hardware wallet signing file
```
cardano-hw-cli address key-gen \
--path 1852H/1815H/0H/0/0 \
--verification-key-file payment.vkey \
--hw-signing-file payment.hwsfile
```
should create `payment.vkey` and `payment.hwsfile` files.

## Verification stake key and hardware wallet signing file
```
cardano-hw-cli address key-gen \
--path 1852H/1815H/0H/2/0 \
--verification-key-file stake.vkey \
--hw-signing-file stake.hwsfile
```
should create `stake.vkey` and `stake.hwsfile` files.

## Payment address
```
cardano-cli address build \
--payment-verification-key-file payment.vkey \
--stake-verification-key-file stake.vkey \
--out-file payment.addr \
--mainnet
```
should create `payment.addr` file.

## Get the transaction hash and index of the UTXO to spend
```
cardano-cli query utxo \
--address $(cat payment.addr) \
--mainnet
```
example return:
```
                           TxHash                                 TxIx        Lovelace
----------------------------------------------------------------------------------------
bc8bf52ea894fb8e442fe3eea628be87d0c9a37baef185b70eb00a5c8a849d3b     0           2487217
```

## Draft the transaction
```
cardano-cli transaction build-raw \
--alonzo-era \
--tx-in "bc8bf52ea894fb8e442fe3eea628be87d0c9a37baef185b70eb00a5c8a849d3b#0" \
--tx-out $(cat payment.addr)+0 \
--ttl 0 \
--fee 0 \
--out-file tx.draft \
--cddl-format
```
should create `tx.draft` file.

## Calculate the fee
```
cardano-cli transaction calculate-min-fee \
--tx-body-file tx.draft \
--tx-in-count 1 \
--tx-out-count 1 \
--witness-count 1 \
--byron-witness-count 0 \
--mainnet \
--protocol-params-file protocol.json
```
example return:
```
170869 Lovelace
```

## Determine the TTL for the transaction
```
cardano-cli query tip --mainnet
```
example return:
```
{
  "era": "Alonzo",
  "hash": "c7eab20fb2e03bbd8ac25cba88369a8efe55788a566e6c3d4e1693faca7cf4ba",
  "epoch": 189,
  "slot": 51672781,
  "block": 3356357
}
```

## Build the transaction
TTL: Add 1000 to `slot` from previous call
```
cardano-cli transaction build-raw \
--alonzo-era \
--tx-in "bc8bf52ea894fb8e442fe3eea628be87d0c9a37baef185b70eb00a5c8a849d3b#0" \
--tx-out $(cat payment.addr)+2316348 \
--ttl 27508111 \
--fee 170869 \
--out-file tx.raw \
--cddl-format
```

## Transform the transaction
HW wallets expect the transaction CBOR to be in *canonical* format (see CIP-0021). Unfortunately, cardano-cli sometimes produces tx files not compliant with CIP-0021. Use the following command to fix the formatting issues.
```
cardano-hw-cli transaction transform \
--tx-file tx.raw \
--out-file tx.transformed
```

## Witness the transaction
```
cardano-hw-cli transaction witness \
--tx-file tx.transformed \
--hw-signing-file payment.hwsfile \
--mainnet \
--out-file payment.witness
```
should return `payment.witness` file.

## Assemble the transaction
```
cardano-cli transaction assemble \
--tx-body-file tx.transformed \
--witness-file payment.witness \
--out-file tx.signed
```

## Submit the transaction
```
cardano-cli transaction submit \
--tx-file tx.signed \
--mainnet
```

## Check the balances
```
cardano-cli query utxo \
--address $(cat payment.addr) \
--mainnet
```