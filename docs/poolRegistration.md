# Pool registration demo

## Create pool keys

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

## Calculate kes period

```
cat mainnet-shelley-genesis.json | grep KESPeriod
```

```
cardano-cli shelley query tip --mainnet
```

```
expr $slotNumber / $kesPeriod
```

## Issue operator certificate

```
cardano-cli shelley node issue-op-cert \
--kes-verification-key-file kes.vkey \
--cold-signing-key-file cold.skey \
--operational-certificate-issue-counter cold.counter \
--kes-period 99 \
--out-file node.cert
```

## Get metadata hash

```
cardano-cli shelley stake-pool metadata-hash \
--pool-metadata-file meta.json
```

## Create owner  signing key

```
sudo cardano-hw-cli shelley address key-gen \
--path 1852H/1815H/0H/2/0 \
--hw-signing-file stake.hwsfile \
--verification-key-file stake.vkey
```

## Create reward address

```
cardano-cli shelley stake-address build \
--stake-verification-key-file stake.vkey \
--out-file stake.addr \
--mainnet
```

## Create pool registration certificate

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

## Get the operator balance

```
cardano-cli shelley query utxo \
--address $(cat operator/payment.addr) \
--mainnet
```

## Calculate fee

Substract deposit and fee from the operators balance

```
expr $operatorBalance - 500000000 - 2000000
```

= 8000000

## Build the tx

```
cardano-cli shelley transaction build-raw \
--tx-in 73aa1b60a8e32bae39a69b509e03f4b45f297817abb0e29d3eed92ece9dc1bbe#0 \
--tx-out $(cat operator/payment.addr)+8000000 \
--ttl 15770560 \
--fee 2000000 \
--out-file tx.raw \
--certificate-file pool-registration.cert
```

## Sign the transaction

This includes creating witnesses with the operator, pool and for all included pool owners

```
## operator witness
cardano-cli shelley transaction witness \
--tx-body-file tx.raw \
--signing-key-file operator/payment.skey \
--mainnet \
--out-file operator.witness

## pool witness
cardano-cli shelley transaction witness \
--tx-body-file tx.raw \
--signing-key-file cold.skey \
--mainnet \
--out-file pool.witness

## owner witness
sudo cardano-hw-cli shelley transaction witness \
--tx-body-file tx.raw \
--hw-signing-file stake.hwsfile \
--mainnet \
--out-file owner.witness
```

## Create signed transaction 

 ```
cardano-cli shelley transaction sign-witness \
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

