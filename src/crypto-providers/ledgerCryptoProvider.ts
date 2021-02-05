import { Errors } from '../errors'
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
  filterSigningFiles,
  findSigningPath,
  getChangeAddress,
  getSigningPath,
  isShelleyPath,
  getAddressAttributes,
  rewardAddressToPubKeyHash,
  ipv4ToString,
  ipv6ToString,
  isDeviceVersionGTE,
} from './util'

const { AddressTypes } = require('cardano-crypto.js')
const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid').default
const Ledger = require('@cardano-foundation/ledgerjs-hw-app-cardano').default

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

  const prepareInput = (input: _Input, path?: BIP32Path): LedgerInput => ({
    path,
    txHashHex: input.txHash.toString('hex'),
    outputIndex: input.outputIndex,
  })

  const prepareTokenBundle = (
    multiAssets: _MultiAsset[],
  ): LedgerAssetGroup[] => {
    if (multiAssets.length > 0 && !isFeatureSupportedForVersion(LedgerCryptoProviderFeature.MULTI_ASSET)) {
      throw Error(Errors.LedgerMultiAssetsNotSupported)
    }
    return multiAssets.map(({ policyId, assets }) => {
      const tokens = assets.map(({ assetName, coins }) => ({
        assetNameHex: assetName.toString('hex'),
        amountStr: coins.toString(),
      }))
      return {
        policyIdHex: policyId.toString('hex'),
        tokens,
      }
    })
  }

  const prepareChangeOutput = (
    amountStr: string,
    changeOutput: _AddressParameters,
    tokenBundle: LedgerAssetGroup[],
  ): LedgerTxOutputTypeAddressParams => ({
    amountStr,
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
    const amountStr = `${output.coins}`
    const tokenBundle = prepareTokenBundle(output.tokenBundle)

    if (changeAddress && !changeAddress.address.compare(output.address)) {
      return prepareChangeOutput(amountStr, changeAddress, tokenBundle)
    }
    return {
      amountStr,
      tokenBundle,
      addressHex: output.address.toString('hex'),
    }
  }

  const prepareStakingKeyRegistrationCert = (
    cert: _StakingKeyDeregistrationCert | _StakingKeyRegistrationCert,
    stakeSigningFiles: HwSigningData[],
  ): LedgerCertificate => {
    const path = findSigningPath(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
    return {
      type: cert.type,
      path,
    }
  }

  const prepareDelegationCert = (
    cert: _DelegationCert, stakeSigningFiles: HwSigningData[],
  ): LedgerCertificate => {
    const path = findSigningPath(cert.pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForCertificateError)
    return {
      type: cert.type,
      path,
      poolKeyHashHex: cert.poolHash.toString('hex'),
    }
  }

  const preparePoolOwners = (
    owners: Buffer[], stakeSigningFiles: HwSigningData[],
  ): LedgerPoolOwnerParams[] => {
    const poolOwners = owners.map((owner): LedgerPoolOwnerParams => {
      const path = findSigningPath(owner, stakeSigningFiles)
      return path
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
    cert: _StakepoolRegistrationCert, stakeSigningFiles: HwSigningData[],
  ): LedgerCertificate => {
    const owners = preparePoolOwners(cert.poolOwnersPubKeyHashes, stakeSigningFiles)
    const metadata = cert.metadata
      ? {
        metadataUrl: cert.metadata.metadataUrl,
        metadataHashHex: cert.metadata.metadataHash.toString('hex'),
      }
      : null
    const poolRegistrationParams: LedgerPoolParams = {
      poolKeyHashHex: cert.poolKeyHash.toString('hex'),
      vrfKeyHashHex: cert.vrfPubKeyHash.toString('hex'),
      pledgeStr: `${cert.pledge}`,
      costStr: `${cert.cost}`,
      margin: {
        numeratorStr: `${cert.margin.numerator}`,
        denominatorStr: `${cert.margin.denominator}`,
      },
      rewardAccountHex: cert.rewardAddress.toString('hex'),
      poolOwners: owners,
      relays: prepareRelays(cert.relays),
      metadata,
    }

    return {
      type: cert.type,
      poolRegistrationParams,
    }
  }

  const prepareCertificate = (
    certificate: _Certificate, stakeSigningFiles: HwSigningData[],
  ): LedgerCertificate => {
    switch (certificate.type) {
      case TxCertificateKeys.STAKING_KEY_REGISTRATION:
        return prepareStakingKeyRegistrationCert(certificate, stakeSigningFiles)
      case TxCertificateKeys.STAKING_KEY_DEREGISTRATION:
        return prepareStakingKeyRegistrationCert(certificate, stakeSigningFiles)
      case TxCertificateKeys.DELEGATION:
        return prepareDelegationCert(certificate, stakeSigningFiles)
      case TxCertificateKeys.STAKEPOOL_REGISTRATION:
        return prepareStakePoolRegistrationCert(certificate, stakeSigningFiles)
      default:
        throw Error(Errors.UnknownCertificateError)
    }
  }

  const prepareWithdrawal = (
    withdrawal: _Withdrawal, stakeSigningFiles: HwSigningData[],
  ): LedgerWithdrawal => {
    const pubKeyHash = rewardAddressToPubKeyHash(withdrawal.address)
    const path = findSigningPath(pubKeyHash, stakeSigningFiles)
    if (!path) throw Error(Errors.MissingSigningFileForWithdrawalError)
    return {
      path,
      amountStr: `${withdrawal.coins}`,
    }
  }

  const prepareTtl = (ttl?: number) => {
    if (!ttl && !isFeatureSupportedForVersion(LedgerCryptoProviderFeature.VALIDITY_INTERVAL_START)) {
      throw Error(Errors.LedgerOptionalTTLNotSupported)
    }
    return ttl && ttl.toString()
  }

  const prepareValidityIntervalStart = (validityIntervalStart?: number) => {
    if (
      validityIntervalStart
      && !isFeatureSupportedForVersion(LedgerCryptoProviderFeature.VALIDITY_INTERVAL_START)
    ) {
      throw Error(Errors.LedgerValidityIntervalStartNotSupported)
    }
    return validityIntervalStart && validityIntervalStart.toString()
  }

  const ledgerSignTx = async (
    txAux: _TxAux, signingFiles: HwSigningData[], network: Network, changeOutputFiles: HwSigningData[],
  ): Promise<LedgerWitness[]> => {
    const { paymentSigningFiles, stakeSigningFiles } = filterSigningFiles(signingFiles)
    const inputs = txAux.inputs.map((input, i) => prepareInput(input, getSigningPath(paymentSigningFiles, i)))
    const outputs = txAux.outputs.map(
      (output) => prepareOutput(output, changeOutputFiles, network),
    )
    const certificates = txAux.certificates.map(
      (certificate) => prepareCertificate(certificate, stakeSigningFiles),
    )
    const fee = `${txAux.fee}`
    const ttl = prepareTtl(txAux.ttl)
    const validityIntervalStart = prepareValidityIntervalStart(txAux.validityIntervalStart)
    const withdrawals = txAux.withdrawals.map(
      (withdrawal) => prepareWithdrawal(withdrawal, stakeSigningFiles),
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
      undefined,
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

    const byronWitnesses = ledgerWitnesses
      .filter((witness) => !isShelleyPath(witness.path))
      .map((witness) => {
        const { cborXPubKeyHex } = getSigningFileDataByPath(witness.path)
        const { pubKey, chainCode } = XPubKey(cborXPubKeyHex)
        return TxByronWitness(pubKey, witness.signature, chainCode, {})
      })

    const shelleyWitnesses = ledgerWitnesses
      .filter((witness) => isShelleyPath(witness.path))
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

  return {
    getVersion,
    showAddress,
    signTx,
    witnessTx,
    getXPubKeys,
  }
}
