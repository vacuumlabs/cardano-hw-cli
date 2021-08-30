import TrezorConnect, * as TrezorTypes from 'trezor-connect'
import {
  SignedTxCborHex,
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
  _UnsignedTxParsed,
  TxWitnesses,
  TxWitnessKeys,
  AddrKeyHash,
} from '../transaction/types'
import {
  CryptoProvider,
  DeviceVersion,
  _AddressParameters,
} from './types'
import { TrezorCryptoProviderFeature } from './trezorTypes'
import {
  TxByronWitness,
  TxShelleyWitness,
  TxSigned,
} from '../transaction/transaction'
import {
  Address,
  BIP32Path,
  HexString,
  HwSigningData,
  NativeScript,
  NativeScriptDisplayFormat,
  NativeScriptHashKeyHex,
  Network,
  PubKeyHex,
  VotePublicKeyHex,
  XPubKeyHex,
  NativeScriptType,
  AddressType,
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
  splitXPubKeyCborHex,
  encodeVotingRegistrationMetaData,
} from './util'
import { Errors } from '../errors'
import { partition, removeNullFields } from '../util'
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
    paymentPath: BIP32Path,
    _paymentScriptHash: string,
    stakingPath: BIP32Path,
    _stakingScriptHash: string,
    address: Address,
  ): Promise<void> => {
    const { addressType, networkId, protocolMagic } = getAddressAttributes(address)
    // TODO: Trezor support for multisig addresses
    if (addressType in [
      AddressType.BASE_PAYMENT_KEY_STAKE_SCRIPT,
      AddressType.BASE_PAYMENT_SCRIPT_STAKE_KEY,
      AddressType.BASE_PAYMENT_SCRIPT_STAKE_SCRIPT,
    ]) {
      throw Error(Errors.UnsupportedCryptoProviderCall)
    }
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

  const determineSigningMode = (certificates: _Certificate[], signingFiles: HwSigningData[]) => {
    const poolRegistrationCert = certificates.find(
      (cert) => cert.type === TxCertificateKeys.STAKEPOOL_REGISTRATION,
    ) as _StakepoolRegistrationCert

    if (poolRegistrationCert) {
      return TrezorTypes.CardanoTxSigningMode.POOL_REGISTRATION_AS_OWNER
    }

    return TrezorTypes.CardanoTxSigningMode.ORDINARY_TRANSACTION
  }

  const prepareInput = (input: _Input, path: BIP32Path | null): TrezorTypes.CardanoInput => ({
    path: path as number[], // TODO: Check if null
    prev_hash: input.txHash.toString('hex'),
    prev_index: input.outputIndex,
  })

  const prepareTokenBundle = (
    multiAssets: _MultiAsset[],
    isMint: boolean,
  ): TrezorTypes.CardanoAssetGroup[] => multiAssets.map(({ policyId, assets }) => {
    const tokenAmounts = assets.map(({ assetName, amount }) => (removeNullFields({
      assetNameBytes: assetName.toString('hex'),
      amount: !isMint ? amount.toString() : undefined,
      mintAmount: isMint ? amount.toString() : undefined,
    })))
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
    const changeAddressParams = getAddressParameters(changeOutputFiles, output.address, network)
    const address = encodeAddress(output.address)
    const tokenBundle = prepareTokenBundle(output.tokenBundle, false)

    if (changeAddressParams) {
      return prepareChangeOutput(output.coins, changeAddressParams, tokenBundle)
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
    const path = findSigningPathForKeyHash(
      (cert.stakeCredentials as AddrKeyHash).addrKeyHash, stakeSigningFiles,
    )
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
    const path = findSigningPathForKeyHash(
      (cert.stakeCredentials as AddrKeyHash).addrKeyHash, stakeSigningFiles,
    )
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
    return {
      type: TrezorTypes.CardanoCertificateType.STAKE_DEREGISTRATION,
      path,
    }
  }

  const prepareDelegationCert = (
    cert: _DelegationCert, stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoCertificate => {
    const path = findSigningPathForKeyHash(
      (cert.stakeCredentials as AddrKeyHash).addrKeyHash, stakeSigningFiles,
    )
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

  const prepareMetaDataHashHex = (
    metaDataHash: Buffer | null,
  ): TrezorTypes.CardanoAuxiliaryData | undefined => (
    metaDataHash ? ({
      hash: metaDataHash.toString('hex'),
    }) : undefined
  )

  const prepareAdditionalWitnessRequests = (
    mintSigningFiles: HwSigningData[],
  ) => mintSigningFiles.map((f) => f.path)

  const ensureFirmwareSupportsParams = (unsignedTxParsed: _UnsignedTxParsed) => {
    if (
      unsignedTxParsed.ttl == null && !isFeatureSupportedForVersion(TrezorCryptoProviderFeature.OPTIONAL_TTL)
    ) {
      throw Error(Errors.TrezorOptionalTTLNotSupported)
    }
    if (
      unsignedTxParsed.validityIntervalStart != null
      && !isFeatureSupportedForVersion(TrezorCryptoProviderFeature.VALIDITY_INTERVAL_START)
    ) {
      throw Error(Errors.TrezorValidityIntervalStartNotSupported)
    }
    unsignedTxParsed.outputs.forEach((output) => {
      const multiAssets: _MultiAsset[] = output.tokenBundle
      if (multiAssets.length > 0 && !isFeatureSupportedForVersion(TrezorCryptoProviderFeature.MULTI_ASSET)) {
        throw Error(Errors.TrezorMultiAssetsNotSupported)
      }
    })
  }

  const createWitnesses = (
    trezorWitnesses: TrezorTypes.CardanoSignedTxWitness[],
    signingFiles: HwSigningData[],
  ): TxWitnesses => {
    const getSigningFileDataByXPubKey = (pubKey: PubKeyHex): HwSigningData => {
      const hwSigningData = signingFiles.find(
        (signingFile) => splitXPubKeyCborHex(signingFile.cborXPubKeyHex).pubKey.toString('hex') === pubKey,
      )
      if (hwSigningData) return hwSigningData
      throw Error(Errors.MissingHwSigningDataAtXPubKeyError)
    }

    const [byronWitnesses, shelleyWitnesses] = partition(
      trezorWitnesses.map((witness) => {
        const signingFile = getSigningFileDataByXPubKey(witness.pubKey as PubKeyHex)
        return ({
          ...witness,
          path: signingFile.path,
          pubKey: Buffer.from(witness.pubKey, 'hex'),
          chainCode: witness.chainCode
            ? Buffer.from(witness.chainCode, 'hex')
            : splitXPubKeyCborHex(signingFile.cborXPubKeyHex).chainCode,
          signature: Buffer.from(witness.signature, 'hex'),
        })
      }),
      (witness) => witness.type === TrezorTypes.CardanoTxWitnessType.BYRON_WITNESS,
    )

    return ({
      byronWitnesses: byronWitnesses.map((witness) => (
        TxByronWitness(witness.pubKey, witness.signature, witness.chainCode, {})
      )),
      shelleyWitnesses: shelleyWitnesses.map((witness) => (
        TxShelleyWitness(witness.pubKey, witness.signature)
      )),
    })
  }

  const trezorSignTx = async (
    unsignedTxParsed: _UnsignedTxParsed,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<TrezorTypes.CardanoSignedTxWitness[]> => {
    ensureFirmwareSupportsParams(unsignedTxParsed)
    const { paymentSigningFiles, stakeSigningFiles, mintSigningFiles } = filterSigningFiles(signingFiles)

    const signingMode = determineSigningMode(unsignedTxParsed.certificates, signingFiles)

    const inputs = unsignedTxParsed.inputs.map(
      (input: _Input, i: number) => prepareInput(input, getSigningPath(paymentSigningFiles, i)),
    )
    const outputs = unsignedTxParsed.outputs.map(
      (output: _Output) => prepareOutput(output, network, changeOutputFiles),
    )
    const certificates = unsignedTxParsed.certificates.map(
      (certificate: _Certificate) => prepareCertificate(certificate, stakeSigningFiles),
    )
    const fee = unsignedTxParsed.fee.toString()
    const ttl = prepareTtl(unsignedTxParsed.ttl)
    const validityIntervalStart = prepareValidityIntervalStart(unsignedTxParsed.validityIntervalStart)
    const withdrawals = unsignedTxParsed.withdrawals.map(
      (withdrawal: _Withdrawal) => prepareWithdrawal(withdrawal, stakeSigningFiles),
    )

    const auxiliaryData = prepareMetaDataHashHex(unsignedTxParsed.metaDataHash)

    let mint
    if (unsignedTxParsed.mint) mint = prepareTokenBundle(unsignedTxParsed.mint, true)

    const additionalWitnessRequests = prepareAdditionalWitnessRequests(mintSigningFiles)

    const request: TrezorTypes.CommonParams & TrezorTypes.CardanoSignTransaction = {
      signingMode,
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
      mint,
      additionalWitnessRequests,
    }

    // TODO: removeNullFields shouldn't be necessary, remove when fixed in trezor connect
    const response = await TrezorConnect.cardanoSignTransaction(removeNullFields(request))

    if (!response.success) {
      throw Error(response.payload.error)
    }
    if (response.payload.hash !== unsignedTxParsed.getId()) {
      throw Error(Errors.TxSerializationMismatchError)
    }

    return response.payload.witnesses
  }

  const signTx = async (
    unsignedTxParsed: _UnsignedTxParsed,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<SignedTxCborHex> => {
    const trezorWitnesses = await trezorSignTx(unsignedTxParsed, signingFiles, network, changeOutputFiles)
    const { byronWitnesses, shelleyWitnesses } = createWitnesses(trezorWitnesses, signingFiles)
    return TxSigned(unsignedTxParsed.unsignedTxDecoded, byronWitnesses, shelleyWitnesses)
  }

  const witnessTx = async (
    unsignedTxParsed: _UnsignedTxParsed,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<Array<_ByronWitness | _ShelleyWitness>> => {
    const ledgerWitnesses = await trezorSignTx(unsignedTxParsed, signingFiles, network, changeOutputFiles)
    const { byronWitnesses, shelleyWitnesses } = await createWitnesses(ledgerWitnesses, signingFiles)
    const _byronWitnesses = byronWitnesses.map((byronWitness) => (
      { key: TxWitnessKeys.BYRON, data: byronWitness }
    ) as _ByronWitness)
    const _shelleyWitnesses = shelleyWitnesses.map((shelleyWitness) => (
      { key: TxWitnessKeys.SHELLEY, data: shelleyWitness }
    ) as _ShelleyWitness)

    return [..._shelleyWitnesses, ..._byronWitnesses]
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
          stakingPath: addressParameters.stakePath as BIP32Path,
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
    signingMode: TrezorTypes.CardanoTxSigningMode.ORDINARY_TRANSACTION,
    protocolMagic: network.protocolMagic,
    networkId: network.networkId,
    inputs: [prepareDummyInput()],
    outputs: [prepareDummyOutput()],
    fee: '0',
    ttl: '0',
    auxiliaryData,
  })

  const signVotingRegistrationMetaData = async (
    rewardAddressSigningFiles: HwSigningData[],
    hwStakeSigningFile: HwSigningData,
    rewardAddressBech32: string,
    votePublicKeyHex: VotePublicKeyHex,
    network: Network,
    nonce: BigInt,
  ): Promise<VotingRegistrationMetaDataCborHex> => {
    const { data: address } : { data: Buffer } = bech32.decode(rewardAddressBech32)
    const addressParams = getAddressParameters(rewardAddressSigningFiles, address, network)
    if (!addressParams) {
      throw Error(Errors.AuxSigningFileNotFoundForVotingRewardAddress)
    }

    validateVotingRegistrationAddressType(addressParams.addressType)

    const trezorAuxData = prepareVoteAuxiliaryData(hwStakeSigningFile, votePublicKeyHex, addressParams, nonce)
    const dummyTx = prepareDummyTx(network, trezorAuxData)

    const response = await TrezorConnect.cardanoSignTransaction(dummyTx)
    if (!response.success) {
      throw Error(response.payload.error)
    }
    if (!response?.payload?.auxiliaryDataSupplement) throw Error(Errors.MissingAuxiliaryDataSupplement)
    if (!response?.payload?.auxiliaryDataSupplement.catalystSignature) {
      throw Error(Errors.MissingCatalystVotingSignature)
    }

    return encodeVotingRegistrationMetaData(
      hwStakeSigningFile,
      votePublicKeyHex,
      address,
      nonce,
      response.payload.auxiliaryDataSupplement.auxiliaryDataHash as HexString,
      response.payload.auxiliaryDataSupplement.catalystSignature as HexString,
    )
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

  const nativeScriptToTrezorTypes = (
    nativeScript: NativeScript,
  ): TrezorTypes.CardanoNativeScript => {
    switch (nativeScript.type) {
      case NativeScriptType.PUBKEY:
        return {
          type: TrezorTypes.CardanoNativeScriptType.PUB_KEY,
          keyHash: nativeScript.keyHash,
        }
      case NativeScriptType.ALL:
        return {
          type: TrezorTypes.CardanoNativeScriptType.ALL,
          scripts: nativeScript.scripts.map(nativeScriptToTrezorTypes),
        }
      case NativeScriptType.ANY:
        return {
          type: TrezorTypes.CardanoNativeScriptType.ANY,
          scripts: nativeScript.scripts.map(nativeScriptToTrezorTypes),
        }
      case NativeScriptType.N_OF_K:
        return {
          type: TrezorTypes.CardanoNativeScriptType.N_OF_K,
          requiredSignaturesCount: Number(nativeScript.required),
          scripts: nativeScript.scripts.map(nativeScriptToTrezorTypes),
        }
      case NativeScriptType.INVALID_BEFORE:
        return {
          type: TrezorTypes.CardanoNativeScriptType.INVALID_BEFORE,
          invalidBefore: nativeScript.slot.toString(10),
        }
      case NativeScriptType.INVALID_HEREAFTER:
        return {
          type: TrezorTypes.CardanoNativeScriptType.INVALID_HEREAFTER,
          invalidHereafter: nativeScript.slot.toString(10),
        }
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const nativeScriptDisplayFormatToTrezorType = (
    displayFormat: NativeScriptDisplayFormat,
  ): TrezorTypes.CardanoNativeScriptHashDisplayFormat => {
    switch (displayFormat) {
      case NativeScriptDisplayFormat.BECH32:
        return TrezorTypes.CardanoNativeScriptHashDisplayFormat.BECH32
      case NativeScriptDisplayFormat.POLICY_ID:
        return TrezorTypes.CardanoNativeScriptHashDisplayFormat.POLICY_ID
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const deriveNativeScriptHash = async (
    nativeScript: NativeScript,
    displayFormat: NativeScriptDisplayFormat,
  ): Promise<NativeScriptHashKeyHex> => {
    const response = await TrezorConnect.cardanoGetNativeScriptHash({
      script: nativeScriptToTrezorTypes(nativeScript),
      displayFormat: nativeScriptDisplayFormatToTrezorType(displayFormat),
    })
    if (!response.success) {
      throw Error(response.payload.error)
    }
    return response.payload.scriptHash as NativeScriptHashKeyHex
  }

  return {
    getVersion,
    showAddress,
    witnessTx,
    signTx,
    getXPubKeys,
    signOperationalCertificate,
    signVotingRegistrationMetaData,
    deriveNativeScriptHash,
  }
}

export {
  TrezorCryptoProvider,
}
