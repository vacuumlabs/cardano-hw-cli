import * as TxTypes from 'cardano-hw-interop-lib'
import TrezorConnect, * as TrezorTypes from 'trezor-connect'
import {
  TxCborHex,
  _ByronWitness,
  _ShelleyWitness,
  VotingRegistrationMetaDataCborHex,
  TxWitnesses,
  TxWitnessKeys,
} from '../transaction/types'
import {
  CryptoProvider,
  DeviceVersion,
  _AddressParameters,
  SigningMode,
  SigningParameters,
} from './types'
import { TrezorCryptoProviderFeature } from './trezorTypes'
import {
  TxByronWitness,
  TxShelleyWitness,
  TxSigned,
} from '../transaction/transaction'
import {
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
  ParsedShowAddressArguments,
} from '../types'
import {
  encodeAddress,
  filterSigningFiles,
  findSigningPathForKeyHash,
  getAddressAttributes,
  getSigningPath,
  ipv4ToString,
  ipv6ToString,
  isDeviceVersionGTE,
  getAddressParameters,
  validateVotingRegistrationAddressType,
  splitXPubKeyCborHex,
  encodeVotingRegistrationMetaData,
  findPathForKeyHash,
  rewardAccountToStakeCredential,
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
    {
      paymentPath, paymentScriptHash, stakingPath, stakingScriptHash, address,
    }: ParsedShowAddressArguments,
  ): Promise<void> => {
    const { addressType, networkId, protocolMagic } = getAddressAttributes(address)

    const response = await TrezorConnect.cardanoGetAddress({
      addressParameters: {
        addressType,
        path: paymentPath || '',
        paymentScriptHash: paymentScriptHash || '',
        stakingPath: stakingPath || '',
        stakingScriptHash: stakingScriptHash || '',
      },
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

  const prepareInput = (
    input: TxTypes.TransactionInput, path: BIP32Path | null,
  ): TrezorTypes.CardanoInput => {
    if (input.index < 0 || input.index > Number.MAX_SAFE_INTEGER) {
      throw Error(Errors.InvalidInputError)
    }
    return {
      path: path as number[], // TODO: Check if null
      prev_hash: input.transactionId.toString('hex'),
      prev_index: Number(input.index),
    }
  }

  const prepareTokenBundle = (
    multiAssets: TxTypes.Multiasset<TxTypes.Uint> | TxTypes.Multiasset<TxTypes.Int>,
    isMint: boolean,
  ): TrezorTypes.CardanoAssetGroup[] => multiAssets.map(({ policyId, tokens }) => {
    const tokenAmounts = tokens.map(({ assetName, amount }) => (removeNullFields({
      assetNameBytes: assetName.toString('hex'),
      amount: !isMint ? `${amount}` : undefined,
      mintAmount: isMint ? `${amount}` : undefined,
    })))
    return {
      policyId: policyId.toString('hex'),
      tokenAmounts,
    }
  })

  const prepareChangeOutput = (
    lovelaceAmount: TxTypes.Uint,
    changeAddress: _AddressParameters,
    tokenBundle?: TrezorTypes.CardanoAssetGroup[],
  ): TrezorTypes.CardanoOutput => ({
    amount: `${lovelaceAmount}`,
    addressParameters: {
      addressType: changeAddress.addressType,
      path: changeAddress.paymentPath as BIP32Path,
      stakingPath: changeAddress.stakePath,
    },
    tokenBundle,
  })

  const prepareOutput = (
    output: TxTypes.TransactionOutput,
    network: Network,
    changeOutputFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoOutput => {
    const changeAddressParams = getAddressParameters(changeOutputFiles, output.address, network)
    const tokenBundle = output.amount.type === TxTypes.AmountType.WITH_MULTIASSET
      ? prepareTokenBundle(output.amount.multiasset, false) : []

    if (changeAddressParams && signingMode === SigningMode.ORDINARY_TRANSACTION) {
      return prepareChangeOutput(output.amount.coin, changeAddressParams, tokenBundle)
    }

    return ({
      address: encodeAddress(output.address),
      amount: `${output.amount.coin}`,
      tokenBundle,
    })
  }

  const _prepareStakeCredential = (
    stakeCredential: TxTypes.StakeCredential,
    stakeSigningFiles: HwSigningData[],
  ): {path: string | number[]} | {scriptHash: string} => {
    switch (stakeCredential.type) {
      case (TxTypes.StakeCredentialType.KEY_HASH): {
        const path = findSigningPathForKeyHash(
          (stakeCredential as TxTypes.StakeCredentialKey).hash, stakeSigningFiles,
        )
        if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
        return { path }
      }
      case (TxTypes.StakeCredentialType.SCRIPT_HASH): {
        return {
          scriptHash: (stakeCredential as TxTypes.StakeCredentialScript).hash.toString('hex'),
        }
      }
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareStakeKeyRegistrationCert = (
    cert: TxTypes.StakeRegistrationCertificate,
    stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoCertificate => ({
    type: TrezorTypes.CardanoCertificateType.STAKE_REGISTRATION,
    ...(_prepareStakeCredential(cert.stakeCredential, stakeSigningFiles)),
  })

  const prepareStakeKeyDeregistrationCert = (
    cert: TxTypes.StakeDeregistrationCertificate,
    stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoCertificate => ({
    type: TrezorTypes.CardanoCertificateType.STAKE_DEREGISTRATION,
    ...(_prepareStakeCredential(cert.stakeCredential, stakeSigningFiles)),
  })

  const prepareDelegationCert = (
    cert: TxTypes.StakeDelegationCertificate,
    stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoCertificate => ({
    type: TrezorTypes.CardanoCertificateType.STAKE_DELEGATION,
    ...(_prepareStakeCredential(cert.stakeCredential, stakeSigningFiles)),
    pool: cert.poolKeyHash.toString('hex'),
  })

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
    relays: TxTypes.Relay[],
  ): TrezorTypes.CardanoPoolRelay[] => relays.map((relay) => ({
    type: relay.type as number,
    port: ('port' in relay && relay.port) ? Number(relay.port) : undefined,
    ipv4Address: ('ipv4' in relay) ? ipv4ToString(relay.ipv4) : undefined,
    ipv6Address: ('ipv6' in relay) ? ipv6ToString(relay.ipv6) : undefined,
    hostName: ('dnsName' in relay) ? relay.dnsName : undefined,
  }))

  const prepareStakePoolRegistrationCert = (
    cert: TxTypes.PoolRegistrationCertificate,
    stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoCertificate => {
    const metadata: TrezorTypes.CardanoPoolMetadata | null = cert.poolParams.poolMetadata
      ? {
        url: cert.poolParams.poolMetadata.url,
        hash: cert.poolParams.poolMetadata.metadataHash.toString('hex'),
      }
      : null

    const margin: TrezorTypes.CardanoPoolMargin = {
      numerator: `${cert.poolParams.margin[0]}`,
      denominator: `${cert.poolParams.margin[1]}`,
    }

    const poolParameters: TrezorTypes.CardanoPoolParameters = {
      poolId: cert.poolParams.operator.toString('hex'),
      vrfKeyHash: cert.poolParams.vrfKeyHash.toString('hex'),
      pledge: `${cert.poolParams.pledge}`,
      cost: `${cert.poolParams.cost}`,
      margin,
      rewardAccount: encodeAddress(cert.poolParams.rewardAccount),
      owners: preparePoolOwners(cert.poolParams.poolOwners, stakeSigningFiles),
      relays: prepareRelays(cert.poolParams.relays),
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
    certificate: TxTypes.Certificate,
    stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoCertificate => {
    switch (certificate.type) {
      case TxTypes.CertificateType.STAKE_REGISTRATION:
        return prepareStakeKeyRegistrationCert(certificate, stakeSigningFiles)
      case TxTypes.CertificateType.STAKE_DEREGISTRATION:
        return prepareStakeKeyDeregistrationCert(certificate, stakeSigningFiles)
      case TxTypes.CertificateType.STAKE_DELEGATION:
        return prepareDelegationCert(certificate, stakeSigningFiles)
      case TxTypes.CertificateType.POOL_REGISTRATION:
        return prepareStakePoolRegistrationCert(certificate, stakeSigningFiles)
      default:
        throw Error(Errors.UnknownCertificateTypeError)
    }
  }

  const prepareWithdrawal = (
    withdrawal: TxTypes.Withdrawal,
    stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoWithdrawal => {
    const stakeCredential: TxTypes.StakeCredential = rewardAccountToStakeCredential(withdrawal.rewardAccount)
    return {
      amount: `${withdrawal.amount}`,
      ...(_prepareStakeCredential(stakeCredential, stakeSigningFiles)),
    }
  }

  const prepareTtl = (ttl: TxTypes.Uint | undefined): string | undefined => ttl?.toString()

  const prepareValidityIntervalStart = (
    validityIntervalStart: TxTypes.Uint | undefined,
  ): string | undefined => validityIntervalStart?.toString()

  const prepareMetaDataHashHex = (
    metaDataHash: Buffer | undefined,
  ): TrezorTypes.CardanoAuxiliaryData | undefined => (
    metaDataHash ? ({
      hash: metaDataHash.toString('hex'),
    }) : undefined
  )

  const prepareAdditionalWitnessRequests = (
    mintSigningFiles: HwSigningData[],
    multisigSigningFiles: HwSigningData[],
  ) => mintSigningFiles.concat(multisigSigningFiles).map((f) => f.path)

  const ensureFirmwareSupportsParams = (txBody: TxTypes.TransactionBody) => {
    if (
      txBody.ttl === undefined
      && !isFeatureSupportedForVersion(TrezorCryptoProviderFeature.OPTIONAL_TTL)
    ) {
      throw Error(Errors.TrezorOptionalTTLNotSupported)
    }
    if (
      txBody.validityIntervalStart !== undefined
      && !isFeatureSupportedForVersion(TrezorCryptoProviderFeature.VALIDITY_INTERVAL_START)
    ) {
      throw Error(Errors.TrezorValidityIntervalStartNotSupported)
    }
    txBody.outputs.forEach((output) => {
      if (
        output.amount.type === TxTypes.AmountType.WITH_MULTIASSET
        && output.amount.multiasset.length !== 0
        && !isFeatureSupportedForVersion(TrezorCryptoProviderFeature.MULTI_ASSET)
      ) {
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

    return {
      byronWitnesses: byronWitnesses.map((witness) => (
        TxByronWitness(witness.pubKey, witness.signature, witness.chainCode, {})
      )),
      shelleyWitnesses: shelleyWitnesses.map((witness) => (
        TxShelleyWitness(witness.pubKey, witness.signature)
      )),
    }
  }

  const signingModeToTrezorType = (
    signingMode: SigningMode,
  ): TrezorTypes.CardanoTxSigningMode => {
    switch (signingMode) {
      case SigningMode.ORDINARY_TRANSACTION:
        return TrezorTypes.CardanoTxSigningMode.ORDINARY_TRANSACTION
      case SigningMode.POOL_REGISTRATION_AS_OWNER:
        return TrezorTypes.CardanoTxSigningMode.POOL_REGISTRATION_AS_OWNER
      case SigningMode.POOL_REGISTRATION_AS_OPERATOR:
        throw Error(Errors.TrezorPoolRegistrationAsOperatorNotSupported)
      case SigningMode.MULTISIG_TRANSACTION:
        return TrezorTypes.CardanoTxSigningMode.MULTISIG_TRANSACTION
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const trezorSignTx = async (
    params: SigningParameters,
    changeOutputFiles: HwSigningData[],
  ): Promise<TrezorTypes.CardanoSignedTxWitness[]> => {
    ensureFirmwareSupportsParams(params.rawTx.body)

    const {
      signingMode, rawTx: { body }, txBodyHashHex, hwSigningFileData, network,
    } = params
    const {
      paymentSigningFiles, stakeSigningFiles, mintSigningFiles, multisigSigningFiles,
    } = filterSigningFiles(hwSigningFileData)

    const inputs = body.inputs.map(
      (input, i) => prepareInput(input, getSigningPath(paymentSigningFiles, i)),
    )
    const outputs = body.outputs.map(
      (output) => prepareOutput(output, network, changeOutputFiles, signingMode),
    )
    const certificates = body.certificates?.map(
      (certificate) => prepareCertificate(certificate, [...stakeSigningFiles, ...multisigSigningFiles]),
    )
    const fee = `${body.fee}`
    const ttl = prepareTtl(body.ttl)
    const validityIntervalStart = prepareValidityIntervalStart(body.validityIntervalStart)
    const withdrawals = body.withdrawals?.map(
      (withdrawal) => prepareWithdrawal(withdrawal, stakeSigningFiles),
    )
    const auxiliaryData = prepareMetaDataHashHex(body.metadataHash)

    const mint = body.mint ? prepareTokenBundle(body.mint, true) : undefined

    const additionalWitnessRequests = prepareAdditionalWitnessRequests(mintSigningFiles, multisigSigningFiles)

    const request: TrezorTypes.CardanoSignTransaction = {
      signingMode: signingModeToTrezorType(signingMode),
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
    // https://github.com/trezor/connect/issues/770
    const response = await TrezorConnect.cardanoSignTransaction(removeNullFields(request))

    if (!response.success) {
      throw Error(response.payload.error)
    }
    if (response.payload.hash !== txBodyHashHex) {
      throw Error(Errors.TxSerializationMismatchError)
    }

    return response.payload.witnesses
  }

  const signTx = async (
    params: SigningParameters,
    changeOutputFiles: HwSigningData[],
  ): Promise<TxCborHex> => {
    const trezorWitnesses = await trezorSignTx(params, changeOutputFiles)
    const { byronWitnesses, shelleyWitnesses } = createWitnesses(trezorWitnesses, params.hwSigningFileData)
    return TxSigned(params.rawTx, byronWitnesses, shelleyWitnesses)
  }

  const witnessTx = async (
    params: SigningParameters,
    changeOutputFiles: HwSigningData[],
  ): Promise<Array<_ByronWitness | _ShelleyWitness>> => {
    const trezorWitnesses = await trezorSignTx(params, changeOutputFiles)
    const { byronWitnesses, shelleyWitnesses } = createWitnesses(trezorWitnesses, params.hwSigningFileData)
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
    if (!response.payload.auxiliaryDataSupplement) throw Error(Errors.MissingAuxiliaryDataSupplement)
    if (!response.payload.auxiliaryDataSupplement.catalystSignature) {
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
    _kesVKey: KesVKey,
    _kesPeriod: BigInt,
    _issueCounter: OpCertIssueCounter,
    _signingFile: HwSigningData[],
  ): Promise<SignedOpCertCborHex> => {
    // TODO is this the right way to deal with this?
    throw Error(Errors.UnsupportedCryptoProviderCall)
  }

  const nativeScriptToTrezorTypes = (
    nativeScript: NativeScript,
    signingFiles: HwSigningData[],
  ): TrezorTypes.CardanoNativeScript => {
    switch (nativeScript.type) {
      case NativeScriptType.PUBKEY: {
        const path = findPathForKeyHash(Buffer.from(nativeScript.keyHash, 'hex'), signingFiles)
        if (path) {
          return {
            type: TrezorTypes.CardanoNativeScriptType.PUB_KEY,
            keyPath: path,
          }
        }
        return {
          type: TrezorTypes.CardanoNativeScriptType.PUB_KEY,
          keyHash: nativeScript.keyHash,
        }
      }
      case NativeScriptType.ALL:
        return {
          type: TrezorTypes.CardanoNativeScriptType.ALL,
          scripts: nativeScript.scripts.map((s) => nativeScriptToTrezorTypes(s, signingFiles)),
        }
      case NativeScriptType.ANY:
        return {
          type: TrezorTypes.CardanoNativeScriptType.ANY,
          scripts: nativeScript.scripts.map((s) => nativeScriptToTrezorTypes(s, signingFiles)),
        }
      case NativeScriptType.N_OF_K:
        return {
          type: TrezorTypes.CardanoNativeScriptType.N_OF_K,
          requiredSignaturesCount: Number(nativeScript.required),
          scripts: nativeScript.scripts.map((s) => nativeScriptToTrezorTypes(s, signingFiles)),
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
    signingFiles: HwSigningData[],
    displayFormat: NativeScriptDisplayFormat,
  ): Promise<NativeScriptHashKeyHex> => {
    const response = await TrezorConnect.cardanoGetNativeScriptHash({
      script: nativeScriptToTrezorTypes(nativeScript, signingFiles),
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
