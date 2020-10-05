import { parseUnsignedTx, parseTxWitnesses } from './txParser'
import {
  TxWitnessByron,
  TxWitnessShelley,
  UnsignedTxDecoded,
  UnsignedTxCborHex,
  SignedTxCborHex,
  SignedTxDecoded,
  TxKeys,
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
    witnesses.set(TxKeys.SHELLEY_WITNESSESS, shelleyWitnesses)
  }
  if (byronWitnesses.length > 0) {
    witnesses.set(TxKeys.BYRON_WITNESSES, byronWitnesses)
  }
  return cbor.encode([txBody, witnesses, meta]).toString('hex')
}

function TxWitnesses(signedTxCborHex: SignedTxCborHex) {
  const signedTxDecoded: SignedTxDecoded = cbor.decode(signedTxCborHex)
  const {
    shelleyWitnesses,
    byronWitnesses,
  } = parseTxWitnesses(signedTxDecoded)

  return {
    shelley: shelleyWitnesses,
    byron: byronWitnesses,
  }
}

export {
  TxByronWitness,
  TxShelleyWitness,
  TxAux,
  TxSigned,
  TxWitnesses,
}
