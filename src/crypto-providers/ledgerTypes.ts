import { BIP32Path } from '../types'

export type LedgerWitness = {
  path: BIP32Path
  signature: Buffer
}

export const enum LedgerCryptoProviderFeature {
  BULK_EXPORT,
  MULTI_ASSET,
  OPTIONAL_TTL,
  POOL_REGISTRATION_OPERATOR,
  VALIDITY_INTERVAL_START,
}
