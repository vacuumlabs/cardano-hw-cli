import * as TxTypes from 'cardano-hw-interop-lib'
import Ledger, * as LedgerTypes from '@cardano-foundation/ledgerjs-hw-app-cardano'
import type Transport from '@ledgerhq/hw-transport'
import {
  CIP36VoteDelegationType,
  DeviceOwnedAddress,
  MessageData,
  TxOutputDestination,
} from '@cardano-foundation/ledgerjs-hw-app-cardano'
import {parseBIP32Path} from '../command-parser/parsers'
import {Errors} from '../errors'
import {isChainCodeHex, isPubKeyHex, isXPubKeyHex} from '../guards'
import {
  KesVKey,
  OpCertIssueCounter,
  OpCertSigned,
  SignedOpCertCborHex,
} from '../opCert/opCert'
import {SignedMessageData} from '../signMessage/signMessage'
import {
  TxByronWitnessData,
  TxShelleyWitnessData,
} from '../transaction/transaction'
import {
  TxWitnessKeys,
  CIP36RegistrationMetaDataCborHex,
  TxWitnesses,
} from '../transaction/txTypes'
import {
  BIP32Path,
  HexString,
  NativeScriptHashKeyHex,
  XPubKeyHex,
  NativeScript,
  NativeScriptType,
  Network,
  CVoteDelegation,
  AddressType,
} from '../basicTypes'
import {
  HwSigningData,
  ParsedShowAddressArguments,
  ParsedSignMessageArguments,
} from '../command-parser/argTypes'
import {partition} from '../util'
import {
  CryptoProvider,
  SigningMode,
  SigningParameters,
  NativeScriptDisplayFormat,
} from './cryptoProvider'
import {
  findSigningPathForKeyHash,
  getAddressAttributes,
  ipv4ToString,
  ipv6ToString,
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
  _AddressParameters,
} from './util'
import {PROTOCOL_MAGICS} from '@trezor/connect/lib/constants/cardano'
import {KEY_HASH_LENGTH} from 'cardano-hw-interop-lib'

const {bech32} = require('cardano-crypto.js')

const failedMsg = (e: unknown): string => `The requested operation failed. \
Check that your Ledger device is connected, unlocked and with Cardano app running.
Details: ${e}`

