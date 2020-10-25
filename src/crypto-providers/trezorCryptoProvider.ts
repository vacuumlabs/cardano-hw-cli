import {
  SignedTxCborHex,
  _TxAux,
  _Input,
  _Output,
  _ByronWitness,
  _ShelleyWitness,
  TxCertificateKeys,
  _Certificate,
  _Withdrawal,
  _StakepoolRegistrationCert,
  _DelegationCert,
  _StakingKeyRegistrationCert,
  _StakingKeyDeregistrationCert,
  _PoolRelay,
} from '../transaction/types'
import { CryptoProvider, _AddressParameters } from './types'
import {
  TrezorInput,
  TrezorOutput,
  TrezorWithdrawal,
  TrezorTxCertificate,
  TrezorPoolOwner,
  TrezorPoolRelay,
  TrezorPoolParameters,
  TrezorPoolMetadata,
  TrezorPoolMargin,
} from './trezorTypes'
import {
  Witness,
} from '../transaction/transaction'
import {
  Address,
  BIP32Path,
  HwSigningData,
  Network,
} from '../types'
import {
  encodeAddress,
  filterSigningFiles,
  findSigningPath,
  getAddressAttributes,
  getChangeAddress,
  getSigningPath,
  ipv4ToString,
  ipv6ToString,
  rewardAddressToPubKeyHash,
} from './util'
import NamedError from '../namedError'

import TrezorConnect from '../../trezor-extended/lib'

