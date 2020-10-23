# Transaction example
This example is modified example found in cardano docs, to work with HW wallets:
- https://docs.cardano.org/projects/cardano-node/en/latest/stake-pool-operations/keys_and_addresses.html
- https://docs.cardano.org/projects/cardano-node/en/latest/stake-pool-operations/simple_transaction.html

## Prepare HW wallet
Connect your HW wallet to your computer.

## Get protocol parameters
```
cardano-cli shelley query protocol-parameters \
--mainnet \
--out-file protocol.json
```
should create `protocol.json` file.

### Verification payment key and hardware wallet signing file
```
cardano-hw-cli shelley address key-gen \
--path 1852H/1815H/0H/0/0 \
--verification-key-file payment.vkey \
--hw-signing-file payment.hwsfile
```
should create `payment.vkey` and `payment.hwsfile` files.

## Verification stake key and hardware wallet signing file
```
cardano-hw-cli shelley address key-gen \
--path 1852H/1815H/0H/2/0 \
--verification-key-file stake.vkey \
--hw-signing-file stake.hwsfile
```
should create `stake.vkey` and `stake.hwsfile` files.

## Payment address
```
cardano-cli shelley address build \
--payment-verification-key-file payment.vkey \
--stake-verification-key-file stake.vkey \
--out-file payment.addr \
--mainnet
```
should create `payment.addr` file.

## Get the transaction hash and index of the UTXO to spend
```
cardano-cli shelley query utxo \
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
cardano-cli shelley transaction build-raw \
--tx-in bc8bf52ea894fb8e442fe3eea628be87d0c9a37baef185b70eb00a5c8a849d3b#0 \
--tx-out $(cat payment.addr)+0 \
--ttl 0 \
--fee 0 \
--out-file tx.draft
```
should create `tx.draft` file.

## Calculate the fee
```
cardano-cli shelley transaction calculate-min-fee \
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
cardano-cli shelley query tip --mainnet
```
example return:
```
{
  "blockNo": 4818137,
  "headerHash": "b567ac1a111822d006c61ba955a24167215b1207cab15aed53d68d51244da904",
  "slotNo": 11122006
}
```

## Build the transaction
TTL: Add 1000 to `slotNo` from previous call
```
cardano-cli shelley transaction build-raw \
--tx-in bc8bf52ea894fb8e442fe3eea628be87d0c9a37baef185b70eb00a5c8a849d3b#0 \
--tx-out $(cat payment.addr)+2316348 \
--ttl 11123006 \
--fee 170869 \
--out-file tx.raw
```

## Sign the transaction
```
cardano-hw-cli shelley transaction sign \
--tx-body-file tx.raw \
--hw-signing-file payment.hwsfile \
--mainnet \
--out-file tx.signed
```
should return `tx.signed` file.

## Submit the transaction
```
cardano-cli shelley transaction submit \
--tx-file tx.signed \
--mainnet
```

## Check the balances
```
cardano-cli shelley query utxo \
--address $(cat payment.addr) \
--mainnet
```