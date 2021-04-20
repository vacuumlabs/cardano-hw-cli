import { UI, UI_EVENT } from 'trezor-connect'
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
  _MultiAsset,
  VotingRegistrationMetaDataCborHex,
} from '../transaction/types'
import {
  CryptoProvider,
  DeviceVersion,
  _AddressParameters,
} from './types'
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
  TrezorMultiAsset,
  TrezorCryptoProviderFeature,
} from './trezorTypes'
import {
  Witness,
} from '../transaction/transaction'
import {
  Address,
  BIP32Path,
  HwSigningData,
  Network,
  VotePublicKeyHex,
  XPubKeyHex,
} from '../types'
import {
  encodeAddress,
  filterSigningFiles,
  findSigningPathForKeyHash,
  getAddressAttributes,
  getSigningPath,
  ipv4ToString,
  ipv6ToString,
  rewardAddressToPubKeyHash,
  isDeviceVersionGTE,
  getAddressParameters,
} from './util'
import { Errors } from '../errors'
import { encodeCbor, removeNullFields } from '../util'
import { TREZOR_VERSIONS } from './constants'
import { KesVKey, OpCertIssueCounter, SignedOpCertCborHex } from '../opCert/opCert'

// using require to suppress type errors from trezor-connect
const TrezorConnect = require('trezor-connect').default

