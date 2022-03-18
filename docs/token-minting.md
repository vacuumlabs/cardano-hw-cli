# Token minting
Cardano offers a way to create native tokens on the blockchain. We recommend reading the guide [Discover native tokens](https://developers.cardano.org/docs/native-tokens/) before continuing.

## Creating a mint policy
Token minting and burning is controlled by a _monetary policy script_, i.e. a script which says who is eligible to mint and burn tokens.
In this guide we will create a policy which will require two signatures, one will be a public key derived on a hardware wallet, and one will be a public key created via `cardano-cli`.

### Public keys
To generate the public key on a hardware wallet a `1855H` path should be used as described in [CIP-1855](https://github.com/cardano-foundation/CIPs/blob/master/CIP-1855/CIP-1855.md):
```sh
cardano-hw-cli address key-gen \
--path 1855H/1815H/0H \
--verification-key-file mint-hw.vkey \
--hw-signing-file mint-hw.hwsfile
```

The second key for the purpose of this demo will be a `cardano-cli` generated one.
```sh
cardano-cli address key-gen \
--normal-key \
--verification-key-file mint-cli.vkey \
--signing-key-file mint-cli.skey
```

### Policy native script
With our keys generated we can create the policy native script:
```sh
cat >policy.script <<EOF
{
  "type": "all",
  "scripts": [
    {
      "type": "sig",
      "keyHash": "$(cardano-cli address key-hash --payment-verification-key-file mint-hw.vkey)"
    },
    {
      "type": "sig",
      "keyHash": "$(cardano-cli address key-hash --payment-verification-key-file mint-cli.vkey)"
    }
  ]
}
EOF
```

### Policy id
In the transaction we are about to compute we will also be using the hash of the native script, also called the policy id. To create it we can use this command:
```sh
cardano-hw-cli transaction policyid \
--script-file policy.script \
--hw-signing-file mint-hw.hwsfile >policyId
```
The `--hw-signing-file` argument is optional, but this will make the hardware wallet show you the path of the `keyHash` where the hash is identical with the one in the `.hwsfile`.

It is also possible to compute the hash with the regular `cardano-cli`:
```sh
cardano-cli transaction policyid --script-file policy.script
```

## Creating a transaction with token minting
*Note: This part of the guide assumes you already have some funded address from which you are going to make this transaction, located in a file named `payment.addr`.*

In this transaction we are going to mint `1000000` tokens named `C0in`. First, we need to encode the token name:
```sh
TOKEN_NAME=$(echo -n "C0in" | xxd -b -ps -c 80 | tr -d '\n')
```

### Querying the UTxO
First as with every transaction you need to query for the UTxO (substitute `--mainnet` for `--testnet-magic 1097911063` if you are using testnet):
```sh
cardano-cli query utxo \
--address $(cat payment.addr) \
--mainnet
```

Example return:
```
                           TxHash                                 TxIx        Amount
--------------------------------------------------------------------------------------
1626d02eac494bfbbf0b725ad617fca9fa9b6c9f5b6dcd5e62aa1f9cc3efe731     0        995124450 lovelace + TxOutDatumHashNone
```

### Drafting the transaction
Now we can draft the transaction:
```sh
cardano-cli transaction build-raw \
--alonzo-era \
--tx-in "1626d02eac494bfbbf0b725ad617fca9fa9b6c9f5b6dcd5e62aa1f9cc3efe731#0" \
--tx-out "$(cat payment.addr)"+0+"1000000 $(cat policyId).$TOKEN_NAME" \
--mint "1000000 $(cat policyId).$TOKEN_NAME" \
--minting-script-file policy.script \
--fee 0 \
--out-file tx.draft \
--cddl-format
```

### Calculating the fee
*Note: if you don't have a `protocol.json` file available you can obtain it with `cardano-cli`:*
```sh
cardano-cli query protocol-parameters \
--out-file protocol.json \
--mainnet
```

Then we can calculate the fee (substitute `--mainnet` for `--testnet-magic 1097911063` if you are using testnet):
```sh
cardano-cli transaction calculate-min-fee \
--tx-body-file tx.draft  \
--tx-in-count 1 \
--tx-out-count 1 \
--witness-count 3 \
--mainnet \
--protocol-params-file ./protocol.json
```
Example output:
```
200701 Lovelace
```
Note that our policy script is of type "all" and therefore requires to be signed with all the nested scripts. In this case it means it needs signatures from both the public keys, therefore we need 2 witnesses only for the policy script plus witnesses needed for the payment address (here we assumed the payment address is an ordinary one, but if it was multisig address it could require more signatures).

### Creating the unsigned transaction
Then we can calculate the output amount (input minus the fee) and create the unsigned transaction.
```sh
expr 995124450 - 200701
```
```sh
cardano-cli transaction build-raw \
--alonzo-era \
--tx-in "1626d02eac494bfbbf0b725ad617fca9fa9b6c9f5b6dcd5e62aa1f9cc3efe731#0" \
--tx-out "$(cat payment.addr)"+994923749+"1000000 $(cat policyId).$TOKEN_NAME" \
--mint "1000000 $(cat policyId).$TOKEN_NAME" \
--minting-script-file policy.script \
--fee 200701 \
--out-file tx.raw \
--cddl-format
```

### Transforming the unsigned transaction
HW wallets expect the transaction CBOR to be in *canonical* format (see CIP-0021). Unfortunately, cardano-cli sometimes produces tx files not compliant with CIP-0021. Use the following command to fix the formatting issues.
```
cardano-hw-cli transaction transform \
--tx-file tx.raw \
--out-file tx.transformed
```

### Signing the transaction
Now we can proceed to signing the transaction. Aside from the witness needed for the payment address, our transaction needs to be signed by the `cardano-cli` generated key and hardware wallet generated one:
```sh
cardano-cli transaction witness \
--tx-body-file tx.transformed \
--signing-key-file mint-cli.skey \
--out-file mint-cli.witness \
--mainnet

cardano-hw-cli transaction witness \
--tx-file tx.transformed \
--hw-signing-file mint-hw.hwsfile \
--out-file mint-hw.witness \
--mainnet
```
We should now have two witness files available: `mint-cli.witness` and `mint-hw.witness`. Together with any other witnesses we can assemble them together into a signed transaction:
```
cardano-cli transaction assemble \
--tx-body-file tx.transformed \
--witness-file payment.witness \
--witness-file mint-hw.witness \
--witness-file mint-cli.witness \
--out-file tx.signed
```
The `--witness-file payment.witness` is just an example, you might have more of other required witnesses or have them named differently.

### Submitting the transaction
We can now submit the signed transaction to the blockchain:
```sh
cardano-cli transaction submit \
--tx-file tx.signed \
--mainnet
```
