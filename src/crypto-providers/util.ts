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
import { _AddressParameters } from './types'

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

const isShelleyPath = (path: number[]) => path[0] - HARDENED_THRESHOLD === 1852

const isStakingPath = (path: number[]) => path[3] === 2

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
): {paymentSigningFiles: HwSigningData[], stakeSigningFiles: HwSigningData[]} => {
  const paymentSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.Payment,
  )
  const stakeSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === HwSigningType.Stake,
  )
  return {
    paymentSigningFiles,
    stakeSigningFiles,
  }
}

const findSigningPath = (
  certPubKeyHash: Buffer, stakingSigningFiles: HwSigningData[],
): BIP32Path | undefined => {
  const signingFile = stakingSigningFiles.find((file) => {
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

const validateTx = (
  txAux: _TxAux, paymentSigningFiles: HwSigningData[], stakeSigningFiles: HwSigningData[],
): void => {
  if (!txAux.inputs.length) throw Error(Errors.MissingInputError)
  if (!txAux.outputs.length) throw Error(Errors.MissingOutputError)
  if (paymentSigningFiles.length > txAux.inputs.length) {
    throw Error(Errors.TooManySigningFilesError)
  }
  const requireStakingSigningFile = !!(txAux.certificates.length + txAux.withdrawals.length)
  if (
    requireStakingSigningFile && !stakeSigningFiles.length
  ) throw Error(Errors.MissingStakingSigningFileError)
}

const validateTxWithPoolRegistration = (
  txAux: _TxAux,
  paymentSigningFiles: HwSigningData[],
  stakeSigningFiles: HwSigningData[],
): void => {
  if (txAux.certificates.length !== 1) throw Error(Errors.MultipleCertificatesWithPoolRegError)
  if (txAux.withdrawals.length) throw Error(Errors.WithdrawalIncludedWithPoolRegError)
  if (paymentSigningFiles.length) throw Error(Errors.PaymentFileInlucedWithPoolRegError)
  if (stakeSigningFiles.length !== 1) throw Error(Errors.MultipleStakingSigningFilesWithPoolRegError)
}

const validateWitnessing = (
  txAux: _TxAux, signingFiles: HwSigningData[],
): void => {
  if (signingFiles.length > 1) throw Error(Errors.TooManySigningFilesError)
  const {
    paymentSigningFiles,
    stakeSigningFiles,
  } = filterSigningFiles(signingFiles)
  validateTx(txAux, paymentSigningFiles, stakeSigningFiles)
  if (txHasStakePoolRegistrationCert(txAux.certificates)) {
    validateTxWithPoolRegistration(txAux, paymentSigningFiles, stakeSigningFiles)
  }
}

const validateSigning = (
  txAux: _TxAux, signingFiles: HwSigningData[],
): void => {
  const {
    paymentSigningFiles,
    stakeSigningFiles,
  } = filterSigningFiles(signingFiles)
  if (txHasStakePoolRegistrationCert(txAux.certificates)) throw Error(Errors.CantSignTxWithPoolRegError)
  validateTx(txAux, paymentSigningFiles, stakeSigningFiles)
  if (!paymentSigningFiles.length) throw Error(Errors.MissingPaymentSigningFileError)
}

const validateKeyGenInputs = (
  paths: BIP32Path[],
  hwSigningFiles: string[],
  verificationKeyFiles: string[],
): void => {
  if (
    !Array.isArray(paths) ||
    !paths.every(isBIP32Path) ||
    !Array.isArray(hwSigningFiles) ||
    !Array.isArray(verificationKeyFiles) ||
    paths.length < 1 ||
    paths.length !== hwSigningFiles.length ||
    paths.length !== verificationKeyFiles.length
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

export {
  isShelleyPath,
  isStakingPath,
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
}