const TrezorCryptoProvider: () => Promise<CryptoProvider> = async () => {
  const initTrezorConnect = async (): Promise<void> => {
    TrezorConnect.manifest({
      email: 'adalite@vacuumlabs.com',
      appUrl: 'https://github.com/vacuumlabs/cardano-hw-cli',
    })

    // without this listener, the passphrase, if enabled, would be infinitely awaited
    // to be inserted in the browser, see https://github.com/trezor/connect/issues/714
    TrezorConnect.on(UI_EVENT, (event) => {
      if (event.type === UI.REQUEST_PASSPHRASE) {
        if (event.payload.device.features.capabilities.includes('Capability_PassphraseEntry')) {
          TrezorConnect.uiResponse({
            type: UI.RECEIVE_PASSPHRASE,
            payload: {
              passphraseOnDevice: true,
              save: true,
              value: '',
            },
          })
        } else {
          throw Error(Errors.TrezorPassphraseNotInsertableOnDevice)
        }
      }
    })

    await TrezorConnect.getFeatures()
  }

  await initTrezorConnect()

  const getDeviceVersion = async (): Promise<DeviceVersion> => {
    const { payload: features } = await TrezorConnect.getFeatures()
    const { major_version: major, minor_version: minor, patch_version: patch } = features
    return { major, minor, patch }
  }

  const deviceVersion = await getDeviceVersion()

  const getVersion = async (): Promise<string> => {
    const { major, minor, patch } = await getDeviceVersion()
    return `Trezor app version ${major}.${minor}.${patch}`
  }

  const isFeatureSupportedForVersion = (
    feature: TrezorCryptoProviderFeature,
  ): boolean => TREZOR_VERSIONS[feature] && isDeviceVersionGTE(deviceVersion, TREZOR_VERSIONS[feature])

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

    if (response.error || !response.success) throw Error(Errors.InvalidAddressParametersProvidedError)
  }

  const getXPubKeys = async (paths: BIP32Path[]): Promise<XPubKeyHex[]> => {
    const { payload } = await TrezorConnect.cardanoGetPublicKey({
      bundle: paths.map((path) => ({
        path,
        showOnTrezor: true,
      })),
    })
    if (payload.error) {
      throw Error(Errors.TrezorXPubKeyCancelled)
    }
    return payload.map((result) => result.publicKey)
  }

  const prepareInput = (input: _Input, path: BIP32Path | null): TrezorInput => ({
    path,
    prev_hash: input.txHash.toString('hex'),
    prev_index: input.outputIndex,
  })

  const prepareTokenBundle = (
    multiAssets: _MultiAsset[],
  ): TrezorMultiAsset => multiAssets.map(({ policyId, assets }) => {
    const tokenAmounts = assets.map(({ assetName, amount }) => ({
      assetNameBytes: assetName.toString('hex'),
      amount: amount.toString(),
    }))
    return {
      policyId: policyId.toString('hex'),
      tokenAmounts,
    }
  })

  const prepareChangeOutput = (
    lovelaceAmount: BigInt,
    changeAddress: _AddressParameters,
    tokenBundle?: TrezorMultiAsset,
  ): TrezorOutput => ({
    amount: lovelaceAmount.toString(),
    addressParameters: {
      addressType: changeAddress.addressType,
      path: changeAddress.paymentPath,
      stakingPath: changeAddress.stakePath,
    },
    tokenBundle,
  })

  const prepareOutput = (
    output: _Output,
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): TrezorOutput => {
    const changeAddress = getAddressParameters(changeOutputFiles, output.address, network)
    const address = encodeAddress(output.address)
    const tokenBundle = prepareTokenBundle(output.tokenBundle)

    if (changeAddress && !changeAddress.address.compare(output.address)) {
      return prepareChangeOutput(output.coins, changeAddress, tokenBundle)
    }

    const trezorOutput: TrezorOutput = {
      address,
      amount: output.coins.toString(),
      tokenBundle,
    }

    return removeNullFields(trezorOutput) as TrezorOutput
  }

  const prepareStakingKeyRegistrationCert = (
    cert: _StakingKeyRegistrationCert | _StakingKeyDeregistrationCert,
    stakeSigningFiles: HwSigningData[],
  ): TrezorTxCertificate => {
    const path = findSigningPathForKeyHash(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
    return {
      type: cert.type,
      path,
    }
  }

  const prepareDelegationCert = (
    cert: _DelegationCert, stakeSigningFiles: HwSigningData[],
  ): TrezorTxCertificate => {
    const path = findSigningPathForKeyHash(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
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
      const path = findSigningPathForKeyHash(owner, stakeSigningFiles)
      return path
        ? { stakingKeyPath: path }
        : { stakingKeyHash: owner.toString('hex') }
    })
    const ownersWithPath = poolOwners.filter((owner) => owner.stakingKeyPath)
    if (!ownersWithPath.length) throw Error(Errors.MissingSigningFileForCertificateError)
    if (ownersWithPath.length > 1) throw Error(Errors.OwnerMultipleTimesInTxError)
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
    const metadata: TrezorPoolMetadata = cert.metadata
      ? {
        url: cert.metadata.metadataUrl,
        hash: cert.metadata.metadataHash.toString('hex'),
      }
      : null
    const margin: TrezorPoolMargin = {
      numerator: `${cert.margin.numerator}`,
      denominator: `${cert.margin.denominator}`,
    }
    const poolParameters: TrezorPoolParameters = {
      poolId: cert.poolKeyHash.toString('hex'),
      vrfKeyHash: cert.vrfPubKeyHash.toString('hex'),
      pledge: `${cert.pledge}`,
      cost: `${cert.cost}`,
      margin,
      rewardAccount: encodeAddress(cert.rewardAccount),
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
        throw Error(Errors.UnknownCertificateTypeError)
    }
  }

  const prepareWithdrawal = (
    withdrawal: _Withdrawal, stakeSigningFiles: HwSigningData[],
  ): TrezorWithdrawal => {
    const pubKeyHash = rewardAddressToPubKeyHash(withdrawal.address)
    const path = findSigningPathForKeyHash(pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForWithdrawalError)
    return {
      path,
      amount: `${withdrawal.coins}`,
    }
  }

  const prepareTtl = (ttl: BigInt | null): string | null => ttl && ttl.toString()

  const prepareValidityIntervalStart = (validityIntervalStart: BigInt | null): string | null => (
    validityIntervalStart && validityIntervalStart.toString()
  )

  const prepareMetaDataHex = (metaData: Buffer | null): string | null => {
    if (Array.isArray(metaData)) {
      throw Error(Errors.TrezorUnsupportedMetaData)
    }
    return metaData && encodeCbor(metaData).toString('hex')
  }

  const ensureFirmwareSupportsParams = (txAux: _TxAux) => {
    if (txAux.ttl == null && !isFeatureSupportedForVersion(TrezorCryptoProviderFeature.OPTIONAL_TTL)) {
      throw Error(Errors.TrezorOptionalTTLNotSupported)
    }
    if (
      txAux.validityIntervalStart != null
      && !isFeatureSupportedForVersion(TrezorCryptoProviderFeature.VALIDITY_INTERVAL_START)
    ) {
      throw Error(Errors.TrezorValidityIntervalStartNotSupported)
    }
    txAux.outputs.forEach((output) => {
      const multiAssets: _MultiAsset[] = output.tokenBundle
      if (multiAssets.length > 0 && !isFeatureSupportedForVersion(TrezorCryptoProviderFeature.MULTI_ASSET)) {
        throw Error(Errors.TrezorMultiAssetsNotSupported)
      }
    })
  }

  const signTx = async (
    txAux: _TxAux,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<SignedTxCborHex> => {
    ensureFirmwareSupportsParams(txAux)
    const {
      paymentSigningFiles,
      stakeSigningFiles,
    } = filterSigningFiles(signingFiles)
    const inputs = txAux.inputs.map(
      (input: _Input, i: number) => prepareInput(input, getSigningPath(paymentSigningFiles, i)),
    )
    const outputs = txAux.outputs.map(
      (output: _Output) => prepareOutput(output, network, changeOutputFiles),
    )
    const certificates = txAux.certificates.map(
      (certificate: _Certificate) => prepareCertificate(certificate, stakeSigningFiles),
    )
    const fee = txAux.fee.toString()
    const ttl = prepareTtl(txAux.ttl)
    const validityIntervalStart = prepareValidityIntervalStart(txAux.validityIntervalStart)
    const withdrawals = txAux.withdrawals.map(
      (withdrawal: _Withdrawal) => prepareWithdrawal(withdrawal, stakeSigningFiles),
    )
    const metaDataHex = prepareMetaDataHex(txAux.meta)

    const response = await TrezorConnect.cardanoSignTransaction(removeNullFields({
      inputs,
      outputs,
      protocolMagic: network.protocolMagic,
      fee,
      ttl,
      validityIntervalStart,
      networkId: network.networkId,
      certificates,
      withdrawals,
      metadata: metaDataHex,
    }))

    if (!response.success) {
      throw Error(response.payload.error)
    }
    if (response.payload.hash !== txAux.getId()) {
      throw Error(Errors.TxSerializationMismatchError)
    }

    return response.payload.serializedTx as SignedTxCborHex
  }

  const signVotingRegistrationMetaData = async (
    auxiliarySigningFiles: HwSigningData[],
    hwStakeSigningFile: HwSigningData,
    paymentAddressBech32: string,
    votePublicKeyHex: VotePublicKeyHex,
    network: Network,
    nonce: BigInt,
  ): Promise<VotingRegistrationMetaDataCborHex> => null as any

  const witnessTx = async (
    txAux: _TxAux,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<Array<_ByronWitness | _ShelleyWitness>> => {
    const signedTx = await signTx(txAux, signingFiles, network, changeOutputFiles)
    return Witness(signedTx)
  }

  const signOperationalCertificate = async (
    kesVKey: KesVKey,
    kesPeriod: BigInt,
    issueCounter: OpCertIssueCounter,
    signingFile: HwSigningData[],
  ): Promise<SignedOpCertCborHex> => {
    // TODO is this the right way to deal with this?
    throw Error(Errors.UnsupportedCryptoProviderCall)
  }

  return {
    getVersion,
    showAddress,
    witnessTx,
    signTx,
    getXPubKeys,
    signOperationalCertificate,
    signVotingRegistrationMetaData,
  }
}

export {
  TrezorCryptoProvider,
}
