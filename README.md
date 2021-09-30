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
```
Arguments can be specified multiple times for bulk export.

## Generate public verification key
```
cardano-hw-cli key verification-key
--hw-signing-file FILE          Input filepath of the hardware wallet signing file.
--verification-key-file FILE    Output filepath of the verification key.
```

## Sign transaction
```
cardano-hw-cli transaction sign
--tx-body-file FILE                    Input filepath of the TxBody.
--hw-signing-file FILE                 Input filepath of the hardware wallet signing file (one or more).
--change-output-key-file FILE          Input filepath of the hardware wallet signing file (so hw cli can match the keys of the change address, if present, and let the device hide it).
--mainnet | --testnet-magic NATURAL    Use the mainnet magic id or specify testnet magic id.
--out-file FILE                        Output filepath of the Tx.
```

## Witness transaction
```
cardano-hw-cli transaction witness
--tx-body-file FILE                    Input filepath of the TxBody.
--hw-signing-file FILE                 Input filepath of the hardware wallet signing file.
--change-output-key-file FILE          Input filepath of the hardware wallet signing file (so hw cli can match the keys of the change address, if present, and let the device hide it).
--mainnet | --testnet-magic NATURAL    Use the mainnet magic id or specify testnet magic id.
--out-file FILE                        Output filepath of the Tx.
```

# Show address on device
```
cardano-hw-cli address show 
--payment-path PAYMENTPATH    Payment derivation path.
--staking-path STAKINGPATH    Stake derivation path.
--address-file ADDRESS        Input filepath of the address.
```

# Issue operational certificate
```
cardano-hw-cli node issue-op-cert
--kes-verification-key-file FILE                  Input filepath of the file with KES vkey.
--operational-certificate-issue-counter FILE      Input filepath of the file with certificate counter.
--kes-period UINT64                               Kes period for the certificate.
--out-file FILE                                   Output filepath for node certificate.
--hw-signing-file FILE                            Input filepath of the hardware wallet signing file.
```

# Catalyst voting registration
```
cardano-hw-cli catalyst voting-key-registration-metadata
--mainnet | --testnet-magic NATURAL    Use the mainnet magic id or specify testnet magic id.
--vote-public-key FILE                 Input filepath of vote public key in ed25519extended.
--stake-signing-key FILE               Input filepath of the hardware wallet stake signing file, which will be used to to sign the voting registration.
--reward-address REWARDADDRESS         Staking address which will receive voting rewards.
--nonce NONCE                          Current slot number.
--reward-address-signing-key FILE      Input filepath of the reward address signing files.
--metadata-cbor-out-file FILE          Output filepath of metadata cbor.
```

see [Catalyst voting registration example](docs/catalyst-voting-registration-example.md)

# Policy id generation
```
cardano-hw-cli transaction policyid
--script-file      Path to a native script file
--hw-signing-file  Input filepath of the hardware wallet signing file
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

## Examples/Guides
- [Basic transaction](docs/transaction-example.md)
- [Stake delegation](docs/delegation-example.md)
- [Catalyst voting registration](docs/catalyst-voting-registration-example.md)
- [Stake pool registration](docs/poolRegistration.md)
- [Public keys bulk export](docs/public-keys-bulk-export-example.md)

# Running from source
Install node version v12.16.2
```
nvm i v12.16.2
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
Install node version v12.16.2
```
nvm i v12.16.2
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
yarn build-windows
yarn build-macos
```
