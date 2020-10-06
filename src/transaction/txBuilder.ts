import { parseUnsignedTx } from './txParser'
import {
  TxWitnessByron,
  TxWitnessShelley,
  UnsignedTxDecoded,
  UnsignedTxCborHex,
  SignedTxCborHex,
  SignedTxDecoded,
  TxWitnessKeys,
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

function TxAux(unsignedTxCborHex: UnsignedTxCborHex) {
  const unsignedTxDecoded:UnsignedTxDecoded = cbor.decode(unsignedTxCborHex)
  const parsedTx = parseUnsignedTx(unsignedTxDecoded)

  function getId(): string {
    const [txBody] = unsignedTxDecoded
    const encodedTxBody = cbor.encode([txBody])
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
  unsignedTxDecoded: UnsignedTxDecoded,
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

function TxWitness(signedTxCborHex: SignedTxCborHex) {
  const [, witnesses]: SignedTxDecoded = cbor.decode(signedTxCborHex)
  // there can be only one witness since only one signing file was passed
  const [type, [witness]] = Array.from(witnesses)[0]
  return {
    type,
    witness,
  }
}

export {
  TxByronWitness,
  TxShelleyWitness,
  TxAux,
  TxSigned,
  TxWitness,
}
