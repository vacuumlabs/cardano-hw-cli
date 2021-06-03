# Requirements
Ledger users: Cardano Ledger app versions 2.3.1 and higher is needed in order to register your vote. In order to install app 2.3.1 you need Ledger firmware 2.0.0 or higher. Both these updates can be done in Ledger Live > Manager section. If you don't see the option to update the firmware to 2.0.0, please re-install Ledger Live.

# Create catalyst voting keys
To get private/public voting key you must use another tool, you can use jcli to generate your private/public voting key:
```
wget https://github.com/input-output-hk/jormungandr/releases/download/v0.9.3/jormungandr-0.9.3-x86_64-unknown-linux-gnu-generic.tar.gz
tar -xf jormungandr-0.9.3-x86_64-unknown-linux-gnu-generic.tar.gz
./jcli key generate --type ed25519extended > catalyst-vote.skey
./jcli key to-public < catalyst-vote.skey > catalyst-vote.pkey
```

# Create catalyst voting registration metadata
Generate stake hardware wallet signing file and verification file with `cardano-hw-cli`:
```
cardano-hw-cli address key-gen \
--path 1852H/1815H/0H/2/0 \
--verification-key-file stake.vkey \
--hw-signing-file stake.hwsfile
```

Get slot number from `cardano-cli`, use slot number as `nonce` in catalyst voting registration command:
```
cardano-cli query tip --mainnet
```

Get stake address from `cardano-cli`, use it as `reward-address` and `reward-address-signing-key` in catalyst voting registration command:
```
cardano-cli stake-address build \
--stake-verification-key-file stake.vkey \
--out-file stake.addr \
--mainnet
```

Create catalyst voting registration metadata with `cardano-hw-cli`:
```
cardano-hw-cli catalyst voting-key-registration-metadata \
--mainnet \
--vote-public-key catalyst-vote.pkey \
--reward-address stake1u9ye6tv22029vm3ugqlklwvv839n684v5k77u2el7eyw5wclw09wl \
--stake-signing-key stake.hwsfile \
--nonce 29747977 \
--reward-address-signing-key stake.hwsfile \
--metadata-cbor-out-file voting_registration.cbor
```

# Create and submit transaction
Create raw transaction with `cardano-cli`, if you don't know how to create simple transaction, check https://github.com/vacuumlabs/cardano-hw-cli/blob/develop/docs/transaction-example.md
```
cardano-cli transaction build-raw \
--mary-era \
--tx-in 270eb90adfb4634fb7e7356dab9a36d1d6c6763e03629ead2e64b59f70217c75#0 \
--tx-out addr1q9nz9shd0wh6uevtnr5j4epyqxtwx6953wegv7pfdttr9hzfn5kc55752ehrcspld7ucc0zt8502efdaac4nlajgagasayc3u9+1810000 \
--fee 190000 \
--metadata-cbor-file voting_registration.cbor \
--out-file tx.raw
```

Create payment hwsfile with `cardano-hw-cli`:
```
cardano-hw-cli address key-gen \
--path 1852H/1815H/0H/0/0 \
--verification-key-file payment.vkey \
--hw-signing-file payment.hwsfile
```

Sign raw transaction with `cardano-hw-cli`:
```
cardano-hw-cli transaction sign \
--tx-body-file tx.raw \
--hw-signing-file payment.hwsfile \
--mainnet \
--out-file tx.signed
```

Submit transaction to blockchain with with `cardano-cli`:
```
cardano-cli transaction submit \
--tx-file tx.signed \
--mainnet
```