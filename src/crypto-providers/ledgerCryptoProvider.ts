import * as TxTypes from 'cardano-hw-interop-lib'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid-noevents'
import Ledger, * as LedgerTypes from '@cardano-foundation/ledgerjs-hw-app-cardano'
import { parseBIP32Path } from '../command-parser/parsers'
import { Errors } from '../errors'
import { isChainCodeHex, isPubKeyHex, isXPubKeyHex } from '../guards'
import {
  KesVKey, OpCertIssueCounter, OpCertSigned, SignedOpCertCborHex,
} from '../opCert/opCert'
import { TxByronWitness, TxShelleyWitness, TxSigned } from '../transaction/transaction'
import {
  TxCborHex,
  _ByronWitness,
  _ShelleyWitness,
  TxWitnessKeys,
  VotingRegistrationMetaDataCborHex,
  TxWitnesses,
} from '../transaction/types'
import {
  BIP32Path,
  HexString,
  HwSigningData,
  NativeScript,
  NativeScriptDisplayFormat,
  NativeScriptHashKeyHex,
  NativeScriptType,
  Network,
  ParsedShowAddressArguments,
  VotePublicKeyHex,
  XPubKeyHex,
} from '../types'
import { partition } from '../util'
import {
  CryptoProvider, _AddressParameters, SigningMode, SigningParameters,
} from './types'
import {
  findSigningPathForKeyHash,
  getSigningPath,
  PathTypes,
  classifyPath,
  getAddressAttributes,
  ipv4ToString,
  ipv6ToString,
  filterSigningFiles,
  getAddressParameters,
  splitXPubKeyCborHex,
  validateVotingRegistrationAddressType,
  findSigningPathForKey,
  encodeVotingRegistrationMetaData,
  rewardAccountToStakeCredential,
} from './util'

const { bech32 } = require('cardano-crypto.js')

