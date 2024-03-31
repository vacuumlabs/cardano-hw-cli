# Message signing example

This example demonstrates how to sign a message. See [CIP-8](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0008/README.md) for more information.

## Requirements

Message signing support:
<!-- TODO update versions -->
* on Ledger, Cardano app version TBD and above
* on Trezor, firmware TBD and above

## Sign a message

If you want to use an address in the `address` header field, prepare the address file. In this example, we will use the address file `payment.addr` (generated like in the [transaction example guide](./transaction-example.md)). If you leave out the `--address` argument, the signing key hash will be used in the `address` header field instead.

```
cardano-hw-cli message sign \
  --message "hello world" \
  --signing-path-hwsfile payment.hwsfile \
  --address $(cat payment.addr) \
  --address-hwsfile payment.hwsfile \
  --address-hwsfile stake.hwsfile \
  --out-file msg.out
```

You can use `--message` or `--message-hex` to specify the message to sign in ASCII or hex format, respectively. If you add `--prefer-hex`, the message will be shown in hex on HW wallet screen even if it is valid ASCII.

If you add `--hashed`, the message will be hashed before signing.

If successful, the command should save output data to the `msg.out` file.
