# Pool registration demo

This guide will walk you through registering a stake pool with a hardware wallet. Make sure you are well aware of [staking in Cardano](https://cardano.org/stake-pool-delegation) and [stake pool operations](https://docs.cardano.org/en/latest/getting-started/stake-pool-operators/index.html). Thorough documentation of how to register a staking pool in steps without a hardware wallet can be found [here](https://docs.cardano.org/projects/cardano-node/en/latest/stake-pool-operations/node_keys.html). It contains all the details, implications and explanations. We will reference it in further steps and give general overview of what is going on in each major step.

## Stake pool registration limitations

### As an owner

HW wallet supports signing of stake pool registration certificates when providing pool owner signatures. In the general case, the transaction may contain external inputs (e.g. belonging to the pool operator) and HW wallet is not able to verify whether they are actually external or not, so if we allowed signing the transaction with a spending key, there is the risk of losing funds from an input that the user did not intend to spend from. Moreover there is the risk of inadvertedly signing a withdrawal in the transaction if there's any. To mitigate those risks, HW wallet has special validation rules for stake pool registration transactions. The validation rules are the following:

1. The transaction must not contain any other certificates, not even another stake pool registration
2. The transaction must not contain any withdrawals
3. Exactly one owner should be passed as a staking path and the rest of owners should be passed as bech32-encoded reward addresses

### As an operator

Currently only Ledger supports signing and creating payment/pool witnesses.

## Create pool keys

These commands create stake pool keys - VRF, KES. The process is similar with the official documentation found [here](https://docs.cardano.org/projects/cardano-node/en/latest/stake-pool-operations/node_keys.html). All of these keys will be required for further steps and for running a block producing node, therefore keep them very secure and do not share them with anyone.

```
cardano-cli node key-gen-VRF \
--verification-key-file vrf.vkey \
--signing-key-file vrf.skey
```

```
cardano-cli node key-gen-KES \
--verification-key-file kes.vkey \
--signing-key-file kes.skey
```

The first difference is that we don't create `cold.skey` cold key file that usually holds private key, instead we are creating `cold.hwsfile` that contains only public key and mapping for Ledger:
```
cardano-hw-cli node key-gen \
--path 1853H/1815H/0H/0H \
--hw-signing-file cold.hwsfile \
--cold-verification-key-file cold.vkey \
--operational-certificate-issue-counter-file cold.counter
```
If you are using Trezor, this feature is not supported and you have to manage cold key by yourself the regular way.

## Calculate KES period

KES stands for Key Evolving Signature. It has limited validity and it expires after a fixed number of KES evolutions. Read more [here](https://docs.cardano.org/projects/cardano-node/en/latest/stake-pool-operations/KES_period.html).

```
cat mainnet-shelley-genesis.json | grep KES
```

```
cardano-cli query tip --mainnet
```

We acquire slots per KES period and current slot number from the former two commands. Next, divide the slot number by the KES period.

```
expr $slotNumber / $slotsPerKESPeriod
```

The result is the start of the KES validity period, i.e. which KES evolution period we are in. Use it in the following command in the field `--kes-period`. Note that after `slotsPerKESPeriod`*`maxKESEvolutions`, this key will become invalid. You will have to generate a new one and generate a new operational certificate with it.

## Issue operator certificate

This step creates an operational certificate. It is required for running the block producing node.

```
cardano-hw-cli node issue-op-cert \
--kes-verification-key-file kes.vkey \
--hw-signing-file cold.hwsfile \
--operational-certificate-issue-counter cold.counter \
--kes-period 99 \
--out-file node.cert
```

## Create owner signing key

```
cardano-hw-cli address key-gen \
--path 1852H/1815H/0H/2/0 \
--hw-signing-file owner-stake.hwsfile \
--verification-key-file owner-stake.vkey
```

should create `owner-stake.vkey` and `owner-stake.hwsfile` files. These files are the staking keys of your hardware wallet necessary for stake delegation and creating a witness of a stake pool registration where this hardware device is its owner.

## Create reward address

```
cardano-cli stake-address build \
--stake-verification-key-file owner-stake.vkey \
--out-file owner-stake.addr \
--mainnet
```

creates a reward address, where all the pool rewards will go. Pool operator must then manually distribute these rewards between all the pool owners, if there are multiple of them.

The staking key (`owner-stake.vkey`) can either be managed from cardano-cli or cardano-hw-cli, and of course, the corresponding CLI then should be used to sign the transaction to withdraw the respective rewards.

If you prefer, you can also manage your staking key/reward address from a UI-based wallet, e.g. Adalite, see this blog for a visual tutorial: https://adalite.medium.com/cardano-stake-pool-owners-hw-support-6d9278dba0ba

Also note that the reward address does not have to be witnessed when registering the stake pool, so you don't have to provide the corresponding staking signing key when registering the stake pool unless it's bound to an owner as well.

Make sure you understand the structure and limitations of the stake pool's metadata and the stake pool registration certificate described [here](https://docs.cardano.org/projects/cardano-node/en/latest/stake-pool-operations/register_stakepool.html). It is crucial in the following blocks of commands.

## Create operator keys and address
This can be same or different from owner. If you are both owner and operator you already have stake file.
```
cardano-hw-cli address key-gen \
--path 1852H/1815H/0H/2/0 \
--verification-key-file operator-stake.vkey \
--hw-signing-file operator-stake.hwsfile
```

```
cardano-hw-cli address key-gen \
--path 1852H/1815H/0H/0/0 \
--verification-key-file operator-payment.vkey \
--hw-signing-file operator-payment.hwsfile
```

Build operator payment address:
```
cardano-cli address build \
--payment-verification-key-file operator-payment.vkey \
--stake-verification-key-file operator-stake.vkey \
--out-file operator-payment.addr \
--mainnet
```

## Get metadata hash

After you have created a JSON file of your pool's metadata, host it on a url you own and get its metadata by executing

```
cardano-cli stake-pool metadata-hash \
--pool-metadata-file meta.json
```

The result will be used in the next step, as the `--metadata-hash` parameter.

## Create pool registration certificate

If there are multiple owners, specify all of their stake verification keys, e.g.

```
...
--pool-owner-stake-verification-key-file owner-stake1.vkey \
--pool-owner-stake-verification-key-file owner-stake2.vkey \
...
```

Double check every argument you pass to the following command. Any mistake will require creation of a new registration certificate.

```
cardano-cli stake-pool registration-certificate \
--cold-verification-key-file cold.vkey \
--vrf-verification-key-file vrf.vkey \
--pool-pledge 50000000000 \
--pool-cost 340000000 \
--pool-margin 0.03 \
--pool-reward-account-verification-key-file owner-stake.vkey \
--pool-owner-stake-verification-key-file owner-stake.vkey \
--mainnet \
--pool-relay-ipv4 54.228.75.154 \
--pool-relay-port 3000 \
--pool-relay-ipv4 54.228.75.155 \
--pool-relay-ipv6 24ff:7801:33a2:e383:a5c4:340a:07c2:76e5 \
--pool-relay-port 3000 \
--single-host-pool-relay aaaa.bbbb.com \
--pool-relay-port 3000 \
--multi-host-pool-relay aaaa.bbbc.com \
--metadata-url https://www.vacuumlabs.com/sampleUrl.json \
--metadata-hash 790be88f23c12ffa0fde8124814ceb97779fa45b1e0d654e52055e1d8cab53a0 \
--out-file pool-registration.cert
```

The file name you specify in `--out-file` will contain the pool registration certificate.

## Get the operator balance

```
cardano-cli query utxo \
--address $(cat operator-payment.addr) \
--mainnet \
--mary-era
```

Use the result as $operatorBalance in the next block.

## Draft the transaction and calculate fee

Create a draft of the transaction to calculate out its fee later:

```
cardano-cli transaction build-raw \
--tx-in 73aa1b60a8e32bae39a69b509e03f4b45f297817abb0e29d3eed92ece9dc1bbe#0 \
--tx-out $(cat operator-payment.addr)+0 \
--ttl 0 \
--fee 0 \
--out-file tx.draft \
--certificate-file pool-registration.cert \
--mary-era
```

Calculate the transaction fee:

```
cardano-cli transaction calculate-min-fee \
--tx-body-file tx.draft \
--tx-in-count 1 \
--tx-out-count 1 \
--mainnet \
--witness-count 1 \
--byron-witness-count 0 \
--protocol-params-file protocol.json
```

Example output: 194685

Registering a stake pool requires a deposit. This amount is specified in `protocol.json`. On mainnet, it is currently 500 ADA. Substract stake pool registration deposit and fee from the operators balance

```
expr $operatorBalance - 500000000 - 194685
```

= 8000000. This value is the change you get back after sending pool registration transaction.

## Build the tx

```
cardano-cli transaction build-raw \
--tx-in 73aa1b60a8e32bae39a69b509e03f4b45f297817abb0e29d3eed92ece9dc1bbe#0 \
--tx-out $(cat operator-payment.addr)+8000000 \
--ttl 15770560 \
--fee 194685 \
--out-file tx.raw \
--certificate-file pool-registration.cert \
--mary-era
```

## Create transaction witnesses

We use Ledger to create all witnesses:

```
## operator witness - Signed by pool operator (payer of pool deposit and fees), can but don't have to be also owner
## pool witness - signed by pool's cold key.
cardano-hw-cli transaction witness \
--tx-body-file tx.raw \
--hw-signing-file operator-payment.hwsfile \
--hw-signing-file cold.hwsfile \
--mainnet \
--out-file operator.witness \
--out-file pool.witness

## owner witness - One or multiple hardware wallet pool owners
cardano-hw-cli transaction witness \
--tx-body-file tx.raw \
--hw-signing-file owner-stake.hwsfile \
--mainnet \
--out-file owner.witness
```

In case operator is managing cold key without HW wallet, operator can use cardano-cli to create witnesses the regular way:
```
## operator witness - Signed by pool operator (payer of pool deposit and fees) 
cardano-cli shelley transaction witness \
--tx-body-file tx.raw \
--signing-key-file operator-payment.skey \
--mainnet \
--out-file operator.witness

## pool witness - signed by pool's cold key.
cardano-cli shelley transaction witness \
--tx-body-file tx.raw \
--signing-key-file cold.skey \
--mainnet \
--out-file pool.witness
```

## Create signed transaction 

Use witnesses from previous step to assemble the signed pool registration transaction

```
cardano-cli transaction assemble \
--tx-body-file tx.raw \
--witness-file operator.witness \
--witness-file pool.witness \
--witness-file owner.witness \
--out-file tx.signed
 ```

## Submit the tx

```
cardano-cli transaction submit --tx-file tx.signed --mainnet
```
