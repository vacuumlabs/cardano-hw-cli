import { isArrayOfType } from '../guards'
import {
  TxInput,
  TxOutput,
  TxStakingKeyRegistrationCert,
  TxStakingKeyDeregistrationCert,
  TxDelegationCert,
  TxCertificateKeys,
  TxStakepoolRegistrationCert,
  TxMultiHostNameRelay,
  TxSingleHostIPRelay,
  TxSingleHostNameRelay,
  TxRelayTypes,
  TxWithdrawal,
  _UnsignedTxDecoded,
  TxBodyKeys,
} from './types'

export const isUint64 = (test: any): test is number => {
  if (typeof test === 'number' && test > 0) return true
  try {
    BigInt(test)
    return test > 0
  } catch (e) { return false }
}

export const isTxInput = (
  test: any,
): test is TxInput => {
  if (!Array.isArray(test) || test.length !== 2) return false
  const [txHash, outputIndex] = test
  return Buffer.isBuffer(txHash) && Number.isInteger(outputIndex)
}

export const isTxOutput = (
  test: any,
): test is TxOutput => {
  if (Array.isArray(test) && test.length === 2) {
    const [address, amount] = test
    const isMultiAsset = (outputAmount: any) => Array.isArray(outputAmount) && outputAmount.length === 2
    return Buffer.isBuffer(address) && (isUint64(amount) || isMultiAsset(amount))
  }
  return false
}

export const isWithdrawalsMap = (
  test: any,
): test is TxWithdrawal => test instanceof Map
  && Array.from(test.keys()).every((key) => Buffer.isBuffer(key))
  && Array.from(test.values()).every((value) => isUint64(value))

export const isTxStakingKeyRegistrationCert = (
  test: any,
): test is TxStakingKeyRegistrationCert => {
  if (!Array.isArray(test) || test.length !== 2) return false
  if (!Array.isArray(test[1]) || test[1].length !== 2) return false
  const [type, [, pubKeyHash]] = test
  return type === TxCertificateKeys.STAKING_KEY_REGISTRATION && Buffer.isBuffer(pubKeyHash)
}

export const isStakingKeyDeregistrationCert = (
  test: any,
): test is TxStakingKeyDeregistrationCert => {
  if (!Array.isArray(test) || test.length !== 2) return false
  if (!Array.isArray(test[1]) || test[1].length !== 2) return false
  const [type, [, pubKeyHash]] = test
  return type === TxCertificateKeys.STAKING_KEY_DEREGISTRATION && Buffer.isBuffer(pubKeyHash)
}

export const isDelegationCert = (
  test: any,
): test is TxDelegationCert => {
  if (!Array.isArray(test) || test.length !== 3) return false
  if (!Array.isArray(test[1]) || test[1].length !== 2) return false
  const [type, [, pubKeyHash], poolHash] = test
  return type === TxCertificateKeys.DELEGATION && Buffer.isBuffer(pubKeyHash) && Buffer.isBuffer(poolHash)
}

export const isTxSingleHostIPRelay = (
  test: any,
): test is TxSingleHostIPRelay => {
  if (!Array.isArray(test) || test.length !== 4) return false
  const [type, portNumber, ipv4, ipv6] = test
  return type === TxRelayTypes.SINGLE_HOST_IP
    && (portNumber === null || Number.isInteger(portNumber))
    && (ipv4 === null || Buffer.isBuffer(ipv4))
    && (ipv6 === null || Buffer.isBuffer(ipv6))
}

export const isTxSingleHostNameRelay = (
  test: any,
): test is TxSingleHostNameRelay => {
  if (!Array.isArray(test) || test.length !== 3) return false
  const [type, portNumber, dnsName] = test
  return type === TxRelayTypes.SINGLE_HOST_NAME && Number.isInteger(portNumber) && typeof dnsName === 'string'
}

export const isTxMultiHostNameRelay = (
  test: any,
): test is TxMultiHostNameRelay => {
  if (!Array.isArray(test) || test.length !== 2) return false
  const [type, dnsName] = test
  return type === TxRelayTypes.MULTI_HOST_NAME && typeof dnsName === 'string'
}

const isMargin = (test: any) => {
  if (typeof test !== 'object') return false
  const { tag, value } = test
  if (!Array.isArray(value)) return false
  const [numerator, denominator] = value
  return tag === 30
    && Number.isInteger(numerator)
    && Number.isInteger(denominator)
}

const isMetaData = (test: any) => {
  if (test === null) return true
  if (!Array.isArray(test) || test.length !== 2) return false
  const [metadataUrl, metadataHash] = test
  return typeof metadataUrl === 'string' && Buffer.isBuffer(metadataHash)
}

export const isStakepoolRegistrationCert = (
  test: any,
): test is TxStakepoolRegistrationCert => {
  if (!Array.isArray(test) || test.length !== 10) return false
  const [
    type,
    poolKeyHash,
    vrfPubKeyHash,
    pledge,
    cost,
    margin,
    rewardAddress,
    poolOwnersPubKeyHashes,
    relays,
    metadata,
  ] = test
  return type === TxCertificateKeys.STAKEPOOL_REGISTRATION
    && Buffer.isBuffer(poolKeyHash)
    && Buffer.isBuffer(vrfPubKeyHash)
    && isUint64(pledge)
    && isUint64(cost)
    && isMargin(margin)
    && Buffer.isBuffer(rewardAddress)
    && isArrayOfType<Buffer>(poolOwnersPubKeyHashes, Buffer.isBuffer)
    && Array.isArray(relays)
    && isMetaData(metadata)
}

export const isUnsignedTxDecoded = (
  test: any,
): test is _UnsignedTxDecoded => {
  if (Array.isArray(test)) {
    const txBody = test[0]
    const validKeys = Object.values(TxBodyKeys).filter(Number.isInteger) as Array<number>
    const txBodyKeys: Array<number> = Array.from(txBody.keys())
    return txBodyKeys.every((key) => validKeys.includes(key))
  }
  return false
}
