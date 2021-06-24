import Ledger, * as LedgerTypes from '@cardano-foundation/ledgerjs-hw-app-cardano'
import { parseBIP32Path } from '../command-parser/parsers'
import { Errors } from '../errors'
import { isChainCodeHex, isPubKeyHex, isXPubKeyHex } from '../guards'
import {
  KesVKey, OpCertIssueCounter, OpCertSigned, SignedOpCertCborHex,
} from '../opCert/opCert'
import { TxByronWitness, TxShelleyWitness, TxSigned } from '../transaction/transaction'
import {
  _Input,
  _Output,
  SignedTxCborHex,
  _ByronWitness,
  _ShelleyWitness,
  _Certificate,
  TxCertificateKeys,
  _Withdrawal,
  _StakepoolRegistrationCert,
  // TODO let's avoid these endless imports
  // TODO what about using something like tx.StakepoolRetirementCert?
  _StakepoolRetirementCert,
  _DelegationCert,
  _StakingKeyDeregistrationCert,
  _StakingKeyRegistrationCert,
  _PoolRelay,
  _SingleHostIPRelay,
  _MultiHostNameRelay,
  _SingleHostNameRelay,
  TxRelayTypes,
  TxWitnessKeys,
  _MultiAsset,
  VotingRegistrationMetaDataCborHex,
  _UnsignedTxParsed,
  TxWitnesses,
  AddrKeyHash,
  ScriptHash,
  StakeCredential,
  StakeCredentialType,
} from '../transaction/types'
import {
  Address,
  BIP32Path,
  HexString,
  HwSigningData,
  NativeScript,
  NativeScriptDisplayFormat,
  NativeScriptHashKeyHex,
  NativeScriptType,
  Network,
  VotePublicKeyHex,
  XPubKeyHex,
} from '../types'
import { partition } from '../util'
import { LEDGER_VERSIONS } from './constants'
import { LedgerCryptoProviderFeature, LedgerWitness } from './ledgerTypes'
import { CryptoProvider, _AddressParameters } from './types'
import {
  findSigningPathForKeyHash,
  getSigningPath,
  PathTypes,
  classifyPath,
  getAddressAttributes,
  ipv4ToString,
  ipv6ToString,
  isDeviceVersionGTE,
  filterSigningFiles,
  getAddressParameters,
  splitXPubKeyCborHex,
  validateVotingRegistrationAddressType,
  findSigningPathForKey,
  encodeVotingRegistrationMetaData,
  findPathForKeyHash,
} from './util'

const { bech32 } = require('cardano-crypto.js')

const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid').default

