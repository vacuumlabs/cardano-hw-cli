import { parseUnsignedTx, parseTxWitnesses } from './txParser'
import { TxByronWitness, TxShelleyWitness, UnsignedTxDecoded } from './types'

const cbor = require('borc')
const { blake2b } = require('cardano-crypto.js')

function TxWitnessByron(
  publicKey: Buffer, signature: Buffer, chaincode: Buffer, addressAttributes: object,
): TxByronWitness {
  return [publicKey, signature, chaincode, cbor.encode(addressAttributes)]
}

function TxWitnessShelley(publicKey: Buffer, signature: Buffer): TxShelleyWitness {
  return [publicKey, signature]
}

function TxAux(unsignedTxCborHex: string) {
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

function SignedTransaction(
  unsignedTxDecoded: UnsignedTxDecoded,
  byronWitnesses: TxByronWitness[],
  shelleyWitnesses: TxShelleyWitness[],
) {
  const [txBody, meta] = unsignedTxDecoded
  const witnesses = new Map()
  if (shelleyWitnesses.length > 0) {
    witnesses.set(0, shelleyWitnesses)
  }
  if (byronWitnesses.length > 0) {
    witnesses.set(2, byronWitnesses)
  }
  return cbor.encode([txBody, witnesses, meta])
}

function TxWitnesses(signedTxCborHex: string) {
  const signedTxDecoded = cbor.decode(signedTxCborHex)
  const {
    byronWitnesses,
    shelleyWitnesses,
  } = parseTxWitnesses(signedTxDecoded)

  return {
    byronWitnesses: byronWitnesses.map((witness: TxByronWitness) => cbor.encode(witness)),
    shelleyWitnesses: shelleyWitnesses.map((witness: TxShelleyWitness) => cbor.encode(witness)),
  }
}

export {
  TxWitnessByron,
  TxWitnessShelley,
  TxAux,
  SignedTransaction,
  TxWitnesses,
}
