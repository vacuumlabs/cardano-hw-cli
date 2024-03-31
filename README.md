# Cardano HW cli tool

Cardano HW CLI tool for signing transaction

The command-line interface is based on the official [Cardano-CLI tool](https://docs.cardano.org/projects/cardano-node/en/latest/reference/cardano-node-cli-reference.html).

# Installation
Check:
- releases https://github.com/vacuumlabs/cardano-hw-cli/releases
- installation instructions https://github.com/vacuumlabs/cardano-hw-cli/blob/develop/docs/installation.md

# Usage
For running commands with ledger, you might need to use `sudo`

## Generate public verification key and hardware wallet signing file
```
cardano-hw-cli address key-gen
--path PATH                     Derivation path to the key we want to sign with.
--verification-key-file FILE    Output filepath of the verification key.
--hw-signing-file FILE          Output filepath of the hardware wallet signing file.
--derivation-type TYPE          Derivation type - currently applies only to Trezor. Options: LEDGER, ICARUS or ICARUS_TREZOR (default).
```
Arguments can be specified multiple times for bulk export.

## Generate public verification key
```
cardano-hw-cli key verification-key
--hw-signing-file FILE          Input filepath of the hardware wallet signing file.
--verification-key-file FILE    Output filepath of the verification key.
```

## Witness transaction
```
cardano-hw-cli transaction witness
--tx-file FILE                         Input filepath of the tx. Use --cddl-format when building transactions with cardano-cli.
--hw-signing-file FILE                 Input filepath of the hardware wallet signing file (one or more files can be specified).
--change-output-key-file FILE          Input filepath of the hardware wallet signing file (so hw cli can match the keys of the change address, if present, and let the device hide it).
--mainnet | --testnet-magic NATURAL    Use the mainnet magic id or specify testnet magic id.
--out-file FILE                        Output filepath of the witness (one or more witness files can be specified).
--derivation-type TYPE                 Derivation type - currently applies only to Trezor. Options: LEDGER, ICARUS or ICARUS_TREZOR (default).
```

## Validate transaction
Verifies whether the tx file complies with [restrictions](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0021/README.md) imposed by hardware wallets.
```
cardano-hw-cli transaction validate
--tx-file FILE                         Input filepath of the tx. Use --cddl-format when building transactions with cardano-cli.
```
Exit code meaning:
- `0` transaction complies with all restrictions
- `1` an error occurred (e.g. the transaction could not be parsed)
- `2` transaction contains validation errors that cannot be fixed automatically (e.g. too many tx inputs)
- `3` transaction contains validation errors that can be fixed by running `transaction transform` (e.g. non-canonical CBOR)

## Transform transaction
Tries to non-destructively transform the tx file, so that it complies with [restrictions](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0021/README.md) imposed by hardware wallets.
```
cardano-hw-cli transaction transform
--tx-file FILE                         Input filepath of the tx. Use --cddl-format when building transactions with cardano-cli.
--out-file FILE                        Output filepath of the tx.
```

## Show address on device
```
cardano-hw-cli address show
--payment-path PAYMENTPATH    Payment derivation path.
--staking-path STAKINGPATH    Stake derivation path.
--address-file ADDRESS        Input filepath of the address.
--derivation-type TYPE        Derivation type - currently applies only to Trezor. Options: LEDGER, ICARUS or ICARUS_TREZOR (default).
```

## Issue operational certificate
```
cardano-hw-cli node issue-op-cert
--kes-verification-key-file FILE                     Input filepath of the file with KES vkey.
--operational-certificate-issue-counter-file FILE    Input filepath of the file with certificate counter.
--kes-period UINT64                                  Kes period for the certificate.
--out-file FILE                                      Output filepath for node certificate.
--hw-signing-file FILE                               Input filepath of the hardware wallet signing file.
```

## CIP36 registration
```
cardano-hw-cli vote registration-metadata
--mainnet | --testnet-magic NATURAL    Use the mainnet magic id or specify testnet magic id.
--vote-public-key-jcli FILE            Input filepath to vote public key in ed25519extended format (one or more keys can be provided).
--vote-public-key-string BECH32STRING  Bech32-encoded vote public key (one or more keys can be provided).
--vote-public-key-hwsfile FILE         Input filepath to vote public key in hw-signing-file format (one or more keys can be provided).
--vote-public-key-file FILE            Input filepath to vote public key in cardano-cli file format (one or more keys can be provided).
--vote-weight WEIGHT                   Voting power weight assigned to vote public key.
--stake-signing-key FILE               Input filepath of the hardware wallet stake signing file, which will be used to to sign the registration.
--payment-address PAYMENTADDRESS       Address which will receive voting rewards.
--nonce NONCE                          Current slot number.
--voting-purpose VOTINGPURPOSE         Voting purpose (optional)
--payment-address-signing-key FILE     Input filepath of the payment address signing files.
--metadata-cbor-out-file FILE          Output filepath of metadata cbor.
--derivation-type TYPE                 Derivation type - currently applies only to Trezor. Options: LEDGER, ICARUS or ICARUS_TREZOR (default).
```

see [registration example](docs/cip36-registration-example.md)

## Message signing
```
--message MESSAGE_ASCII | --message-hex MESSAGE_HEX   Message to sign.
--signing-path-hwsfile FILE                           Input filepath of the hardware wallet signing file describing the key to be used to sign the message.
--hashed                                              If present, the message will be hashed; otherwise it will not be hashed.
--prefer-hex                                          If present, the message will be shown in hex even if it is valid ASCII.
--address ADDRESS                                     Address for the COSE header (if not given, signing key hash is used).
--address-hwsfile FILE                                Input filepath of an address hardware wallet signing file.
--out-file FILE                                       Output filepath.
--derivation-type TYPE                                Derivation type - currently applies only to Trezor. Options: LEDGER, ICARUS or ICARUS_TREZOR (default).
```

see [message signing example](docs/message-signing.md)

## Policy id generation
```
cardano-hw-cli transaction policyid
--script-file             Path to a native script file
--hw-signing-file         Input filepath of the hardware wallet signing file
--derivation-type TYPE    Derivation type - currently applies only to Trezor. Options: LEDGER, ICARUS or ICARUS_TREZOR (default).
```

see [Policy id](docs/token-minting.md#policy-id)

## Check app version
```
cardano-hw-cli version
```

## Check device version
```
cardano-hw-cli device version
```

# Examples/Guides
- [Basic transaction](docs/transaction-example.md)
- [Stake delegation](docs/delegation-example.md)
- [Catalyst/CIP36 registration](docs/cip36-registration-example.md)
- [Stake pool registration](docs/pool-registration.md)
- [Token minting](docs/token-minting.md)
- [Multisig transactions](docs/multisig-transactions.md)
- [Plutus transactions](docs/plutus-transactions.md)
- [Public keys bulk export](docs/public-keys-bulk-export-example.md)

# Running from source
Install node version v14.17.6
```
nvm i v14.17.6
```

Install yarn:
```
npm install -g yarn
```

Install dependencies:
```
yarn install
```

Run unit test
```
yarn test-unit
```

Run application with
```
yarn dev ...
```

# Building from source
Install node version v18.7.0
```
nvm i v18.7.0
```

Install yarn:
```
npm install -g yarn
```

To build all artifacts for each OS run:
```
yarn build
```

To target specific artifact, run one of following commands:
```
yarn build-linux-deb
yarn build-linux-tar
yarn build-linux-tar-arm64
yarn build-windows
yarn build-macos
```