export const LedgerCryptoProvider: () => Promise<CryptoProvider> = async () => {
  const transport = await TransportNodeHid.create()
  const ledger = new Ledger(transport)

  const getVersion = async (): Promise<string> => {
    const { major, minor, patch } = (await ledger.getVersion()).version
    return `Ledger app version ${major}.${minor}.${patch}`
  }

  const deviceVersion = (await ledger.getVersion()).version

  const isFeatureSupportedForVersion = (
    feature: LedgerCryptoProviderFeature,
  ): boolean => LEDGER_VERSIONS[feature] && isDeviceVersionGTE(deviceVersion, LEDGER_VERSIONS[feature])

  const showAddress = async (
    paymentPath: BIP32Path,
    paymentScriptHash: string,
    stakingPath: BIP32Path,
    stakingScriptHash: string,
    address: Address,
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

  const determineSigningMode = (certificates: _Certificate[], signingFiles: HwSigningData[]) => {
    const poolRegistrationCert = certificates.find(
      (cert) => cert.type === TxCertificateKeys.STAKEPOOL_REGISTRATION,
    ) as _StakepoolRegistrationCert

    if (!poolRegistrationCert) {
      return LedgerTypes.TransactionSigningMode.ORDINARY_TRANSACTION
    }

    const poolKeyPath = findSigningPathForKeyHash(poolRegistrationCert.poolKeyHash, signingFiles)
    if (!poolKeyPath) {
      return LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OWNER
    }

    return LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OPERATOR
  }

  const prepareInput = (
    signingMode: LedgerTypes.TransactionSigningMode, input: _Input, path: BIP32Path | null,
  ): LedgerTypes.TxInput => {
    const pathToUse = (signingMode === LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OWNER)
      ? null // inputs are required to be given without path in this case
      : path
    return {
      path: pathToUse,
      txHashHex: input.txHash.toString('hex'),
      outputIndex: input.outputIndex,
    }
  }

  const prepareTokenBundle = (
    multiAssets: _MultiAsset[],
  ): LedgerTypes.AssetGroup[] => multiAssets.map(({ policyId, assets }) => {
    const tokens: LedgerTypes.Token[] = assets.map(({ assetName, amount }) => ({
      assetNameHex: assetName.toString('hex'),
      amount: amount.toString(),
    }))
    return {
      policyIdHex: policyId.toString('hex'),
      tokens,
    }
  })

  const prepareChangeOutput = (
    amount: BigInt,
    changeOutput: _AddressParameters,
    tokenBundle: LedgerTypes.AssetGroup[] | null,
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
    amount: `${amount}`,
    tokenBundle,
  })

  const prepareOutput = (
    output: _Output,
    changeOutputFiles: HwSigningData[],
    network: Network,
  ): LedgerTypes.TxOutput => {
    const changeAddressParams = getAddressParameters(changeOutputFiles, output.address, network)
    const amount = output.coins
    const tokenBundle = prepareTokenBundle(output.tokenBundle)

    if (changeAddressParams) {
      return prepareChangeOutput(amount, changeAddressParams, tokenBundle)
    }
    return {
      destination: {
        type: LedgerTypes.TxOutputDestinationType.THIRD_PARTY,
        params: {
          addressHex: output.address.toString('hex'),
        },
      },
      amount: `${output.coins}`,
      tokenBundle,
    }
  }

  const _prepareCert = (
    stakeCredential: StakeCredential,
    stakeSigningFiles: HwSigningData[],
  ): LedgerTypes.StakeCredentialParams => {
    switch (stakeCredential.type) {
      case (StakeCredentialType.ADDR_KEY_HASH): {
        const path = findSigningPathForKeyHash(
          (stakeCredential as AddrKeyHash).addrKeyHash, stakeSigningFiles,
        )
        if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
        return {
          type: LedgerTypes.StakeCredentialParamsType.KEY_PATH,
          keyPath: path,
        }
      }
      case (StakeCredentialType.SCRIPT_HASH): {
        return {
          type: LedgerTypes.StakeCredentialParamsType.SCRIPT_HASH,
          scriptHash: (stakeCredential as ScriptHash).scriptHash.toString('hex'),
        }
      }
      default:
        throw Error(Errors.Unreachable)
    }
  }

  const prepareStakingKeyRegistrationCert = (
    cert: _StakingKeyRegistrationCert,
    stakeSigningFiles: HwSigningData[],
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.STAKE_REGISTRATION,
    params: {
      stakeCredential: _prepareCert(cert.stakeCredential, stakeSigningFiles),
    },
  })

  const prepareStakingKeyDeregistrationCert = (
    cert: _StakingKeyDeregistrationCert,
    stakeSigningFiles: HwSigningData[],
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.STAKE_DEREGISTRATION,
    params: {
      stakeCredential: _prepareCert(cert.stakeCredential, stakeSigningFiles),
    },
  })

  const prepareDelegationCert = (
    cert: _DelegationCert, stakeSigningFiles: HwSigningData[],
  ): LedgerTypes.Certificate => ({
    type: LedgerTypes.CertificateType.STAKE_DELEGATION,
    params: {
      poolKeyHashHex: cert.poolHash.toString('hex'),
      stakeCredential: _prepareCert(cert.stakeCredential, stakeSigningFiles),
    },
  })

  const preparePoolKey = (
    signingMode: LedgerTypes.TransactionSigningMode,
    poolKeyHash: Buffer,
    poolKeyPath?: BIP32Path,
  ): LedgerTypes.PoolKey => {
    switch (signingMode) {
      case LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OPERATOR:
        return {
          type: LedgerTypes.PoolKeyType.DEVICE_OWNED,
          params: {
            path: poolKeyPath as BIP32Path,
          },
        }
      case LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OWNER:
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
    signingMode: LedgerTypes.TransactionSigningMode,
    owners: Buffer[],
    stakeSigningFiles: HwSigningData[],
  ): LedgerTypes.PoolOwner[] => {
    const poolOwners: LedgerTypes.PoolOwner[] = owners.map((owner) => {
      const path = findSigningPathForKeyHash(owner, stakeSigningFiles)
      return path && (signingMode === LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OWNER)
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
    if (ownersWithPath.length > 1) throw Error(Errors.OwnerMultipleTimesInTxError)

    return poolOwners
  }

  const prepareRelays = (relays: _PoolRelay[]): LedgerTypes.Relay[] => {
    const SingleIPRelay = ({ portNumber, ipv4, ipv6 }: _SingleHostIPRelay): LedgerTypes.Relay => ({
      type: LedgerTypes.RelayType.SINGLE_HOST_IP_ADDR,
      params: { portNumber, ipv4: ipv4ToString(ipv4), ipv6: ipv6ToString(ipv6) },
    })

    const SingleNameRelay = ({ dnsName, portNumber }: _SingleHostNameRelay): LedgerTypes.Relay => ({
      type: LedgerTypes.RelayType.SINGLE_HOST_HOSTNAME,
      params: { portNumber, dnsName },
    })

    const MultiNameRelay = ({ dnsName }: _MultiHostNameRelay): LedgerTypes.Relay => ({
      type: LedgerTypes.RelayType.MULTI_HOST,
      params: { dnsName },
    })

    const prepareRelay = (relay: _PoolRelay): LedgerTypes.Relay => {
      switch (relay.type) {
        case TxRelayTypes.SINGLE_HOST_IP:
          return SingleIPRelay(relay as _SingleHostIPRelay)
        case TxRelayTypes.SINGLE_HOST_NAME:
          return SingleNameRelay(relay as _SingleHostNameRelay)
        case TxRelayTypes.MULTI_HOST_NAME:
          return MultiNameRelay(relay as _MultiHostNameRelay)
        default:
          throw Error(Errors.UnsupportedRelayTypeError)
      }
    }

    return relays.map(prepareRelay)
  }

  const prepareStakePoolRegistrationCert = (
    cert: _StakepoolRegistrationCert, signingFiles: HwSigningData[], network: Network,
  ): LedgerTypes.Certificate => {
    // if path is given, we are signing as pool operator
    // if keyHashHex is given, we are signing as pool owner
    const poolKeyPath = findSigningPathForKeyHash(cert.poolKeyHash, signingFiles)

    const signingMode = (poolKeyPath)
      ? LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OPERATOR
      : LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OWNER

    const poolOwners: LedgerTypes.PoolOwner[] = (
      preparePoolOwners(signingMode, cert.poolOwnersPubKeyHashes, signingFiles)
    )

    const metadata: LedgerTypes.PoolMetadataParams | null = cert.metadata
      ? {
        metadataUrl: cert.metadata.metadataUrl,
        metadataHashHex: cert.metadata.metadataHash.toString('hex'),
      }
      : null

    const params: LedgerTypes.PoolRegistrationParams = {
      poolKey: preparePoolKey(signingMode, cert.poolKeyHash, poolKeyPath),
      vrfKeyHashHex: cert.vrfPubKeyHash.toString('hex'),
      pledge: `${cert.pledge}`,
      cost: `${cert.cost}`,
      margin: {
        numerator: `${cert.margin.numerator}`,
        denominator: `${cert.margin.denominator}`,
      },
      rewardAccount: prepareRewardAccount(signingFiles, cert.rewardAccount, network),
      poolOwners,
      relays: prepareRelays(cert.relays),
      metadata,
    }

    return {
      type: LedgerTypes.CertificateType.STAKE_POOL_REGISTRATION,
      params,
    }
  }

  const prepareStakePoolRetirementCert = (
    cert: _StakepoolRetirementCert,
    signingFiles: HwSigningData[],
  ): LedgerTypes.Certificate => {
    const poolKeyPath = findSigningPathForKeyHash(cert.poolKeyHash, signingFiles)
    if (!poolKeyPath) throw Error(Errors.MissingSigningFileForCertificateError)
    const poolRetirementParams: LedgerTypes.PoolRetirementParams = {
      poolKeyPath,
      retirementEpoch: cert.retirementEpoch.toString(),
    }

    return {
      type: LedgerTypes.CertificateType.STAKE_POOL_RETIREMENT,
      params: poolRetirementParams,
    }
  }

  const prepareCertificate = (
    certificate: _Certificate, signingFiles: HwSigningData[], network: Network,
  ): LedgerTypes.Certificate => {
    switch (certificate.type) {
      case TxCertificateKeys.STAKING_KEY_REGISTRATION:
        return prepareStakingKeyRegistrationCert(certificate, signingFiles)
      case TxCertificateKeys.STAKING_KEY_DEREGISTRATION:
        return prepareStakingKeyDeregistrationCert(certificate, signingFiles)
      case TxCertificateKeys.DELEGATION:
        return prepareDelegationCert(certificate, signingFiles)
      case TxCertificateKeys.STAKEPOOL_REGISTRATION:
        return prepareStakePoolRegistrationCert(certificate, signingFiles, network)
      case TxCertificateKeys.STAKEPOOL_RETIREMENT:
        return prepareStakePoolRetirementCert(certificate, signingFiles)
      default:
        throw Error(Errors.UnknownCertificateError)
    }
  }

  const prepareWithdrawal = (
    withdrawal: _Withdrawal, stakeSigningFiles: HwSigningData[],
  ): LedgerTypes.Withdrawal => (
    {
      stakeCredential: _prepareCert(withdrawal.stakeCredential, stakeSigningFiles),
      amount: `${withdrawal.coins}`,
    }
  )

  const prepareTtl = (ttl: BigInt | null): string | null => ttl && ttl.toString()

  const prepareValidityIntervalStart = (validityIntervalStart: BigInt | null): string | null => (
    validityIntervalStart && validityIntervalStart.toString()
  )

  const prepareMetaDataHashHex = (metaDataHash: Buffer | null): LedgerTypes.TxAuxiliaryData | null => (
    metaDataHash && ({
      type: LedgerTypes.TxAuxiliaryDataType.ARBITRARY_HASH,
      params: {
        hashHex: metaDataHash.toString('hex'),
      },
    })
  )

  const prepareAdditionalWitnessRequests = (
    mintSigningFiles: HwSigningData[],
  ) => mintSigningFiles.map((f) => f.path)

  const ensureFirmwareSupportsParams = (
    unsignedTxParsed: _UnsignedTxParsed, signingFiles: HwSigningData[],
  ) => {
    if (
      unsignedTxParsed.ttl == null && !isFeatureSupportedForVersion(LedgerCryptoProviderFeature.OPTIONAL_TTL)
    ) {
      throw Error(Errors.LedgerOptionalTTLNotSupported)
    }
    if (
      unsignedTxParsed.validityIntervalStart != null
      && !isFeatureSupportedForVersion(LedgerCryptoProviderFeature.VALIDITY_INTERVAL_START)
    ) {
      throw Error(Errors.LedgerValidityIntervalStartNotSupported)
    }
    unsignedTxParsed.outputs.forEach((output) => {
      const multiAssets: _MultiAsset[] = output.tokenBundle
      if (multiAssets.length > 0 && !isFeatureSupportedForVersion(LedgerCryptoProviderFeature.MULTI_ASSET)) {
        throw Error(Errors.LedgerMultiAssetsNotSupported)
      }
    })

    const signingMode = determineSigningMode(unsignedTxParsed.certificates, signingFiles)
    switch (signingMode) {
      case LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OPERATOR:
        if (!isFeatureSupportedForVersion(LedgerCryptoProviderFeature.POOL_REGISTRATION_OPERATOR)) {
          throw Error(Errors.PoolRegistrationAsOperatorNotSupported)
        }
        break
      default:
    }
  }

  const ledgerSignTx = async (
    unsignedTxParsed: _UnsignedTxParsed,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<LedgerWitness[]> => {
    ensureFirmwareSupportsParams(unsignedTxParsed, signingFiles)
    const {
      paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles, mintSigningFiles,
    } = filterSigningFiles(signingFiles)

    const signingMode = determineSigningMode(unsignedTxParsed.certificates, signingFiles)

    const inputs = unsignedTxParsed.inputs.map(
      (input, i) => prepareInput(signingMode, input, getSigningPath(paymentSigningFiles, i)),
    )
    const outputs = unsignedTxParsed.outputs.map(
      (output) => prepareOutput(output, changeOutputFiles, network),
    )
    const certificates = unsignedTxParsed.certificates.map(
      (certificate) => prepareCertificate(
        certificate, [...stakeSigningFiles, ...poolColdSigningFiles], network,
      ),
    )
    const fee = `${unsignedTxParsed.fee}`
    const ttl = prepareTtl(unsignedTxParsed.ttl)
    const validityIntervalStart = prepareValidityIntervalStart(unsignedTxParsed.validityIntervalStart)
    const withdrawals = unsignedTxParsed.withdrawals.map(
      (withdrawal) => prepareWithdrawal(withdrawal, stakeSigningFiles),
    )
    const auxiliaryData = prepareMetaDataHashHex(unsignedTxParsed.metaDataHash)

    // Ledger expect to receive either a `null` mint field, or a non-empty array
    const mint = (Array.isArray(unsignedTxParsed.mint) && unsignedTxParsed.mint.length > 0)
      ? prepareTokenBundle(unsignedTxParsed.mint)
      : null

    const additionalWitnessRequests = prepareAdditionalWitnessRequests(mintSigningFiles)

    const response = await ledger.signTransaction({
      signingMode,
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
      },
      additionalWitnessPaths: additionalWitnessRequests,
    })

    if (response.txHashHex !== unsignedTxParsed.getId()) {
      throw Error(Errors.TxSerializationMismatchError)
    }

    return response.witnesses.map((witness: any) => ({
      path: witness.path,
      signature: Buffer.from(witness.witnessSignatureHex, 'hex'),
    }))
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
    if (!response?.auxiliaryDataSupplement) throw Error(Errors.MissingAuxiliaryDataSupplement)

    return encodeVotingRegistrationMetaData(
      hwStakeSigningFile,
      votePublicKeyHex,
      address,
      nonce,
      response.auxiliaryDataSupplement.auxiliaryDataHashHex as HexString,
      response.auxiliaryDataSupplement.catalystRegistrationSignatureHex as HexString,
    )
  }

  const createWitnesses = (ledgerWitnesses: LedgerWitness[], signingFiles: HwSigningData[]): TxWitnesses => {
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
          getSigningFileDataByPath(witness.path).cborXPubKeyHex,
        )
        return ({
          ...witness,
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

  const signTx = async (
    unsignedTxParsed: _UnsignedTxParsed,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<SignedTxCborHex> => {
    const ledgerWitnesses = await ledgerSignTx(unsignedTxParsed, signingFiles, network, changeOutputFiles)
    const { byronWitnesses, shelleyWitnesses } = createWitnesses(ledgerWitnesses, signingFiles)
    return TxSigned(unsignedTxParsed.unsignedTxDecoded, byronWitnesses, shelleyWitnesses)
  }

  const witnessTx = async (
    unsignedTxParsed: _UnsignedTxParsed,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<Array<_ShelleyWitness | _ByronWitness>> => {
    const ledgerWitnesses = await ledgerSignTx(unsignedTxParsed, signingFiles, network, changeOutputFiles)
    const { byronWitnesses, shelleyWitnesses } = await createWitnesses(ledgerWitnesses, signingFiles)
    const _byronWitnesses = byronWitnesses.map((byronWitness) => (
      { key: TxWitnessKeys.BYRON, data: byronWitness }
    ) as _ByronWitness)
    const _shelleyWitnesses = shelleyWitnesses.map((shelleyWitness) => (
      { key: TxWitnessKeys.SHELLEY, data: shelleyWitness }
    ) as _ShelleyWitness)

    return [..._shelleyWitnesses, ..._byronWitnesses]
  }

  const getXPubKeys = async (paths: BIP32Path[]): Promise<XPubKeyHex[]> => {
    const xPubKeys = await ledger.getExtendedPublicKeys({ paths })
    return xPubKeys.map((xPubKey) => {
      const { publicKeyHex, chainCodeHex } = xPubKey
      if (isPubKeyHex(xPubKey.publicKeyHex) && isChainCodeHex(xPubKey.chainCodeHex)) {
        const xPubKeyHex = publicKeyHex + chainCodeHex
        if (isXPubKeyHex(xPubKeyHex)) return xPubKeyHex
        throw Error(Errors.InternalInvalidTypeError)
      }
      throw Error(Errors.InternalInvalidTypeError)
    })
  }

  const signOperationalCertificate = async (
    kesVKey: KesVKey,
    kesPeriod: BigInt,
    issueCounter: OpCertIssueCounter,
    signingFiles: HwSigningData[],
  ): Promise<SignedOpCertCborHex> => {
    if (!isFeatureSupportedForVersion(LedgerCryptoProviderFeature.SIGN_OPERATIONAL_CERTIFICATE)) {
      throw Error(Errors.LedgerSignOperationalCertificateNotSupported)
    }

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
        const path = findPathForKeyHash(Buffer.from(nativeScript.keyHash, 'hex'), signingFiles)
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
