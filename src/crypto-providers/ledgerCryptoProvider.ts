import * as TxTypes from 'cardano-hw-interop-lib'
import Ledger, * as LedgerTypes from '@cardano-foundation/ledgerjs-hw-app-cardano'
import type Transport from '@ledgerhq/hw-transport'
import {
  CIP36VoteDelegationType,
  TxOutputDestination,
} from '@cardano-foundation/ledgerjs-hw-app-cardano'
import { parseBIP32Path } from '../command-parser/parsers'
import { Errors } from '../errors'
import { isChainCodeHex, isPubKeyHex, isXPubKeyHex } from '../guards'
import {
  KesVKey, OpCertIssueCounter, OpCertSigned, SignedOpCertCborHex,
} from '../opCert/opCert'
import { TxByronWitnessData, TxShelleyWitnessData } from '../transaction/transaction'
import {
  TxWitnessKeys,
  CIP36RegistrationMetaDataCborHex,
  TxWitnesses,
} from '../transaction/types'
import {
  BIP32Path,
  HexString,
  HwSigningData,
  NativeScriptHashKeyHex,
  XPubKeyHex,
  NativeScript,
  NativeScriptType,
  Network,
  CVoteDelegation,
} from '../basicTypes'
import {
  ParsedShowAddressArguments,
} from '../types'
import { partition } from '../util'
import {
  CryptoProvider, _AddressParameters, SigningMode, SigningParameters, NativeScriptDisplayFormat,
} from './types'
import {
  findSigningPathForKeyHash,
  getAddressAttributes,
  ipv4ToString,
  ipv6ToString,
  filterSigningFiles,
  getAddressParameters,
  splitXPubKeyCborHex,
  validateCIP36RegistrationAddressType,
  findSigningPathForKey,
  encodeCIP36RegistrationMetaData,
  rewardAccountToStakeCredential,
  areAddressParamsAllowed,
  pathEquals,
  classifyPath,
  PathTypes,
} from './util'

const { bech32 } = require('cardano-crypto.js')

const failedMsg = (e: unknown): string => `The requested operation failed. \
Check that your Ledger device is connected, unlocked and with Cardano app running.
Details: ${e}`

