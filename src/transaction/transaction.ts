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

const cbor = require('borc')
const { blake2b } = require('cardano-crypto.js')

function TxByronWitness(
  publicKey: Buffer, signature: Buffer, chaincode: Buffer, addressAttributes: object,
): TxWitnessByron {
  return [publicKey, signature, chaincode, cbor.encode(addressAttributes)]
}

function TxShelleyWitness(publicKey: Buffer, signature: Buffer): TxWitnessShelley {
  return [publicKey, signature]
}

function TxAux(unsignedTxCborHex: UnsignedTxCborHex): _TxAux {
  const unsignedTxDecoded:_UnsignedTxDecoded = cbor.decode(unsignedTxCborHex)
  const parsedTx = parseUnsignedTx(unsignedTxDecoded)

  function getId(): string {
    const [txBody] = unsignedTxDecoded
    const encodedTxBody = cbor.encode(txBody)
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

function TxSigned(
  unsignedTxDecoded: _UnsignedTxDecoded,
  byronWitnesses: TxWitnessByron[],
  shelleyWitnesses: TxWitnessShelley[],
): SignedTxCborHex {
  const [txBody, meta] = unsignedTxDecoded
  const witnesses = new Map()
  if (shelleyWitnesses.length > 0) {
    witnesses.set(TxWitnessKeys.SHELLEY, shelleyWitnesses)
  }
  if (byronWitnesses.length > 0) {
    witnesses.set(TxWitnessKeys.BYRON, byronWitnesses)
  }
  return cbor.encode([txBody, witnesses, meta]).toString('hex')
}

function Witness(signedTxCborHex: SignedTxCborHex): _ShelleyWitness | _ByronWitness {
  const [, witnesses]: _SignedTxDecoded = cbor.decode(signedTxCborHex)
  // there can be only one witness since only one signing file was passed
  const [key, [data]] = Array.from(witnesses)[0]
  return {
    key,
    data,
  } as _ShelleyWitness | _ByronWitness
}

function XPubKey(xPubKeyCborHex: XPubKeyCborHex): _XPubKey {
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
