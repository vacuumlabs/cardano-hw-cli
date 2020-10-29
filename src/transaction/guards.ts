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
} from './types'

export const isLovelace = (test: any): test is number => {
  if (typeof test === 'number') return true
  try {
    BigInt(test)
    return true
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
  if (!Array.isArray(test) || test.length !== 2) return false
  const [address, coins] = test
  return Buffer.isBuffer(address) && isLovelace(coins)
}

export const isWithdrawalsMap = (
  test: any,
): test is TxWithdrawal => test instanceof Map
  && Array.from(test.keys()).every((key) => Buffer.isBuffer(key))
  && Array.from(test.values()).every((value) => isLovelace(value))

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
  return 'value' in test
    && 0 in test.value
    && Number.isInteger(test.value[0])
    && 1 in test.value
    && Number.isInteger(test.value[1])
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
    && isLovelace(pledge)
    && isLovelace(cost)
    && isMargin(margin)
    && Buffer.isBuffer(rewardAddress)
    && isArrayOfType<Buffer>(poolOwnersPubKeyHashes, Buffer.isBuffer)
    && Array.isArray(relays)
    && isMetaData(metadata)
}
