import parseTxBody from './txBodyParser'

const cbor = require('borc')
const { blake2b } = require('cardano-crypto.js')

function TxWitnessByron(
  publicKey: Buffer, signature: Buffer, chaincode: Buffer, addressAttributes: Buffer,
) {
  function encodeCBOR(encoder: any) {
    return encoder.pushAny([publicKey, signature, chaincode, addressAttributes])
  }

  return {
    publicKey,
    signature,
    chaincode,
    addressAttributes,
    encodeCBOR,
  }
}

function TxWitnessShelley(publicKey: Buffer, signature: Buffer) {
  function encodeCBOR(encoder: any) {
    return encoder.pushAny([publicKey, signature])
  }

  return {
    publicKey,
    signature,
    encodeCBOR,
  }
}

function TxAux(txBody: string) {
  const decodedTxBody = cbor.decode(txBody)
  const parsedTxBody = parseTxBody(decodedTxBody)

  function getId(): string {
    return blake2b(
      Buffer.from(txBody, 'hex'),
      32,
    ).toString('hex')
  }

  function encodeCBOR(encoder: any) {
    return encoder.pushAny(decodedTxBody)
  }

  return {
    getId,
    ...parsedTxBody,
    encodeCBOR,
  }
}

function SignedTransaction(
  txAux: ReturnType<typeof TxAux>,
  witnesses: ReturnType<typeof TxWitnessShelley | typeof TxWitnessShelley> [],
  meta: Buffer | null,
) {
  function getId(): string {
    return txAux.getId()
  }

  function encodeCBOR(encoder: any): string {
    return encoder.pushAny([txAux, witnesses, meta])
  }

  return {
    getId,
    encodeCBOR,
  }
}

export {
  SignedTransaction,
  TxWitnessShelley,
  TxWitnessByron,
  TxAux,
}
