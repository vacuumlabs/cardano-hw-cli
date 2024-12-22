import * as TxTypes from 'cardano-hw-interop-lib'
import TrezorConnect, * as TrezorTypes from '@trezor/connect'
import {PROTO as TrezorEnums} from '@trezor/connect'
import {
  CIP36RegistrationMetaDataCborHex,
  TxWitnesses,
  TxWitnessKeys,
} from '../transaction/txTypes'
import {
  CryptoProvider,
  SigningMode,
  TxSigningParameters,
  NativeScriptDisplayFormat,
} from './cryptoProvider'
import {
  TxByronWitnessData,
  TxShelleyWitnessData,
} from '../transaction/transaction'
import {
  BIP32Path,
  HexString,
  PubKeyHex,
  XPubKeyHex,
  DerivationType,
  NativeScriptHashKeyHex,
  Network,
  NativeScriptType,
  NativeScript,
  CVoteDelegation,
  ProtocolMagics,
  AddressType,
} from '../basicTypes'
import {
  encodeAddress,
  findSigningPathForKeyHash,
  getAddressAttributes,
  ipv4ToString,
  ipv6ToString,
  getAddressParameters,
  validateCIP36RegistrationAddressType,
  splitXPubKeyCborHex,
  encodeCIP36RegistrationMetaData,
  rewardAccountToStakeCredential,
  areAddressParamsAllowed,
  _AddressParameters,
  stakeHashFromBaseAddress,
  verifyIntendedPubKeySignatureMatch,
} from './util'
import {Errors} from '../errors'
import {partition} from '../util'
import {
  KesVKey,
  OpCertIssueCounter,
  SignedOpCertCborHex,
} from '../opCert/opCert'
import {parseBIP32Path} from '../command-parser/parsers'
import {
  ParsedShowAddressArguments,
  HwSigningData,
  ParsedSignMessageArguments,
} from '../command-parser/argTypes'
import {SignedMessageData} from '../signMessage/signMessage'

const {bech32, getShelleyAddressNetworkId} = require('cardano-crypto.js')

type _TrezorDestination =
  | {
      address: string
    }
  | {
      addressParameters: TrezorTypes.CardanoAddressParameters
    }

