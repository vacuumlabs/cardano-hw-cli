import { HARDENED_THRESHOLD, NETWORKS } from '../constants'
import NamedError from '../namedError'
import { XPubKey } from '../transaction/transaction'
import { TxCertificateKeys, _Certificate, _TxAux } from '../transaction/types'
import {
  Address,
  BIP32Path,
  HwSigningData,
  Network,
  NetworkIds,
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
  return signingFiles[i] ? signingFiles[i].path : signingFiles[0].path
}

const filterSigningFiles = (
  signingFiles: HwSigningData[],
): {paymentSigningFiles: HwSigningData[], stakeSigningFiles: HwSigningData[]} => {
  const paymentSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === 0,
  )
  const stakeSigningFiles = signingFiles.filter(
    (signingFile) => signingFile.type === 1,
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

const txHasPoolPoolRegistrationCert = (
  certs: _Certificate[],
): boolean => certs.some(
  ({ type }) => type === TxCertificateKeys.STAKEPOOL_REGISTRATION,
)

const validateTx = (
  txAux: _TxAux, paymentSigningFiles: HwSigningData[], stakeSigningFiles: HwSigningData[],
): void => {
  if (!txAux.inputs.length) throw NamedError('MissingInputError')
  if (!txAux.outputs.length) throw NamedError('MissingOutputError')
  if (paymentSigningFiles.length > txAux.inputs.length) {
    throw NamedError('TooManySigningFilesError')
  }
  const requireStakingSigningFile = !!(txAux.certificates.length + txAux.withdrawals.length)
  if (
    requireStakingSigningFile && !stakeSigningFiles.length
  ) throw NamedError('MissingStakingSigningFileError')
}

const validateWitnessing = (
  txAux: _TxAux, signingFiles: HwSigningData[],
): void => {
  const {
    paymentSigningFiles,
    stakeSigningFiles,
  } = filterSigningFiles(signingFiles)
  validateTx(txAux, paymentSigningFiles, stakeSigningFiles)
  if (!txHasPoolPoolRegistrationCert(txAux.certificates)) return

  if (txAux.certificates.length !== 1) throw NamedError('MultipleCertificatesWithPoolRegError')
  if (txAux.withdrawals.length) throw NamedError('WithdrawalIncludedWithPoolRegError')
  if (paymentSigningFiles.length) throw NamedError('PaymentFileInlucedWithPoolRegError')
  if (stakeSigningFiles.length !== 1) throw NamedError('MultipleStakingSigningFilesWithPoolRegError')
}

const validateSigning = (
  txAux: _TxAux, signingFiles: HwSigningData[],
): void => {
  const {
    paymentSigningFiles,
    stakeSigningFiles,
  } = filterSigningFiles(signingFiles)
  if (txHasPoolPoolRegistrationCert(txAux.certificates)) throw NamedError('CantSignTxWithPoolReg')
  validateTx(txAux, paymentSigningFiles, stakeSigningFiles)
  if (!paymentSigningFiles.length) throw NamedError('MissingPaymentSigningFileError')
}

const _packBootStrapAddress = (
  file: HwSigningData, network: Network,
) => {
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
) => {
  const stakePathFile = changeOutputFiles.find(({ path }) => isStakingPath(path))
  const paymentPathFile = changeOutputFiles.find(({ path }) => !isStakingPath(path))
  if (!stakePathFile || !paymentPathFile) return undefined
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
) => {
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
): _AddressParameters | undefined => {
  const addressType = getAddressType(outputAddress)
  try {
    switch (addressType) {
      case AddressTypes.BOOTSTRAP: return _packBootStrapAddress(
        changeOutputFiles[0], network,
      )
      case AddressTypes.BASE: return _packBaseAddress(
        changeOutputFiles, network,
      )
      case AddressTypes.ENTERPRISE: return _packEnterpriseAddress(
        changeOutputFiles[0], network,
      )
      default: return undefined
    }
  } catch (e) {
    return undefined
  }
}

const getAddressAttributes = (address: Address) => {
  const addressBuffer = addressToBuffer(address)
  const addressType = getAddressType(addressBuffer)
  let protocolMagic
  let networkId

  if (isValidBootstrapAddress(address)) {
    protocolMagic = getBootstrapAddressProtocolMagic(addressBuffer)
    networkId = NETWORKS.MAINNET.protocolMagic === protocolMagic
      ? NETWORKS.MAINNET.networkId
      : NETWORKS.TESTNET.networkId
  } else if (isValidShelleyAddress(address)) {
    networkId = getShelleyAddressNetworkId(addressBuffer)
    protocolMagic = NETWORKS.MAINNET.networkId === networkId
      ? NETWORKS.MAINNET.protocolMagic
      : NETWORKS.TESTNET.protocolMagic
  } else throw NamedError('InvalidAddressError')

  return { addressType, networkId, protocolMagic }
}

const ipv4ToString = (ipv4: Buffer | undefined): string | undefined => {
  if (!ipv4) return undefined
  return new Uint8Array(ipv4).join('.')
}
const ipv6ToString = (ipv6: Buffer | undefined): string | undefined => {
  if (!ipv6) return undefined
  const _ipv6LE: Buffer[] = []
  for (let i = 0; i < 16; i += 4) {
    _ipv6LE.push(Buffer.from(new Uint32Array([ipv6.readUInt32BE(i)]).buffer))
  }
  // concats the little endians to Buffer and divides the hex string to foursomes
  const ipv6LE = Buffer.concat(_ipv6LE).toString('hex').match(/.{1,4}/g)
  return ipv6LE ? ipv6LE.join(':') : undefined
}

const rewardAddressToPubKeyHash = (address: Buffer) => address.slice(1)

export {
  isShelleyPath,
  isStakingPath,
  validateSigning,
  validateWitnessing,
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