export const LedgerCryptoProvider: () => Promise<CryptoProvider> = async () => {
  const transport = await TransportNodeHid.create()
  const ledger = new Ledger(transport)

  const getVersion = async (): Promise<string> => {
    const { major, minor, patch } = (await ledger.getVersion()).version
    return `Ledger app version ${major}.${minor}.${patch}`
  }

  const showAddress = async (
    {
      paymentPath, paymentScriptHash, stakingPath, stakingScriptHash, address,
    }: ParsedShowAddressArguments,
  ): Promise<void> => {
    try {
      const { addressType, networkId, protocolMagic } = getAddressAttributes(address)

      await ledger.showAddress({
        network: {
          protocolMagic,
          networkId,
        },
        address: {
          type: addressType,
          params: {
            spendingPath: paymentPath,
            spendingScriptHash: paymentScriptHash,
            stakingPath,
            stakingScriptHash,
          },
        },
      })
    } catch (err) {
      throw Error(Errors.LedgerOperationError)
    }
  }

  const getXPubKeys = async (paths: BIP32Path[]): Promise<XPubKeyHex[]> => {
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
  }

  const prepareInput = (
    signingMode: SigningMode, input: TxTypes.TransactionInput, path: BIP32Path | null,
  ): LedgerTypes.TxInput => {
    const pathToUse = (signingMode === SigningMode.POOL_REGISTRATION_AS_OWNER)
      ? null // inputs are required to be given without path in this case
      : path
    if (input.index < 0 || input.index > Number.MAX_SAFE_INTEGER) {
      throw Error(Errors.InvalidInputError)
    }
    return {
      path: pathToUse,
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

  const prepareChangeOutput = (
    lovelaceAmount: TxTypes.Uint,
    changeOutput: _AddressParameters,
    tokenBundle: LedgerTypes.AssetGroup[] | null,
    datumHashHex?: string,
  ): LedgerTypes.TxOutput => ({
    destination: {
      type: LedgerTypes.TxOutputDestinationType.DEVICE_OWNED,
      params: {
        type: changeOutput.addressType,
        params: {
          spendingPath: changeOutput.paymentPath as BIP32Path,
          stakingPath: changeOutput.stakePath,
        },
      },
    },
    amount: `${lovelaceAmount}`,
    tokenBundle,
    datumHashHex,
  })

  const prepareOutput = (
    output: TxTypes.TransactionOutput,
    network: Network,
    changeOutputFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.TxOutput => {
    const changeAddressParams = getAddressParameters(changeOutputFiles, output.address, network)
    const tokenBundle = output.amount.type === TxTypes.AmountType.WITH_MULTIASSET
      ? prepareTokenBundle(output.amount.multiasset) : null
    const datumHashHex = output.datumHash?.toString('hex')

    const addressParamsAllowed = [
      SigningMode.ORDINARY_TRANSACTION, SigningMode.PLUTUS_TRANSACTION,
    ].includes(signingMode)
    if (changeAddressParams && addressParamsAllowed) {
      return prepareChangeOutput(output.amount.coin, changeAddressParams, tokenBundle, datumHashHex)
    }

    return {
      destination: {
        type: LedgerTypes.TxOutputDestinationType.THIRD_PARTY,
        params: {
          addressHex: output.address.toString('hex'),
        },
      },
      amount: `${output.amount.coin}`,
      tokenBundle,
      datumHashHex,
    }
  }

  const _prepareStakeCredential = (
    stakeCredential: TxTypes.StakeCredential,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.StakeCredentialParams => {
    switch (stakeCredential.type) {
      case (TxTypes.StakeCredentialType.KEY_HASH): {
        const path = findSigningPathForKeyHash(
          (stakeCredential as TxTypes.StakeCredentialKey).hash, stakeSigningFiles,
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
            keyHash: stakeCredential.hash.toString('hex'),
          }
        }
        throw Error(Errors.MissingSigningFileForCertificateError)
      }
      case (TxTypes.StakeCredentialType.SCRIPT_HASH): {
        return {
          type: LedgerTypes.StakeCredentialParamsType.SCRIPT_HASH,
          scriptHash: stakeCredential.hash.toString('hex'),
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
    signingMode: SigningMode, poolKeyHash: Buffer, poolKeyPath?: BIP32Path,
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
    signingFiles: HwSigningData[], rewardAccount: Buffer, network: Network,
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
    signingMode: SigningMode, owners: Buffer[], stakeSigningFiles: HwSigningData[],
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
    if (!ownersWithPath.length && signingMode === SigningMode.POOL_REGISTRATION_AS_OWNER) {
      throw Error(Errors.MissingSigningFileForCertificateError)
    }
    if (ownersWithPath.length > 1) throw Error(Errors.OwnerMultipleTimesInTxError)

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

  const prepareMetaDataHashHex = (
    metaDataHash: Buffer | undefined,
  ): LedgerTypes.TxAuxiliaryData | undefined => (
    metaDataHash ? ({
      type: LedgerTypes.TxAuxiliaryDataType.ARBITRARY_HASH,
      params: {
        hashHex: metaDataHash.toString('hex'),
      },
    }) : undefined
  )

  const prepareScriptDataHash = (
    scriptDataHash: Buffer | undefined,
  ): string | undefined => scriptDataHash?.toString('hex')

  const prepareCollateralInput = (
    collateralInput: TxTypes.Collateral, path: BIP32Path | null,
  ): LedgerTypes.TxInput => {
    if (collateralInput.index < 0 || collateralInput.index > Number.MAX_SAFE_INTEGER) {
      throw Error(Errors.InvalidCollateralInputError)
    }
    return {
      path,
      txHashHex: collateralInput.transactionId.toString('hex'),
      outputIndex: Number(collateralInput.index),
    }
  }

  const prepareRequiredSigner = (
    requiredSigner: TxTypes.RequiredSigner, signingFiles: HwSigningData[],
  ): LedgerTypes.RequiredSigner => {
    const path = findSigningPathForKeyHash(requiredSigner, signingFiles)
    return path
      ? {
        type: LedgerTypes.TxRequiredSignerType.PATH,
        path,
      }
      : {
        type: LedgerTypes.TxRequiredSignerType.HASH,
        hash: requiredSigner.toString('hex'),
      }
  }

  const prepareAdditionalWitnessRequests = (
    mintSigningFiles: HwSigningData[],
    multisigSigningFiles: HwSigningData[],
  ) => (
    // Even though Plutus txs might require additional payment/stake signatures, Plutus scripts
    // don't see signatures directly - they can only access requiredSigners, and their witnesses
    // are gathered above.
    [...mintSigningFiles, ...multisigSigningFiles].map((f) => f.path)
  )

  const createWitnesses = (
    ledgerWitnesses: LedgerTypes.Witness[],
    signingFiles: HwSigningData[],
  ): TxWitnesses => {
    const pathEquals = (
      path1: BIP32Path, path2: BIP32Path,
    ) => path1.every((element, i) => element === path2[i])

    const getSigningFileDataByPath = (
      path: BIP32Path,
    ): HwSigningData => {
      const hwSigningData = signingFiles.find((signingFile) => pathEquals(signingFile.path, path))
      if (hwSigningData) return hwSigningData
      throw Error(Errors.MissingHwSigningDataAtPathError)
    }

    const isByronPath = (path: number[]) => classifyPath(path) === PathTypes.PATH_WALLET_SPENDING_KEY_BYRON

    const [byronWitnesses, shelleyWitnesses] = partition(
      ledgerWitnesses.map((witness) => {
        const { pubKey, chainCode } = splitXPubKeyCborHex(
          getSigningFileDataByPath(witness.path as BIP32Path).cborXPubKeyHex,
        )
        return ({
          path: witness.path,
          signature: Buffer.from(witness.witnessSignatureHex, 'hex'),
          pubKey,
          chainCode,
        })
      }),
      (witness) => isByronPath(witness.path),
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
      signingMode, rawTx, tx, txBodyHashHex, hwSigningFileData, network,
    } = params
    const body = (rawTx?.body ?? tx?.body)!
    const {
      paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles, mintSigningFiles, multisigSigningFiles,
    } = filterSigningFiles(hwSigningFileData)

    const inputs = body.inputs.map(
      (input, i) => prepareInput(signingMode, input, getSigningPath(paymentSigningFiles, i)),
    )
    const outputs = body.outputs.map(
      (output) => prepareOutput(output, network, changeOutputFiles, signingMode),
    )
    const certificates = body.certificates?.map(
      (certificate) => prepareCertificate(
        certificate,
        [...stakeSigningFiles, ...poolColdSigningFiles],
        network,
        signingMode,
      ),
    )
    const fee = `${body.fee}`
    const ttl = prepareTtl(body.ttl)
    const validityIntervalStart = prepareValidityIntervalStart(body.validityIntervalStart)
    const withdrawals = body.withdrawals?.map(
      (withdrawal) => prepareWithdrawal(withdrawal, stakeSigningFiles, signingMode),
    )
    const auxiliaryData = prepareMetaDataHashHex(body.metadataHash)
    const mint = body.mint ? prepareTokenBundle(body.mint) : null
    const scriptDataHashHex = prepareScriptDataHash(body.scriptDataHash)
    const collaterals = body.collaterals?.map(
      (collateralInput, i) => prepareCollateralInput(
        collateralInput, getSigningPath(paymentSigningFiles, inputs.length + i),
      ),
    )
    const requiredSigners = body.requiredSigners?.map(
      (requiredSigner) => prepareRequiredSigner(
        requiredSigner,
        [...paymentSigningFiles, ...stakeSigningFiles, ...mintSigningFiles, ...multisigSigningFiles],
      ),
    )
    const includeNetworkId = body.networkId !== undefined

    const additionalWitnessRequests = prepareAdditionalWitnessRequests(mintSigningFiles, multisigSigningFiles)

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
        collaterals,
        requiredSigners,
        includeNetworkId,
      },
      additionalWitnessPaths: additionalWitnessRequests,
    })

    if (response.txHashHex !== txBodyHashHex) {
      throw Error(Errors.TxSerializationMismatchError)
    }

    return response.witnesses
  }

  const signTx = async (
    params: SigningParameters,
    changeOutputFiles: HwSigningData[],
  ): Promise<TxCborHex> => {
    const ledgerWitnesses = await ledgerSignTx(params, changeOutputFiles)
    const { byronWitnesses, shelleyWitnesses } = createWitnesses(ledgerWitnesses, params.hwSigningFileData)
    return TxSigned(params, byronWitnesses, shelleyWitnesses)
  }

  const witnessTx = async (
    params: SigningParameters,
    changeOutputFiles: HwSigningData[],
  ): Promise<Array<_ShelleyWitness | _ByronWitness>> => {
    const ledgerWitnesses = await ledgerSignTx(params, changeOutputFiles)
    const { byronWitnesses, shelleyWitnesses } = createWitnesses(ledgerWitnesses, params.hwSigningFileData)
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
  ): LedgerTypes.TxAuxiliaryData => ({
    type: LedgerTypes.TxAuxiliaryDataType.CATALYST_REGISTRATION,
    params: {
      votingPublicKeyHex,
      stakingPath: hwStakeSigningFile.path,
      rewardsDestination: {
        type: addressParameters.addressType,
        params: {
          spendingPath: addressParameters.paymentPath as BIP32Path,
          stakingPath: addressParameters.stakePath as BIP32Path,
        },
      },
      nonce: `${nonce}`,
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
    network: LedgerTypes.Network, auxiliaryData: LedgerTypes.TxAuxiliaryData,
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

    const ledgerAuxData = prepareVoteAuxiliaryData(hwStakeSigningFile, votePublicKeyHex, addressParams, nonce)
    const dummyTx = prepareDummyTx(network, ledgerAuxData)

    const response = await ledger.signTransaction(dummyTx)
    if (!response.auxiliaryDataSupplement) throw Error(Errors.MissingAuxiliaryDataSupplement)

    return encodeVotingRegistrationMetaData(
      hwStakeSigningFile,
      votePublicKeyHex,
      address,
      nonce,
      response.auxiliaryDataSupplement.auxiliaryDataHashHex as HexString,
      response.auxiliaryDataSupplement.catalystRegistrationSignatureHex as HexString,
    )
  }

  const signOperationalCertificate = async (
    kesVKey: KesVKey,
    kesPeriod: BigInt,
    issueCounter: OpCertIssueCounter,
    signingFiles: HwSigningData[],
  ): Promise<SignedOpCertCborHex> => {
    const poolColdKeyPath = findSigningPathForKey(issueCounter.poolColdKey, signingFiles)

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
    const { scriptHashHex } = await ledger.deriveNativeScriptHash({
      script: nativeScriptToLedgerTypes(nativeScript, signingFiles),
      displayFormat: nativeScriptDisplayFormatToLedgerType(displayFormat),
    })

    return scriptHashHex as NativeScriptHashKeyHex
  }

  return {
    getVersion,
    showAddress,
    signTx,
    witnessTx,
    getXPubKeys,
    signOperationalCertificate,
    signVotingRegistrationMetaData,
    deriveNativeScriptHash,
  }
}
