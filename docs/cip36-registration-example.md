# CIP-36 registration example

## Requirements

CIP-36 support:
* on Ledger, Cardano app version 6.0.2 and above
* on Trezor, firmware 2.5.3 and above

## Create CIP36 vote keys

You may want to keep your vote keys stored on a Ledger Nano hardware device (the key derivation schema is described in [CIP-36](https://cips.cardano.org/cips/cip36/)). Consequently, you will have to sign all voting on the HW device storing the keys. For Trezor, this is not supported.

It is possible to register and use keys generated in other ways, e.g. as follows:
```
wget https://github.com/input-output-hk/jormungandr/releases/download/v0.9.3/jormungandr-0.9.3-x86_64-unknown-linux-gnu-generic.tar.gz
tar -xf jormungandr-0.9.3-x86_64-unknown-linux-gnu-generic.tar.gz
./jcli key generate --type ed25519extended > catalyst-vote.skey
./jcli key to-public < catalyst-vote.skey > catalyst-vote.pkey
```

## Create CIP36 registration metadata

Generate hardware wallet signing files and verification key files with `cardano-hw-cli`:
```
cardano-hw-cli address key-gen \
--path 1852H/1815H/0H/2/0 \
--verification-key-file stake.vkey \
--hw-signing-file stake.hwsfile

cardano-hw-cli address key-gen \
--path 1852H/1815H/0H/0/0 \
--verification-key-file payment.vkey \
--hw-signing-file payment.hwsfile
```

Get slot number from `cardano-cli`, use slot number as `nonce` in CIP36 registration command:
```
cardano-cli query tip --mainnet
```

Get payment address from `cardano-cli`, use it as `payment-address` and `payment-address-signing-key-hwsfile` in CIP36 registration command:
```
cardano-cli address build \
--payment-verification-key-file payment.vkey \
--stake-verification-key-file stake.vkey \
--out-file payment.addr \
--mainnet
```

Create CIP36 registration metadata with `cardano-hw-cli`:
```
cardano-hw-cli vote registration-metadata \
--mainnet \
--vote-public-key-file catalyst-vote.pkey \
--payment-address $(cat payment.addr) \
--stake-signing-key-hwsfile stake.hwsfile \
--nonce 29747977 \
--payment-address-signing-key-hwsfile payment.hwsfile \
--metadata-cbor-out-file cip36_registration.cbor
```
(You should add `--voting-purpose` to change the voting purpose to something other than Catalyst.)

Alternatively, in case you want to split your voting power among several vote keys, the keys and their voting power weights can be specified like this:
```
cardano-hw-cli vote registration-metadata \
--mainnet \
--vote-public-key-file catalyst-vote1.pkey \
--vote-weight 1 \
--vote-public-key-file catalyst-vote2.pkey \
--vote-weight 10 \
--payment-address $(cat stake.addr) \
--stake-signing-key-hwsfile stake.hwsfile \
--nonce 29747977 \
--payment-address-signing-key-hwsfile stake.hwsfile \
--metadata-cbor-out-file cip36_registration.cbor
```

Note: The registration auxiliary data are formatted according to [CIP-36](https://cips.cardano.org/cips/cip36/).

## Create and submit transaction
Create raw transaction with `cardano-cli`, if you don't know how to create simple transaction, check https://github.com/vacuumlabs/cardano-hw-cli/blob/develop/docs/transaction-example.md
```
cardano-cli transaction build-raw \
--alonzo-era \
--tx-in "270eb90adfb4634fb7e7356dab9a36d1d6c6763e03629ead2e64b59f70217c75#0" \
--tx-out addr1q9nz9shd0wh6uevtnr5j4epyqxtwx6953wegv7pfdttr9hzfn5kc55752ehrcspld7ucc0zt8502efdaac4nlajgagasayc3u9+1810000 \
--fee 190000 \
--metadata-cbor-file cip36_registration.cbor \
--out-file tx.raw \
--cddl-format
```

HW wallets expect the transaction CBOR to be in *canonical* format (see CIP-0021). Unfortunately, cardano-cli sometimes produces tx files not compliant with CIP-0021. Use the following command to fix the formatting issues.
```
cardano-hw-cli transaction transform \
--tx-file tx.raw \
--out-file tx.transformed
```

Witness the transaction with `cardano-hw-cli` (we assume that `payment.hwsfile` belongs to the address that controls the transaction inputs):
```
cardano-hw-cli transaction witness \
--tx-file tx.transformed \
--hw-signing-file payment.hwsfile \
--mainnet \
--out-file payment.witness
```

Assemble the transaction with with `cardano-cli`:
```
cardano-cli transaction assemble \
--tx-body-file tx.transformed \
--witness-file payment.witness \
--out-file tx.signed
```

Submit transaction to blockchain with with `cardano-cli`:
```
cardano-cli transaction submit \
--tx-file tx.signed \
--mainnet
```
