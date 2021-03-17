import { HARDENED_THRESHOLD } from '../constants'
import { Errors } from '../errors'
import { isBIP32Path } from '../guards'
import { XPubKey } from '../transaction/transaction'
import { TxCertificateKeys, _Certificate, _TxAux } from '../transaction/types'
import {
  Address,
  BIP32Path,
  HwSigningData,
  HwSigningType,
  Network,
  NetworkIds,
  ProtocolMagics,
} from '../types'
import {
  DeviceVersion,
  _AddressParameters,
} from './types'

const {
  getPubKeyBlake2b224Hash,
  AddressTypes,
  base58,
  bech32,
  getAddressType,
  packBootstrapAddress,
  packBaseAddress,
  getShelleyAddressNetworkId,
  packEnterpriseAddress,
  isValidBootstrapAddress,
  isValidShelleyAddress,
  addressToBuffer,
  getBootstrapAddressProtocolMagic,
} = require('cardano-crypto.js')

enum PathTypes {
  // hd wallet account
  PATH_WALLET_ACCOUNT,

  // hd wallet address
  PATH_WALLET_SPENDING_KEY_BYRON,
  PATH_WALLET_SPENDING_KEY_SHELLEY,

  // hd wallet reward adress, withdrawal witness, pool owner
  PATH_WALLET_STAKING_KEY,

  // pool cold key in pool registrations and retirements
  PATH_POOL_COLD_KEY,

  // not one of the above
  PATH_INVALID,
}

const classifyPath = (path: number[]) => {
  if (path.length < 3) return PathTypes.PATH_INVALID

  const HD = HARDENED_THRESHOLD

  if (path[0] === 1853 + HD) {
    // cold keys
    if (path.length !== 4) return PathTypes.PATH_INVALID
    if (path[1] !== 1815 + HD) return PathTypes.PATH_INVALID
    if (path[2] !== 0 + HD) return PathTypes.PATH_INVALID
    if (path[3] < HD) return PathTypes.PATH_INVALID

    return PathTypes.PATH_POOL_COLD_KEY
  }

  if (path[0] === 44 + HD) {
    if (path[1] !== 1815 + HD) return PathTypes.PATH_INVALID

    if (path.length === 3) {
      return PathTypes.PATH_WALLET_ACCOUNT
    }

    if (path.length !== 5) {
      return PathTypes.PATH_INVALID
    }

    switch (path[3]) {
      case 0:
      case 1:
        return PathTypes.PATH_WALLET_SPENDING_KEY_BYRON

      default:
        return PathTypes.PATH_INVALID
    }
  }

  if (path[0] === 1852 + HD) {
    if (path[1] !== 1815 + HD) {
      return PathTypes.PATH_INVALID
    }

    if (path.length === 3) {
      return PathTypes.PATH_WALLET_ACCOUNT
    }

    if (path.length !== 5) {
      return PathTypes.PATH_INVALID
    }

    switch (path[3]) {
      case 0:
      case 1:
        return PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY

      case 2:
        if (path[4] === 0) {
          return PathTypes.PATH_WALLET_STAKING_KEY
        }
        return PathTypes.PATH_INVALID

      default:
        return PathTypes.PATH_INVALID
    }
  }

  return PathTypes.PATH_INVALID
}

const encodeAddress = (address: Buffer): string => {
  const addressType = getAddressType(address)
  if (addressType === AddressTypes.BOOTSTRAP) {
    return base58.encode(address)
  }
  const addressPrefixes: {[key: number]: string} = {
    [AddressTypes.BASE]: 'addr',
    [AddressTypes.POINTER]: 'addr',
    [AddressTypes.ENTERPRISE]: 'addr',
    [AddressTypes.REWARD]: 'stake',
  }
  const isTestnet = getShelleyAddressNetworkId(address) === NetworkIds.TESTNET
  const addressPrefix = `${addressPrefixes[addressType]}${isTestnet ? '_test' : ''}`
  return bech32.encode(addressPrefix, address)
}

const getSigningPath = (
  signingFiles: HwSigningData[], i: number,
): BIP32Path | undefined => {
  if (!signingFiles.length) return undefined
  // in case signingFiles.length < input.length
  // we return the first path since all we need is to pass all the paths
  // disregarding their order
  return signingFiles[i] ? signingFiles[i].path : signingFiles[0].path
}

const filterSigningFiles = (
  signingFiles: HwSigningData[],
): {
    paymentSigningFiles: HwSigningData[],
    stakeSigningFiles: HwSigningData[],
    poolColdSigningFiles: HwSigningData[]
} => {
  const paymentSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.Payment,
  )
  const stakeSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.Stake,
  )
  const poolColdSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.PoolCold,
  )
  return {
    paymentSigningFiles,
    stakeSigningFiles,
    poolColdSigningFiles,
  }
}

