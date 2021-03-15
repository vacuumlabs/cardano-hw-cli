import { HARDENED_THRESHOLD } from './constants'
import { classifyPath, PathTypes } from './crypto-providers/util'
import {
  SignedTxCborHex,
  SignedTxOutput,
  WitnessOutput,
  XPubKeyHex,
  _ByronWitness,
  _ShelleyWitness,
} from './transaction/types'
import {
  BIP32Path,
  CardanoEra,
  HwSigningOutput,
  OutputData,
  VerificationKeyOutput,
} from './types'

const rw = require('rw')
const cbor = require('borc')

const write = (path: string, data: OutputData) => rw.writeFileSync(
  path,
  JSON.stringify(data, null, 4),
  'utf8',
)

const cardanoEraToSignedType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'TxSignedByron',
  [CardanoEra.SHELLEY]: 'TxSignedShelley',
  [CardanoEra.ALLEGRA]: 'Tx AllegraEra',
  [CardanoEra.MARY]: 'Tx MaryEra',
}

const TxSignedOutput = (era: CardanoEra, signedTxCborHex: SignedTxCborHex): SignedTxOutput => ({
  type: cardanoEraToSignedType[era],
  description: '',
  cborHex: signedTxCborHex,
})

const cardanoEraToWitnessType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'TxWitnessByron',
  [CardanoEra.SHELLEY]: 'TxWitnessShelley',
  [CardanoEra.ALLEGRA]: 'TxWitness AllegraEra',
  [CardanoEra.MARY]: 'TxWitness MaryEra',
}

const TxWitnessOutput = (
  era: CardanoEra,
  { key, data }: _ByronWitness | _ShelleyWitness,
): WitnessOutput => ({
  type: cardanoEraToWitnessType[era],
  description: '',
  cborHex: cbor.encode([key, data]).toString('hex'),
})

const PathOutput = (path: BIP32Path): string => path
  .map((value) => (value >= HARDENED_THRESHOLD ? `${value - HARDENED_THRESHOLD}H` : `${value}`))
  .join('/')

const pathTypeDescription = (path: number[]): string => {
  switch (classifyPath(path)) {
    case PathTypes.PATH_POOL_COLD_KEY:
      return 'PoolCold'

    // TODO what about these two cases?
    case PathTypes.PATH_WALLET_ACCOUNT:
    case PathTypes.PATH_INVALID:
    default:
      throw Error('unsuitable path, FIX IT')

    case PathTypes.PATH_WALLET_SPENDING_KEY_BYRON:
    case PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY:
      return 'Payment'

    case PathTypes.PATH_WALLET_STAKING_KEY:
      return 'Stake'
  }
}

const HwSigningKeyOutput = (xPubKey: XPubKeyHex, path: BIP32Path): HwSigningOutput => {
  const typeDesc = pathTypeDescription(path)
  return {
    type: `${typeDesc}HWSigningFileShelley_ed25519`,
    description: `${typeDesc} Hardware Signing File`,
    path: PathOutput(path),
    cborXPubKeyHex: cbor.encode(Buffer.from(xPubKey, 'hex')).toString('hex'),
  }
}

const HwVerificationKeyOutput = (xPubKey: XPubKeyHex, path: BIP32Path): VerificationKeyOutput => {
  // to get pub key also from cbor encoded xpub
  const pubKey = Buffer.from(xPubKey, 'hex').slice(-64).slice(0, 32)
  const typeDesc = pathTypeDescription(path)
  return {
    type: `${typeDesc}VerificationKeyShelley_ed25519`,
    description: `${typeDesc} Verification Key`,
    cborHex: cbor.encode(pubKey).toString('hex'),
  }
}

export {
  write,
  TxSignedOutput,
  TxWitnessOutput,
  HwSigningKeyOutput,
  HwVerificationKeyOutput,
}
