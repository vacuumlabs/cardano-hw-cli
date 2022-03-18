# Plutus transactions
Since the Alonzo era, Cardano supports transactions involving Plutus script evaluation (e.g. spending from a Plutus script address, or minting tokens with Plutus minting policy).

You can learn more about Plutus scripts and see some transaction examples [here](https://docs.cardano.org/plutus/datums-redeemers).

## Script address
First of all, we need to create a script address. This requires a Plutus script - you can use [this simple script](./data/datum-equals-redeemer.plutus) which allows spending an eUTxO from its address if the eUTxO's datum equals the provided redeemer. If you aren't familiar with these terms, we recommend [this tutorial](https://docs.cardano.org/plutus/datums-redeemers).

```sh
cardano-cli address build \
--payment-script-file datum-equals-redeemer.plutus \
--out-file script.addr \
--mainnet
```

### Fund the script address
Send some funds to the script address. The steps are the same as in the [transaction tutorial](./transaction-example.md), the only difference is that we need to send the funds to the script address and provide a datum (`"chocolate"` in this case), so use these parameters when creating the transaction:

```sh
cardano-cli transaction build-raw \
...
--tx-out $(cat script.addr)+0 \
--tx-out-datum-hash-value '"chocolate"' \
...
```

### Check the script balance
```sh
cardano-cli query utxo \
--address $(cat script.addr) \
--mainnet
```

## Spending from the script
This transaction will be the one involving Plutus script evaluation. Therefore, we need to provide a redeemer and some collateral. The collateral input will need to be witnessed by the `payment` key. The Plutus script itself could require some signatures, too. Even though our script doesn't require any signatures, we will add `payment.vkey` as a required signer anyway (as a demonstration). We will send the funds to `payment.addr` (i.e. back to the address you funded the script from).

### Querying the UTxOs
First we need to query for the eUTxO owned by the script:
```sh
cardano-cli query utxo \
--address $(cat script.addr) \
--mainnet
```

Example return:
```
                           TxHash                                 TxIx        Amount
--------------------------------------------------------------------------------------
1789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8     0        990000000 lovelace + TxOutDatumHash ScriptDataInAlonzoEra "bb292f5270d8b30482d91ee44de4ffcb50c1efeb1c219d9cd08eda0f9242a7b5"
```

The collateral has to be a UTxO owned by a regular payment key, so we expect you to have a suitable UTxO governed by `payment.addr` ready. Beware - if the script evaluation fails, the whole collateral will be consumed, therefore we recommend using only a small Ada amout (let's say 4 Ada) as a collateral. You can split a larger UTxO into two using an ordinary transaction (tutorial [here](./transaction-example.md)).
```sh
cardano-cli query utxo \
--address $(cat payment.addr) \
--mainnet
```

Example return:
```
                           TxHash                                 TxIx        Amount
--------------------------------------------------------------------------------------
1789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8     1        9000000 lovelace + TxOutDatumNone
```

### Drafting the transaction
```sh
cardano-cli transaction build-raw \
--alonzo-era \
--tx-in "1789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8#0" \
--tx-in-script-file datum-equals-redeemer.plutus \
--tx-in-datum-value '"chocolate"' \
--tx-in-redeemer-value '"chocolate"' \
--tx-in-execution-units "(2000000, 6000)" \
--tx-in-collateral "1789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8#1" \
--tx-out "$(cat payment.addr)"+0 \
--required-signer-hash $(cardano-cli address key-hash --payment-verification-key-file payment.vkey) \
--fee 0 \
--protocol-params-file protocol.json \
--out-file tx.draft \
--cddl-format
```
Note that your Plutus script may require different execution units.

### Calculating the fee
*Note: if you don't have a `protocol.json` file available you can obtain it with `cardano-cli`:*
```sh
cardano-cli query protocol-parameters \
--out-file protocol.json \
--mainnet
```

Then we can calculate the fee:
```sh
cardano-cli transaction calculate-min-fee \
--tx-body-file tx.draft  \
--tx-in-count 2 \
--tx-out-count 1 \
--witness-count 1 \
--mainnet \
--protocol-params-file protocol.json
```
Example output:
```
182133 Lovelace
```

### Creating the unsigned transaction
Now we can calculate the output amount (input minus the fee) and create the unsigned transaction.
```sh
expr 990000000 - 182133
```
```sh
cardano-cli transaction build-raw \
--alonzo-era \
--tx-in "1789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8#0" \
--tx-in-script-file datum-equals-redeemer.plutus \
--tx-in-datum-value '"chocolate"' \
--tx-in-redeemer-value '"chocolate"' \
--tx-in-execution-units "(2000000, 6000)" \
--tx-in-collateral "1789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8#1" \
--tx-out "$(cat payment.addr)"+989817867 \
--required-signer-hash $(cardano-cli address key-hash --payment-verification-key-file payment.vkey) \
--fee 182133 \
--protocol-params-file protocol.json \
--out-file tx.raw \
--cddl-format
```
At this point, the Plutus script is present in the transaction witness set - now we only need to add the witness with signature.

### Transforming the transaction
HW wallets expect the transaction CBOR to be in *canonical* format (see CIP-0021). Unfortunately, cardano-cli sometimes produces tx files not compliant with CIP-0021. Use the following command to fix the formatting issues.
```
cardano-hw-cli transaction transform \
--tx-file tx.raw \
--out-file tx.transformed
```

### Signing the transaction
```sh
cardano-hw-cli transaction witness \
--tx-file tx.transformed \
--hw-signing-file payment.hwsfile \
--out-file payment.witness \
--mainnet
```

And now assembling:
```sh
cardano-cli transaction assemble \
--tx-body-file tx.transformed \
--witness-file payment.witness \
--out-file tx.signed
```

### Submitting the transaction
We now have the signed transaction ready and we can submit it to the blockchain:
```sh
cardano-cli transaction submit \
--tx-file tx.signed \
--mainnet
```