const findSigningPath = (
  certPubKeyHash: Buffer, signingFiles: HwSigningData[],
): BIP32Path | undefined => {
  const signingFile = signingFiles.find((file) => {
    const { pubKey } = XPubKey(file.cborXPubKeyHex)
    const pubKeyHash = getPubKeyBlake2b224Hash(pubKey)
    return !Buffer.compare(pubKeyHash, certPubKeyHash)
  })
  return signingFile?.path
}

const txHasStakePoolRegistrationCert = (
  certs: _Certificate[],
): boolean => certs.some(
  ({ type }) => type === TxCertificateKeys.STAKEPOOL_REGISTRATION,
)

// validates if the given signing files correspond to the tx body
// TODO not entirely, e.g. we don't count unique witnesses, and don't verify there is an input included
const validateTxWithoutPoolRegistration = (
  txAux: _TxAux, signingFiles: HwSigningData[],
): void => {
  const { paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles } = filterSigningFiles(signingFiles)

  if (paymentSigningFiles.length === 0) {
    throw Error(Errors.MissingPaymentSigningFileError)
  }
  if (paymentSigningFiles.length > txAux.inputs.length) {
    throw Error(Errors.TooManyPaymentSigningFilesError)
  }

  let numStakeWitnesses = txAux.withdrawals.length
  let numPoolColdWitnesses = 0
  txAux.certificates.forEach((cert) => {
    switch (cert.type) {
      case TxCertificateKeys.STAKING_KEY_REGISTRATION:
      case TxCertificateKeys.STAKING_KEY_DEREGISTRATION:
      case TxCertificateKeys.DELEGATION:
        numStakeWitnesses += 1
        break

      case TxCertificateKeys.STAKEPOOL_RETIREMENT:
        numPoolColdWitnesses += 1
        break

      default:
        break
    }
  })

  if (numStakeWitnesses > 0 && (stakeSigningFiles.length === 0)) {
    throw Error(Errors.MissingStakeSigningFileError)
  }
  if (stakeSigningFiles.length > numStakeWitnesses) {
    throw Error(Errors.TooManyStakeSigningFilesError)
  }

  if (numPoolColdWitnesses > 0 && (poolColdSigningFiles.length === 0)) {
    throw Error(Errors.MissingPoolColdSigningFileError)
  }
  if (poolColdSigningFiles.length > numPoolColdWitnesses) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }
}

// validates if the given signing files correspond to the tx body
const validateTxWithPoolRegistration = (
  txAux: _TxAux, signingFiles: HwSigningData[],
): void => {
  const { paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles } = filterSigningFiles(signingFiles)

  // TODO needs revisiting
  if (!txAux.inputs.length) {
    throw Error(Errors.MissingInputError)
  }
  if (txAux.certificates.length !== 1) {
    throw Error(Errors.MultipleCertificatesWithPoolRegError)
  }
  if (txAux.withdrawals.length) {
    throw Error(Errors.WithdrawalIncludedWithPoolRegError)
  }

  if (paymentSigningFiles.length !== 0) {
    throw Error(Errors.PaymentFileIncludedWithPoolRegError)
  }
  if (stakeSigningFiles.length + poolColdSigningFiles.length === 0) {
    throw Error(Errors.MissingStakeSigningFileError)
  }
  if (stakeSigningFiles.length + poolColdSigningFiles.length > 1) {
    throw Error(Errors.MultipleStakingSigningFilesWithPoolRegError)
  }
}

const validateWitnessing = (
  txAux: _TxAux, signingFiles: HwSigningData[],
): void => {
  if (!txHasStakePoolRegistrationCert(txAux.certificates)) {
    throw Error(Errors.CantWitnessTxWithoutPoolRegError)
  }

  validateTxWithPoolRegistration(txAux, signingFiles)
}

const validateSigning = (
  txAux: _TxAux, signingFiles: HwSigningData[],
): void => {
  if (txHasStakePoolRegistrationCert(txAux.certificates)) {
    throw Error(Errors.CantSignTxWithPoolRegError)
  }

  validateTxWithoutPoolRegistration(txAux, signingFiles)
}

const validateKeyGenInputs = (
  paths: BIP32Path[],
  hwSigningFiles: string[],
  verificationKeyFiles: string[],
): void => {
  if (
    !Array.isArray(paths)
    || !paths.every(isBIP32Path)
    || !Array.isArray(hwSigningFiles)
    || !Array.isArray(verificationKeyFiles)
    || paths.length < 1
    || paths.length !== hwSigningFiles.length
    || paths.length !== verificationKeyFiles.length
  ) throw Error(Errors.InvalidKeyGenInputsError)
}

const _packBootStrapAddress = (
  file: HwSigningData, network: Network,
): _AddressParameters => {
  const { pubKey, chainCode } = XPubKey(file.cborXPubKeyHex)
  const xPubKey = Buffer.concat([pubKey, chainCode])
  const address: Buffer = packBootstrapAddress(
    file.path,
    xPubKey,
    undefined, // passphrase is undefined for derivation scheme v2
    2, // derivation scheme is always 2 for hw wallets
    network.protocolMagic,
  )
  return {
    address,
    addressType: getAddressType(address),
    paymentPath: file.path,
  }
}

