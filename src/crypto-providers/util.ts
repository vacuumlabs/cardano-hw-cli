import { XPubKey } from '../transaction/transaction'
import { TxCertificateKeys, _Output, _TxAux } from '../transaction/types'
import { BIP32Path, HwSigningData } from '../types'

const {
  getPubKeyBlake2b224Hash,
  AddressTypes,
  base58,
  bech32,
  getAddressType,
} = require('cardano-crypto.js')

const encodeAddress = (address: Buffer): string => (
  getAddressType(address) === AddressTypes.ENTERPRISE
    ? base58.encode(address)
    : bech32.encode('addr', address)
)

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

const getChangeOutput = (
  output: _Output,
  changeOutputFiles: HwSigningData[],
) => {
  const pubKeyHash = getPubKeyBlake2b224Hash(pubKey)
  const pubKeys = changeOutputFiles.map(
    ({ cborXPubKeyHex }) => XPubKey(cborXPubKeyHex).pubKey,
  )
  const addressType = getAddressType(output.address)
}

export {
  validateUnsignedTx,
  getSigningPath,
  filterSigningFiles,
  findSigningPath,
  encodeAddress,
}
