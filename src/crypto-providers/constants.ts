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
  [LedgerCryptoProviderFeature.OPTIONAL_TTL]: {
    major: 2,
    minor: 2,
    patch: 0,
  },
  [LedgerCryptoProviderFeature.VALIDITY_INTERVAL_START]: {
    major: 2,
    minor: 2,
    patch: 0,
  },
  [LedgerCryptoProviderFeature.POOL_REGISTRATION_OPERATOR]: {
    major: 2,
    minor: 4,
    patch: 0,
  },
  [LedgerCryptoProviderFeature.SIGN_OPERATIONAL_CERTIFICATE]: {
    major: 2,
    minor: 4,
    patch: 0,
  },
}

export const TREZOR_VERSIONS: { [key in TrezorCryptoProviderFeature]: DeviceVersion } = {
  [TrezorCryptoProviderFeature.MULTI_ASSET]: {
    major: 2,
    minor: 3,
    patch: 5,
  },
  [TrezorCryptoProviderFeature.OPTIONAL_TTL]: {
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
