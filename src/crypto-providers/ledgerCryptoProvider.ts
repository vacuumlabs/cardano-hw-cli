import { Errors } from '../errors'
import {
  KesVKey, OpCertIssueCounter, OpCertSigned, SignedOpCertCborHex,
} from '../opCert/opCert'
import {
  TxByronWitness,
  TxShelleyWitness,
  TxSigned,
  XPubKey,
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
import {
  LedgerAssetGroup,
  LedgerCertificate,
  LedgerCryptoProviderFeature,
  LedgerInput,
  LedgerMultiHostNameRelay,
  LedgerOutput,
  LedgerPoolOwnerParams,
  LedgerPoolParams,
  LedgerPoolRetirementParams,
  LedgerRelayParams,
  LedgerSingleHostIPRelay,
  LedgerSingleHostNameRelay,
  LedgerTxOutputTypeAddressParams,
  LedgerWithdrawal,
  LedgerWitness,
} from './ledgerTypes'
import {
  CryptoProvider,
  _AddressParameters,
} from './types'
import {
  findSigningPathForKey,
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
} from './util'

const { AddressTypes } = require('cardano-crypto.js')
const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid').default
const Ledger = require('@cardano-foundation/ledgerjs-hw-app-cardano').default

// TODO copied from ledgerjs --- perhaps make it public there and just import here?
const enum SignTxUsecases {
  SIGN_TX_USECASE_ORDINARY_TX,
  SIGN_TX_USECASE_POOL_REGISTRATION_OWNER,
  SIGN_TX_USECASE_POOL_REGISTRATION_OPERATOR,
}

export const LedgerCryptoProvider: () => Promise<CryptoProvider> = async () => {
  const transport = await TransportNodeHid.create()
  const ledger = new Ledger(transport)

  const getVersion = async (): Promise<string> => {
    const { major, minor, patch } = await ledger.getVersion()
    return `Ledger app version ${major}.${minor}.${patch}`
  }

  const deviceVersion = await ledger.getVersion()

  const isFeatureSupportedForVersion = (
    feature: LedgerCryptoProviderFeature,
  ): boolean => LEDGER_VERSIONS[feature] && isDeviceVersionGTE(deviceVersion, LEDGER_VERSIONS[feature])

  const showAddress = async (
    paymentPath: BIP32Path, stakingPath: BIP32Path, address: Address,
  ): Promise<void> => {
    try {
      const { addressType, networkId, protocolMagic } = getAddressAttributes(address)
      const networkIdOrProtocolMagic = addressType === AddressTypes.BOOTSTRAP ? protocolMagic : networkId
      await ledger.showAddress(addressType, networkIdOrProtocolMagic, paymentPath, stakingPath)
    } catch (err) {
      throw Error(Errors.LedgerOperationError)
    }
  }

  const determineUsecase = (certificates: _Certificate[], signingFiles: HwSigningData[]) => {
    const poolRegistrationCert = certificates.find(
      (cert) => cert.type === TxCertificateKeys.STAKEPOOL_REGISTRATION,
    ) as _StakepoolRegistrationCert

    if (!poolRegistrationCert) {
      return SignTxUsecases.SIGN_TX_USECASE_ORDINARY_TX
    }

    const poolKeyPath = findSigningPathForKeyHash(poolRegistrationCert.poolKeyHash, signingFiles)
    if (!poolKeyPath) {
      return SignTxUsecases.SIGN_TX_USECASE_POOL_REGISTRATION_OWNER
    }

    return SignTxUsecases.SIGN_TX_USECASE_POOL_REGISTRATION_OPERATOR
  }

  const prepareInput = (usecase: SignTxUsecases, input: _Input, path?: BIP32Path): LedgerInput => {
    const pathToUse = (usecase === SignTxUsecases.SIGN_TX_USECASE_POOL_REGISTRATION_OWNER)
      ? undefined // inputs are required to be given without path in this case
      : path
    return {
      path: pathToUse,
      txHashHex: input.txHash.toString('hex'),
      outputIndex: input.outputIndex,
    }
  }

  const prepareTokenBundle = (
    multiAssets: _MultiAsset[],
  ): LedgerAssetGroup[] => multiAssets.map(({ policyId, assets }) => {
    const tokens = assets.map(({ assetName, amount }) => ({
      assetNameHex: assetName.toString('hex'),
      amountStr: amount.toString(),
    }))
    return {
      policyIdHex: policyId.toString('hex'),
      tokens,
    }
  })

  const prepareChangeOutput = (
    amount: BigInt,
    changeOutput: _AddressParameters,
    tokenBundle: LedgerAssetGroup[],
  ): LedgerTxOutputTypeAddressParams => ({
    amountStr: `${amount}`,
    tokenBundle,
    addressTypeNibble: changeOutput.addressType,
    spendingPath: changeOutput.paymentPath,
    stakingPath: changeOutput.stakePath,
  })

  const prepareOutput = (
    output: _Output,
    changeOutputFiles: HwSigningData[],
    network: Network,
  ): LedgerOutput => {
    const changeAddress = getChangeAddress(changeOutputFiles, output.address, network)
    const amount = output.coins
    const tokenBundle = prepareTokenBundle(output.tokenBundle)

    if (changeAddress && !changeAddress.address.compare(output.address)) {
      return prepareChangeOutput(amount, changeAddress, tokenBundle)
    }
    return {
      amountStr: `${output.coins}`,
      tokenBundle,
      addressHex: output.address.toString('hex'),
    }
  }

  const prepareStakingKeyRegistrationCert = (
    cert: _StakingKeyDeregistrationCert | _StakingKeyRegistrationCert,
    stakeSigningFiles: HwSigningData[],
  ): LedgerCertificate => {
    const path = findSigningPathForKeyHash(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
    return {
      type: cert.type,
      path,
    }
  }

  const prepareDelegationCert = (
    cert: _DelegationCert, stakeSigningFiles: HwSigningData[],
  ): LedgerCertificate => {
    const path = findSigningPathForKeyHash(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
    return {
      type: cert.type,
      path,
      poolKeyHashHex: cert.poolHash.toString('hex'),
    }
  }

  // TODO revisit this
  const preparePoolOwners = (
    usecase: SignTxUsecases,
    owners: Buffer[],
    stakeSigningFiles: HwSigningData[],
  ): LedgerPoolOwnerParams[] => {
    const poolOwners = owners.map((owner): LedgerPoolOwnerParams => {
      const path = findSigningPathForKeyHash(owner, stakeSigningFiles)
      return path && (usecase === SignTxUsecases.SIGN_TX_USECASE_POOL_REGISTRATION_OWNER)
        ? { stakingPath: path }
        : { stakingKeyHashHex: owner.toString('hex') }
    })

    const ownersWithPath = poolOwners.filter((owner) => owner.stakingPath)
    if (ownersWithPath.length > 1) throw Error(Errors.OwnerMultipleTimesInTxError)

    return poolOwners
  }

  const prepareRelays = (relays: _PoolRelay[]): LedgerRelayParams[] => {
    const SingleIPRelay = (
      { portNumber, ipv4, ipv6 }: _SingleHostIPRelay,
    ): LedgerSingleHostIPRelay => ({
      portNumber, ipv4: ipv4ToString(ipv4), ipv6: ipv6ToString(ipv6),
    })

    const SingleNameRelay = (
      { dnsName, portNumber }: _SingleHostNameRelay,
    ): LedgerSingleHostNameRelay => ({
      portNumber, dnsName,
    })

    const MultiNameRelay = (
      { dnsName }: _MultiHostNameRelay,
    ): LedgerMultiHostNameRelay => ({
      dnsName,
    })

    const prepareRelay = (relay: _PoolRelay) => {
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

    return relays.map((relay) => ({
      type: relay.type,
      params: prepareRelay(relay),
    }))
  }

  const prepareStakePoolRegistrationCert = (
    cert: _StakepoolRegistrationCert, signingFiles: HwSigningData[],
  ): LedgerCertificate => {
    // if path is given, we are signing as pool operator
    // if keyHashHex is given, we are signing as pool owner
    const poolKeyPath = findSigningPathForKeyHash(cert.poolKeyHash, signingFiles)
    const poolKey = (poolKeyPath)
      ? { path: poolKeyPath }
      : { keyHashHex: cert.poolKeyHash.toString('hex') }

    const usecase = (poolKeyPath)
      ? SignTxUsecases.SIGN_TX_USECASE_POOL_REGISTRATION_OPERATOR
      : SignTxUsecases.SIGN_TX_USECASE_POOL_REGISTRATION_OWNER

    const owners = preparePoolOwners(usecase, cert.poolOwnersPubKeyHashes, signingFiles)

    const metadata = cert.metadata
      ? {
        metadataUrl: cert.metadata.metadataUrl,
        metadataHashHex: cert.metadata.metadataHash.toString('hex'),
      }
      : null

    const poolRegistrationParams: LedgerPoolParams = {
      poolKey,
      vrfKeyHashHex: cert.vrfPubKeyHash.toString('hex'),
      pledgeStr: `${cert.pledge}`,
      costStr: `${cert.cost}`,
      margin: {
        numeratorStr: `${cert.margin.numerator}`,
        denominatorStr: `${cert.margin.denominator}`,
      },
      rewardAccount: { // TODO add option to use path here
        // (replace changeOutputKeyFileData from --change-output-key-file with --hw-signing-file-auxiliary)
        rewardAccountHex: cert.rewardAccount.toString('hex'),
      },
      poolOwners: owners,
      relays: prepareRelays(cert.relays),
      metadata,
    }

    return {
      type: cert.type,
      poolRegistrationParams,
    }
  }

  // TODO we use both StakePool and Stakepool in names
  const prepareStakePoolRetirementCert = (
    cert: _StakepoolRetirementCert,
    signingFiles: HwSigningData[],
  ): LedgerCertificate => {
    const poolKeyPath = findSigningPathForKeyHash(cert.poolKeyHash, signingFiles)
    if (!poolKeyPath) throw Error(Errors.MissingSigningFileForCertificateError)
    const poolRetirementParams: LedgerPoolRetirementParams = {
      poolKeyPath,
      retirementEpochStr: cert.retirementEpoch.toString(),
    }

    return {
      type: cert.type,
      poolRetirementParams,
    }
  }

  const prepareCertificate = (
    certificate: _Certificate, signingFiles: HwSigningData[],
  ): LedgerCertificate => {
    switch (certificate.type) {
      case TxCertificateKeys.STAKING_KEY_REGISTRATION:
        return prepareStakingKeyRegistrationCert(certificate, signingFiles)
      case TxCertificateKeys.STAKING_KEY_DEREGISTRATION:
        return prepareStakingKeyRegistrationCert(certificate, signingFiles)
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
  ): LedgerWithdrawal => {
    const pubKeyHash = rewardAddressToPubKeyHash(withdrawal.address)
    const path = findSigningPathForKeyHash(pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForWithdrawalError)
    return {
      path,
      amountStr: `${withdrawal.coins}`,
    }
  }

  const prepareTtl = (ttl: BigInt | null): string | null => ttl && ttl.toString()

  const prepareValidityIntervalStart = (validityIntervalStart: BigInt | null): string | null => (
    validityIntervalStart && validityIntervalStart.toString()
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
    if ((usecase === SignTxUsecases.SIGN_TX_USECASE_POOL_REGISTRATION_OPERATOR)
      && !isFeatureSupportedForVersion(LedgerCryptoProviderFeature.POOL_REGISTRATION_OPERATOR)
    ) {
      throw Error(Errors.PoolRegistrationAsOperatorNotSupported)
    }
  }

  const ledgerSignTx = async (
    txAux: _TxAux, signingFiles: HwSigningData[], network: Network, changeOutputFiles: HwSigningData[],
  ): Promise<LedgerWitness[]> => {
    ensureFirmwareSupportsParams(txAux, signingFiles)

    const usecase = determineUsecase(txAux.certificates, signingFiles)

    const inputs = txAux.inputs.map(
      (input, i) => prepareInput(usecase, input, getSigningPath(signingFiles, i)),
    )
    const outputs = txAux.outputs.map(
      (output) => prepareOutput(output, changeOutputFiles, network),
    )
    const certificates = txAux.certificates.map(
      (certificate) => prepareCertificate(certificate, signingFiles),
    )
    const fee = `${txAux.fee}`
    const ttl = prepareTtl(txAux.ttl)
    const validityIntervalStart = prepareValidityIntervalStart(txAux.validityIntervalStart)
    const withdrawals = txAux.withdrawals.map(
      (withdrawal) => prepareWithdrawal(withdrawal, signingFiles),
    )

    const response = await ledger.signTransaction(
      network.networkId,
      network.protocolMagic,
      inputs,
      outputs,
      fee,
      ttl,
      certificates,
      withdrawals,
      null,
      validityIntervalStart,
    )
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
    const ledgerWitnesses = await ledgerSignTx(txAux, signingFiles, network, changeOutputFiles)
    const { byronWitnesses, shelleyWitnesses } = await createWitnesses(ledgerWitnesses, signingFiles)
    return TxSigned(txAux.unsignedTxDecoded, byronWitnesses, shelleyWitnesses)
  }

  const witnessTx = async (
    txAux: _TxAux, signingFiles: HwSigningData, network: Network, changeOutputFiles: HwSigningData[],
  ): Promise<_ShelleyWitness | _ByronWitness> => {
    const ledgerWitnesses = await ledgerSignTx(txAux, [signingFiles], network, changeOutputFiles)
    const { byronWitnesses, shelleyWitnesses } = await createWitnesses(ledgerWitnesses, [signingFiles])
    const _byronWitnesses = byronWitnesses.map((byronWitness) => (
      { key: TxWitnessKeys.BYRON, data: byronWitness }
    ) as _ByronWitness)
    const _shelleyWitnesses = shelleyWitnesses.map((shelleyWitness) => (
      { key: TxWitnessKeys.SHELLEY, data: shelleyWitness }
    ) as _ShelleyWitness)

    if (_byronWitnesses.length + _shelleyWitnesses.length !== 1) throw Error(Errors.MultipleWitnessesError)
    return _shelleyWitnesses.length === 1 ? _shelleyWitnesses[0] : _byronWitnesses[0]
  }

  const getXPubKeys = async (paths: BIP32Path[]): Promise<XPubKeyHex[]> => {
    if (isFeatureSupportedForVersion(LedgerCryptoProviderFeature.BULK_EXPORT)) {
      const xPubKeys = await ledger.getExtendedPublicKeys(paths)
      return xPubKeys.map((xPubKey) => xPubKey.publicKeyHex + xPubKey.chainCodeHex)
    }

    const xPubKeys: XPubKeyHex[] = []
    for (let i = 0; i < paths.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const { publicKeyHex, chainCodeHex } = await ledger.getExtendedPublicKey(paths[i])
      xPubKeys.push(publicKeyHex + chainCodeHex)
    }
    return xPubKeys
  }

  const signOperationalCertificate = async (
    kesVKey: KesVKey,
    kesPeriod: BigInt,
    issueCounter: OpCertIssueCounter,
    signingFiles: HwSigningData[],
  ): Promise<SignedOpCertCborHex> => {
    // TODO  something like   ensureFirmwareSupportsParams(txAux, signingFiles)

    const poolColdKeyPath = findSigningPathForKey(issueCounter.poolColdKey, signingFiles)

    const params = [
      kesVKey.toString('hex'),
      kesPeriod.toString(),
      issueCounter.counter.toString(),
      poolColdKeyPath,
    ]

    const { operationalCertificateSignatureHex } = await ledger.signOperationalCertificate(
      ...params,
    )

    return OpCertSigned(
      kesVKey,
      kesPeriod,
      issueCounter,
      Buffer.from(operationalCertificateSignatureHex, 'hex'),
    )
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
