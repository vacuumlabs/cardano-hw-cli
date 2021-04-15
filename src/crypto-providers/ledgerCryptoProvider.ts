import Ledger, * as LedgerTypes from '@cardano-foundation/ledgerjs-hw-app-cardano'
import { Errors } from '../errors'
import { KesVKey, OpCertIssueCounter, SignedOpCertCborHex } from '../opCert/opCert'
import {
  TxByronWitness, TxShelleyWitness, TxSigned, XPubKey,
} from '../transaction/transaction'
import {
  _Input,
  _Output,
  SignedTxCborHex,
  _TxAux,
  _ByronWitness,
  _ShelleyWitness,
  TxWitnessByron,
  TxWitnessShelley,
  XPubKeyHex,
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
} from '../transaction/types'
import {
  Address,
  BIP32Path,
  HwSigningData,
  Network,
} from '../types'
import { LEDGER_VERSIONS } from './constants'
import { LedgerCryptoProviderFeature, LedgerWitness } from './ledgerTypes'
import { CryptoProvider, _AddressParameters } from './types'
import {
  findSigningPathForKeyHash,
  getChangeAddress,
  getSigningPath,
  PathTypes,
  classifyPath,
  getAddressAttributes,
  rewardAddressToPubKeyHash,
  ipv4ToString,
  ipv6ToString,
  isDeviceVersionGTE,
  filterSigningFiles,
} from './util'

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
    paymentPath: BIP32Path, stakingPath: BIP32Path, address: Address,
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
            stakingPath,
          },
        },
      })
    } catch (err) {
      throw Error(Errors.LedgerOperationError)
    }
  }

  const determineUsecase = (certificates: _Certificate[], signingFiles: HwSigningData[]) => {
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

    return LedgerTypes.TransactionSigningMode.__RESEVED_POOL_REGISTRATION_AS_OPERATOR
  }

  const prepareInput = (
    usecase: LedgerTypes.TransactionSigningMode, input: _Input, path: BIP32Path | null,
  ): LedgerTypes.TxInput => {
    const pathToUse = (usecase === LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OWNER)
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
          spendingPath: changeOutput.paymentPath,
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
    const changeAddress = getChangeAddress(changeOutputFiles, output.address, network)
    const amount = output.coins
    const tokenBundle = prepareTokenBundle(output.tokenBundle)

    if (changeAddress && !changeAddress.address.compare(output.address)) {
      return prepareChangeOutput(amount, changeAddress, tokenBundle)
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

  const prepareStakingKeyRegistrationCert = (
    cert: _StakingKeyRegistrationCert,
    stakeSigningFiles: HwSigningData[],
  ): LedgerTypes.Certificate => {
    const path = findSigningPathForKeyHash(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
    return {
      type: LedgerTypes.CertificateType.STAKE_REGISTRATION,
      params: { path },
    }
  }

  const prepareStakingKeyDeregistrationCert = (
    cert: _StakingKeyDeregistrationCert,
    stakeSigningFiles: HwSigningData[],
  ): LedgerTypes.Certificate => {
    const path = findSigningPathForKeyHash(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
    return {
      type: LedgerTypes.CertificateType.STAKE_DEREGISTRATION,
      params: { path },
    }
  }

  const prepareDelegationCert = (
    cert: _DelegationCert, stakeSigningFiles: HwSigningData[],
  ): LedgerTypes.Certificate => {
    const path = findSigningPathForKeyHash(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
    return {
      type: LedgerTypes.CertificateType.STAKE_DELEGATION,
      params: {
        poolKeyHashHex: cert.poolHash.toString('hex'),
        path,
      },
    }
  }

  // TODO revisit this
  const preparePoolOwners = (
    usecase: LedgerTypes.TransactionSigningMode,
    owners: Buffer[],
    stakeSigningFiles: HwSigningData[],
  ): LedgerTypes.PoolOwner[] => {
    const poolOwners: LedgerTypes.PoolOwner[] = owners.map((owner) => {
      const path = findSigningPathForKeyHash(owner, stakeSigningFiles)
      return path && (usecase === LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OWNER)
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
    cert: _StakepoolRegistrationCert, signingFiles: HwSigningData[],
  ): LedgerTypes.Certificate => {
    // if path is given, we are signing as pool operator
    // if keyHashHex is given, we are signing as pool owner
    const poolKeyPath = findSigningPathForKeyHash(cert.poolKeyHash, signingFiles)

    const usecase = (poolKeyPath)
      ? LedgerTypes.TransactionSigningMode.__RESEVED_POOL_REGISTRATION_AS_OPERATOR
      : LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OWNER

    const owners: LedgerTypes.PoolOwner[] = (
      preparePoolOwners(usecase, cert.poolOwnersPubKeyHashes, signingFiles)
    )

    const metadata: LedgerTypes.PoolMetadataParams | null = cert.metadata
      ? {
        metadataUrl: cert.metadata.metadataUrl,
        metadataHashHex: cert.metadata.metadataHash.toString('hex'),
      }
      : null

    const params: LedgerTypes.PoolRegistrationParams = {
      poolKeyHashHex: cert.poolKeyHash.toString('hex'),
      vrfKeyHashHex: cert.vrfPubKeyHash.toString('hex'),
      pledge: `${cert.pledge}`,
      cost: `${cert.cost}`,
      margin: {
        numerator: `${cert.margin.numerator}`,
        denominator: `${cert.margin.denominator}`,
      },
      rewardAccountHex: cert.rewardAccount.toString('hex'),
      poolOwners: owners,
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
    throw Error(Errors.UnsupportedCryptoProviderCall)
    // const poolKeyPath = findSigningPathForKeyHash(cert.poolKeyHash, signingFiles)
    // if (!poolKeyPath) throw Error(Errors.MissingSigningFileForCertificateError)
    // const poolRetirementParams: LedgerPoolRetirementParams = {
    //   poolKeyPath,
    //   retirementEpochStr: cert.retirementEpoch.toString(),
    // }

    // return {
    //   type: cert.type,
    //   poolRetirementParams,
    // }
  }

  const prepareCertificate = (
    certificate: _Certificate, signingFiles: HwSigningData[],
  ): LedgerTypes.Certificate => {
    switch (certificate.type) {
      case TxCertificateKeys.STAKING_KEY_REGISTRATION:
        return prepareStakingKeyRegistrationCert(certificate, signingFiles)
      case TxCertificateKeys.STAKING_KEY_DEREGISTRATION:
        return prepareStakingKeyDeregistrationCert(certificate, signingFiles)
      case TxCertificateKeys.DELEGATION:
        return prepareDelegationCert(certificate, signingFiles)
      case TxCertificateKeys.STAKEPOOL_REGISTRATION:
        return prepareStakePoolRegistrationCert(certificate, signingFiles)
      case TxCertificateKeys.STAKEPOOL_RETIREMENT:
        return prepareStakePoolRetirementCert(certificate, signingFiles)
      default:
        throw Error(Errors.UnknownCertificateError)
    }
  }

  const prepareWithdrawal = (
    withdrawal: _Withdrawal, stakeSigningFiles: HwSigningData[],
  ): LedgerTypes.Withdrawal => {
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

  const prepareMetaDataHashHex = (metaDataHash: Buffer | null): LedgerTypes.TxAuxiliaryData | null => (
    metaDataHash && ({
      type: LedgerTypes.TxAuxiliaryDataType.ARBITRARY_HASH,
      params: {
        hashHex: metaDataHash.toString('hex'),
      },
    })
  )

  const ensureFirmwareSupportsParams = (txAux: _TxAux, signingFiles: HwSigningData[]) => {
    if (txAux.ttl == null && !isFeatureSupportedForVersion(LedgerCryptoProviderFeature.OPTIONAL_TTL)) {
      throw Error(Errors.LedgerOptionalTTLNotSupported)
    }
    if (
      txAux.validityIntervalStart != null
      && !isFeatureSupportedForVersion(LedgerCryptoProviderFeature.VALIDITY_INTERVAL_START)
    ) {
      throw Error(Errors.LedgerValidityIntervalStartNotSupported)
    }
    txAux.outputs.forEach((output) => {
      const multiAssets: _MultiAsset[] = output.tokenBundle
      if (multiAssets.length > 0 && !isFeatureSupportedForVersion(LedgerCryptoProviderFeature.MULTI_ASSET)) {
        throw Error(Errors.LedgerMultiAssetsNotSupported)
      }
    })

    // TODO revisit, use a switch?
    const usecase = determineUsecase(txAux.certificates, signingFiles)
    if ((usecase === LedgerTypes.TransactionSigningMode.__RESEVED_POOL_REGISTRATION_AS_OPERATOR)
      && !isFeatureSupportedForVersion(LedgerCryptoProviderFeature.POOL_REGISTRATION_OPERATOR)
    ) {
      throw Error(Errors.PoolRegistrationAsOperatorNotSupported)
    }
  }

  const ledgerSignTx = async (
    signingMode: LedgerTypes.TransactionSigningMode,
    txAux: _TxAux,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<LedgerWitness[]> => {
    ensureFirmwareSupportsParams(txAux, signingFiles)
    const { paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles } = filterSigningFiles(signingFiles)

    const usecase = determineUsecase(txAux.certificates, signingFiles)

    const inputs = txAux.inputs.map(
      (input, i) => prepareInput(usecase, input, getSigningPath(paymentSigningFiles, i)),
    )
    const outputs = txAux.outputs.map(
      (output) => prepareOutput(output, changeOutputFiles, network),
    )
    const certificates = txAux.certificates.map(
      (certificate) => prepareCertificate(certificate, [...stakeSigningFiles, ...poolColdSigningFiles]),
    )
    const fee = `${txAux.fee}`
    const ttl = prepareTtl(txAux.ttl)
    const validityIntervalStart = prepareValidityIntervalStart(txAux.validityIntervalStart)
    const withdrawals = txAux.withdrawals.map(
      (withdrawal) => prepareWithdrawal(withdrawal, stakeSigningFiles),
    )
    const auxiliaryData = prepareMetaDataHashHex(txAux.metaDataHash)

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
      },
    })

    if (response.txHashHex !== txAux.getId()) {
      throw Error(Errors.TxSerializationMismatchError)
    }

    return response.witnesses.map((witness: any) => ({
      path: witness.path,
      signature: Buffer.from(witness.witnessSignatureHex, 'hex'),
    }))
  }

  const createWitnesses = async (ledgerWitnesses: LedgerWitness[], signingFiles: HwSigningData[]): Promise<{
    byronWitnesses: TxWitnessByron[]
    shelleyWitnesses: TxWitnessShelley[]
  }> => {
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

    const byronWitnesses = ledgerWitnesses
      .filter((witness) => isByronPath(witness.path))
      .map((witness) => {
        const { cborXPubKeyHex } = getSigningFileDataByPath(witness.path)
        const { pubKey, chainCode } = XPubKey(cborXPubKeyHex)
        return TxByronWitness(pubKey, witness.signature, chainCode, {})
      })

    // TODO should be properly checked is the witness path is valid?
    // TODO pool cold key witnesses?
    const shelleyWitnesses = ledgerWitnesses
      .filter((witness) => !isByronPath(witness.path))
      .map((witness) => {
        const { cborXPubKeyHex } = getSigningFileDataByPath(witness.path)
        const { pubKey } = XPubKey(cborXPubKeyHex)
        return TxShelleyWitness(pubKey, witness.signature)
      })

    return { byronWitnesses, shelleyWitnesses }
  }

  const signTx = async (
    txAux: _TxAux, signingFiles: HwSigningData[], network: Network, changeOutputFiles: HwSigningData[],
  ): Promise<SignedTxCborHex> => {
    const ledgerWitnesses = await ledgerSignTx(
      LedgerTypes.TransactionSigningMode.ORDINARY_TRANSACTION,
      txAux, signingFiles, network, changeOutputFiles,
    )
    const { byronWitnesses, shelleyWitnesses } = await createWitnesses(ledgerWitnesses, signingFiles)
    return TxSigned(txAux.unsignedTxDecoded, byronWitnesses, shelleyWitnesses)
  }

  const witnessTx = async (
    txAux: _TxAux, signingFiles: HwSigningData[], network: Network, changeOutputFiles: HwSigningData[],
  ): Promise<Array<_ShelleyWitness | _ByronWitness>> => {
    const ledgerWitnesses = await ledgerSignTx(
      LedgerTypes.TransactionSigningMode.POOL_REGISTRATION_AS_OWNER,
      txAux, signingFiles, network, changeOutputFiles,
    )
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
    return xPubKeys.map((xPubKey) => xPubKey.publicKeyHex + xPubKey.chainCodeHex)
  }

  const signOperationalCertificate = async (
    kesVKey: KesVKey,
    kesPeriod: BigInt,
    issueCounter: OpCertIssueCounter,
    signingFiles: HwSigningData[],
  ): Promise<SignedOpCertCborHex> => {
    throw Error(Errors.UnsupportedCryptoProviderCall)
    // TODO  something like   ensureFirmwareSupportsParams(txAux, signingFiles)

    // const poolColdKeyPath = findSigningPathForKey(issueCounter.poolColdKey, signingFiles)

    // const params = [
    //   kesVKey.toString('hex'),
    //   kesPeriod.toString(),
    //   issueCounter.counter.toString(),
    //   poolColdKeyPath,
    // ]

    // const { operationalCertificateSignatureHex } = await ledger.signOperationalCertificate(
    //   ...params,
    // )

    // return OpCertSigned(
    //   kesVKey,
    //   kesPeriod,
    //   issueCounter,
    //   Buffer.from(operationalCertificateSignatureHex, 'hex'),
    // )
  }

  return {
    getVersion,
    showAddress,
    signTx,
    witnessTx,
    getXPubKeys,
    signOperationalCertificate,
  }
}
