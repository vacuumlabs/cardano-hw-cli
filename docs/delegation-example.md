# Delegation example

## Prepare HW wallet
Connect your HW wallet to your computer.

## Get protocol parameters
```
cardano-cli query protocol-parameters \
--mainnet \
--out-file protocol.json
```
should create `protocol.json` file.

### Verification payment key and hardware wallet signing file
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

## Create delegation certificate
```
cardano-cli stake-address delegation-certificate \
--staking-verification-key-file stake.vkey \
--stake-pool-verification-key-file cold.vkey \
--out-file delegation.cert
```
should create `delegation.cert` file.

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
2a602e9ad218967602b4ca7be48648224e07f34fb0059f164ea3f99dbbfee1cb     0           1983692
```

## Draft the transaction
```
cardano-cli transaction build-raw \
--tx-in "2a602e9ad218967602b4ca7be48648224e07f34fb0059f164ea3f99dbbfee1cb#0" \
--tx-out $(cat payment.addr)+0 \
--ttl 0 \
--fee 0 \
--certificate-file delegation.cert \
--out-file tx.draft \
--alonzo-era \
--cddl-format
```
should create `tx.draft` file.

## Calculate the fee
```
cardano-cli transaction calculate-min-fee \
--tx-body-file tx.draft \
--tx-in-count 1 \
--tx-out-count 1 \
--witness-count 2 \
--byron-witness-count 0 \
--mainnet \
--protocol-params-file protocol.json
```
example return:
```
199845 Lovelace
```

## Determine the TTL for the transaction
```
cardano-cli query tip --mainnet
```

## Build the transaction
```
cardano-cli transaction build-raw \
--tx-in "2a602e9ad218967602b4ca7be48648224e07f34fb0059f164ea3f99dbbfee1cb#0" \
--tx-out $(cat payment.addr)+1783847 \
--ttl 13909233 \
--fee 199845 \
--certificate-file delegation.cert \
--out-file tx.raw \
--alonzo-era \
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
--hw-signing-file stake.hwsfile \
--mainnet \
--out-file payment.witness \
--out-file stake.witness
```

## Assemble the transaction
```
cardano-cli transaction assemble \
--tx-body-file tx.transformed \
--witness-file payment.witness \
--witness-file stake.witness \
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