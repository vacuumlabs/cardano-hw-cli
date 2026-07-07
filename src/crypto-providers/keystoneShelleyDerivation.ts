import {BIP32Path} from '../basicTypes'
import {HARDENED_THRESHOLD} from '../constants'
import {Errors} from '../errors'
import {PathTypes} from './util'

const formatBip32Path = (path: BIP32Path): string =>
  `m/${path
    .map((element) => {
      if (element >= HARDENED_THRESHOLD) {
        return `${element - HARDENED_THRESHOLD}'`
      }
      return element.toString()
    })
    .join('/')}`

const assertNever = (pathType: never): never => {
  throw new Error(`Unsupported path type: ${pathType}`)
}

/**
 * Decides how `getExtendedPublicKeys` obtains the xpub for a given path, and
 * defensively rejects any path Keystone cannot export a key for.
 *
 * Keystone only exports two kinds of key material directly from the device:
 *   - the account-level xpub (`PATH_WALLET_ACCOUNT`), and
 *   - the pool cold key (`PATH_POOL_COLD_KEY`, needed for operational
 *     certificates via `node key-gen`).
 * Standard Shelley leaf keys (payment / staking / DRep / committee) are not
 * exported per-leaf; instead the account xpub is fetched once and the
 * role + address index are derived locally.
 *
 * Every other path type (Byron, multisig, minting, CIP-36 voting) is either
 * explicitly unsupported by Keystone or unused by any Keystone flow, so we
 * throw here rather than send an unusable request to the device and surface a
 * confusing device-side error.
 *
 * @returns `true`  - derive the leaf locally from the account xpub
 *          `false` - request this exact path directly from the device
 * @throws  if the path type is not supported by Keystone for key export
 */
export const needsShelleyLocalDerivation = (
  pathType: PathTypes,
  path: BIP32Path,
): boolean => {
  switch (pathType) {
    // Shelley leaf keys: device exports the account xpub, we derive locally.
    case PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY:
    case PathTypes.PATH_WALLET_STAKING_KEY:
    case PathTypes.PATH_DREP_KEY:
    case PathTypes.PATH_COMMITTEE_COLD_KEY:
    case PathTypes.PATH_COMMITTEE_HOT_KEY:
      return true
    // The only keys we request from the device at their exact path.
    case PathTypes.PATH_WALLET_ACCOUNT:
    case PathTypes.PATH_POOL_COLD_KEY:
      return false
    // Unsupported on Keystone for key export - fail loudly and early.
    case PathTypes.PATH_WALLET_SPENDING_KEY_BYRON:
    case PathTypes.PATH_WALLET_ACCOUNT_MULTISIG:
    case PathTypes.PATH_WALLET_SPENDING_KEY_MULTISIG:
    case PathTypes.PATH_WALLET_STAKING_KEY_MULTISIG:
    case PathTypes.PATH_WALLET_MINTING_KEY:
    case PathTypes.PATH_CVOTE_ACCOUNT:
    case PathTypes.PATH_CVOTE_KEY:
    case PathTypes.PATH_INVALID:
      throw new Error(
        `${Errors.Keystone3ProUnsupportedThisPath} (${formatBip32Path(path)})`,
      )
    default:
      return assertNever(pathType)
  }
}
