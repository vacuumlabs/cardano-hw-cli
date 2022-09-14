import * as TxTypes from 'cardano-hw-interop-lib'
import TrezorConnect, * as TrezorTypes from '@trezor/connect'
import { PROTO as TrezorEnums } from '@trezor/connect'
import {
  TxCborHex,
  VotingRegistrationMetaDataCborHex,
  TxWitnesses,
  TxWitnessKeys,
} from '../transaction/types'
import {
  CryptoProvider,
  _AddressParameters,
  SigningMode,
  SigningParameters,
} from './types'
import {
  TxByronWitnessData,
  TxShelleyWitnessData,
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
  DerivationType,
} from '../types'
import {
  encodeAddress,
  filterSigningFiles,
  findSigningPathForKeyHash,
  getAddressAttributes,
  ipv4ToString,
  ipv6ToString,
  getAddressParameters,
  validateVotingRegistrationAddressType,
  splitXPubKeyCborHex,
  encodeVotingRegistrationMetaData,
  rewardAccountToStakeCredential,
  areAddressParamsAllowed,
} from './util'
import { Errors } from '../errors'
import { partition } from '../util'
import { KesVKey, OpCertIssueCounter, SignedOpCertCborHex } from '../opCert/opCert'
import { parseBIP32Path } from '../command-parser/parsers'

const { bech32 } = require('cardano-crypto.js')

