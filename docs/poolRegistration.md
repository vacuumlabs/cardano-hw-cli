# Pool registration demo

This guide will walk you through registering a stake pool with a hardware wallet. Make sure you are well aware of [staking in Cardano](https://cardano.org/stake-pool-delegation) and [stake pool operations](https://docs.cardano.org/en/latest/getting-started/stake-pool-operators/index.html). Thorough documentation of how to register a staking pool in steps without a hardware wallet can be found [here](https://docs.cardano.org/projects/cardano-node/en/latest/stake-pool-operations/node_keys.html). It contains all the details, implications and explanations. We will reference it in further steps and give general overview of what is going on in each major step.

## Create pool keys

These commands create stake pool keys - cold, VRF, KES. The process is identical with the official documentation found [here](https://docs.cardano.org/projects/cardano-node/en/latest/stake-pool-operations/node_keys.html). All of these keys will be required for further steps and for running a block producing node, therefore keep them very secure and do not share them with anyone.

```
cardano-cli shelley node key-gen \
--cold-verification-key-file cold.vkey \
--cold-signing-key-file cold.skey \
--operational-certificate-issue-counter-file cold.counter
```

```
cardano-cli shelley node key-gen-VRF \
--verification-key-file vrf.vkey \
--signing-key-file vrf.skey

```

```
cardano-cli shelley node key-gen-KES \
--verification-key-file kes.vkey \
--signing-key-file kes.skey

```

## Calculate KES period

KES stands for Key Evolving Signature. It has limited validity and it expires after a fixed number of KES evolutions. Read more [here](https://docs.cardano.org/projects/cardano-node/en/latest/stake-pool-operations/KES_period.html).

```
cat mainnet-shelley-genesis.json | grep KES
```

```
cardano-cli shelley query tip --mainnet
```

We acquire slots per KES period and current slot number from the former two commands. Next, divide the slot number by the KES period.

```
expr $slotNumber / $slotsPerKESPeriod
```

The result is the start of the KES validity period, i.e. which KES evolution period we are in. Use it in the following command in the field `--kes-period`. Note that after `slotsPerKESPeriod`*`maxKESEvolutions`, this key will become invalid. You will have to generate a new one and generate a new operational certificate with it.

## Issue operator certificate

This step creates an operational certificate. It is required for running the block producing node.

```
cardano-cli shelley node issue-op-cert \
--kes-verification-key-file kes.vkey \
--cold-signing-key-file cold.skey \
--operational-certificate-issue-counter cold.counter \
--kes-period 99 \
--out-file node.cert
```

## Create owner signing key

```
sudo cardano-hw-cli shelley address key-gen \
--path 1852H/1815H/0H/2/0 \
--hw-signing-file stake.hwsfile \
--verification-key-file stake.vkey
```

should create `stake.vkey` and `stake.hwsfile` files. These files are the staking keys of your hardware wallet necessary for stake delegation and creating a witness of a stake pool registration where this hardware device is its owner.

## Create reward address

```
cardano-cli shelley stake-address build \
--stake-verification-key-file stake.vkey \
--out-file stake.addr \
--mainnet
```

creates a reward address, where all the pool rewards will go. Pool operator must then manually distribute these rewards between all the pool owners, if there are multiple of them.

The staking key (`stake.vkey`) can either be managed from cardano-cli or cardano-hw-cli, and of course, the corresponding CLI then should be used to sign the transaction to withdraw the respective rewards. Also note that the reward address does not have to be witnessed when registering the stake pool, so you don't have to provide the corresponding staking signing key when registering the stake pool unless it's bound to an owner as well.

Make sure you understand the structure and limitations of the stake pool's metadata and the stake pool registration certificate described [here](https://docs.cardano.org/projects/cardano-node/en/latest/stake-pool-operations/register_stakepool.html). It is crucial in the following blocks of commands.

## Get metadata hash

After you have created a JSON file of your pool's metadata, host it on a url you own and get its metadata by executing

```
cardano-cli shelley stake-pool metadata-hash \
--pool-metadata-file meta.json
```

The result will be used in the next step, as the `--metadata-hash` parameter.

## Create pool registration certificate

If there are multiple owners, specify all of their stake verification keys, e.g.

```
...
--pool-owner-stake-verification-key-file stake1.vkey \
--pool-owner-stake-verification-key-file stake2.vkey \
...
```

Double check every argument you pass to the following command. Any mistake will require creation of a new registration certificate.

```
cardano-cli shelley stake-pool registration-certificate \
--cold-verification-key-file cold.vkey \
--vrf-verification-key-file vrf.vkey \
--pool-pledge 50000000000 \
--pool-cost 340000000 \
--pool-margin 0.03 \
--pool-reward-account-verification-key-file stake.vkey \
--pool-owner-stake-verification-key-file stake.vkey \
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
cardano-cli shelley query utxo \
--address $(cat operator/payment.addr) \
--mainnet
```

Use the result as $operatorBalance in the next block.

## Draft the transaction and calculate fee

Create a draft of the transaction to calculate out its fee later:

```
cardano-cli shelley transaction build-raw \
--tx-in 73aa1b60a8e32bae39a69b509e03f4b45f297817abb0e29d3eed92ece9dc1bbe#0 \
--tx-out $(cat operator/payment.addr)+0 \
--ttl 0 \
--fee 0 \
--out-file tx.draft \
--certificate-file pool-registration.cert
```

Calculate the transaction fee:

```
cardano-cli shelley transaction calculate-min-fee \
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
cardano-cli shelley transaction build-raw \
--tx-in 73aa1b60a8e32bae39a69b509e03f4b45f297817abb0e29d3eed92ece9dc1bbe#0 \
--tx-out $(cat operator/payment.addr)+8000000 \
--ttl 15770560 \
--fee 194685 \
--out-file tx.raw \
--certificate-file pool-registration.cert
```

## Create transaction witnesses

This includes creating witnesses with the operator, pool and for all included pool owners. Only pool owners can provide their witness from a hardware wallet. Pool keys and spending keys must be managed by cardano-cli.

```
## operator witness - Signed by pool operator (payer of pool deposit and fees) 
cardano-cli shelley transaction witness \
--tx-body-file tx.raw \
--signing-key-file operator/payment.skey \
--mainnet \
--out-file operator.witness

## pool witness - signed by pool's cold key.
cardano-cli shelley transaction witness \
--tx-body-file tx.raw \
--signing-key-file cold.skey \
--mainnet \
--out-file pool.witness

## owner witness - One or multiple hardware wallet pool owners
sudo cardano-hw-cli shelley transaction witness \
--tx-body-file tx.raw \
--hw-signing-file stake.hwsfile \
--mainnet \
--out-file owner.witness
```

## Create signed transaction 

Use witnesses from previous step to assemble the signed pool registration transaction

```
cardano-cli shelley transaction assemble \
--tx-body-file tx.raw \
--witness-file operator.witness \
--witness-file pool.witness \
--witness-file owner.witness \
--out-file tx.signed
 ```

## Submit the tx

```
cardano-cli shelley transaction submit --tx-file tx.signed --mainnet
```

