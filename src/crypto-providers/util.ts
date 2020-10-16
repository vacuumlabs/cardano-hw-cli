import { HARDENED_THRESHOLD } from '../constants'
import { XPubKey } from '../transaction/transaction'
import { TxCertificateKeys, _TxAux } from '../transaction/types'
import {
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
} = require('cardano-crypto.js')

const isShelleyPath = (path: number[]) => path[0] - HARDENED_THRESHOLD === 1852

const isStakingPath = (path: number[]) => path[3] === 2

const encodeAddress = (address: Buffer): string => {
  if (getAddressType(address) === AddressTypes.ENTERPRISE) {
    return base58.encode(address)
  }
  const prefixes: {[key: number]: string} = {
    [NetworkIds.MAINNET]: 'addr',
    [NetworkIds.TESTNET]: 'addr_test',
  }
  const networkId = getShelleyAddressNetworkId(address)
  return bech32.encode(prefixes[networkId], address)
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

const findSigningPath = (certPubKeyHash: Buffer, stakingSigningFiles: HwSigningData[]) => {
  const signingFile = stakingSigningFiles.find((file) => {
    const { pubKey } = XPubKey(file.cborXPubKeyHex)
    const pubKeyHash = getPubKeyBlake2b224Hash(pubKey)
    return !Buffer.compare(pubKeyHash, certPubKeyHash)
  })
  if (!signingFile) throw Error('Missing signing file')
  return signingFile.path
}

const validateTxWithStakePoolCert = (
  txAux: _TxAux, paymentSigningFiles: HwSigningData[], stakeSigningFiles: HwSigningData[],
): void => {
  if (txAux.certificates.length !== 1) throw Error('MultipleCertificatesWithPoolReg')
  if (txAux.withdrawals.length) throw Error('WithdrawalIncludedWithPoolReg')
  if (paymentSigningFiles.length) throw Error('PaymentFileInlucedWithPoolReg')
  if (stakeSigningFiles.length !== 1) throw Error('MultipleStakingSigningFilesWithPoolReg')
}

const validateTxWithoutStakePoolCert = (
  txAux: _TxAux, paymentSigningFiles: HwSigningData[], stakeSigningFiles: HwSigningData[],
): void => {
  if (!paymentSigningFiles.length) throw Error('MissingPaymentSigningFile')
  if (paymentSigningFiles.length > txAux.inputs.length) {
    throw Error('TooManySigningFiles')
  }
  const requireStakingSigningFile = !!(txAux.certificates.length + txAux.withdrawals.length)
  if (requireStakingSigningFile && !stakeSigningFiles.length) throw Error('MissingStakingSigningFile')
}

const validateUnsignedTx = (txAux: _TxAux, signingFiles: HwSigningData[]): void => {
  if (!txAux.inputs.length) throw Error('MissingInput')
  if (!txAux.outputs.length) throw Error('MissingOutput')
  if (!signingFiles.length) throw Error('MissingSigningFile')
  const {
    paymentSigningFiles,
    stakeSigningFiles,
  } = filterSigningFiles(signingFiles)
  const hasStakePoolRegCert = txAux.certificates.some(
    ({ type }) => type === TxCertificateKeys.STAKEPOOL_REGISTRATION,
  )
  if (hasStakePoolRegCert) {
    validateTxWithStakePoolCert(txAux, paymentSigningFiles, stakeSigningFiles)
  } else {
    validateTxWithoutStakePoolCert(txAux, paymentSigningFiles, stakeSigningFiles)
  }
}

const _packBootStrapAddress = (
  file: HwSigningData, network: Network,
) => {
  const { pubKey, chainCode } = XPubKey(file.cborXPubKeyHex)
  const xPubKey = Buffer.concat([pubKey, chainCode])
  const address: Buffer = packBootstrapAddress(
    file.path,
    xPubKey,
    undefined,
    2,
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

const getChangeAddress = (
  changeOutputFiles: HwSigningData[],
  network: Network,
): _AddressParameters | undefined => {
  if (changeOutputFiles.length === 1) {
    return _packBootStrapAddress(changeOutputFiles[0], network)
  }
  if (changeOutputFiles.length === 2) {
    return _packBaseAddress(changeOutputFiles, network)
  }
  return undefined
}

export {
  isShelleyPath,
  validateUnsignedTx,
  getSigningPath,
  filterSigningFiles,
  findSigningPath,
  encodeAddress,
  getChangeAddress,
}
