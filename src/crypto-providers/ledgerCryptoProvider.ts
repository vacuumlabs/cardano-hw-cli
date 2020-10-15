import { HARDENED_THRESHOLD } from '../constants'
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
} from '../transaction/types'
import { BIP32Path, HwSigningData } from '../types'
import {
  isDelegationCertificate,
  isStakepoolRegistrationCertificate,
  isStakingKeyDeregistrationCertificate,
  isStakingKeyRegistrationCertificate,
} from './guards'
import {
  LedgerCertificate,
  LedgerInput,
  LedgerOutput,
  LedgerWitness,
} from './ledgerTypes'
import { CryptoProvider } from './types'
import { filterSigningFiles, findSigningPath, getSigningPath } from './util'

const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid').default
const Ledger = require('@cardano-foundation/ledgerjs-hw-app-cardano').default

export const LedgerCryptoProvider: () => Promise<CryptoProvider> = async () => {
  const transport = await TransportNodeHid.create()
  const ledger = new Ledger(transport)

  function prepareInput(input: _Input, path?: BIP32Path): LedgerInput {
    return {
      path,
      txHashHex: input.txHash.toString('hex'),
      outputIndex: input.outputIndex,
    }
  }

  function prepareOutput(output: _Output): LedgerOutput {
    //  return output.isChange
    //   ? {
    //     addressTypeNibble: 0, // TODO: get from address
    //     spendingPath: output.spendingPath,
    //     amountStr: `${output.coins}`,
    //     stakingPath: output.stakingPath,
    //   }
    //   : {
    return {
      amountStr: `${output.coins}`,
      addressHex: output.address.toString('hex'),
    }
  }

  const isShelleyPath = (path: number[]) => path[0] - HARDENED_THRESHOLD === 1852

  function prepareStakingKeyRegistrationCert(
    cert: _Certificate, stakeSigningFiles: HwSigningData[],
  ): LedgerCertificate {
    if (
      !isStakingKeyRegistrationCertificate(cert) && !isStakingKeyDeregistrationCertificate(cert)
    ) throw Error()
    const path = findSigningPath(cert.pubKeyHash, stakeSigningFiles)
    return {
      type: cert.type,
      path,
    }
  }

  function prepareDelegationCert(
    cert: _Certificate, stakeSigningFiles: HwSigningData[],
  ): LedgerCertificate {
    if (!isDelegationCertificate(cert)) throw Error()
    const path = findSigningPath(cert.pubKeyHash, stakeSigningFiles)
    return {
      type: cert.type,
      path,
      poolKeyHashHex: cert.poolHash.toString('hex'),
    }
  }

  function prepareStakePoolRegistrationCert(
    cert: _Certificate, stakeSigningFiles: HwSigningData[],
  ): LedgerCertificate {
    if (!isStakepoolRegistrationCertificate(cert)) throw Error()
    const path = findSigningPath(cert.ownerPubKeys[0], stakeSigningFiles)
    // TODO: we need to iterate through the owner pubkeys
    return { // TODO: proper pool reg cert
      type: cert.type,
      path,
    }
  }

  function prepareCertificate(
    certificate: _Certificate, stakeSigningFiles: HwSigningData[],
  ): LedgerCertificate {
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
        throw Error('UnknownCertificateError')
    }
  }

  const ledgerSignTx = async (
    txAux: _TxAux, signingFiles: HwSigningData[], network: any,
  ): Promise<LedgerWitness[]> => {
    const {
      paymentSigningFiles,
      stakeSigningFiles,
    } = filterSigningFiles(signingFiles)
    const inputs = txAux.inputs.map((input, i) => prepareInput(input, getSigningPath(paymentSigningFiles, i)))
    const outputs = txAux.outputs.map((output) => prepareOutput(output))
    // const certificates = txAux.certs.map((cert) => _prepareCert(cert, addressToAbsPathMapper))
    const certificates = txAux.certificates.map(
      (certificate) => prepareCertificate(certificate, stakeSigningFiles),
    )
    const { fee } = txAux
    const { ttl } = txAux
    const withdrawals = [] as any
    // const withdrawals = txAux.withdrawals
    //   ? [_prepareWithdrawal(txAux.withdrawals, addressToAbsPathMapper)]
    //   : []

    const response = await ledger.signTransaction(
      network.networkId,
      network.protocolMagic,
      inputs,
      outputs,
      fee,
      ttl,
      certificates,
      withdrawals,
    )

    if (response.txHashHex !== txAux.getId()) {
      throw new Error('Tx serialization mismatch')
    }

    return response.witnesses.map((witness: any) => ({
      path: witness.path,
      signature: Buffer.from(witness.witnessSignatureHex, 'hex'),
    }))
  }

  const createWitnesses = async (txAux: _TxAux, signingFiles: HwSigningData[], network: any): Promise<{
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
      throw new Error(`Can not find hw signing data with path ${path}`)
    }

    const ledgerWitnesses = await ledgerSignTx(txAux, signingFiles, network)

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
    txAux: _TxAux, signingFiles: HwSigningData[], network: any,
  ): Promise<SignedTxCborHex> => {
    const { byronWitnesses, shelleyWitnesses } = await createWitnesses(txAux, signingFiles, network)
    return TxSigned(txAux.unsignedTxDecoded, byronWitnesses, shelleyWitnesses)
  }

  const witnessTx = async (
    txAux: _TxAux, signingFiles: HwSigningData, network: any,
  ): Promise<_ShelleyWitness | _ByronWitness> => {
    const { byronWitnesses, shelleyWitnesses } = await createWitnesses(txAux, [signingFiles], network)
    const _byronWitnesses = byronWitnesses.map((byronWitness) => ({ data: byronWitness }) as _ByronWitness)
    const _shelleyWitnesses = shelleyWitnesses.map((shelleyWitness) => (
      { data: shelleyWitness }
    ) as _ShelleyWitness)

    if (_byronWitnesses.length + _shelleyWitnesses.length !== 1) throw new Error('Multiple witnesses found')

    return _shelleyWitnesses.length === 1 ? _shelleyWitnesses[0] : _byronWitnesses[0]
  }

  const getXPubKey = async (path: BIP32Path): Promise<XPubKeyHex> => {
    const { publicKeyHex, chainCodeHex } = await ledger.getExtendedPublicKey(path)
    return publicKeyHex + chainCodeHex
  }

  return {
    signTx,
    witnessTx,
    getXPubKey,
  }
}