const _packBaseAddress = (
  changeOutputFiles: HwSigningData[], network: Network,
): _AddressParameters | null => {
  const isStakingPath = (path: number[]) => classifyPath(path) === PathTypes.PATH_WALLET_STAKING_KEY
  const stakePathFile = changeOutputFiles.find(({ path }) => isStakingPath(path))
  const paymentPathFile = changeOutputFiles.find(({ path }) => !isStakingPath(path))
  if (!stakePathFile || !paymentPathFile) return null

  const { pubKey: stakePubKey } = XPubKey(stakePathFile.cborXPubKeyHex)
  const { pubKey: paymentPubKey } = XPubKey(paymentPathFile.cborXPubKeyHex)
  const address: Buffer = packBaseAddress(
    getPubKeyBlake2b224Hash(paymentPubKey),
    getPubKeyBlake2b224Hash(stakePubKey),
    network.networkId,
  )
  return {
    address,
    addressType: getAddressType(address),
    paymentPath: paymentPathFile.path,
    stakePath: stakePathFile.path,
  }
}

const _packEnterpriseAddress = (
  changeOutputFile: HwSigningData, network: Network,
): _AddressParameters => {
  const { pubKey: paymentPubKey } = XPubKey(changeOutputFile.cborXPubKeyHex)
  const address: Buffer = packEnterpriseAddress(
    getPubKeyBlake2b224Hash(paymentPubKey),
    network.networkId,
  )
  return {
    address,
    addressType: getAddressType(address),
    paymentPath: changeOutputFile.path,
  }
}

const getChangeAddress = (
  changeOutputFiles: HwSigningData[],
  outputAddress: Buffer,
  network: Network,
): _AddressParameters | null => {
  const addressType = getAddressType(outputAddress)
  try {
    switch (addressType) {
      case AddressTypes.BOOTSTRAP:
        return _packBootStrapAddress(changeOutputFiles[0], network)
      case AddressTypes.BASE:
        return _packBaseAddress(changeOutputFiles, network)
      case AddressTypes.ENTERPRISE:
        return _packEnterpriseAddress(changeOutputFiles[0], network)
      default: return null
    }
  } catch (e) {
    return null
  }
}

const getAddressAttributes = (address: Address) => {
  const addressBuffer = addressToBuffer(address)
  const addressType: number = getAddressType(addressBuffer)
  let protocolMagic: ProtocolMagics
  let networkId: NetworkIds

  if (isValidBootstrapAddress(address)) {
    protocolMagic = getBootstrapAddressProtocolMagic(addressBuffer)
    networkId = ProtocolMagics.MAINNET === protocolMagic
      ? NetworkIds.MAINNET
      : NetworkIds.TESTNET
  } else if (isValidShelleyAddress(address)) {
    networkId = getShelleyAddressNetworkId(addressBuffer)
    protocolMagic = NetworkIds.MAINNET === networkId
      ? ProtocolMagics.MAINNET
      : ProtocolMagics.TESTNET
  } else throw Error(Errors.InvalidAddressError)

  return { addressType, networkId, protocolMagic }
}

const ipv4ToString = (ipv4: Buffer | undefined): string | undefined => {
  if (!ipv4) return undefined
  return new Uint8Array(ipv4).join('.')
}
const ipv6ToString = (ipv6: Buffer | undefined): string | undefined => {
  if (!ipv6) return undefined
  // concats the little endians to Buffer and divides the hex string to foursomes
  const ipv6LE = Buffer.from(ipv6).swap32().toString('hex').match(/.{1,4}/g)
  return ipv6LE ? ipv6LE.join(':') : undefined
}

const rewardAddressToPubKeyHash = (address: Buffer) => address.slice(1)

const deviceVersionToStr = (
  deviceVersion: DeviceVersion,
): string => `${deviceVersion.major}.${deviceVersion.minor}.${deviceVersion.patch}`

const isDeviceVersionGTE = (
  deviceVersion: DeviceVersion,
  thresholdVersion: DeviceVersion,
): boolean => deviceVersion.major > thresholdVersion.major
  || (
    deviceVersion.major === thresholdVersion.major
    && deviceVersion.minor > thresholdVersion.minor
  )
  || (
    deviceVersion.major === thresholdVersion.major
    && deviceVersion.minor === thresholdVersion.minor
    && deviceVersion.patch >= thresholdVersion.patch
  )

export {
  PathTypes,
  classifyPath,
  validateSigning,
  validateWitnessing,
  validateKeyGenInputs,
  getSigningPath,
  filterSigningFiles,
  findSigningPath,
  encodeAddress,
  getChangeAddress,
  getAddressAttributes,
  ipv4ToString,
  ipv6ToString,
  rewardAddressToPubKeyHash,
  deviceVersionToStr,
  isDeviceVersionGTE,
}
