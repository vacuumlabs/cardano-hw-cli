import { LedgerCryptoProviderFeature, LedgerVersionThresholdMap } from './ledgerTypes'
import { TrezorCryptoProviderFeature, TrezorVersionThresholdMap } from './trezorTypes'

export const LEDGER_VERSIONS: LedgerVersionThresholdMap = {
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
  [LedgerCryptoProviderFeature.VALIDITY_INTERVAL_START]: {
    major: 2,
    minor: 2,
    patch: 0,
  },
}

export const TREZOR_VERSIONS: TrezorVersionThresholdMap = {
  [TrezorCryptoProviderFeature.MULTI_ASSET]: {
    major: 2,
    minor: 3,
    patch: 5,
  },
  [TrezorCryptoProviderFeature.VALIDITY_INTERVAL_START]: {
    major: 2,
    minor: 3,
    patch: 5,
  },
}
