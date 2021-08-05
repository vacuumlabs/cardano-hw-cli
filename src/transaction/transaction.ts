import {
  TxWitnessByron,
  TxWitnessShelley,
  _UnsignedTxDecoded,
  SignedTxCborHex,
  TxWitnessKeys,
} from './types'
import { encodeCbor, encodeCborAsync } from '../util'

const TxByronWitness = (
  publicKey: Buffer, signature: Buffer, chaincode: Buffer, addressAttributes: object,
): TxWitnessByron => [publicKey, signature, chaincode, encodeCbor(addressAttributes)]

const TxShelleyWitness = (publicKey: Buffer, signature: Buffer): TxWitnessShelley => [publicKey, signature]

const TxSigned = async (
  unsignedTxDecoded: _UnsignedTxDecoded,
  byronWitnesses: TxWitnessByron[],
  shelleyWitnesses: TxWitnessShelley[],
): Promise<SignedTxCborHex> => {
  const [txBody, meta] = unsignedTxDecoded
  const witnesses = new Map()
  if (shelleyWitnesses.length > 0) {
    witnesses.set(TxWitnessKeys.SHELLEY, shelleyWitnesses)
  }
  if (byronWitnesses.length > 0) {
    witnesses.set(TxWitnessKeys.BYRON, byronWitnesses)
  }
  return (await encodeCborAsync([txBody, witnesses, meta])).toString('hex')
}

export {
  TxByronWitness,
  TxShelleyWitness,
  TxSigned,
}
