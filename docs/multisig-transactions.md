# Multisig transactions
Cardano in the Shelley era supports creating multisig transactions, transactions containing multisig addresses and witnesses.

## Multisig address
Before we create the transaction itself we will create a multisig address first. We will create a payment native script and a stake native script from which we will then assemble the address. More information about native scripts can be found in the [CIP-1854](https://github.com/cardano-foundation/CIPs/blob/master/CIP-1854/CIP-1854.md).

### Public keys
To create a multisig address you need a payment native script and a stake native script. All public keys used inside the scripts need to be derived using the `1854H` paths.

#### Payment key
The derivation path is described in [CIP-1854](https://github.com/cardano-foundation/CIPs/blob/master/CIP-1854/CIP-1854.md), but it is similar to the `1852H` derivation path, but beginning with `1854H` instead. We can generate the payment key like this:
```sh
cardano-hw-cli address key-gen \
--path 1854H/1815H/0H/0/0 \
--verification-key-file payment-hw.vkey \
--hw-signing-file payment-hw.hwsfile
```

#### Stake key
The stake key has the role `2`, as is the case with `1852H` keys:
```sh
cardano-hw-cli address key-gen \
--path 1854H/1815H/0H/2/0 \
--verification-key-file stake.vkey \
--hw-signing-file stake.hwsfile
```

### Creating the native scripts

#### Payment script
The payment native script will be in this example an all script with two public key hashes. One public key will be the one we generated above on the hardware wallet. The second one we will generate using `cardano-cli`.
```sh
cardano-cli address key-gen \
--normal-key \
--verification-key-file payment-cli.vkey \
--signing-key-file payment-cli.skey

cat >payment.script <<EOF
{
  "type": "all",
  "scripts": [
    {
      "type": "sig",
      "keyHash": "$(cardano-cli address key-hash --payment-verification-key-file payment-hw.vkey)"
    },
    {
      "type": "sig",
      "keyHash": "$(cardano-cli address key-hash --payment-verification-key-file payment-cli.vkey)"
    }
  ]
}
EOF
```

#### Stake script
The stake native script will be a simple `sig` (pubkey hash) native script:
```sh
cat >stake.script <<EOF
{
  "type": "sig",
  "keyHash": "$(cardano-cli stake-address key-hash --stake-verification-key-file stake.vkey)"
}
EOF
```

You can read more about scripts [in the `cardano-node` docs](https://github.com/input-output-hk/cardano-node/blob/master/doc/reference/simple-scripts.md). Feel free to experiment with creating more complex scripts. This example is just a very simple demonstration.

### Create the address
Now you will want to create the payment address:
```sh
cardano-cli address build \
--payment-script-file payment.script \
--stake-script-file stake.script \
--out-file payment.addr \
--mainnet
```
Or you can swap `--mainnet` for `--testnet-magic 1097911063` if you want to create a testnet address.

## Creating the transaction
Now we have created a multisig address and we are able to continue with creating a simple transaction. We will assume you have already send some funds to your newly created address (for testnet addresses you can use the [Faucet](https://testnets.cardano.org/en/testnets/cardano/tools/faucet/)).

### Querying the UTxO
First we need to query for the UTxO:
```sh
cardano-cli query utxo \
--address $(cat payment.addr) \
--mainnet
```

Example return:
```
                           TxHash                                 TxIx        Amount
--------------------------------------------------------------------------------------
94461e17271b4a108f679eb7b6947aea29573296a5edca635d583fb40785e05d     0        1000000000 lovelace + TxOutDatumHashNone
```

### Drafting the transaction
```sh
cardano-cli transaction build-raw \
--mary-era \
--tx-in "94461e17271b4a108f679eb7b6947aea29573296a5edca635d583fb40785e05d#0" \
--tx-in-script-file payment.script \
--tx-out "$(cat payment.addr)"+0 \
--fee 0 \
--out-file tx.draft
```

### Calculating the fee
*Note: if you don't have a `protocol.json` file available you obtain it with `cardano-cli`:*
```sh
cardano-cli query protocol-parameters \
--out-file protocol.json \
--testnet-magic 1097911063
```

Then we can calculate the fee:
```sh
cardano-cli transaction calculate-min-fee \
--tx-body-file tx.draft  \
--tx-in-count 1 \
--tx-out-count 1 \
--witness-count 2 \
--mainnet \
--protocol-params-file ./protocol.json
```
Example output:
```
194654 Lovelace
```
Note that an ordinary transaction looking like this would most likely require one signature. However, our payment part is defined with a script that requires two signatures. Therefore, we need two witnesses for this transaction.

### Creating the unsigned transaction
Now we can calculate the output amount (input minus the fee) and create the unsigned transaction.
```sh
expr 1000000000 - 194654
```
```sh
cardano-cli transaction build-raw \
--mary-era \
--tx-in "94461e17271b4a108f679eb7b6947aea29573296a5edca635d583fb40785e05d#0" \
--tx-in-script-file payment.script \
--tx-out "$(cat payment.addr)"+999805346 \
--fee 194654 \
--out-file tx.raw
```
At this point, the native script is present in the transaction witness set - now we only need to add the witnesses with signatures.

### Signing the transaction
Because we need two witnesses, one from the key from hardware wallet and one from the key from `cardano-cli`, we will create them separately and afterwards assemble them together to create a signed transaction.
```sh
cardano-hw-cli transaction witness \
--tx-body-file tx.raw \
--hw-signing-file payment-hw.hwsfile \
--out-file payment-hw.witness \
--mainnet

cardano-cli transaction witness \
--tx-body-file tx.raw \
--signing-key-file payment-cli.skey \
--out-file payment-cli.witness \
--mainnet
```
And now assembling:
```sh
cardano-cli transaction assemble \
--tx-body-file tx.raw \
--witness-file payment-hw.witness \
--witness-file payment-cli.witness \
--out-file tx.signed
```

### Submitting the transaction
We now have the signed transaction ready and we can submit to blockchain:
```sh
cardano-cli transaction submit \
--tx-file tx.signed \
--mainnet
```
