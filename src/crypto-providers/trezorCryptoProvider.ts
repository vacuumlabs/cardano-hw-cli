import TrezorConnect, * as TrezorTypes from 'trezor-connect'
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
  VotingRegistrationMetaData,
} from '../transaction/types'
import {
  CryptoProvider,
  DeviceVersion,
  _AddressParameters,
} from './types'
import {
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
  validateVotingRegistrationAddressType,
} from './util'
import { Errors } from '../errors'
import { decodeCbor, encodeCbor, removeNullFields } from '../util'
import { TREZOR_VERSIONS } from './constants'
import { KesVKey, OpCertIssueCounter, SignedOpCertCborHex } from '../opCert/opCert'
import { parseBIP32Path } from '../command-parser/parsers'

const { bech32 } = require('cardano-crypto.js')

const TrezorCryptoProvider: () => Promise<CryptoProvider> = async () => {
  const initTrezorConnect = async (): Promise<void> => {
    TrezorConnect.manifest({
      email: 'adalite@vacuumlabs.com',
      appUrl: 'https://github.com/vacuumlabs/cardano-hw-cli',
    })

    // without this listener, the passphrase, if enabled, would be infinitely awaited
    // to be inserted in the browser, see https://github.com/trezor/connect/issues/714
    TrezorConnect.on(TrezorTypes.UI_EVENT, (event) => {
      if (event.type === TrezorTypes.UI.REQUEST_PASSPHRASE) {
        if (event.payload.device.features?.capabilities.includes('Capability_PassphraseEntry')) {
          TrezorConnect.uiResponse({
            type: TrezorTypes.UI.RECEIVE_PASSPHRASE,
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
    const isSuccessful = (
      value: any,
    ): value is TrezorTypes.Features => !value.error

    if (!isSuccessful(features)) throw Error(Errors.TrezorVersionError)

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

    if ((response as any).error || !response.success) {
      throw Error(Errors.InvalidAddressParametersProvidedError)
    }
  }

  const getXPubKeys = async (paths: BIP32Path[]): Promise<XPubKeyHex[]> => {
    const { payload } = await TrezorConnect.cardanoGetPublicKey({
      bundle: paths.map((path) => ({
        path,
        showOnTrezor: true,
      })),
    })

    const isSuccessful = (
      value: any,
    ): value is TrezorTypes.CardanoPublicKey[] => !value.error

    if (!isSuccessful(payload)) {
      throw Error(Errors.TrezorXPubKeyCancelled)
    }
    return payload.map((result) => result.publicKey as XPubKeyHex)
  }

  const prepareInput = (input: _Input, path: BIP32Path | null): TrezorTypes.CardanoInput => ({
    path: path as number[], // TODO: Check if null
    prev_hash: input.txHash.toString('hex'),
    prev_index: input.outputIndex,
  })

  const prepareTokenBundle = (
    multiAssets: _MultiAsset[],
  ): TrezorTypes.CardanoAssetGroup[] => multiAssets.map(({ policyId, assets }) => {
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
    tokenBundle?: TrezorTypes.CardanoAssetGroup[],
  ): TrezorTypes.CardanoOutput => ({
    amount: lovelaceAmount.toString(),
    addressParameters: {
      addressType: changeAddress.addressType,
      path: changeAddress.paymentPath as BIP32Path,
      stakingPath: changeAddress.stakePath,
    },
    tokenBundle,
  })

  const prepareOutput = (
    output: _Output,
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): TrezorTypes.CardanoOutput => {
    const changeAddress = getAddressParameters(changeOutputFiles, output.address, network)
    const address = encodeAddress(output.address)
    const tokenBundle = prepareTokenBundle(output.tokenBundle)

    if (changeAddress && !changeAddress.address.compare(output.address)) {
      return prepareChangeOutput(output.coins, changeAddress, tokenBundle)
    }

    return ({
      address,
      amount: output.coins.toString(),
      tokenBundle,
    })
  }

  const prepareStakingKeyRegistrationCert = (
    cert: _StakingKeyRegistrationCert,
    stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoCertificate => {
    const path = findSigningPathForKeyHash(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
    return {
      type: TrezorTypes.CardanoCertificateType.STAKE_REGISTRATION,
      path,
    }
  }

  const prepareStakingKeyDeregistrationCert = (
    cert: _StakingKeyDeregistrationCert,
    stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoCertificate => {
    const path = findSigningPathForKeyHash(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
    return {
      type: TrezorTypes.CardanoCertificateType.STAKE_DEREGISTRATION,
      path,
    }
  }

  const prepareDelegationCert = (
    cert: _DelegationCert, stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoCertificate => {
    const path = findSigningPathForKeyHash(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
    return {
      type: TrezorTypes.CardanoCertificateType.STAKE_DELEGATION,
      path,
      pool: cert.poolHash.toString('hex'),
    }
  }

  const preparePoolOwners = (
    owners: Buffer[], stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoPoolOwner[] => {
    const poolOwners = owners.map((owner): TrezorTypes.CardanoPoolOwner => {
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
  ): TrezorTypes.CardanoPoolRelay[] => relays.map((relay) => ({
    type: relay.type as number,
    port: relay.portNumber,
    ipv4Address: ipv4ToString(relay.ipv4),
    ipv6Address: ipv6ToString(relay.ipv6),
    hostName: relay.dnsName,
  }))

  const prepareStakePoolRegistrationCert = (
    cert: _StakepoolRegistrationCert, stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoCertificate => {
    const owners: TrezorTypes.CardanoPoolOwner[] = (
      preparePoolOwners(cert.poolOwnersPubKeyHashes, stakeSigningFiles)
    )
    const relays: TrezorTypes.CardanoPoolRelay[] = prepareRelays(cert.relays)
    const metadata: TrezorTypes.CardanoPoolMetadata | null = cert.metadata
      ? {
        url: cert.metadata.metadataUrl,
        hash: cert.metadata.metadataHash.toString('hex'),
      }
      : null
    const margin: TrezorTypes.CardanoPoolMargin = {
      numerator: `${cert.margin.numerator}`,
      denominator: `${cert.margin.denominator}`,
    }
    const poolParameters: TrezorTypes.CardanoPoolParameters = {
      poolId: cert.poolKeyHash.toString('hex'),
      vrfKeyHash: cert.vrfPubKeyHash.toString('hex'),
      pledge: `${cert.pledge}`,
      cost: `${cert.cost}`,
      margin,
      rewardAccount: encodeAddress(cert.rewardAccount),
      owners,
      relays,
      // metadata can be null in case of private pool, library type definition is wrong:
      metadata: metadata as TrezorTypes.CardanoPoolMetadata,
    }
    return {
      type: TrezorTypes.CardanoCertificateType.STAKE_POOL_REGISTRATION,
      path: null as any, // path can be null here, library type definition is wrong
      poolParameters,
    }
  }

  const prepareCertificate = (
    certificate: _Certificate, stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoCertificate => {
    switch (certificate.type) {
      case TxCertificateKeys.STAKING_KEY_REGISTRATION:
        return prepareStakingKeyRegistrationCert(certificate, stakeSigningFiles)
      case TxCertificateKeys.STAKING_KEY_DEREGISTRATION:
        return prepareStakingKeyDeregistrationCert(certificate, stakeSigningFiles)
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
  ): TrezorTypes.CardanoWithdrawal => {
    const pubKeyHash = rewardAddressToPubKeyHash(withdrawal.address)
    const path = findSigningPathForKeyHash(pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForWithdrawalError)
    return {
      path,
      amount: `${withdrawal.coins}`,
    }
  }

  const prepareTtl = (ttl: BigInt | null): string | undefined => (ttl != null ? ttl.toString() : undefined)

  const prepareValidityIntervalStart = (validityIntervalStart: BigInt | null): string | undefined => (
    validityIntervalStart != null ? validityIntervalStart.toString() : undefined
  )

  const prepareMetaDataHex = (metaData: Buffer | null): TrezorTypes.CardanoAuxiliaryData | undefined => (
    metaData ? ({
      blob: encodeCbor(metaData).toString('hex'),
    }) as TrezorTypes.CardanoAuxiliaryData : undefined // Forced cast due to wrong type definition in connect
  )

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
    // console.log(signingFiles)
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

    const auxiliaryData = prepareMetaDataHex(txAux.meta)

    const request: TrezorTypes.CommonParams & TrezorTypes.CardanoSignTransaction = {
      inputs,
      outputs,
      protocolMagic: network.protocolMagic,
      fee,
      ttl,
      validityIntervalStart,
      networkId: network.networkId,
      certificates,
      withdrawals,
      auxiliaryData,
    }

    // TODO: removeNullFields shouldn't be necessary, remove when fixed in trezor connect
    const response = await TrezorConnect.cardanoSignTransaction(removeNullFields(request))

    if (!response.success) {
      throw Error(response.payload.error)
    }
    if (response.payload.hash !== txAux.getId()) {
      throw Error(Errors.TxSerializationMismatchError)
    }

    return response.payload.serializedTx as SignedTxCborHex
  }

  const prepareVoteAuxiliaryData = (
    hwStakeSigningFile: HwSigningData,
    votingPublicKeyHex: VotePublicKeyHex,
    addressParameters: _AddressParameters,
    nonce: BigInt,
  ): TrezorTypes.CardanoAuxiliaryData => {
    const prepareAddressParameters = () => {
      if (addressParameters.addressType === TrezorTypes.CardanoAddressType.BASE) {
        return {
          addressType: addressParameters.addressType,
          path: addressParameters.paymentPath as BIP32Path,
          stakingPath: addressParameters.stakePath,
        }
      }
      if (addressParameters.addressType === TrezorTypes.CardanoAddressType.REWARD) {
        return {
          addressType: addressParameters.addressType,
          path: addressParameters.stakePath as BIP32Path,
        }
      }
      throw Error(Errors.InvalidVotingRegistrationAddressType)
    }

    return {
      catalystRegistrationParameters: {
        votingPublicKey: votingPublicKeyHex,
        stakingPath: hwStakeSigningFile.path,
        rewardAddressParameters: prepareAddressParameters(),
        nonce: `${nonce}`,
      },
    }
  }

  const prepareDummyInput = (): TrezorTypes.CardanoInput => ({
    path: parseBIP32Path('1852H/1815H/0H/0/0'),
    prev_hash: '0'.repeat(64),
    prev_index: 0,
  })

  const prepareDummyOutput = (): TrezorTypes.CardanoOutput => ({
    addressParameters: {
      addressType: TrezorTypes.CardanoAddressType.BASE,
      path: parseBIP32Path('1852H/1815H/0H/0/0'),
      stakingPath: parseBIP32Path('1852H/1815H/0H/2/0'),
    },
    amount: '1',
  })

  const prepareDummyTx = (
    network: Network, auxiliaryData: TrezorTypes.CardanoAuxiliaryData,
  ): TrezorTypes.CommonParams & TrezorTypes.CardanoSignTransaction => ({
    protocolMagic: network.protocolMagic,
    networkId: network.networkId,
    inputs: [prepareDummyInput()],
    outputs: [prepareDummyOutput()],
    fee: '0',
    ttl: '0',
    auxiliaryData,
  })

  const extractTrezorSignedAuxiliaryData = (
    payload: TrezorTypes.CardanoSignedTx,
  ): VotingRegistrationMetaData => {
    try {
      const { serializedTx } = payload
      const votingRegistrationMetaData = decodeCbor(serializedTx)[2][0]
      return votingRegistrationMetaData
    } catch (e) {
      throw Error(Errors.MissingAuxiliaryDataSupplement)
    }
  }

  const signVotingRegistrationMetaData = async (
    auxiliarySigningFiles: HwSigningData[],
    hwStakeSigningFile: HwSigningData,
    rewardAddressBech32: string,
    votePublicKeyHex: VotePublicKeyHex,
    network: Network,
    nonce: BigInt,
  ): Promise<VotingRegistrationMetaDataCborHex> => {
    const { data: address } : { data: Buffer } = bech32.decode(rewardAddressBech32)
    const addressParams = getAddressParameters(auxiliarySigningFiles, address, network)
    if (!addressParams || addressParams.address.compare(address)) {
      throw Error(Errors.AuxSigningFileNotFoundForVotingRewardAddress)
    }

    validateVotingRegistrationAddressType(addressParams.addressType)

    const trezorAuxData = prepareVoteAuxiliaryData(hwStakeSigningFile, votePublicKeyHex, addressParams, nonce)
    const dummyTx = prepareDummyTx(network, trezorAuxData)

    const response = await TrezorConnect.cardanoSignTransaction(dummyTx)

    if (!response.success) {
      throw Error(response.payload.error)
    }

    const votingRegistrationMetaData = extractTrezorSignedAuxiliaryData(response.payload)

    return encodeCbor(votingRegistrationMetaData).toString('hex')
  }

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
