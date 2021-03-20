import { parseUnsignedTx } from './txParser'
import {
  TxWitnessByron,
  TxWitnessShelley,
  _UnsignedTxDecoded,
  UnsignedTxCborHex,
  SignedTxCborHex,
  _SignedTxDecoded,
  TxWitnessKeys,
  _TxAux,
  _ShelleyWitness,
  _ByronWitness,
  XPubKeyCborHex,
  _XPubKey,
} from './types'
import { isUnsignedTxDecoded } from './guards'
import { Errors } from '../errors'

const cbor = require('borc')
const { blake2b } = require('cardano-crypto.js')

// eslint-disable-next-line import/no-extraneous-dependencies
const { BigNumber } = require('bignumber.js')

const encodeBigNum = (gen: any, object: any) => {
  const bigNumHex = object.toString(16).padStart(16, '0')
  const bigNumBuff = Buffer.from(`1b${bigNumHex}`, 'hex')
  return gen.push(bigNumBuff)
}

const encoder = new cbor.Encoder({
  genTypes: [
    [BigNumber, encodeBigNum],
  ],
})

const encode = (data: any) => encoder.finalize(encoder.pushAny(data))

const TxByronWitness = (
  publicKey: Buffer, signature: Buffer, chaincode: Buffer, addressAttributes: object,
): TxWitnessByron => [publicKey, signature, chaincode, cbor.encode(addressAttributes)]

const TxShelleyWitness = (publicKey: Buffer, signature: Buffer): TxWitnessShelley => [publicKey, signature]

const TxAux = (unsignedTxCborHex: UnsignedTxCborHex): _TxAux => {
  const unsignedTxDecoded = cbor.decode(unsignedTxCborHex)
  if (!isUnsignedTxDecoded(unsignedTxDecoded)) {
    throw Error(Errors.InvalidTransactionBody)
  } else {
    const parsedTx = parseUnsignedTx(unsignedTxDecoded)

    const getId = (): string => {
      const [txBody] = unsignedTxDecoded
      const encodedTxBody = encode(txBody)
      return blake2b(
        encodedTxBody,
        32,
      ).toString('hex')
    }

    return {
      getId,
      unsignedTxDecoded,
      ...parsedTx,
    }
  }
}

const TxSigned = (
  unsignedTxDecoded: _UnsignedTxDecoded,
  byronWitnesses: TxWitnessByron[],
  shelleyWitnesses: TxWitnessShelley[],
): SignedTxCborHex => {
  const [txBody, meta] = unsignedTxDecoded
  const witnesses = new Map()
  if (shelleyWitnesses.length > 0) {
    witnesses.set(TxWitnessKeys.SHELLEY, shelleyWitnesses)
  }
  if (byronWitnesses.length > 0) {
    witnesses.set(TxWitnessKeys.BYRON, byronWitnesses)
  }
  return encode([txBody, witnesses, meta]).toString('hex')
}

const Witness = (signedTxCborHex: SignedTxCborHex): _ShelleyWitness | _ByronWitness => {
  const [, witnesses]: _SignedTxDecoded = cbor.decode(signedTxCborHex)
  // there can be only one witness since only one signing file was passed
  const [key, [data]] = Array.from(witnesses)[0]
  return {
    key,
    data,
  } as _ShelleyWitness | _ByronWitness
}

// TODO why is this in transaction.ts?
const XPubKey = (xPubKeyCborHex: XPubKeyCborHex): _XPubKey => {
  const xPubKeyDecoded = cbor.decode(xPubKeyCborHex)
  const pubKey = xPubKeyDecoded.slice(0, 32)
  const chainCode = xPubKeyDecoded.slice(32, 64)
  return { pubKey, chainCode }
}

export {
  TxByronWitness,
  TxShelleyWitness,
  TxAux,
  TxSigned,
  Witness,
  XPubKey,
}