export const LedgerCryptoProvider: (
  transport: Transport,
  // eslint-disable-next-line require-await
) => Promise<CryptoProvider> = async (transport) => {
  const ledger = new Ledger(transport)

  const getVersion = async (): Promise<string> => {
    try {
      const {major, minor, patch} = (await ledger.getVersion()).version
      return `Ledger app version ${major}.${minor}.${patch}`
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const showAddress = async ({
    paymentPath,
    paymentScriptHash,
    stakingPath,
    stakingScriptHash,
    address,
  }: ParsedShowAddressArguments): Promise<void> => {
    const {addressType, networkId, protocolMagic} =
      getAddressAttributes(address)
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
      const xPubKeys = await ledger.getExtendedPublicKeys({paths})
      return xPubKeys.map((xPubKey) => {
        const {publicKeyHex, chainCodeHex} = xPubKey
        if (
          !isPubKeyHex(xPubKey.publicKeyHex) ||
          !isChainCodeHex(xPubKey.chainCodeHex)
        ) {
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
    multiAssets:
      | TxTypes.Multiasset<TxTypes.Uint>
      | TxTypes.Multiasset<TxTypes.Int>,
  ): LedgerTypes.AssetGroup[] =>
    multiAssets.map(({policyId, tokens}) => {
      const tokenAmounts: LedgerTypes.Token[] = tokens.map(
        ({assetName, amount}) => ({
          assetNameHex: assetName.toString('hex'),
          amount: `${amount}`,
        }),
      )
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

        return output.datum?.type === TxTypes.DatumType.HASH
          ? {
              type: TxTypes.DatumType.HASH,
              datumHashHex: output.datum.hash.toString('hex'),
            }
          : {
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
    const changeAddressParams = getAddressParameters(
      changeOutputFiles,
      output.address,
      network,
    )
    const destination = prepareDestination(
      output.address,
      changeAddressParams,
      signingMode,
    )

    const tokenBundle =
      output.amount.type === TxTypes.AmountType.WITH_MULTIASSET
        ? prepareTokenBundle(output.amount.multiasset)
        : undefined

    const datumHashHex = prepareDatumHash(output)
    const datum = prepareDatum(output)

    const referenceScriptHex =
      output.format === TxTypes.TxOutputFormat.MAP_BABBAGE
        ? output.referenceScript?.toString('hex')
        : undefined

    return {
      format:
        output.format === TxTypes.TxOutputFormat.ARRAY_LEGACY
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

  const prepareCredential = (
    credential: TxTypes.Credential,
    signingFiles: HwSigningData[],
    signingMode: SigningMode,
    allowKeyHashInOrdinary: boolean,
  ): LedgerTypes.CredentialParams => {
    switch (credential.type) {
      case TxTypes.CredentialType.KEY_HASH: {
        // A key hash credential can be sent to the HW wallet either by the key derivation
        // path or by the key hash (there are certain restrictions depending on signing mode). If we
        // are given the appropriate signing file, we always send a path; if we are not, we send the
        // key hash or throw an error depending on whether the signing mode allows it. This allows
        // the user of hw-cli to stay in control.
        const path = findSigningPathForKeyHash(
          (credential as TxTypes.KeyCredential).keyHash,
          signingFiles,
        )
        if (path) {
          return {
            type: LedgerTypes.CredentialParamsType.KEY_PATH,
            keyPath: path,
          }
        }
        const allowKeyHash =
          signingMode === SigningMode.PLUTUS_TRANSACTION ||
          (allowKeyHashInOrdinary &&
            signingMode === SigningMode.ORDINARY_TRANSACTION)
        if (allowKeyHash) {
          return {
            type: LedgerTypes.CredentialParamsType.KEY_HASH,
            keyHashHex: credential.keyHash.toString('hex'),
          }
        }
        throw Error(Errors.MissingSigningFileForCertificateError)
      }
      case TxTypes.CredentialType.SCRIPT_HASH: {
        return {
          type: LedgerTypes.CredentialParamsType.SCRIPT_HASH,
          scriptHashHex: credential.scriptHash.toString('hex'),
        }
      }
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareDRep = (
    dRep: TxTypes.DRep,
    signingFiles: HwSigningData[],
  ): LedgerTypes.DRepParams => {
    switch (dRep.type) {
      case TxTypes.DRepType.KEY_HASH: {
        const path = findSigningPathForKeyHash(
          (dRep as TxTypes.KeyHashDRep).keyHash,
          signingFiles,
        )
        if (path) {
          return {
            type: LedgerTypes.DRepParamsType.KEY_PATH,
            keyPath: path,
          }
        } else {
          return {
            type: LedgerTypes.DRepParamsType.KEY_HASH,
            keyHashHex: dRep.keyHash.toString('hex'),
          }
        }
      }
      case TxTypes.DRepType.SCRIPT_HASH: {
        return {
          type: LedgerTypes.DRepParamsType.SCRIPT_HASH,
          scriptHashHex: dRep.scriptHash.toString('hex'),
        }
      }
      case TxTypes.DRepType.ABSTAIN: {
        return {
          type: LedgerTypes.DRepParamsType.ABSTAIN,
        }
      }
      case TxTypes.DRepType.NO_CONFIDENCE: {
        return {
          type: LedgerTypes.DRepParamsType.NO_CONFIDENCE,
        }
      }
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareAnchor = (
    anchor: TxTypes.Anchor | null,
  ): LedgerTypes.AnchorParams | null => {
    if (anchor === null) {
      return null
    }
    return {
      url: anchor.url,
      hashHex: anchor.dataHash.toString('hex'),
    }
  }

  const prepareStakeRegistrationCert = (
    cert: TxTypes.StakeRegistrationCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.STAKE_REGISTRATION,
    params: {
      stakeCredential: prepareCredential(
        cert.stakeCredential,
        stakeSigningFiles,
        signingMode,
        false,
      ),
    },
  })

  const prepareStakeRegistrationConwayCert = (
    cert: TxTypes.StakeRegistrationConwayCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.STAKE_REGISTRATION_CONWAY,
    params: {
      stakeCredential: prepareCredential(
        cert.stakeCredential,
        stakeSigningFiles,
        signingMode,
        false,
      ),
      deposit: `${cert.deposit}`,
    },
  })

  const prepareStakeDeregistrationCert = (
    cert: TxTypes.StakeDeregistrationCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.STAKE_DEREGISTRATION,
    params: {
      stakeCredential: prepareCredential(
        cert.stakeCredential,
        stakeSigningFiles,
        signingMode,
        false,
      ),
    },
  })

  const prepareStakeDeregistrationConwayCert = (
    cert: TxTypes.StakeDeregistrationConwayCertificate,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.STAKE_DEREGISTRATION_CONWAY,
    params: {
      stakeCredential: prepareCredential(
        cert.stakeCredential,
        stakeSigningFiles,
        signingMode,
        false,
      ),
      deposit: `${cert.deposit}`,
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
      stakeCredential: prepareCredential(
        cert.stakeCredential,
        stakeSigningFiles,
        signingMode,
        false,
      ),
    },
  })

  const prepareVoteDelegationCert = (
    cert: TxTypes.VoteDelegationCertificate,
    signingFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.VOTE_DELEGATION,
    params: {
      stakeCredential: prepareCredential(
        cert.stakeCredential,
        signingFiles,
        signingMode,
        false,
      ),
      dRep: prepareDRep(cert.dRep, signingFiles),
    },
  })

  const prepareAuthorizeCommitteeHotCert = (
    cert: TxTypes.AuthorizeCommitteeHotCertificate,
    signingFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.AUTHORIZE_COMMITTEE_HOT,
    params: {
      coldCredential: prepareCredential(
        cert.coldCredential,
        signingFiles,
        signingMode,
        false,
      ),
      hotCredential: prepareCredential(
        cert.hotCredential,
        signingFiles,
        signingMode,
        true,
      ),
    },
  })

  const prepareResignCommitteeColdCert = (
    cert: TxTypes.ResignCommitteeColdCertificate,
    signingFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.RESIGN_COMMITTEE_COLD,
    params: {
      coldCredential: prepareCredential(
        cert.coldCredential,
        signingFiles,
        signingMode,
        false,
      ),
      anchor: prepareAnchor(cert.anchor),
    },
  })

  const prepareDRepRegistrationCert = (
    cert: TxTypes.DRepRegistrationCertificate,
    signingFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.DREP_REGISTRATION,
    params: {
      dRepCredential: prepareCredential(
        cert.dRepCredential,
        signingFiles,
        signingMode,
        false,
      ),
      deposit: `${cert.deposit}`,
      anchor: prepareAnchor(cert.anchor),
    },
  })

  const prepareDRepDeregistrationCert = (
    cert: TxTypes.DRepDeregistrationCertificate,
    signingFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.DREP_DEREGISTRATION,
    params: {
      dRepCredential: prepareCredential(
        cert.dRepCredential,
        signingFiles,
        signingMode,
        false,
      ),
      deposit: `${cert.deposit}`,
    },
  })

  const prepareDRepUpdateCert = (
    cert: TxTypes.DRepUpdateCertificate,
    signingFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.DREP_UPDATE,
    params: {
      dRepCredential: prepareCredential(
        cert.dRepCredential,
        signingFiles,
        signingMode,
        false,
      ),
      anchor: prepareAnchor(cert.anchor),
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
    const addressParams = getAddressParameters(
      signingFiles,
      rewardAccount,
      network,
    )
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
      return path && signingMode === SigningMode.POOL_REGISTRATION_AS_OWNER
        ? {
            type: LedgerTypes.PoolOwnerType.DEVICE_OWNED,
            params: {stakingPath: path},
          }
        : {
            type: LedgerTypes.PoolOwnerType.THIRD_PARTY,
            params: {stakingKeyHashHex: owner.toString('hex')},
          }
    })

    const ownersWithPath = poolOwners.filter(
      (owner) => owner.type === LedgerTypes.PoolOwnerType.DEVICE_OWNED,
    )
    if (
      ownersWithPath.length === 0 &&
      signingMode === SigningMode.POOL_REGISTRATION_AS_OWNER
    ) {
      throw Error(Errors.MissingSigningFileForCertificateError)
    }
    if (ownersWithPath.length > 1) {
      throw Error(Errors.OwnerMultipleTimesInTxError)
    }

    return poolOwners
  }

  const prepareRelays = (relays: TxTypes.Relay[]): LedgerTypes.Relay[] => {
    const SingleIPRelay = ({
      port,
      ipv4,
      ipv6,
    }: TxTypes.RelaySingleHostAddress): LedgerTypes.Relay => ({
      type: LedgerTypes.RelayType.SINGLE_HOST_IP_ADDR,
      params: {
        portNumber: port ? Number(port) : undefined,
        ipv4: ipv4ToString(ipv4),
        ipv6: ipv6ToString(ipv6),
      },
    })

    const SingleNameRelay = ({
      dnsName,
      port,
    }: TxTypes.RelaySingleHostName): LedgerTypes.Relay => ({
      type: LedgerTypes.RelayType.SINGLE_HOST_HOSTNAME,
      params: {portNumber: port ? Number(port) : undefined, dnsName},
    })

    const MultiNameRelay = ({
      dnsName,
    }: TxTypes.RelayMultiHostName): LedgerTypes.Relay => ({
      type: LedgerTypes.RelayType.MULTI_HOST,
      params: {dnsName},
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
    const poolKeyPath = findSigningPathForKeyHash(
      cert.poolParams.operator,
      signingFiles,
    )

    const metadata: LedgerTypes.PoolMetadataParams | null = cert.poolParams
      .poolMetadata
      ? {
          metadataUrl: cert.poolParams.poolMetadata.url,
          metadataHashHex:
            cert.poolParams.poolMetadata.metadataHash.toString('hex'),
        }
      : null

    const margin: LedgerTypes.Margin = {
      numerator: `${cert.poolParams.margin[0]}`,
      denominator: `${cert.poolParams.margin[1]}`,
    }

    const params: LedgerTypes.PoolRegistrationParams = {
      poolKey: preparePoolKey(
        signingMode,
        cert.poolParams.operator,
        poolKeyPath,
      ),
      vrfKeyHashHex: cert.poolParams.vrfKeyHash.toString('hex'),
      pledge: `${cert.poolParams.pledge}`,
      cost: `${cert.poolParams.cost}`,
      margin,
      rewardAccount: prepareRewardAccount(
        signingFiles,
        cert.poolParams.rewardAccount,
        network,
      ),
      poolOwners: preparePoolOwners(
        signingMode,
        cert.poolParams.poolOwners.items,
        signingFiles,
      ),
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
    const poolKeyPath = findSigningPathForKeyHash(
      cert.poolKeyHash,
      signingFiles,
    )
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
        return prepareStakeRegistrationCert(
          certificate,
          signingFiles,
          signingMode,
        )
      case TxTypes.CertificateType.STAKE_REGISTRATION_CONWAY:
        return prepareStakeRegistrationConwayCert(
          certificate,
          signingFiles,
          signingMode,
        )
      case TxTypes.CertificateType.STAKE_DEREGISTRATION:
        return prepareStakeDeregistrationCert(
          certificate,
          signingFiles,
          signingMode,
        )
      case TxTypes.CertificateType.STAKE_DEREGISTRATION_CONWAY:
        return prepareStakeDeregistrationConwayCert(
          certificate,
          signingFiles,
          signingMode,
        )
      case TxTypes.CertificateType.STAKE_DELEGATION:
        return prepareDelegationCert(certificate, signingFiles, signingMode)
      case TxTypes.CertificateType.POOL_REGISTRATION:
        return prepareStakePoolRegistrationCert(
          certificate,
          signingFiles,
          network,
          signingMode,
        )
      case TxTypes.CertificateType.POOL_RETIREMENT:
        return prepareStakePoolRetirementCert(certificate, signingFiles)
      case TxTypes.CertificateType.VOTE_DELEGATION:
        return prepareVoteDelegationCert(certificate, signingFiles, signingMode)

      case TxTypes.CertificateType.STAKE_AND_VOTE_DELEGATION:
      case TxTypes.CertificateType.STAKE_REGISTRATION_AND_DELEGATION:
      case TxTypes.CertificateType.STAKE_REGISTRATION_WITH_VOTE_DELEGATION:
      case TxTypes.CertificateType
        .STAKE_REGISTRATION_WITH_STAKE_AND_VOTE_DELEGATION:
        throw Error(Errors.UnsupportedCertificateType)

      case TxTypes.CertificateType.AUTHORIZE_COMMITTEE_HOT:
        return prepareAuthorizeCommitteeHotCert(
          certificate,
          signingFiles,
          signingMode,
        )
      case TxTypes.CertificateType.RESIGN_COMMITTEE_COLD:
        return prepareResignCommitteeColdCert(
          certificate,
          signingFiles,
          signingMode,
        )
      case TxTypes.CertificateType.DREP_REGISTRATION:
        return prepareDRepRegistrationCert(
          certificate,
          signingFiles,
          signingMode,
        )
      case TxTypes.CertificateType.DREP_DEREGISTRATION:
        return prepareDRepDeregistrationCert(
          certificate,
          signingFiles,
          signingMode,
        )
      case TxTypes.CertificateType.DREP_UPDATE:
        return prepareDRepUpdateCert(certificate, signingFiles, signingMode)

      default:
        throw Error(Errors.UnknownCertificateError)
    }
  }

  const prepareWithdrawal = (
    withdrawal: TxTypes.Withdrawal,
    stakeSigningFiles: HwSigningData[],
    signingMode: SigningMode,
  ): LedgerTypes.Withdrawal => {
    const stakeCredential: TxTypes.Credential = rewardAccountToStakeCredential(
      withdrawal.rewardAccount,
    )
    return {
      stakeCredential: prepareCredential(
        stakeCredential,
        stakeSigningFiles,
        signingMode,
        false,
      ),
      amount: `${withdrawal.amount}`,
    }
  }

  const prepareTtl = (ttl: TxTypes.Uint | undefined): string | undefined =>
    ttl?.toString()

  const prepareValidityIntervalStart = (
    validityIntervalStart: TxTypes.Uint | undefined,
  ): string | undefined => validityIntervalStart?.toString()

  const prepareAuxiliaryDataHashHex = (
    auxiliaryDataHash: Buffer | undefined,
  ): LedgerTypes.TxAuxiliaryData | undefined =>
    auxiliaryDataHash
      ? {
          type: LedgerTypes.TxAuxiliaryDataType.ARBITRARY_HASH,
          params: {
            hashHex: auxiliaryDataHash.toString('hex'),
          },
        }
      : undefined

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

  const prepareVoter = (
    voter: TxTypes.Voter,
    voterPath: BIP32Path | undefined,
  ): LedgerTypes.Voter => {
    switch (voter.type) {
      case TxTypes.VoterType.DREP_KEY:
        return voterPath !== undefined
          ? {
              type: LedgerTypes.VoterType.DREP_KEY_PATH,
              keyPath: voterPath,
            }
          : {
              type: LedgerTypes.VoterType.DREP_KEY_HASH,
              keyHashHex: voter.hash.toString('hex'),
            }

      case TxTypes.VoterType.DREP_SCRIPT:
        return {
          type: LedgerTypes.VoterType.DREP_SCRIPT_HASH,
          scriptHashHex: voter.hash.toString('hex'),
        }

      case TxTypes.VoterType.COMMITTEE_KEY:
        return voterPath !== undefined
          ? {
              type: LedgerTypes.VoterType.COMMITTEE_KEY_PATH,
              keyPath: voterPath,
            }
          : {
              type: LedgerTypes.VoterType.COMMITTEE_KEY_HASH,
              keyHashHex: voter.hash.toString('hex'),
            }

      case TxTypes.VoterType.COMMITTEE_SCRIPT:
        return {
          type: LedgerTypes.VoterType.COMMITTEE_SCRIPT_HASH,
          scriptHashHex: voter.hash.toString('hex'),
        }

      case TxTypes.VoterType.STAKE_POOL:
        return voterPath !== undefined
          ? {
              type: LedgerTypes.VoterType.STAKE_POOL_KEY_PATH,
              keyPath: voterPath,
            }
          : {
              type: LedgerTypes.VoterType.STAKE_POOL_KEY_HASH,
              keyHashHex: voter.hash.toString('hex'),
            }

      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareVoteOption = (voteOption: TxTypes.VoteOption) => {
    switch (voteOption) {
      case TxTypes.VoteOption.NO:
        return LedgerTypes.VoteOption.NO
      case TxTypes.VoteOption.YES:
        return LedgerTypes.VoteOption.YES
      case TxTypes.VoteOption.ABSTAIN:
        return LedgerTypes.VoteOption.ABSTAIN
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareVoterVotes = (
    voterVotes: TxTypes.VoterVotes,
    signingFiles: HwSigningData[],
  ): LedgerTypes.VoterVotes => {
    const voterPath = findSigningPathForKeyHash(
      voterVotes.voter.hash,
      signingFiles,
    )
    return {
      voter: prepareVoter(voterVotes.voter, voterPath),
      votes: voterVotes.votes.map((vv) => {
        if (vv.govActionId.index > Number.MAX_SAFE_INTEGER) {
          throw Error(Errors.InvalidVotingProcedures)
        }
        return {
          govActionId: {
            txHashHex: vv.govActionId.transactionId.toString('hex'),
            govActionIndex: Number(vv.govActionId.index),
          },
          votingProcedure: {
            vote: prepareVoteOption(vv.votingProcedure.voteOption),
            anchor: prepareAnchor(vv.votingProcedure.anchor),
          },
        }
      }),
    }
  }

  const prepareAdditionalWitnessRequests = (
    hwSigningFileData: HwSigningData[],
  ): BIP32Path[] => {
    // Witnesses for some tx body elements (certificates, required signers etc.) have already been
    // added across the tx.
    // However, we must add witnesses for inputs, script hash elements (e.g. mint).
    // For whatever reason, the user might want to get extra witnesses, so we add it all here and
    // let ledgerjs uniquify them so that each witness is asked only once.
    return hwSigningFileData.map((f) => f.path)
  }

  const createWitnesses = (
    ledgerWitnesses: LedgerTypes.Witness[],
    signingFiles: HwSigningData[],
  ): TxWitnesses => {
    const getSigningFileDataByPath = (path: BIP32Path): HwSigningData => {
      const hwSigningData = signingFiles.find((signingFile) =>
        pathEquals(signingFile.path, path),
      )
      if (hwSigningData) return hwSigningData
      throw Error(Errors.MissingHwSigningDataAtPathError)
    }
    const witnessesWithKeys = ledgerWitnesses.map((witness) => {
      const {pubKey, chainCode} = splitXPubKeyCborHex(
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
      (witness) =>
        classifyPath(witness.path) === PathTypes.PATH_WALLET_SPENDING_KEY_BYRON,
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
    const {signingMode, tx, txBodyHashHex, hwSigningFileData, network} = params

    const inputs = tx.body.inputs.items.map(prepareInput)
    const outputs = tx.body.outputs.map((output) =>
      prepareOutput(output, network, changeOutputFiles, signingMode),
    )
    const fee = `${tx.body.fee}`
    const ttl = prepareTtl(tx.body.ttl)
    const certificates = tx.body.certificates?.items.map((certificate) =>
      prepareCertificate(certificate, hwSigningFileData, network, signingMode),
    )
    const withdrawals = tx.body.withdrawals?.map((withdrawal) =>
      prepareWithdrawal(withdrawal, hwSigningFileData, signingMode),
    )
    const auxiliaryData = prepareAuxiliaryDataHashHex(tx.body.auxiliaryDataHash)
    const validityIntervalStart = prepareValidityIntervalStart(
      tx.body.validityIntervalStart,
    )
    const mint = tx.body.mint ? prepareTokenBundle(tx.body.mint) : null
    const scriptDataHashHex = prepareScriptDataHash(tx.body.scriptDataHash)
    const collateralInputs = tx.body.collateralInputs?.items.map(
      prepareCollateralInput,
    )
    const requiredSigners = tx.body.requiredSigners?.items.map(
      (requiredSigner) =>
        prepareRequiredSigner(requiredSigner, hwSigningFileData),
    )
    const includeNetworkId = tx.body.networkId !== undefined
    const collateralOutput = tx.body.collateralReturnOutput
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
    const votingProcedures = tx.body.votingProcedures?.map((vv) =>
      prepareVoterVotes(vv, hwSigningFileData),
    )
    const treasury =
      tx.body.treasury !== undefined ? `${tx.body.treasury}` : undefined
    const donation =
      tx.body.donation !== undefined ? `${tx.body.donation}` : undefined

    const additionalWitnessRequests =
      prepareAdditionalWitnessRequests(hwSigningFileData)

    // the tags are either used everywhere or nowhere,
    // so we can just look at the inputs
    const tagCborSets = tx.body.inputs.hasTag

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
          votingProcedures,
          treasury,
          donation,
        },
        additionalWitnessPaths: additionalWitnessRequests,
        options: {
          tagCborSets,
        },
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

  const prepareCVoteDelegations = (
    delegations: CVoteDelegation[],
  ): LedgerTypes.CIP36VoteDelegation[] =>
    delegations.map(({votePublicKey, voteWeight}) => {
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

  const prepareCVoteAuxiliaryData = (
    delegations: CVoteDelegation[],
    hwStakeSigningFile: HwSigningData,
    paymentDestination: TxOutputDestination,
    nonce: bigint,
    votingPurpose: bigint,
  ): LedgerTypes.TxAuxiliaryData => ({
    type: LedgerTypes.TxAuxiliaryDataType.CIP36_REGISTRATION,
    params: {
      format: LedgerTypes.CIP36VoteRegistrationFormat.CIP_36,
      delegations: prepareCVoteDelegations(delegations),
      stakingPath: hwStakeSigningFile.path,
      paymentDestination,
      nonce: `${nonce}`,
      votingPurpose: `${votingPurpose}`,
    },
  })

  const prepareDummyInput = (): LedgerTypes.TxInput => ({
    path: parseBIP32Path('1852H/1815H/0H/0/0'),
    txHashHex: '0'.repeat(64),
    outputIndex: 0,
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
    const {data: address}: {data: Buffer} = bech32.decode(paymentAddressBech32)

    let destination: TxOutputDestination
    const addressParams = getAddressParameters(
      paymentAddressSigningFiles,
      address,
      network,
    )
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

    const ledgerAuxData = prepareCVoteAuxiliaryData(
      delegations,
      hwStakeSigningFile,
      destination,
      nonce,
      votingPurpose,
    )
    const dummyTx = prepareDummyTx(network, ledgerAuxData)

    try {
      const response = await ledger.signTransaction(dummyTx)
      if (!response.auxiliaryDataSupplement)
        throw Error(Errors.MissingAuxiliaryDataSupplement)

      return encodeCIP36RegistrationMetaData(
        delegations,
        hwStakeSigningFile,
        address,
        nonce,
        votingPurpose,
        response.auxiliaryDataSupplement.auxiliaryDataHashHex as HexString,
        response.auxiliaryDataSupplement
          .cip36VoteRegistrationSignatureHex as HexString,
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
    const poolColdKeyPath = findSigningPathForKey(
      issueCounter.poolColdKey,
      signingFiles,
    )
    try {
      const {signatureHex} = await ledger.signOperationalCertificate({
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

  const prepareAddressFieldData = (
    args: ParsedSignMessageArguments,
  ): [DeviceOwnedAddress, Network] => {
    const addressBytes = bech32.decode(args.address).data
    const network: Network = {
      // eslint-disable-next-line no-bitwise
      networkId: addressBytes[0] & 0b00001111,
      protocolMagic: PROTOCOL_MAGICS.mainnet, // irrelevant, Byron addresses not used here
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
            type: LedgerTypes.AddressType.BASE_PAYMENT_KEY_STAKE_KEY,
            params: {
              spendingPath: addressParams.paymentPath,
              stakingPath: addressParams.stakePath,
            },
          },
          network,
        ]

      case AddressType.BASE_PAYMENT_KEY_STAKE_SCRIPT:
        if (addressParams.paymentPath == null) {
          throw Error(Errors.InvalidMessageAddressError)
        }
        return [
          {
            type: LedgerTypes.AddressType.BASE_PAYMENT_KEY_STAKE_SCRIPT,
            params: {
              spendingPath: addressParams.paymentPath,
              stakingScriptHashHex: addressBytes
                .subarray(1 + KEY_HASH_LENGTH)
                .toString('hex'),
            },
          },
          network,
        ]

      case AddressType.REWARD_KEY:
        if (addressParams.stakePath == null) {
          throw Error(Errors.InvalidMessageAddressError)
        }
        return [
          {
            type: LedgerTypes.AddressType.REWARD_KEY,
            params: {
              stakingPath: addressParams.stakePath,
            },
          },
          network,
        ]

      case AddressType.ENTERPRISE_KEY:
        if (addressParams.paymentPath == null) {
          throw Error(Errors.InvalidMessageAddressError)
        }
        return [
          {
            type: LedgerTypes.AddressType.ENTERPRISE_KEY,
            params: {
              spendingPath: addressParams.paymentPath,
            },
          },
          network,
        ]

      default:
        throw Error(Errors.InvalidMessageAddressTypeError)
    }
  }

  const signMessage = async (
    args: ParsedSignMessageArguments,
  ): Promise<SignedMessageData> => {
    try {
      const commonLedgerArgs = {
        messageHex: args.messageHex,
        signingPath: args.hwSigningFileData.path,
        hashPayload: args.hashPayload,
      }
      let ledgerArgs: MessageData
      if (args.address !== undefined) {
        const [address, network] = prepareAddressFieldData(args)
        ledgerArgs = {
          ...commonLedgerArgs,
          addressFieldType: LedgerTypes.MessageAddressFieldType.ADDRESS,
          address,
          network,
        }
      } else {
        ledgerArgs = {
          ...commonLedgerArgs,
          addressFieldType: LedgerTypes.MessageAddressFieldType.KEY_HASH,
        }
      }
      const response = await ledger.signMessage(ledgerArgs)

      return {
        signatureHex: response.signatureHex,
        signingPublicKeyHex: response.signingPublicKeyHex,
        addressFieldHex: response.addressFieldHex,
      }
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
        const path = findSigningPathForKeyHash(
          Buffer.from(nativeScript.keyHash, 'hex'),
          signingFiles,
        )
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
            scripts: nativeScript.scripts.map((s) =>
              nativeScriptToLedgerTypes(s, signingFiles),
            ),
          },
        }
      case NativeScriptType.ANY:
        return {
          type: LedgerTypes.NativeScriptType.ANY,
          params: {
            scripts: nativeScript.scripts.map((s) =>
              nativeScriptToLedgerTypes(s, signingFiles),
            ),
          },
        }
      case NativeScriptType.N_OF_K:
        return {
          type: LedgerTypes.NativeScriptType.N_OF_K,
          params: {
            requiredCount: nativeScript.required,
            scripts: nativeScript.scripts.map((s) =>
              nativeScriptToLedgerTypes(s, signingFiles),
            ),
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
      const {scriptHashHex} = await ledger.deriveNativeScriptHash({
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
    signMessage,
    deriveNativeScriptHash,
  }
}