const TrezorCryptoProvider: () => Promise<CryptoProvider> = async () => {
  TrezorConnect.manifest({
    email: 'todo',
    appUrl: 'todo',
  })
  await TrezorConnect.getFeatures()

  const getVersion = async (): Promise<string> => {
    const { payload: features } = await TrezorConnect.getFeatures()
    const {
      major_version: major,
      minor_version: minor,
      patch_version: patch,
    } = features
    return `Trezor app version ${major}.${minor}.${patch}`
  }

  const showAddress = async (
    paymentPath: BIP32Path, stakingPath: BIP32Path, address: Address,
  ): Promise<void> => {
    const { addressType, networkId, protocolMagic } = getAddressAttributes(address)
    const addressParameters = {
      addressType,
      path: paymentPath,
      stakingPath,
    }
    const response = await TrezorConnect.cardanoGetAddress({
      addressParameters,
      networkId,
      protocolMagic,
      showOnTrezor: true,
    })

    if (response.error || !response.success) throw NamedError('TrezorError')
  }

  const getXPubKey = async (path: BIP32Path): Promise<string> => {
    const { payload } = await TrezorConnect.cardanoGetPublicKey({
      path,
      showOnTrezor: false,
    })
    return payload.publicKey
  }

  const prepareInput = (input: _Input, path?: BIP32Path): TrezorInput => ({
    path,
    prev_hash: input.txHash.toString('hex'),
    prev_index: input.outputIndex,
  })

  const prepareChangeOutput = (
    coins: number,
    changeAddress: _AddressParameters,
  ) => ({
    amount: `${coins}`,
    addressParameters: {
      addressType: changeAddress.addressType,
      path: changeAddress.paymentPath,
      stakingPath: changeAddress.stakePath,
    },
  })

  const prepareOutput = (
    output: _Output,
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): TrezorOutput => {
    const changeAddress = getChangeAddress(changeOutputFiles, output.address, network)
    const address = encodeAddress(output.address)
    if (changeAddress && !changeAddress.address.compare(output.address)) {
      return prepareChangeOutput(output.coins, changeAddress)
    }
    return {
      address,
      amount: `${output.coins}`,
    }
  }

  const prepareStakingKeyRegistrationCert = (
    cert: _StakingKeyRegistrationCert | _StakingKeyDeregistrationCert,
    stakeSigningFiles: HwSigningData[],
  ): TrezorTxCertificate => {
    const path = findSigningPath(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw NamedError('MissingSigningFileForCertificateError')
    return {
      type: cert.type,
      path,
    }
  }

  const prepareDelegationCert = (
    cert: _DelegationCert, stakeSigningFiles: HwSigningData[],
  ): TrezorTxCertificate => {
    const path = findSigningPath(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw NamedError('MissingSigningFileForCertificateError')
    return {
      type: cert.type,
      path,
      pool: cert.poolHash.toString('hex'),
    }
  }

  const preparePoolOwners = (
    owners: Buffer[], stakeSigningFiles: HwSigningData[],
  ): TrezorPoolOwner[] => {
    const poolOwners = owners.map((owner): TrezorPoolOwner => {
      const path = findSigningPath(owner, stakeSigningFiles)
      return path
        ? { stakingKeyPath: path }
        : { stakingKeyHash: owner.toString('hex') }
    })
    const ownersWithPath = poolOwners.filter((owner) => owner.stakingKeyPath)
    if (!ownersWithPath.length) throw NamedError('MissingSigningFileForCertificateError')
    if (ownersWithPath.length > 1) throw NamedError('OwnerMultipleTimesInTxError')
    return poolOwners
  }

  const prepareRelays = (
    relays: _PoolRelay[],
  ): TrezorPoolRelay[] => relays.map((relay) => ({
    type: relay.type,
    port: relay.portNumber,
    ipv4Address: ipv4ToString(relay.ipv4),
    ipv6Address: ipv6ToString(relay.ipv6),
    hostName: relay.dnsName,
  }))

  const prepareStakePoolRegistrationCert = (
    cert: _StakepoolRegistrationCert, stakeSigningFiles: HwSigningData[],
  ): TrezorTxCertificate => {
    const owners: TrezorPoolOwner[] = preparePoolOwners(cert.poolOwnersPubKeyHashes, stakeSigningFiles)
    const relays: TrezorPoolRelay[] = prepareRelays(cert.relays)
    const metadata: TrezorPoolMetadata = {
      url: cert.metadata.metadataUrl,
      hash: cert.metadata.metadataHash.toString('hex'),
    }
    const margin:TrezorPoolMargin = {
      numerator: `${cert.margin.numerator}`,
      denominator: `${cert.margin.denominator}`,
    }
    const poolParameters: TrezorPoolParameters = {
      poolId: cert.poolKeyHash.toString('hex'),
      vrfKeyHash: cert.vrfPubKeyHash.toString('hex'),
      pledge: `${cert.pledge}`,
      cost: `${cert.cost}`,
      margin,
      rewardAccount: encodeAddress(cert.rewardAddress),
      owners,
      relays,
      metadata,
    }
    return {
      type: cert.type,
      poolParameters,
    }
  }

  const prepareCertificate = (
    certificate: _Certificate, stakeSigningFiles: HwSigningData[],
  ): TrezorTxCertificate => {
    switch (certificate.type) {
      case TxCertificateKeys.STAKING_KEY_REGISTRATION:
        return prepareStakingKeyRegistrationCert(certificate, stakeSigningFiles)
      case TxCertificateKeys.STAKING_KEY_DEREGISTRATION:
        return prepareStakingKeyRegistrationCert(certificate, stakeSigningFiles)
      case TxCertificateKeys.DELEGATION:
        return prepareDelegationCert(certificate, stakeSigningFiles)
      case TxCertificateKeys.STAKEPOOL_REGISTRATION:
        return prepareStakePoolRegistrationCert(certificate, stakeSigningFiles)
      default:
        throw NamedError('UnknownCertificateTypeError')
    }
  }

  const prepareWithdrawal = (
    withdrawal: _Withdrawal, stakeSigningFiles: HwSigningData[],
  ): TrezorWithdrawal => {
    const pubKeyHash = rewardAddressToPubKeyHash(withdrawal.address)
    const path = findSigningPath(pubKeyHash, stakeSigningFiles)
    if (!path) throw NamedError('MissingSigningFileForWithdrawalError')
    return {
      path,
      amount: `${withdrawal.coins}`,
    }
  }

  const signTx = async (
    txAux: _TxAux,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<SignedTxCborHex> => {
    const {
      paymentSigningFiles,
      stakeSigningFiles,
    } = filterSigningFiles(signingFiles)
    const inputs = txAux.inputs.map(
      (input, i) => prepareInput(input, getSigningPath(paymentSigningFiles, i)),
    )
    const outputs = txAux.outputs.map(
      (output) => prepareOutput(output, network, changeOutputFiles),
    )
    const certificates = txAux.certificates.map(
      (certificate) => prepareCertificate(certificate, stakeSigningFiles),
    )
    const fee = `${txAux.fee}`
    const ttl = `${txAux.ttl}`
    const withdrawals = txAux.withdrawals.map(
      (withdrawal) => prepareWithdrawal(withdrawal, stakeSigningFiles),
    )

    const response = await TrezorConnect.cardanoSignTransaction({
      inputs,
      outputs,
      protocolMagic: network.protocolMagic,
      fee,
      ttl,
      networkId: network.networkId,
      certificates,
      withdrawals,
    })
    if (response.error || !response.success) {
      throw NamedError('TrezorSignTxError')
    }
    if (response.payload.hash !== txAux.getId()) {
      throw NamedError('TxSerializationMismatchError')
    }

    return response.payload.serializedTx as SignedTxCborHex
  }

  const witnessTx = async (
    txAux: _TxAux,
    signingFile: HwSigningData,
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<_ByronWitness | _ShelleyWitness> => {
    const signedTx = await signTx(txAux, [signingFile], network, changeOutputFiles)
    return Witness(signedTx)
  }

  return {
    getVersion,
    showAddress,
    witnessTx,
    signTx,
    getXPubKey,
  }
}

export {
  TrezorCryptoProvider,
}