export const TrezorCryptoProvider: () => Promise<CryptoProvider> = async () => {
  const getVersion = async (): Promise<string> => {
    const {payload: features} = await TrezorConnect.getFeatures()
    const isSuccessful = (value: unknown): value is TrezorTypes.Features =>
      typeof value === 'object' && value !== null && !('error' in value)

    if (!isSuccessful(features)) throw Error(Errors.TrezorVersionError)

    const {
      major_version: major,
      minor_version: minor,
      patch_version: patch,
    } = features
    return `Trezor app version ${major}.${minor}.${patch}`
  }

  const initTrezorConnect = async (): Promise<void> => {
    TrezorConnect.manifest({
      email: 'adalite@vacuumlabs.com',
      appUrl: 'https://github.com/vacuumlabs/cardano-hw-cli',
    })

    TrezorConnect.on(TrezorTypes.UI_EVENT, (event) => {
      // without this listener, the passphrase, if enabled, would be infinitely awaited
      // to be inserted in the browser, see https://github.com/trezor/connect/issues/714
      if (event.type === TrezorTypes.UI.REQUEST_PASSPHRASE) {
        if (
          event.payload.device.features?.capabilities.includes(
            'Capability_PassphraseEntry',
          )
        ) {
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

      // Connect expects an explicit confirmation that no backup was created
      // for cardanoGetPublicKey call
      if (
        event.type === TrezorTypes.UI.REQUEST_CONFIRMATION &&
        event.payload.view === 'no-backup'
      ) {
        TrezorConnect.uiResponse({
          type: TrezorTypes.UI.RECEIVE_CONFIRMATION,
          payload: true,
        })
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

  const showAddress = async ({
    paymentPath,
    paymentScriptHash,
    stakingPath,
    stakingScriptHash,
    address,
    derivationType,
  }: ParsedShowAddressArguments): Promise<void> => {
    const {addressType, networkId, protocolMagic} =
      getAddressAttributes(address)

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

    if (('error' in response && response.error != null) || !response.success) {
      throw Error(Errors.InvalidAddressParametersProvidedError)
    }
  }

  const getXPubKeys = async (
    paths: BIP32Path[],
    derivationType?: DerivationType,
  ): Promise<XPubKeyHex[]> => {
    const {payload} = await TrezorConnect.cardanoGetPublicKey({
      bundle: paths.map((path) => ({
        path,
        showOnTrezor: true,
        derivationType: derivationTypeToTrezorType(derivationType),
      })),
    })

    const isSuccessful = (
      value: unknown,
    ): value is TrezorTypes.CardanoPublicKey[] =>
      typeof value === 'object' && value !== null && !('error' in value)

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
    multiAssets:
      | TxTypes.Multiasset<TxTypes.Uint>
      | TxTypes.Multiasset<TxTypes.Int>,
    isMint: boolean,
  ): TrezorTypes.CardanoAssetGroup[] =>
    multiAssets.map(({policyId, tokens}) => {
      const tokenAmounts = tokens.map(({assetName, amount}) => ({
        assetNameBytes: assetName.toString('hex'),
        amount: !isMint ? `${amount}` : undefined,
        mintAmount: isMint ? `${amount}` : undefined,
      }))
      return {
        policyId: policyId.toString('hex'),
        tokenAmounts,
      }
    })

  const prepareDestination = (
    address: Buffer,
    changeAddressParams: _AddressParameters | null,
    signingMode: SigningMode,
  ): _TrezorDestination => {
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

    return {address: encodeAddress(address)}
  }

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

  const prepareOutput = (
    output: TxTypes.TransactionOutput,
    network: Network,
    changeOutputFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoOutput => {
    const format =
      output.format === TxTypes.TxOutputFormat.ARRAY_LEGACY
        ? TrezorEnums.CardanoTxOutputSerializationFormat.ARRAY_LEGACY
        : TrezorEnums.CardanoTxOutputSerializationFormat.MAP_BABBAGE

    const changeAddressParams = getAddressParameters(
      changeOutputFiles,
      output.address,
      network,
    )
    const tokenBundle =
      output.amount.type === TxTypes.AmountType.WITH_MULTIASSET
        ? prepareTokenBundle(output.amount.multiasset, false)
        : []

    const datumHash = prepareDatumHash(output)
    const inlineDatum = prepareInlineDatum(output)

    const referenceScript =
      output.format === TxTypes.TxOutputFormat.MAP_BABBAGE
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

  const prepareCredential = (
    credential: TxTypes.Credential,
    signingFiles: HwSigningData[],
    signingMode: SigningMode,
  ): {path: BIP32Path} | {keyHash: string} | {scriptHash: string} => {
    switch (credential.type) {
      case TxTypes.CredentialType.KEY_HASH: {
        // A key hash stake credential can be sent to the HW wallet either by the key derivation
        // path or by the key hash (there are certain restrictions depending on signing mode). If we
        // are given the appropriate signing file, we always send a path; if we are not, we send the
        // key hash or throw an error depending on whether the signing mode allows it. This allows
        // the user of hw-cli to stay in control.
        const path = findSigningPathForKeyHash(
          (credential as TxTypes.KeyCredential).keyHash,
          signingFiles,
        )
        if (path) {
          return {path}
        }
        if (signingMode === SigningMode.PLUTUS_TRANSACTION) {
          return {keyHash: credential.keyHash.toString('hex')}
        }
        throw Error(Errors.MissingSigningFileForCertificateError)
      }
      case TxTypes.CredentialType.SCRIPT_HASH: {
        return {scriptHash: credential.scriptHash.toString('hex')}
      }
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareDRep = (dRep: TxTypes.DRep): TrezorTypes.CardanoDRep => {
    switch (dRep.type) {
      case TxTypes.DRepType.KEY_HASH:
        return {
          type: TrezorEnums.CardanoDRepType.KEY_HASH,
          keyHash: dRep.keyHash.toString('hex'),
        }
      case TxTypes.DRepType.SCRIPT_HASH:
        return {
          type: TrezorEnums.CardanoDRepType.SCRIPT_HASH,
          scriptHash: dRep.scriptHash.toString('hex'),
        }
      case TxTypes.DRepType.ABSTAIN:
        return {
          type: TrezorEnums.CardanoDRepType.ABSTAIN,
        }
      case TxTypes.DRepType.NO_CONFIDENCE:
        return {
          type: TrezorEnums.CardanoDRepType.NO_CONFIDENCE,
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
    ...prepareCredential(cert.stakeCredential, stakeSigningFiles, signingMode),
  })

  const prepareStakeKeyRegistrationConwayCert = (
    cert: TxTypes.StakeRegistrationConwayCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoCertificate => ({
    type: TrezorEnums.CardanoCertificateType.STAKE_REGISTRATION_CONWAY,
    ...prepareCredential(cert.stakeCredential, stakeSigningFiles, signingMode),
    deposit: `${cert.deposit}`,
  })

  const prepareStakeKeyDeregistrationCert = (
    cert: TxTypes.StakeDeregistrationCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoCertificate => ({
    type: TrezorEnums.CardanoCertificateType.STAKE_DEREGISTRATION,
    ...prepareCredential(cert.stakeCredential, stakeSigningFiles, signingMode),
  })

  const prepareStakeKeyDeregistrationConwayCert = (
    cert: TxTypes.StakeDeregistrationConwayCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoCertificate => ({
    type: TrezorEnums.CardanoCertificateType.STAKE_DEREGISTRATION_CONWAY,
    ...prepareCredential(cert.stakeCredential, stakeSigningFiles, signingMode),
    deposit: `${cert.deposit}`,
  })

  const prepareDelegationCert = (
    cert: TxTypes.StakeDelegationCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoCertificate => ({
    type: TrezorEnums.CardanoCertificateType.STAKE_DELEGATION,
    ...prepareCredential(cert.stakeCredential, stakeSigningFiles, signingMode),
    pool: cert.poolKeyHash.toString('hex'),
  })

  const prepareVoteDelegationCert = (
    cert: TxTypes.VoteDelegationCertificate,
    signingFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoCertificate => ({
    type: TrezorEnums.CardanoCertificateType.VOTE_DELEGATION,
    ...prepareCredential(cert.stakeCredential, signingFiles, signingMode),
    dRep: prepareDRep(cert.dRep),
  })

  const preparePoolOwners = (
    owners: Buffer[],
    stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoPoolOwner[] => {
    const poolOwners = owners.map((owner): TrezorTypes.CardanoPoolOwner => {
      const path = findSigningPathForKeyHash(owner, stakeSigningFiles)
      return path
        ? {stakingKeyPath: path}
        : {stakingKeyHash: owner.toString('hex')}
    })

    const ownersWithPath = poolOwners.filter((owner) => owner.stakingKeyPath)
    if (ownersWithPath.length === 0)
      throw Error(Errors.MissingSigningFileForCertificateError)
    if (ownersWithPath.length > 1)
      throw Error(Errors.OwnerMultipleTimesInTxError)

    return poolOwners
  }

  const prepareRelays = (
    relays: TxTypes.Relay[],
  ): TrezorTypes.CardanoPoolRelay[] =>
    relays.map((relay) => ({
      type: relay.type as number,
      port: 'port' in relay && relay.port ? Number(relay.port) : undefined,
      ipv4Address: 'ipv4' in relay ? ipv4ToString(relay.ipv4) : undefined,
      ipv6Address: 'ipv6' in relay ? ipv6ToString(relay.ipv6) : undefined,
      hostName: 'dnsName' in relay ? relay.dnsName : undefined,
    }))

  const prepareStakePoolRegistrationCert = (
    cert: TxTypes.PoolRegistrationCertificate,
    stakeSigningFiles: HwSigningData[],
  ): TrezorTypes.CardanoCertificate => {
    const metadata: TrezorTypes.CardanoPoolMetadata | null = cert.poolParams
      .poolMetadata
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
      owners: preparePoolOwners(
        cert.poolParams.poolOwners.items,
        stakeSigningFiles,
      ),
      relays: prepareRelays(cert.poolParams.relays),
      // metadata can be null in case of private pool, library type definition is wrong:
      metadata: metadata as TrezorTypes.CardanoPoolMetadata,
    }

    return {
      type: TrezorEnums.CardanoCertificateType.STAKE_POOL_REGISTRATION,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        return prepareStakeKeyRegistrationCert(
          certificate,
          stakeSigningFiles,
          signingMode,
        )
      case TxTypes.CertificateType.STAKE_REGISTRATION_CONWAY:
        return prepareStakeKeyRegistrationConwayCert(
          certificate,
          stakeSigningFiles,
          signingMode,
        )
      case TxTypes.CertificateType.STAKE_DEREGISTRATION:
        return prepareStakeKeyDeregistrationCert(
          certificate,
          stakeSigningFiles,
          signingMode,
        )
      case TxTypes.CertificateType.STAKE_DEREGISTRATION_CONWAY:
        return prepareStakeKeyDeregistrationConwayCert(
          certificate,
          stakeSigningFiles,
          signingMode,
        )
      case TxTypes.CertificateType.STAKE_DELEGATION:
        return prepareDelegationCert(
          certificate,
          stakeSigningFiles,
          signingMode,
        )
      case TxTypes.CertificateType.VOTE_DELEGATION:
        return prepareVoteDelegationCert(
          certificate,
          stakeSigningFiles,
          signingMode,
        )
      case TxTypes.CertificateType.POOL_REGISTRATION:
        return prepareStakePoolRegistrationCert(certificate, stakeSigningFiles)

      case TxTypes.CertificateType.POOL_RETIREMENT:
      case TxTypes.CertificateType.STAKE_AND_VOTE_DELEGATION:
      case TxTypes.CertificateType.STAKE_REGISTRATION_AND_DELEGATION:
      case TxTypes.CertificateType.STAKE_REGISTRATION_WITH_VOTE_DELEGATION:
      case TxTypes.CertificateType
        .STAKE_REGISTRATION_WITH_STAKE_AND_VOTE_DELEGATION:
      case TxTypes.CertificateType.AUTHORIZE_COMMITTEE_HOT:
      case TxTypes.CertificateType.RESIGN_COMMITTEE_COLD:
      case TxTypes.CertificateType.DREP_REGISTRATION:
      case TxTypes.CertificateType.DREP_DEREGISTRATION:
      case TxTypes.CertificateType.DREP_UPDATE:
        throw Error(Errors.UnsupportedCertificateType)

      default:
        throw Error(Errors.UnknownCertificateError)
    }
  }

  const prepareWithdrawal = (
    withdrawal: TxTypes.Withdrawal,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): TrezorTypes.CardanoWithdrawal => {
    const stakeCredential: TxTypes.Credential = rewardAccountToStakeCredential(
      withdrawal.rewardAccount,
    )
    return {
      amount: `${withdrawal.amount}`,
      ...prepareCredential(stakeCredential, stakeSigningFiles, signingMode),
    }
  }

  const prepareTtl = (ttl: TxTypes.Uint | undefined): string | undefined =>
    ttl?.toString()

  const prepareValidityIntervalStart = (
    validityIntervalStart: TxTypes.Uint | undefined,
  ): string | undefined => validityIntervalStart?.toString()

  const prepareAuxiliaryDataHashHex = (
    auxiliaryDataHash: Buffer | undefined,
  ): TrezorTypes.CardanoAuxiliaryData | undefined =>
    auxiliaryDataHash
      ? {
          hash: auxiliaryDataHash.toString('hex'),
        }
      : undefined

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
    return path ? {keyPath: path} : {keyHash: requiredSigner.toString('hex')}
  }

  const prepareAdditionalWitnessRequests = (
    hwSigningFileData: HwSigningData[],
  ): BIP32Path[] => {
    // Witnesses for some tx body elements (certificates, required signers etc.) have already been
    // added across the tx.
    // However, we must add witnesses for inputs and script hash elements (e.g. mint).
    // For whatever reason, the user might also want to get extra witnesses, so we add it all here
    // and let ledgerjs uniquify them so that each witness is asked only once.
    return hwSigningFileData.map((f) => f.path)
  }

  const createWitnesses = (
    trezorWitnesses: TrezorTypes.CardanoSignedTxWitness[],
    signingFiles: HwSigningData[],
    txBodyHashHex: string,
  ): TxWitnesses => {
    const getSigningFileDataByXPubKey = (pubKey: PubKeyHex): HwSigningData => {
      const hwSigningData = signingFiles.find(
        (signingFile) =>
          splitXPubKeyCborHex(signingFile.cborXPubKeyHex).pubKey.toString(
            'hex',
          ) === pubKey,
      )
      if (hwSigningData) return hwSigningData
      throw Error(Errors.MissingHwSigningDataAtXPubKeyError)
    }

    const transformedWitnesses = trezorWitnesses.map((witness) => {
      const signingFile = getSigningFileDataByXPubKey(
        witness.pubKey as PubKeyHex,
      )
      verifyIntendedPubKeySignatureMatch(
        txBodyHashHex,
        signingFile,
        witness.signature,
      )
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
      (witness) =>
        witness.type === TrezorEnums.CardanoTxWitnessType.BYRON_WITNESS,
    )

    return {
      byronWitnesses: byronWitnesses.map((witness) => ({
        key: TxWitnessKeys.BYRON,
        data: TxByronWitnessData(
          witness.pubKey,
          witness.signature,
          witness.chainCode,
          {},
        ),
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
    params: TxSigningParameters,
    changeOutputFiles: HwSigningData[],
  ): Promise<TrezorTypes.CardanoSignedTxWitness[]> => {
    const {
      signingMode,
      tx,
      txBodyHashHex,
      hwSigningFileData,
      network,
      derivationType,
    } = params

    const inputs = tx.body.inputs.items.map(prepareInput)
    const outputs = tx.body.outputs.map((output) =>
      prepareOutput(output, network, changeOutputFiles, signingMode),
    )
    const certificates = tx.body.certificates?.items.map((certificate) =>
      prepareCertificate(certificate, hwSigningFileData, signingMode),
    )
    const fee = `${tx.body.fee}`
    const ttl = prepareTtl(tx.body.ttl)
    const validityIntervalStart = prepareValidityIntervalStart(
      tx.body.validityIntervalStart,
    )
    const withdrawals = tx.body.withdrawals?.map((withdrawal) =>
      prepareWithdrawal(withdrawal, hwSigningFileData, signingMode),
    )
    const auxiliaryData = prepareAuxiliaryDataHashHex(tx.body.auxiliaryDataHash)
    const mint = tx.body.mint
      ? prepareTokenBundle(tx.body.mint, true)
      : undefined
    const scriptDataHash = prepareScriptDataHash(tx.body.scriptDataHash)
    const collateralInputs = tx.body.collateralInputs?.items.map(
      prepareCollateralInput,
    )
    const requiredSigners = tx.body.requiredSigners?.items.map(
      (requiredSigner) =>
        prepareRequiredSigner(requiredSigner, hwSigningFileData),
    )
    const includeNetworkId = tx.body.networkId !== undefined
    const collateralReturn = tx.body.collateralReturnOutput
      ? prepareOutput(
          tx.body.collateralReturnOutput,
          network,
          changeOutputFiles,
          signingMode,
        )
      : undefined
    const totalCollateral =
      tx.body.totalCollateral !== undefined
        ? `${tx.body.totalCollateral}`
        : undefined
    const referenceInputs = tx.body.referenceInputs?.items.map(prepareInput)

    if (tx.body.votingProcedures !== undefined) {
      throw Error(Errors.TrezorVotingProceduresUnsupported)
    }

    if (tx.body.treasury !== undefined) {
      throw Error(Errors.TrezorTreasuryUnsupported)
    }

    if (tx.body.donation !== undefined) {
      throw Error(Errors.TrezorDonationUnsupported)
    }

    const additionalWitnessRequests =
      prepareAdditionalWitnessRequests(hwSigningFileData)

    // the tags are either used everywhere or nowhere,
    // so we can just look at the inputs
    const tagCborSets = tx.body.inputs.hasTag

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
      tagCborSets,
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

  const witnessTx = async (
    params: TxSigningParameters,
    changeOutputFiles: HwSigningData[],
  ): Promise<TxWitnesses> => {
    const trezorWitnesses = await trezorSignTx(params, changeOutputFiles)
    return createWitnesses(
      trezorWitnesses,
      params.hwSigningFileData,
      params.txBodyHashHex,
    )
  }

  const prepareVoteDelegations = (
    delegations: CVoteDelegation[],
  ): TrezorTypes.CardanoCVoteRegistrationDelegation[] =>
    delegations.map(({votePublicKey, voteWeight}) => {
      if (Number(voteWeight) > Number.MAX_SAFE_INTEGER) {
        throw Error(Errors.InvalidCVoteWeight)
      }
      return {
        votePublicKey,
        weight: Number(voteWeight),
      }
    })

  const prepareVoteAuxiliaryData = (
    delegations: CVoteDelegation[],
    hwStakeSigningFile: HwSigningData,
    paymentDestination: _TrezorDestination,
    nonce: bigint,
    votingPurpose: bigint,
  ): TrezorTypes.CardanoAuxiliaryData => {
    const destination: {
      address?: string
      addressParameters?: TrezorTypes.CardanoAddressParameters
    } = paymentDestination
    if (Number(votingPurpose) > Number.MAX_SAFE_INTEGER) {
      throw Error(Errors.InvalidCVoteVotingPurpose)
    }
    return {
      cVoteRegistrationParameters: {
        format: TrezorEnums.CardanoCVoteRegistrationFormat.CIP36,
        delegations: prepareVoteDelegations(delegations),
        stakingPath: hwStakeSigningFile.path,
        paymentAddressParameters: destination.addressParameters,
        paymentAddress: destination.address,
        nonce: `${nonce}`,
        votingPurpose: Number(votingPurpose),
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

  const signCIP36RegistrationMetaData = async (
    delegations: CVoteDelegation[],
    hwStakeSigningFile: HwSigningData, // describes stake_credential
    paymentAddressBech32: string,
    nonce: bigint,
    votingPurpose: bigint,
    network: Network,
    paymentAddressSigningFiles: HwSigningData[],
    derivationType?: DerivationType,
  ): Promise<CIP36RegistrationMetaDataCborHex> => {
    const {data: address}: {data: Buffer} = bech32.decode(paymentAddressBech32)

    let destination: _TrezorDestination
    const addressParams = getAddressParameters(
      paymentAddressSigningFiles,
      address,
      network,
    )
    if (addressParams) {
      validateCIP36RegistrationAddressType(addressParams.addressType)
      destination = {
        addressParameters: {
          addressType: addressParams.addressType,
          path: addressParams.paymentPath,
          stakingPath: addressParams.stakePath,
        },
      }
    } else {
      destination = {address: paymentAddressBech32}
    }

    const trezorAuxData = prepareVoteAuxiliaryData(
      delegations,
      hwStakeSigningFile,
      destination,
      nonce,
      votingPurpose,
    )
    const dummyTx = prepareDummyTx(network, trezorAuxData)

    const response = await TrezorConnect.cardanoSignTransaction({
      ...dummyTx,
      derivationType: derivationTypeToTrezorType(derivationType),
    })
    if (!response.success) {
      throw Error(response.payload.error)
    }
    if (!response.payload.auxiliaryDataSupplement)
      throw Error(Errors.MissingAuxiliaryDataSupplement)
    if (!response.payload.auxiliaryDataSupplement.cVoteRegistrationSignature) {
      throw Error(Errors.MissingCIP36RegistrationSignature)
    }

    return encodeCIP36RegistrationMetaData(
      delegations,
      hwStakeSigningFile,
      address,
      nonce,
      votingPurpose,
      response.payload.auxiliaryDataSupplement.auxiliaryDataHash as HexString,
      response.payload.auxiliaryDataSupplement
        .cVoteRegistrationSignature as HexString,
    )
  }

  const signOperationalCertificate = async (
    _kesVKey: KesVKey,
    _kesPeriod: bigint,
    _issueCounter: OpCertIssueCounter,
    _signingFile: HwSigningData[],
    // eslint-disable-next-line require-await
  ): Promise<SignedOpCertCborHex> => {
    throw Error(Errors.UnsupportedCryptoProviderCall)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const prepareAddressFieldData = (
    args: ParsedSignMessageArguments,
  ): [TrezorTypes.CardanoAddressParameters, Network] => {
    const addressBytes = bech32.decode(args.address).data as Buffer
    const network: Network = {
      networkId: getShelleyAddressNetworkId(addressBytes),
      protocolMagic: ProtocolMagics.MAINNET, // irrelevant, Byron addresses not used here
    }
    if (
      args.addressHwSigningFileData == null ||
      args.addressHwSigningFileData.length === 0
    ) {
      throw Error(Errors.InvalidMessageAddressSigningFilesError)
    }
    const addressParams = getAddressParameters(
      args.addressHwSigningFileData,
      addressBytes,
      network,
    )
    if (addressParams == null) {
      throw Error(Errors.InvalidMessageAddressError)
    }
    switch (addressParams.addressType) {
      case AddressType.BASE_PAYMENT_KEY_STAKE_KEY:
        if (
          addressParams.paymentPath == null ||
          addressParams.stakePath == null
        ) {
          throw Error(Errors.InvalidMessageAddressError)
        }
        return [
          {
            addressType: TrezorTypes.PROTO.CardanoAddressType.BASE,
            path: addressParams.paymentPath,
            stakingPath: addressParams.stakePath,
          },
          network,
        ]

      case AddressType.BASE_PAYMENT_KEY_STAKE_SCRIPT:
        if (addressParams.paymentPath == null) {
          throw Error(Errors.InvalidMessageAddressError)
        }
        return [
          {
            addressType: TrezorTypes.PROTO.CardanoAddressType.BASE_KEY_SCRIPT,
            path: addressParams.paymentPath,
            stakingScriptHash:
              stakeHashFromBaseAddress(addressBytes).toString('hex'),
          },
          network,
        ]

      case AddressType.REWARD_KEY:
        if (addressParams.stakePath == null) {
          throw Error(Errors.InvalidMessageAddressError)
        }
        return [
          {
            addressType: TrezorTypes.PROTO.CardanoAddressType.REWARD,
            stakingPath: addressParams.stakePath,
          },
          network,
        ]

      case AddressType.ENTERPRISE_KEY:
        if (addressParams.paymentPath == null) {
          throw Error(Errors.InvalidMessageAddressError)
        }
        return [
          {
            addressType: TrezorTypes.PROTO.CardanoAddressType.ENTERPRISE,
            path: addressParams.paymentPath,
          },
          network,
        ]

      default:
        throw Error(Errors.InvalidMessageAddressTypeError)
    }
  }

  const signMessage = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,
    args: ParsedSignMessageArguments,
    // eslint-disable-next-line require-await
  ): Promise<SignedMessageData> => {
    // TODO uncomment when message signing is merged in Trezor Connect
    throw Error(Errors.UnsupportedCryptoProviderCall)
    // let request: TrezorTypes.CardanoSignMessage = {
    //   signingPath: args.hwSigningFileData.path,
    //   hashPayload: args.hashPayload,
    //   payload: args.messageHex,
    //   preferHexDisplay: args.preferHexDisplay,
    //   derivationType: derivationTypeToTrezorType(args.derivationType),
    // }
    // if (args.address !== undefined) {
    //   const [addressFieldData, network] = prepareAddressFieldData(args)
    //   request = {
    //     ...request,
    //     addressParameters: addressFieldData,
    //     networkId: network.networkId,
    //     protocolMagic: network.protocolMagic,
    //   }
    // }

    // const response = await TrezorConnect.cardanoSignMessage(request)
    // if (!response.success) {
    //   throw Error(response.payload.error)
    // }

    // if (args.address !== undefined) {
    //   const addressCli = bech32.decode(args.address).data as Buffer
    //   const addressFieldHex = response.payload.headers.protected.address
    //   if (addressCli.toString('hex') !== addressFieldHex) {
    //     throw Error(Errors.MessageAddressMismatchError)
    //   }
    // }
    // const pubKey = splitXPubKeyCborHex(
    //   args.hwSigningFileData.cborXPubKeyHex,
    // ).pubKey
    // if (pubKey.toString('hex') !== response.payload.pubKey) {
    //   throw Error(Errors.SigningPubKeyMismatchError)
    // }

    // return {
    //   addressFieldHex: response.payload.headers.protected.address as HexString,
    //   signatureHex: response.payload.signature as HexString,
    //   signingPublicKeyHex: response.payload.pubKey as HexString,
    // }
  }

  const nativeScriptToTrezorTypes = (
    nativeScript: NativeScript,
    signingFiles: HwSigningData[],
  ): TrezorTypes.CardanoNativeScript => {
    switch (nativeScript.type) {
      case NativeScriptType.PUBKEY: {
        const path = findSigningPathForKeyHash(
          Buffer.from(nativeScript.keyHash, 'hex'),
          signingFiles,
        )
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
          scripts: nativeScript.scripts.map((s) =>
            nativeScriptToTrezorTypes(s, signingFiles),
          ),
        }
      case NativeScriptType.ANY:
        return {
          type: TrezorEnums.CardanoNativeScriptType.ANY,
          scripts: nativeScript.scripts.map((s) =>
            nativeScriptToTrezorTypes(s, signingFiles),
          ),
        }
      case NativeScriptType.N_OF_K:
        return {
          type: TrezorEnums.CardanoNativeScriptType.N_OF_K,
          requiredSignaturesCount: Number(nativeScript.required),
          scripts: nativeScript.scripts.map((s) =>
            nativeScriptToTrezorTypes(s, signingFiles),
          ),
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
    getXPubKeys,
    signOperationalCertificate,
    signCIP36RegistrationMetaData,
    signMessage,
    deriveNativeScriptHash,
  }
}
