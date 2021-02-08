import { LedgerCryptoProviderFeature } from './ledgerTypes'
import { TrezorCryptoProviderFeature } from './trezorTypes'
import { DeviceVersion } from './types'

export const LEDGER_VERSIONS: { [key in LedgerCryptoProviderFeature]: DeviceVersion } = {
  [LedgerCryptoProviderFeature.BULK_EXPORT]: {
    major: 2,
    minor: 1,
    patch: 0,
  },
  [LedgerCryptoProviderFeature.MULTI_ASSET]: {
    major: 2,
    minor: 2,
    patch: 0,
  },
  [LedgerCryptoProviderFeature.ALLEGRA]: {
    major: 2,
    minor: 2,
    patch: 0,
  },
}

export const TREZOR_VERSIONS: { [key in TrezorCryptoProviderFeature]: DeviceVersion } = {
  [TrezorCryptoProviderFeature.MULTI_ASSET]: {
    major: 2,
    minor: 3,
    patch: 5,
  },
  [TrezorCryptoProviderFeature.ALLEGRA]: {
    major: 2,
    minor: 3,
    patch: 5,
  },
}
