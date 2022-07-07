# Plutus transactions in Babbage era
Plutus scripts have been supported since the Alonzo era - see Plutus transactions docs for more details. In Babbage era some changes have been made to the way Plutus transactions can be built. For more information see [this post on IOHK blog](https://iohk.io/en/blog/posts/2022/07/04/cardano-s-approaching-vasil-upgrade-what-to-expect/) or [the Babbage CDDL spec](https://github.com/input-output-hk/cardano-ledger/blob/master/eras/babbage/test-suite/cddl-files/babbage.cddl).

## Script address
In Babbage we need a script address as well. However, to use the new Babbage features we need a Plutus V2 script - you can use [the V2 version of the script used in our Plutus docs](./data/datum-equals-redeemer-v2.plutus).

```sh
cardano-cli address build \
--payment-script-file datum-equals-redeemer-v2.plutus \
--out-file script.addr \
--mainnet
```

### Fund the script address
Send some funds to the script address. The steps are the same as in the [Plutus tutorial](./plutus-transaction.md), the only difference is that we will use an `inline_datum` and a `reference_script`.

```sh
cardano-cli transaction build-raw \
...
--tx-out $(cat script.addr)+0 \
--tx-out-inline-datum-value '"chocolate"' \
--tx-out $(cat payment.addr)+2000000 \
--tx-out-reference-script-file datum-equals-redeemer-v2.plutus \
...
```

### The steps we need to take before creating the transaction are the same as in the [Plutus tutorial](./plutus-transaction.md) so we won't repeat them here. We do however skip the transaction drafting and fee calculating steps.

### Creating the unsigned transaction
```sh
cardano-cli transaction build-raw \
--babbage-era \
--tx-in "1789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8#0" \
--spending-tx-in-reference "1789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8#1" \
--spending-plutus-script-v2 \
--spending-reference-tx-in-inline-datum-present \
--spending-reference-tx-in-redeemer-value '"chocolate"' \
--spending-reference-tx-in-execution-units "(2000000, 6000)" \
--tx-in-collateral "1789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8#1" \
--tx-out-return-collateral $(cat payment.addr)+23000000 \
--tx-out "$(cat payment.addr)"+0 \
--required-signer-hash $(cardano-cli address key-hash --payment-verification-key-file payment.vkey) \
--fee 4000000 \
--tx-total-collateral 8000000 \
--protocol-params-file protocol.json \
--out-file tx.draft \
--cddl-format
```
Note that your Plutus script may require different execution units.

### The steps for submitting the transaction are the same as in the [Plutus tutorial](./plutus-transaction.md) so we won't repeat them here.