export const LedgerCryptoProvider: (transport: Transport) => Promise<CryptoProvider> = async (transport) => {
  const ledger = new Ledger(transport)

  const getVersion = async (): Promise<string> => {
    try {
      const { major, minor, patch } = (await ledger.getVersion()).version
      return `Ledger app version ${major}.${minor}.${patch}`
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const showAddress = async (
    {
      paymentPath, paymentScriptHash, stakingPath, stakingScriptHash, address,
    }: ParsedShowAddressArguments,
  ): Promise<void> => {
    const { addressType, networkId, protocolMagic } = getAddressAttributes(address)
    try {
      await ledger.showAddress({
        network: {
          protocolMagic,
          networkId,
        },
        address: {
          type: addressType,
          params: {
            spendingPath: paymentPath,
            spendingScriptHashHex: paymentScriptHash,
            stakingPath,
            stakingScriptHashHex: stakingScriptHash,
          },
        },
      })
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const getXPubKeys = async (paths: BIP32Path[]): Promise<XPubKeyHex[]> => {
    try {
      const xPubKeys = await ledger.getExtendedPublicKeys({ paths })
      return xPubKeys.map((xPubKey) => {
        const { publicKeyHex, chainCodeHex } = xPubKey
        if (!isPubKeyHex(xPubKey.publicKeyHex) || !isChainCodeHex(xPubKey.chainCodeHex)) {
          throw Error(Errors.InternalInvalidTypeError)
        }
        const xPubKeyHex = publicKeyHex + chainCodeHex
        if (!isXPubKeyHex(xPubKeyHex)) {
          throw Error(Errors.InternalInvalidTypeError)
        }
        return xPubKeyHex
      })
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const prepareInput = (
    input: TxTypes.TransactionInput,
  ): LedgerTypes.TxInput => {
    if (input.index > Number.MAX_SAFE_INTEGER) {
      throw Error(Errors.InvalidInputError)
    }
    return {
      path: null, // all payment paths are added added as additionalWitnessRequests
      txHashHex: input.transactionId.toString('hex'),
      outputIndex: Number(input.index),
    }
  }

  const prepareTokenBundle = (
    multiAssets: TxTypes.Multiasset<TxTypes.Uint> | TxTypes.Multiasset<TxTypes.Int>,
  ): LedgerTypes.AssetGroup[] => multiAssets.map(({ policyId, tokens }) => {
    const tokenAmounts: LedgerTypes.Token[] = tokens.map(({ assetName, amount }) => ({
      assetNameHex: assetName.toString('hex'),
      amount: `${amount}`,
    }))
    return {
      policyIdHex: policyId.toString('hex'),
      tokens: tokenAmounts,
    }
  })

  const prepareDestination = (
    address: Buffer,
    changeAddressParams: _AddressParameters | null,
    signingMode: SigningMode,
  ): LedgerTypes.TxOutputDestination => {
    if (changeAddressParams && areAddressParamsAllowed(signingMode)) {
      // paymentPath should always be defined if changeAddressParams are defined
      if (!changeAddressParams.paymentPath) throw Error(Errors.Unreachable)

      return {
        type: LedgerTypes.TxOutputDestinationType.DEVICE_OWNED,
        params: {
          type: changeAddressParams.addressType,
          params: {
            spendingPath: changeAddressParams.paymentPath,
            stakingPath: changeAddressParams.stakePath,
          },
        },
      }
    }

    return {
      type: LedgerTypes.TxOutputDestinationType.THIRD_PARTY,
      params: {
        addressHex: address.toString('hex'),
      },
    }
  }

  const prepareDatumHash = (
    output: TxTypes.TransactionOutput,
  ): string | undefined => {
    switch (output.format) {
      case TxTypes.TxOutputFormat.ARRAY_LEGACY:
        return output.datumHash?.hash.toString('hex')
      case TxTypes.TxOutputFormat.MAP_BABBAGE:
        return undefined
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareDatum = (
    output: TxTypes.TransactionOutput,
  ): LedgerTypes.Datum | undefined => {
    switch (output.format) {
      case TxTypes.TxOutputFormat.ARRAY_LEGACY:
        return undefined
      case TxTypes.TxOutputFormat.MAP_BABBAGE:
        if (!output.datum) return undefined

        return output.datum?.type === TxTypes.DatumType.HASH ? {
          type: TxTypes.DatumType.HASH,
          datumHashHex: output.datum.hash.toString('hex'),
        } : {
          type: TxTypes.DatumType.INLINE,
          datumHex: output.datum.bytes.toString('hex'),
        }
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareOutput = (
    output: TxTypes.TransactionOutput,
    network: Network,
    changeOutputFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.TxOutput => {
    const changeAddressParams = getAddressParameters(changeOutputFiles, output.address, network)
    const destination = prepareDestination(output.address, changeAddressParams, signingMode)

    const tokenBundle = output.amount.type === TxTypes.AmountType.WITH_MULTIASSET
      ? prepareTokenBundle(output.amount.multiasset) : undefined

    const datumHashHex = prepareDatumHash(output)
    const datum = prepareDatum(output)

    const referenceScriptHex = output.format === TxTypes.TxOutputFormat.MAP_BABBAGE
      ? output.referenceScript?.toString('hex')
      : undefined

    return {
      format: output.format === TxTypes.TxOutputFormat.ARRAY_LEGACY
        ? LedgerTypes.TxOutputFormat.ARRAY_LEGACY
        : LedgerTypes.TxOutputFormat.MAP_BABBAGE,
      destination,
      amount: `${output.amount.coin}`,
      tokenBundle,
      datumHashHex,
      datum,
      referenceScriptHex,
    }
  }

  const _prepareStakeCredential = (
    stakeCredential: TxTypes.StakeCredential,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.StakeCredentialParams => {
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
          return {
            type: LedgerTypes.StakeCredentialParamsType.KEY_PATH,
            keyPath: path,
          }
        }
        if (signingMode === SigningMode.PLUTUS_TRANSACTION) {
          return {
            type: LedgerTypes.StakeCredentialParamsType.KEY_HASH,
            keyHashHex: stakeCredential.hash.toString('hex'),
          }
        }
        throw Error(Errors.MissingSigningFileForCertificateError)
      }
      case (TxTypes.StakeCredentialType.SCRIPT_HASH): {
        return {
          type: LedgerTypes.StakeCredentialParamsType.SCRIPT_HASH,
          scriptHashHex: stakeCredential.hash.toString('hex'),
        }
      }
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareStakeKeyRegistrationCert = (
    cert: TxTypes.StakeRegistrationCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.STAKE_REGISTRATION,
    params: {
      stakeCredential: _prepareStakeCredential(cert.stakeCredential, stakeSigningFiles, signingMode),
    },
  })

  const prepareStakeKeyDeregistrationCert = (
    cert: TxTypes.StakeDeregistrationCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.STAKE_DEREGISTRATION,
    params: {
      stakeCredential: _prepareStakeCredential(cert.stakeCredential, stakeSigningFiles, signingMode),
    },
  })

  const prepareDelegationCert = (
    cert: TxTypes.StakeDelegationCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.STAKE_DELEGATION,
    params: {
      poolKeyHashHex: cert.poolKeyHash.toString('hex'),
      stakeCredential: _prepareStakeCredential(cert.stakeCredential, stakeSigningFiles, signingMode),
    },
  })

  const preparePoolKey = (
    signingMode: SigningMode,
    poolKeyHash: Buffer,
    poolKeyPath?: BIP32Path,
  ): LedgerTypes.PoolKey => {
    switch (signingMode) {
      case SigningMode.POOL_REGISTRATION_AS_OPERATOR:
        return {
          type: LedgerTypes.PoolKeyType.DEVICE_OWNED,
          params: {
            path: poolKeyPath as BIP32Path,
          },
        }
      case SigningMode.POOL_REGISTRATION_AS_OWNER:
        return {
          type: LedgerTypes.PoolKeyType.THIRD_PARTY,
          params: {
            keyHashHex: poolKeyHash.toString('hex'),
          },
        }
      default:
        throw Error(Errors.InvalidTransactionType)
    }
  }

  const prepareRewardAccount = (
    signingFiles: HwSigningData[],
    rewardAccount: Buffer,
    network: Network,
  ): LedgerTypes.PoolRewardAccount => {
    const addressParams = getAddressParameters(signingFiles, rewardAccount, network)
    if (addressParams) {
      return {
        type: LedgerTypes.PoolRewardAccountType.DEVICE_OWNED,
        params: {
          path: addressParams.stakePath as BIP32Path,
        },
      }
    }
    return {
      type: LedgerTypes.PoolRewardAccountType.THIRD_PARTY,
      params: {
        rewardAccountHex: rewardAccount.toString('hex'),
      },
    }
  }

  const preparePoolOwners = (
    signingMode: SigningMode,
    owners: Buffer[],
    stakeSigningFiles: HwSigningData[],
  ): LedgerTypes.PoolOwner[] => {
    const poolOwners: LedgerTypes.PoolOwner[] = owners.map((owner) => {
      const path = findSigningPathForKeyHash(owner, stakeSigningFiles)
      return path && (signingMode === SigningMode.POOL_REGISTRATION_AS_OWNER)
        ? {
          type: LedgerTypes.PoolOwnerType.DEVICE_OWNED,
          params: { stakingPath: path },
        }
        : {
          type: LedgerTypes.PoolOwnerType.THIRD_PARTY,
          params: { stakingKeyHashHex: owner.toString('hex') },
        }
    })

    const ownersWithPath = poolOwners.filter((owner) => owner.type === LedgerTypes.PoolOwnerType.DEVICE_OWNED)
    if (ownersWithPath.length === 0 && signingMode === SigningMode.POOL_REGISTRATION_AS_OWNER) {
      throw Error(Errors.MissingSigningFileForCertificateError)
    }
    if (ownersWithPath.length > 1) {
      throw Error(Errors.OwnerMultipleTimesInTxError)
    }

    return poolOwners
  }

  const prepareRelays = (relays: TxTypes.Relay[]): LedgerTypes.Relay[] => {
    const SingleIPRelay = ({ port, ipv4, ipv6 }: TxTypes.RelaySingleHostAddress): LedgerTypes.Relay => ({
      type: LedgerTypes.RelayType.SINGLE_HOST_IP_ADDR,
      params: {
        portNumber: port ? Number(port) : undefined,
        ipv4: ipv4ToString(ipv4),
        ipv6: ipv6ToString(ipv6),
      },
    })

    const SingleNameRelay = ({ dnsName, port }: TxTypes.RelaySingleHostName): LedgerTypes.Relay => ({
      type: LedgerTypes.RelayType.SINGLE_HOST_HOSTNAME,
      params: { portNumber: port ? Number(port) : undefined, dnsName },
    })

    const MultiNameRelay = ({ dnsName }: TxTypes.RelayMultiHostName): LedgerTypes.Relay => ({
      type: LedgerTypes.RelayType.MULTI_HOST,
      params: { dnsName },
    })

    const prepareRelay = (relay: TxTypes.Relay): LedgerTypes.Relay => {
      switch (relay.type) {
        case TxTypes.RelayType.SINGLE_HOST_ADDRESS:
          return SingleIPRelay(relay)
        case TxTypes.RelayType.SINGLE_HOST_NAME:
          return SingleNameRelay(relay)
        case TxTypes.RelayType.MULTI_HOST_NAME:
          return MultiNameRelay(relay)
        default:
          throw Error(Errors.UnsupportedRelayTypeError)
      }
    }

    return relays.map(prepareRelay)
  }

  const prepareStakePoolRegistrationCert = (
    cert: TxTypes.PoolRegistrationCertificate,
    signingFiles: HwSigningData[],
    network: Network,
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => {
    // if path is given, we are signing as pool operator
    // if keyHashHex is given, we are signing as pool owner
    const poolKeyPath = findSigningPathForKeyHash(cert.poolParams.operator, signingFiles)

    const metadata: LedgerTypes.PoolMetadataParams | null = cert.poolParams.poolMetadata
      ? {
        metadataUrl: cert.poolParams.poolMetadata.url,
        metadataHashHex: cert.poolParams.poolMetadata.metadataHash.toString('hex'),
      }
      : null

    const margin: LedgerTypes.Margin = {
      numerator: `${cert.poolParams.margin[0]}`,
      denominator: `${cert.poolParams.margin[1]}`,
    }

    const params: LedgerTypes.PoolRegistrationParams = {
      poolKey: preparePoolKey(signingMode, cert.poolParams.operator, poolKeyPath),
      vrfKeyHashHex: cert.poolParams.vrfKeyHash.toString('hex'),
      pledge: `${cert.poolParams.pledge}`,
      cost: `${cert.poolParams.cost}`,
      margin,
      rewardAccount: prepareRewardAccount(signingFiles, cert.poolParams.rewardAccount, network),
      poolOwners: preparePoolOwners(signingMode, cert.poolParams.poolOwners, signingFiles),
      relays: prepareRelays(cert.poolParams.relays),
      metadata,
    }

    return {
      type: LedgerTypes.CertificateType.STAKE_POOL_REGISTRATION,
      params,
    }
  }

  const prepareStakePoolRetirementCert = (
    cert: TxTypes.PoolRetirementCertificate,
    signingFiles: HwSigningData[],
  ): LedgerTypes.Certificate => {
    const poolKeyPath = findSigningPathForKeyHash(cert.poolKeyHash, signingFiles)
    if (!poolKeyPath) throw Error(Errors.MissingSigningFileForCertificateError)

    const poolRetirementParams: LedgerTypes.PoolRetirementParams = {
      poolKeyPath,
      retirementEpoch: `${cert.epoch}`,
    }

    return {
      type: LedgerTypes.CertificateType.STAKE_POOL_RETIREMENT,
      params: poolRetirementParams,
    }
  }

  const prepareCertificate = (
    certificate: TxTypes.Certificate,
    signingFiles: HwSigningData[],
    network: Network,
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => {
    switch (certificate.type) {
      case TxTypes.CertificateType.STAKE_REGISTRATION:
        return prepareStakeKeyRegistrationCert(certificate, signingFiles, signingMode)
      case TxTypes.CertificateType.STAKE_DEREGISTRATION:
        return prepareStakeKeyDeregistrationCert(certificate, signingFiles, signingMode)
      case TxTypes.CertificateType.STAKE_DELEGATION:
        return prepareDelegationCert(certificate, signingFiles, signingMode)
      case TxTypes.CertificateType.POOL_REGISTRATION:
        return prepareStakePoolRegistrationCert(certificate, signingFiles, network, signingMode)
      case TxTypes.CertificateType.POOL_RETIREMENT:
        return prepareStakePoolRetirementCert(certificate, signingFiles)
      default:
        throw Error(Errors.UnknownCertificateError)
    }
  }

  const prepareWithdrawal = (
    withdrawal: TxTypes.Withdrawal,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Withdrawal => {
    const stakeCredential: TxTypes.StakeCredential = rewardAccountToStakeCredential(withdrawal.rewardAccount)
    return {
      stakeCredential: _prepareStakeCredential(stakeCredential, stakeSigningFiles, signingMode),
      amount: `${withdrawal.amount}`,
    }
  }

  const prepareTtl = (ttl: TxTypes.Uint | undefined): string | undefined => ttl?.toString()

  const prepareValidityIntervalStart = (
    validityIntervalStart: TxTypes.Uint | undefined,
  ): string | undefined => validityIntervalStart?.toString()

  const prepareAuxiliaryDataHashHex = (
    auxiliaryDataHash: Buffer | undefined,
  ): LedgerTypes.TxAuxiliaryData | undefined => (
    auxiliaryDataHash ? ({
      type: LedgerTypes.TxAuxiliaryDataType.ARBITRARY_HASH,
      params: {
        hashHex: auxiliaryDataHash.toString('hex'),
      },
    }) : undefined
  )

  const prepareScriptDataHash = (
    scriptDataHash: Buffer | undefined,
  ): string | undefined => scriptDataHash?.toString('hex')

  const prepareCollateralInput = (
    collateralInput: TxTypes.TransactionInput,
  ): LedgerTypes.TxInput => {
    if (collateralInput.index > Number.MAX_SAFE_INTEGER) {
      throw Error(Errors.InvalidCollateralInputError)
    }
    return {
      path: null, // all payment paths are added added as additionalWitnessRequests
      txHashHex: collateralInput.transactionId.toString('hex'),
      outputIndex: Number(collateralInput.index),
    }
  }

  const prepareRequiredSigner = (
    requiredSigner: TxTypes.RequiredSigner,
    signingFiles: HwSigningData[],
  ): LedgerTypes.RequiredSigner => {
    const path = findSigningPathForKeyHash(requiredSigner, signingFiles)
    return path
      ? {
        type: LedgerTypes.TxRequiredSignerType.PATH,
        path,
      }
      : {
        type: LedgerTypes.TxRequiredSignerType.HASH,
        hashHex: requiredSigner.toString('hex'),
      }
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
    ledgerWitnesses: LedgerTypes.Witness[],
    signingFiles: HwSigningData[],
  ): TxWitnesses => {
    const getSigningFileDataByPath = (
      path: BIP32Path,
    ): HwSigningData => {
      const hwSigningData = signingFiles.find((signingFile) => pathEquals(signingFile.path, path))
      if (hwSigningData) return hwSigningData
      throw Error(Errors.MissingHwSigningDataAtPathError)
    }

    const witnessesWithKeys = ledgerWitnesses.map((witness) => {
      const { pubKey, chainCode } = splitXPubKeyCborHex(
        getSigningFileDataByPath(witness.path as BIP32Path).cborXPubKeyHex,
      )
      return {
        path: witness.path as BIP32Path,
        signature: Buffer.from(witness.witnessSignatureHex, 'hex'),
        pubKey,
        chainCode,
      }
    })
    const [byronWitnesses, shelleyWitnesses] = partition(
      witnessesWithKeys,
      (witness) => classifyPath(witness.path) === PathTypes.PATH_WALLET_SPENDING_KEY_BYRON,
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

  const signingModeToLedgerType = (
    signingMode: SigningMode,
  ): LedgerTypes.TransactionSigningMode => {
    switch (signingMode) {
      case SigningMode.ORDINARY_TRANSACTION:
        return LedgerTypes.TransactionSigningMode.ORDINARY_TRANSACTION
      case SigningMode.POOL_REGISTRATION_AS_OWNER:
        return LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OWNER
      case SigningMode.POOL_REGISTRATION_AS_OPERATOR:
        return LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OPERATOR
      case SigningMode.MULTISIG_TRANSACTION:
        return LedgerTypes.TransactionSigningMode.MULTISIG_TRANSACTION
      case SigningMode.PLUTUS_TRANSACTION:
        return LedgerTypes.TransactionSigningMode.PLUTUS_TRANSACTION
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const ledgerSignTx = async (
    params: SigningParameters,
    changeOutputFiles: HwSigningData[],
  ): Promise<LedgerTypes.Witness[]> => {
    const {
      signingMode, tx, txBodyHashHex, hwSigningFileData, network,
    } = params
    const {
      paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles, mintSigningFiles, multisigSigningFiles,
    } = filterSigningFiles(hwSigningFileData)

    const inputs = tx.body.inputs.map(prepareInput)
    const outputs = tx.body.outputs.map(
      (output) => prepareOutput(output, network, changeOutputFiles, signingMode),
    )
    const certificates = tx.body.certificates?.map(
      (certificate) => prepareCertificate(
        certificate,
        [...stakeSigningFiles, ...poolColdSigningFiles],
        network,
        signingMode,
      ),
    )
    const fee = `${tx.body.fee}`
    const ttl = prepareTtl(tx.body.ttl)
    const validityIntervalStart = prepareValidityIntervalStart(tx.body.validityIntervalStart)
    const withdrawals = tx.body.withdrawals?.map(
      (withdrawal) => prepareWithdrawal(withdrawal, stakeSigningFiles, signingMode),
    )
    const auxiliaryData = prepareAuxiliaryDataHashHex(tx.body.auxiliaryDataHash)
    const mint = tx.body.mint ? prepareTokenBundle(tx.body.mint) : null
    const scriptDataHashHex = prepareScriptDataHash(tx.body.scriptDataHash)
    const collateralInputs = tx.body.collateralInputs?.map(prepareCollateralInput)
    const requiredSigners = tx.body.requiredSigners?.map(
      (requiredSigner) => prepareRequiredSigner(
        requiredSigner,
        [...paymentSigningFiles, ...stakeSigningFiles, ...mintSigningFiles, ...multisigSigningFiles],
      ),
    )
    const includeNetworkId = tx.body.networkId !== undefined
    const collateralOutput = tx.body.collateralReturnOutput
      ? prepareOutput(tx.body.collateralReturnOutput, network, changeOutputFiles, signingMode)
      : undefined
    const totalCollateral = tx.body.totalCollateral !== undefined ? `${tx.body.totalCollateral}` : undefined
    const referenceInputs = tx.body.referenceInputs?.map(prepareInput)

    const additionalWitnessRequests = prepareAdditionalWitnessRequests(
      paymentSigningFiles,
      mintSigningFiles,
      multisigSigningFiles,
    )

    try {
      const response = await ledger.signTransaction({
        signingMode: signingModeToLedgerType(signingMode),
        tx: {
          network,
          inputs,
          outputs,
          fee,
          ttl,
          certificates,
          withdrawals,
          auxiliaryData,
          validityIntervalStart,
          mint,
          scriptDataHashHex,
          collateralInputs,
          requiredSigners,
          includeNetworkId,
          collateralOutput,
          totalCollateral,
          referenceInputs,
        },
        additionalWitnessPaths: additionalWitnessRequests,
      })
      if (response.txHashHex !== txBodyHashHex) {
        throw Error(Errors.TxSerializationMismatchError)
      }
      return response.witnesses
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const witnessTx = async (
    params: SigningParameters,
    changeOutputFiles: HwSigningData[],
  ): Promise<TxWitnesses> => {
    try {
      const ledgerWitnesses = await ledgerSignTx(params, changeOutputFiles)
      return createWitnesses(ledgerWitnesses, params.hwSigningFileData)
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const prepareVoteDelegations = (
    delegations: CVoteDelegation[],
  ): LedgerTypes.CIP36VoteDelegation[] => (
    delegations.map(({ votePublicKey, voteWeight }) => {
      if (Number(voteWeight) > Number.MAX_SAFE_INTEGER) {
        throw Error(Errors.InvalidCVoteWeight)
      }
      return {
        // TODO what about using a path from signing files instead of the key?
        type: CIP36VoteDelegationType.KEY,
        voteKeyHex: votePublicKey,
        weight: Number(voteWeight),
      }
    })
  )

  const prepareVoteAuxiliaryData = (
    delegations: CVoteDelegation[],
    hwStakeSigningFile: HwSigningData,
    paymentDestination: TxOutputDestination,
    nonce: bigint,
    votingPurpose: bigint,
  ): LedgerTypes.TxAuxiliaryData => ({
    type: LedgerTypes.TxAuxiliaryDataType.CIP36_REGISTRATION,
    params: {
      format: LedgerTypes.CIP36VoteRegistrationFormat.CIP_36,
      delegations: prepareVoteDelegations(delegations),
      stakingPath: hwStakeSigningFile.path,
      paymentDestination,
      nonce: `${nonce}`,
      votingPurpose: `${votingPurpose}`,
    },
  })

  const prepareDummyInput = (): LedgerTypes.TxInput => ({
    txHashHex: '0'.repeat(64),
    outputIndex: 0,
    path: parseBIP32Path('1852H/1815H/0H/0/0'),
  })

  const prepareDummyOutput = (): LedgerTypes.TxOutput => ({
    destination: {
      type: LedgerTypes.TxOutputDestinationType.DEVICE_OWNED,
      params: {
        type: LedgerTypes.AddressType.BASE_PAYMENT_KEY_STAKE_KEY,
        params: {
          spendingPath: parseBIP32Path('1852H/1815H/0H/0/0'),
          stakingPath: parseBIP32Path('1852H/1815H/0H/2/0'),
        },
      },
    },
    amount: '1',
  })

  const prepareDummyTx = (
    network: LedgerTypes.Network,
    auxiliaryData: LedgerTypes.TxAuxiliaryData,
  ): LedgerTypes.SignTransactionRequest => ({
    signingMode: LedgerTypes.TransactionSigningMode.ORDINARY_TRANSACTION,
    tx: {
      network,
      inputs: [prepareDummyInput()],
      outputs: [prepareDummyOutput()],
      fee: 0,
      ttl: 0,
      certificates: null,
      withdrawals: null,
      auxiliaryData,
      validityIntervalStart: null,
    },
    additionalWitnessPaths: [],
  })

  const signCIP36RegistrationMetaData = async (
    delegations: CVoteDelegation[],
    hwStakeSigningFile: HwSigningData, // describes stake_credential
    paymentAddressBech32: string,
    nonce: bigint,
    votingPurpose: bigint,
    network: Network,
    paymentAddressSigningFiles: HwSigningData[],
  ): Promise<CIP36RegistrationMetaDataCborHex> => {
    const { data: address } : { data: Buffer } = bech32.decode(paymentAddressBech32)

    let destination: TxOutputDestination
    const addressParams = getAddressParameters(paymentAddressSigningFiles, address, network)
    if (addressParams) {
      validateCIP36RegistrationAddressType(addressParams.addressType)
      destination = {
        type: LedgerTypes.TxOutputDestinationType.DEVICE_OWNED,
        params: {
          type: addressParams.addressType,
          params: {
            spendingPath: addressParams.paymentPath as BIP32Path,
            stakingPath: addressParams.stakePath as BIP32Path,
          },
        },
      }
    } else {
      destination = {
        type: LedgerTypes.TxOutputDestinationType.THIRD_PARTY,
        params: {
          addressHex: address.toString('hex'),
        },
      }
    }

    const ledgerAuxData = prepareVoteAuxiliaryData(
      delegations,
      hwStakeSigningFile,
      destination,
      nonce,
      votingPurpose,
    )
    const dummyTx = prepareDummyTx(network, ledgerAuxData)

    try {
      const response = await ledger.signTransaction(dummyTx)
      if (!response.auxiliaryDataSupplement) throw Error(Errors.MissingAuxiliaryDataSupplement)

      return encodeCIP36RegistrationMetaData(
        delegations,
        hwStakeSigningFile,
        address,
        nonce,
        votingPurpose,
        response.auxiliaryDataSupplement.auxiliaryDataHashHex as HexString,
        response.auxiliaryDataSupplement.cip36VoteRegistrationSignatureHex as HexString,
      )
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const signOperationalCertificate = async (
    kesVKey: KesVKey,
    kesPeriod: bigint,
    issueCounter: OpCertIssueCounter,
    signingFiles: HwSigningData[],
  ): Promise<SignedOpCertCborHex> => {
    const poolColdKeyPath = findSigningPathForKey(issueCounter.poolColdKey, signingFiles)
    try {
      const { signatureHex } = await ledger.signOperationalCertificate({
        kesPublicKeyHex: kesVKey.toString('hex'),
        kesPeriod: kesPeriod.toString(),
        issueCounter: issueCounter.counter.toString(),
        coldKeyPath: poolColdKeyPath as BIP32Path,
      })

      return OpCertSigned(
        kesVKey,
        kesPeriod,
        issueCounter,
        Buffer.from(signatureHex, 'hex'),
      )
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const nativeScriptToLedgerTypes = (
    nativeScript: NativeScript,
    signingFiles: HwSigningData[],
  ): LedgerTypes.NativeScript => {
    switch (nativeScript.type) {
      case NativeScriptType.PUBKEY: {
        const path = findSigningPathForKeyHash(Buffer.from(nativeScript.keyHash, 'hex'), signingFiles)
        if (path) {
          return {
            type: LedgerTypes.NativeScriptType.PUBKEY_DEVICE_OWNED,
            params: {
              path,
            },
          }
        }
        return {
          type: LedgerTypes.NativeScriptType.PUBKEY_THIRD_PARTY,
          params: {
            keyHashHex: nativeScript.keyHash,
          },
        }
      }
      case NativeScriptType.ALL:
        return {
          type: LedgerTypes.NativeScriptType.ALL,
          params: {
            scripts: nativeScript.scripts.map((s) => nativeScriptToLedgerTypes(s, signingFiles)),
          },
        }
      case NativeScriptType.ANY:
        return {
          type: LedgerTypes.NativeScriptType.ANY,
          params: {
            scripts: nativeScript.scripts.map((s) => nativeScriptToLedgerTypes(s, signingFiles)),
          },
        }
      case NativeScriptType.N_OF_K:
        return {
          type: LedgerTypes.NativeScriptType.N_OF_K,
          params: {
            requiredCount: nativeScript.required,
            scripts: nativeScript.scripts.map((s) => nativeScriptToLedgerTypes(s, signingFiles)),
          },
        }
      case NativeScriptType.INVALID_BEFORE:
        return {
          type: LedgerTypes.NativeScriptType.INVALID_BEFORE,
          params: {
            slot: nativeScript.slot,
          },
        }
      case NativeScriptType.INVALID_HEREAFTER:
        return {
          type: LedgerTypes.NativeScriptType.INVALID_HEREAFTER,
          params: {
            slot: nativeScript.slot,
          },
        }
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const nativeScriptDisplayFormatToLedgerType = (
    displayFormat: NativeScriptDisplayFormat,
  ): LedgerTypes.NativeScriptHashDisplayFormat => {
    switch (displayFormat) {
      case NativeScriptDisplayFormat.BECH32:
        return LedgerTypes.NativeScriptHashDisplayFormat.BECH32
      case NativeScriptDisplayFormat.POLICY_ID:
        return LedgerTypes.NativeScriptHashDisplayFormat.POLICY_ID
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const deriveNativeScriptHash = async (
    nativeScript: NativeScript,
    signingFiles: HwSigningData[],
    displayFormat: NativeScriptDisplayFormat,
  ): Promise<NativeScriptHashKeyHex> => {
    try {
      const { scriptHashHex } = await ledger.deriveNativeScriptHash({
        script: nativeScriptToLedgerTypes(nativeScript, signingFiles),
        displayFormat: nativeScriptDisplayFormatToLedgerType(displayFormat),
      })
      return scriptHashHex as NativeScriptHashKeyHex
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  return {
    getVersion,
    showAddress,
    witnessTx,
    getXPubKeys,
    signOperationalCertificate,
    signCIP36RegistrationMetaData,
    deriveNativeScriptHash,
  }
}