const TrezorCryptoProvider: () => Promise<CryptoProvider> = async () => {
  const getVersion = async (): Promise<string> => {
    const { payload: features } = await TrezorConnect.getFeatures()
    const isSuccessful = (
      value: any,
    ): value is TrezorTypes.Features => !value.error

    if (!isSuccessful(features)) throw Error(Errors.TrezorVersionError)

    const { major_version: major, minor_version: minor, patch_version: patch } = features
    return `Trezor app version ${major}.${minor}.${patch}`
  }

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

    // If Trezor Bridge is not running, the previous code doesn't throw an error. We need to make
    // sure that there is a working connection to a Trezor device e.g. by getting its version.
    await getVersion()
  }

  await initTrezorConnect()

  const derivationTypeToTrezorType = (
    derivationType?: DerivationType,
  ): TrezorEnums.CardanoDerivationType | undefined => {
    switch (derivationType) {
      case undefined:
        return undefined
      case DerivationType.LEDGER:
        return TrezorEnums.CardanoDerivationType.LEDGER
      case DerivationType.ICARUS:
        return TrezorEnums.CardanoDerivationType.ICARUS
      case DerivationType.ICARUS_TREZOR:
        return TrezorEnums.CardanoDerivationType.ICARUS_TREZOR
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const showAddress = async (
    {
      paymentPath, paymentScriptHash, stakingPath, stakingScriptHash, address, derivationType,
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
      derivationType: derivationTypeToTrezorType(derivationType),
      showOnTrezor: true,
    })

    if ((response as any).error || !response.success) {
      throw Error(Errors.InvalidAddressParametersProvidedError)
    }
  }

  const getXPubKeys = async (
    paths: BIP32Path[],
    derivationType?: DerivationType,
  ): Promise<XPubKeyHex[]> => {
    const { payload } = await TrezorConnect.cardanoGetPublicKey({
      bundle: paths.map((path) => ({
        path,
        showOnTrezor: true,
        derivationType: derivationTypeToTrezorType(derivationType),
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
    input: TxTypes.TransactionInput,
  ): TrezorTypes.CardanoInput => {
    if (input.index > Number.MAX_SAFE_INTEGER) {
      throw Error(Errors.InvalidInputError)
    }
    return {
      path: undefined, // all payment paths are added added as additionalWitnessRequests
      prev_hash: input.transactionId.toString('hex'),
      prev_index: Number(input.index),
    }
  }

  const prepareTokenBundle = (
    multiAssets: TxTypes.Multiasset<TxTypes.Uint> | TxTypes.Multiasset<TxTypes.Int>,
    isMint: boolean,
  ): TrezorTypes.CardanoAssetGroup[] => multiAssets.map(({ policyId, tokens }) => {
    const tokenAmounts = tokens.map(({ assetName, amount }) => ({
      assetNameBytes: assetName.toString('hex'),
      amount: !isMint ? `${amount}` : undefined,
      mintAmount: isMint ? `${amount}` : undefined,
    }))
    return {
      policyId: policyId.toString('hex'),
      tokenAmounts,
    }
  })

  const prepareDatumHash = (
    output: TxTypes.TransactionOutput,
  ): string | undefined => {
    switch (output.format) {
      case TxTypes.TxOutputFormat.ARRAY_LEGACY:
        return output.datumHash?.hash.toString('hex')
      case TxTypes.TxOutputFormat.MAP_BABBAGE:
        return output.datum?.type === TxTypes.DatumType.HASH
          ? output.datum.hash.toString('hex')
          : undefined
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareInlineDatum = (
    output: TxTypes.TransactionOutput,
  ): string | undefined => {
    switch (output.format) {
      case TxTypes.TxOutputFormat.ARRAY_LEGACY:
        return undefined
      case TxTypes.TxOutputFormat.MAP_BABBAGE:
        return output.datum?.type === TxTypes.DatumType.INLINE
          ? output.datum?.bytes.toString('hex')
          : undefined
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareDestination = (
    address: Buffer,
    changeAddressParams: _AddressParameters | null,
    signingMode: SigningMode,
  ): {
    address: string
  } | {
    addressParameters: TrezorTypes.CardanoAddressParameters
  } => {
    if (changeAddressParams && areAddressParamsAllowed(signingMode)) {
      // paymentPath should always be defined if changeAddressParams are defined
      if (!changeAddressParams.paymentPath) throw Error(Errors.Unreachable)

      return {
        addressParameters: {
          addressType: changeAddressParams.addressType,
          path: changeAddressParams.paymentPath,
          stakingPath: changeAddressParams.stakePath,
        },
      }
    }

    return { address: encodeAddress(address) }
  }

  const prepareOutput = (
    output: TxTypes.TransactionOutput,
    network: Network,
    changeOutputFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoOutput => {
    const format = output.format === TxTypes.TxOutputFormat.ARRAY_LEGACY
      ? TrezorEnums.CardanoTxOutputSerializationFormat.ARRAY_LEGACY
      : TrezorEnums.CardanoTxOutputSerializationFormat.MAP_BABBAGE

    const changeAddressParams = getAddressParameters(changeOutputFiles, output.address, network)
    const tokenBundle = output.amount.type === TxTypes.AmountType.WITH_MULTIASSET
      ? prepareTokenBundle(output.amount.multiasset, false) : []

    const datumHash = prepareDatumHash(output)
    const inlineDatum = prepareInlineDatum(output)

    const referenceScript = output.format === TxTypes.TxOutputFormat.MAP_BABBAGE
      ? output.referenceScript?.toString('hex')
      : undefined

    return {
      format,
      ...prepareDestination(output.address, changeAddressParams, signingMode),
      amount: `${output.amount.coin}`,
      tokenBundle,
      datumHash,
      inlineDatum,
      referenceScript,
    }
  }

  const _prepareStakeCredential = (
    stakeCredential: TxTypes.StakeCredential,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): {path: BIP32Path} | {keyHash: string} | {scriptHash: string} => {
    switch (stakeCredential.type) {
      case (TxTypes.StakeCredentialType.KEY_HASH): {
        // A key hash stake credential can be sent to the HW wallet either by the key derivation
        // path or by the key hash (there are certain restrictions depending on signing mode). If we
        // are given the appropriate signing file, we always send a path; if we are not, we send the
        // key hash or throw an error depending on whether the signing mode allows it. This allows
        // the user of hw-cli to stay in control.
        const path = findSigningPathForKeyHash(
          (stakeCredential as TxTypes.StakeCredentialKey).hash,
          stakeSigningFiles,
        )
        if (path) {
          return { path }
        }
        if (signingMode === SigningMode.PLUTUS_TRANSACTION) {
          return { keyHash: stakeCredential.hash.toString('hex') }
        }
        throw Error(Errors.MissingSigningFileForCertificateError)
      }
      case (TxTypes.StakeCredentialType.SCRIPT_HASH): {
        return { scriptHash: stakeCredential.hash.toString('hex') }
      }
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareStakeKeyRegistrationCert = (
    cert: TxTypes.StakeRegistrationCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoCertificate => ({
    type: TrezorEnums.CardanoCertificateType.STAKE_REGISTRATION,
    ...(_prepareStakeCredential(cert.stakeCredential, stakeSigningFiles, signingMode)),
  })

  const prepareStakeKeyDeregistrationCert = (
    cert: TxTypes.StakeDeregistrationCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoCertificate => ({
    type: TrezorEnums.CardanoCertificateType.STAKE_DEREGISTRATION,
    ...(_prepareStakeCredential(cert.stakeCredential, stakeSigningFiles, signingMode)),
  })

  const prepareDelegationCert = (
    cert: TxTypes.StakeDelegationCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoCertificate => ({
    type: TrezorEnums.CardanoCertificateType.STAKE_DELEGATION,
    ...(_prepareStakeCredential(cert.stakeCredential, stakeSigningFiles, signingMode)),
    pool: cert.poolKeyHash.toString('hex'),
  })

  const preparePoolOwners = (
    owners: Buffer[],
    stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoPoolOwner[] => {
    const poolOwners = owners.map((owner): TrezorTypes.CardanoPoolOwner => {
      const path = findSigningPathForKeyHash(owner, stakeSigningFiles)
      return path
        ? { stakingKeyPath: path }
        : { stakingKeyHash: owner.toString('hex') }
    })

    const ownersWithPath = poolOwners.filter((owner) => owner.stakingKeyPath)
    if (ownersWithPath.length === 0) throw Error(Errors.MissingSigningFileForCertificateError)
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
      type: TrezorEnums.CardanoCertificateType.STAKE_POOL_REGISTRATION,
      path: null as any, // path can be null here, library type definition is wrong
      poolParameters,
    }
  }

  const prepareCertificate = (
    certificate: TxTypes.Certificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoCertificate => {
    switch (certificate.type) {
      case TxTypes.CertificateType.STAKE_REGISTRATION:
        return prepareStakeKeyRegistrationCert(certificate, stakeSigningFiles, signingMode)
      case TxTypes.CertificateType.STAKE_DEREGISTRATION:
        return prepareStakeKeyDeregistrationCert(certificate, stakeSigningFiles, signingMode)
      case TxTypes.CertificateType.STAKE_DELEGATION:
        return prepareDelegationCert(certificate, stakeSigningFiles, signingMode)
      case TxTypes.CertificateType.POOL_REGISTRATION:
        return prepareStakePoolRegistrationCert(certificate, stakeSigningFiles)
      default:
        throw Error(Errors.UnknownCertificateTypeError)
    }
  }

  const prepareWithdrawal = (
    withdrawal: TxTypes.Withdrawal,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoWithdrawal => {
    const stakeCredential: TxTypes.StakeCredential = rewardAccountToStakeCredential(withdrawal.rewardAccount)
    return {
      amount: `${withdrawal.amount}`,
      ...(_prepareStakeCredential(stakeCredential, stakeSigningFiles, signingMode)),
    }
  }

  const prepareTtl = (ttl: TxTypes.Uint | undefined): string | undefined => ttl?.toString()

  const prepareValidityIntervalStart = (
    validityIntervalStart: TxTypes.Uint | undefined,
  ): string | undefined => validityIntervalStart?.toString()

  const prepareAuxiliaryDataHashHex = (
    auxiliaryDataHash: Buffer | undefined,
  ): TrezorTypes.CardanoAuxiliaryData | undefined => (
    auxiliaryDataHash ? ({
      hash: auxiliaryDataHash.toString('hex'),
    }) : undefined
  )

  const prepareScriptDataHash = (
    scriptDataHash: Buffer | undefined,
  ): string | undefined => scriptDataHash?.toString('hex')

  const prepareCollateralInput = (
    collateralInput: TxTypes.TransactionInput,
  ): TrezorTypes.CardanoCollateralInput => {
    if (collateralInput.index > Number.MAX_SAFE_INTEGER) {
      throw Error(Errors.InvalidCollateralInputError)
    }
    return {
      path: undefined, // all payment paths are added as added additionalWitnessRequests
      prev_hash: collateralInput.transactionId.toString('hex'),
      prev_index: Number(collateralInput.index),
    }
  }

  const prepareRequiredSigner = (
    requiredSigner: TxTypes.RequiredSigner,
    signingFiles: HwSigningData[],
  ): TrezorTypes.CardanoRequiredSigner => {
    const path = findSigningPathForKeyHash(requiredSigner, signingFiles)
    return path
      ? { keyPath: path }
      : { keyHash: requiredSigner.toString('hex') }
  }

  const prepareAdditionalWitnessRequests = (
    paymentSigningFiles: HwSigningData[],
    mintSigningFiles: HwSigningData[],
    multisigSigningFiles: HwSigningData[],
  ) => (
    // Payment signing files are always added here, so that the inputs are witnessed.
    // Even though Plutus txs might require additional stake signatures, Plutus scripts
    // don't see signatures directly - they can only access requiredSigners, and their witnesses
    // are gathered above.
    [...paymentSigningFiles, ...mintSigningFiles, ...multisigSigningFiles].map((f) => f.path)
  )

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

    const transformedWitnesses = trezorWitnesses.map((witness) => {
      const signingFile = getSigningFileDataByXPubKey(witness.pubKey as PubKeyHex)
      return {
        ...witness,
        path: signingFile.path,
        pubKey: Buffer.from(witness.pubKey, 'hex'),
        chainCode: witness.chainCode
          ? Buffer.from(witness.chainCode, 'hex')
          : splitXPubKeyCborHex(signingFile.cborXPubKeyHex).chainCode,
        signature: Buffer.from(witness.signature, 'hex'),
      }
    })
    const [byronWitnesses, shelleyWitnesses] = partition(
      transformedWitnesses,
      (witness) => witness.type === TrezorEnums.CardanoTxWitnessType.BYRON_WITNESS,
    )

    return {
      byronWitnesses: byronWitnesses.map((witness) => ({
        key: TxWitnessKeys.BYRON,
        data: TxByronWitnessData(witness.pubKey, witness.signature, witness.chainCode, {}),
        path: witness.path,
      })),
      shelleyWitnesses: shelleyWitnesses.map((witness) => ({
        key: TxWitnessKeys.SHELLEY,
        data: TxShelleyWitnessData(witness.pubKey, witness.signature),
        path: witness.path,
      })),
    }
  }

  const signingModeToTrezorType = (
    signingMode: SigningMode,
  ): TrezorEnums.CardanoTxSigningMode => {
    switch (signingMode) {
      case SigningMode.ORDINARY_TRANSACTION:
        return TrezorEnums.CardanoTxSigningMode.ORDINARY_TRANSACTION
      case SigningMode.POOL_REGISTRATION_AS_OWNER:
        return TrezorEnums.CardanoTxSigningMode.POOL_REGISTRATION_AS_OWNER
      case SigningMode.POOL_REGISTRATION_AS_OPERATOR:
        throw Error(Errors.TrezorPoolRegistrationAsOperatorNotSupported)
      case SigningMode.MULTISIG_TRANSACTION:
        return TrezorEnums.CardanoTxSigningMode.MULTISIG_TRANSACTION
      case SigningMode.PLUTUS_TRANSACTION:
        return TrezorEnums.CardanoTxSigningMode.PLUTUS_TRANSACTION
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const trezorSignTx = async (
    params: SigningParameters,
    changeOutputFiles: HwSigningData[],
  ): Promise<TrezorTypes.CardanoSignedTxWitness[]> => {
    const {
      signingMode, rawTx, tx, txBodyHashHex, hwSigningFileData, network, derivationType,
    } = params
    const body = (rawTx?.body ?? tx?.body)!
    const {
      paymentSigningFiles, stakeSigningFiles, mintSigningFiles, multisigSigningFiles,
    } = filterSigningFiles(hwSigningFileData)

    const inputs = body.inputs.map(prepareInput)
    const outputs = body.outputs.map(
      (output) => prepareOutput(output, network, changeOutputFiles, signingMode),
    )
    const certificates = body.certificates?.map(
      (certificate) => prepareCertificate(certificate, stakeSigningFiles, signingMode),
    )
    const fee = `${body.fee}`
    const ttl = prepareTtl(body.ttl)
    const validityIntervalStart = prepareValidityIntervalStart(body.validityIntervalStart)
    const withdrawals = body.withdrawals?.map(
      (withdrawal) => prepareWithdrawal(withdrawal, stakeSigningFiles, signingMode),
    )
    const auxiliaryData = prepareAuxiliaryDataHashHex(body.auxiliaryDataHash)
    const mint = body.mint ? prepareTokenBundle(body.mint, true) : undefined
    const scriptDataHash = prepareScriptDataHash(body.scriptDataHash)
    const collateralInputs = body.collateralInputs?.map(prepareCollateralInput)
    const requiredSigners = body.requiredSigners?.map(
      (requiredSigner) => prepareRequiredSigner(
        requiredSigner,
        [...paymentSigningFiles, ...stakeSigningFiles, ...mintSigningFiles, ...multisigSigningFiles],
      ),
    )
    const includeNetworkId = body.networkId !== undefined
    const collateralReturn = body.collateralReturnOutput
      ? prepareOutput(body.collateralReturnOutput, network, changeOutputFiles, signingMode)
      : undefined
    const totalCollateral = body.totalCollateral !== undefined ? `${body.totalCollateral}` : undefined
    const referenceInputs = body.referenceInputs?.map(prepareInput)

    const additionalWitnessRequests = prepareAdditionalWitnessRequests(
      paymentSigningFiles,
      mintSigningFiles,
      multisigSigningFiles,
    )

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
      scriptDataHash,
      collateralInputs,
      requiredSigners,
      additionalWitnessRequests,
      includeNetworkId,
      collateralReturn,
      totalCollateral,
      referenceInputs,
      derivationType: derivationTypeToTrezorType(derivationType),
    }

    const response = await TrezorConnect.cardanoSignTransaction(request)

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
    const witnesses = createWitnesses(trezorWitnesses, params.hwSigningFileData)
    return TxSigned(params, witnesses)
  }

  const witnessTx = async (
    params: SigningParameters,
    changeOutputFiles: HwSigningData[],
  ): Promise<TxWitnesses> => {
    const trezorWitnesses = await trezorSignTx(params, changeOutputFiles)
    return createWitnesses(trezorWitnesses, params.hwSigningFileData)
  }

  const prepareVoteAuxiliaryData = (
    hwStakeSigningFile: HwSigningData,
    votingPublicKeyHex: VotePublicKeyHex,
    addressParameters: _AddressParameters,
    nonce: BigInt,
  ): TrezorTypes.CardanoAuxiliaryData => {
    const prepareAddressParameters = () => {
      if (addressParameters.addressType === TrezorEnums.CardanoAddressType.BASE) {
        return {
          addressType: addressParameters.addressType,
          path: addressParameters.paymentPath as BIP32Path,
          stakingPath: addressParameters.stakePath,
        }
      }
      if (addressParameters.addressType === TrezorEnums.CardanoAddressType.REWARD) {
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
      addressType: TrezorEnums.CardanoAddressType.BASE,
      path: parseBIP32Path('1852H/1815H/0H/0/0'),
      stakingPath: parseBIP32Path('1852H/1815H/0H/2/0'),
    },
    amount: '1',
  })

  const prepareDummyTx = (
    network: Network,
    auxiliaryData: TrezorTypes.CardanoAuxiliaryData,
  ): TrezorTypes.CommonParams & TrezorTypes.CardanoSignTransaction => ({
    signingMode: TrezorEnums.CardanoTxSigningMode.ORDINARY_TRANSACTION,
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
    derivationType?: DerivationType,
  ): Promise<VotingRegistrationMetaDataCborHex> => {
    const { data: address } : { data: Buffer } = bech32.decode(rewardAddressBech32)
    const addressParams = getAddressParameters(rewardAddressSigningFiles, address, network)
    if (!addressParams) {
      throw Error(Errors.AuxSigningFileNotFoundForVotingRewardAddress)
    }

    validateVotingRegistrationAddressType(addressParams.addressType)

    const trezorAuxData = prepareVoteAuxiliaryData(hwStakeSigningFile, votePublicKeyHex, addressParams, nonce)
    const dummyTx = prepareDummyTx(network, trezorAuxData)

    const response = await TrezorConnect.cardanoSignTransaction({
      ...dummyTx,
      derivationType: derivationTypeToTrezorType(derivationType),
    })
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
        const path = findSigningPathForKeyHash(Buffer.from(nativeScript.keyHash, 'hex'), signingFiles)
        if (path) {
          return {
            type: TrezorEnums.CardanoNativeScriptType.PUB_KEY,
            keyPath: path,
          }
        }
        return {
          type: TrezorEnums.CardanoNativeScriptType.PUB_KEY,
          keyHash: nativeScript.keyHash,
        }
      }
      case NativeScriptType.ALL:
        return {
          type: TrezorEnums.CardanoNativeScriptType.ALL,
          scripts: nativeScript.scripts.map((s) => nativeScriptToTrezorTypes(s, signingFiles)),
        }
      case NativeScriptType.ANY:
        return {
          type: TrezorEnums.CardanoNativeScriptType.ANY,
          scripts: nativeScript.scripts.map((s) => nativeScriptToTrezorTypes(s, signingFiles)),
        }
      case NativeScriptType.N_OF_K:
        return {
          type: TrezorEnums.CardanoNativeScriptType.N_OF_K,
          requiredSignaturesCount: Number(nativeScript.required),
          scripts: nativeScript.scripts.map((s) => nativeScriptToTrezorTypes(s, signingFiles)),
        }
      case NativeScriptType.INVALID_BEFORE:
        return {
          type: TrezorEnums.CardanoNativeScriptType.INVALID_BEFORE,
          invalidBefore: nativeScript.slot.toString(10),
        }
      case NativeScriptType.INVALID_HEREAFTER:
        return {
          type: TrezorEnums.CardanoNativeScriptType.INVALID_HEREAFTER,
          invalidHereafter: nativeScript.slot.toString(10),
        }
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const nativeScriptDisplayFormatToTrezorType = (
    displayFormat: NativeScriptDisplayFormat,
  ): TrezorEnums.CardanoNativeScriptHashDisplayFormat => {
    switch (displayFormat) {
      case NativeScriptDisplayFormat.BECH32:
        return TrezorEnums.CardanoNativeScriptHashDisplayFormat.BECH32
      case NativeScriptDisplayFormat.POLICY_ID:
        return TrezorEnums.CardanoNativeScriptHashDisplayFormat.POLICY_ID
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const deriveNativeScriptHash = async (
    nativeScript: NativeScript,
    signingFiles: HwSigningData[],
    displayFormat: NativeScriptDisplayFormat,
    derivationType?: DerivationType,
  ): Promise<NativeScriptHashKeyHex> => {
    const response = await TrezorConnect.cardanoGetNativeScriptHash({
      script: nativeScriptToTrezorTypes(nativeScript, signingFiles),
      displayFormat: nativeScriptDisplayFormatToTrezorType(displayFormat),
      derivationType: derivationTypeToTrezorType(derivationType),
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
