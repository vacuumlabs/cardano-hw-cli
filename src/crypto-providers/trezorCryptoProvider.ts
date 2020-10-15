import {
  SignedTxCborHex,
  _TxAux,
  _Input,
  _Output,
  _ByronWitness,
  _ShelleyWitness,
  TxCertificateKeys,
  _Certificate,
  _Withdrawal,
} from '../transaction/types'
import { CryptoProvider } from './types'
import {
  TrezorInput,
  TrezorOutput,
  TrezorWithdrawal,
  TrezorCertificate,
} from './trezorTypes'
import {
  Witness,
} from '../transaction/transaction'
import { BIP32Path, HwSigningData, Network } from '../types'
import {
  isDelegationCertificate,
  isStakepoolRegistrationCertificate,
  isStakingKeyDeregistrationCertificate,
  isStakingKeyRegistrationCertificate,
} from './guards'
import {
  encodeAddress,
  filterSigningFiles,
  findSigningPath,
  getSigningPath,
} from './util'

const TrezorConnect = require('trezor-connect').default

const TrezorCryptoProvider: () => Promise<CryptoProvider> = async () => {
  TrezorConnect.manifest({
    email: 'todo',
    appUrl: 'todo',
  })
  // const { payload: features } = await TrezorConnect.getFeatures()
  // const {
  //   major_version: major,
  //   minor_version: minor,
  //   patch_version: patch,
  // } = features

  async function getXPubKey(path: BIP32Path): Promise<string> {
    const { payload } = await TrezorConnect.cardanoGetPublicKey({
      path,
      showOnTrezor: false,
    })
    return payload.publicKey
  }

  function prepareInput(input: _Input, path?: BIP32Path): TrezorInput {
    return {
      path,
      prev_hash: input.txHash.toString('hex'),
      prev_index: input.outputIndex,
    }
  }

  function prepareOutput(
    output: _Output,
    changeOutputFiles: HwSigningData[],
  ): TrezorOutput {
    const address = encodeAddress(output.address)
    // if (output.isChange) {
    //   return {
    //     amount: `${output.coins}`,
    //     addressParameters: {
    //       addressType: 0, // TODO: 0 for base address
    //       path: output.spendingPath,
    //       stakingPath: output.stakingPath,
    //     },
    //   }
    // } else {
    return {
      address,
      amount: `${output.coins}`,
    }
  }

  function prepareStakingKeyRegistrationCert(
    cert: _Certificate, stakeSigningFiles: HwSigningData[],
  ): TrezorCertificate {
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
  ): TrezorCertificate {
    if (!isDelegationCertificate(cert)) throw Error()
    const path = findSigningPath(cert.pubKeyHash, stakeSigningFiles)
    return {
      type: cert.type,
      path,
      pool: cert.poolHash.toString('hex'),
    }
  }

  function prepareStakePoolRegistrationCert(
    cert: _Certificate, stakeSigningFiles: HwSigningData[],
  ): TrezorCertificate {
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
  ): TrezorCertificate {
    type certificatePreparer =
    | typeof prepareStakingKeyRegistrationCert
    | typeof prepareDelegationCert
    | typeof prepareStakePoolRegistrationCert

    const certificatePreparerers: {[key: number]: certificatePreparer} = {
      [TxCertificateKeys.STAKING_KEY_REGISTRATION]: prepareStakingKeyRegistrationCert,
      [TxCertificateKeys.STAKING_KEY_DEREGISTRATION]: prepareStakingKeyRegistrationCert,
      [TxCertificateKeys.DELEGATION]: prepareDelegationCert,
      [TxCertificateKeys.STAKEPOOL_REGISTRATION]: prepareStakePoolRegistrationCert,
    }
    return certificatePreparerers[certificate.type](certificate, stakeSigningFiles)
  }

  function prepareWithdrawal(
    withdrawal: _Withdrawal, stakeSigningFiles: HwSigningData[],
  ): TrezorWithdrawal {
    const pubKeyHash = withdrawal.address.slice(1)
    const path = findSigningPath(pubKeyHash, stakeSigningFiles)
    return {
      path,
      amount: `${withdrawal.coins}`,
    }
  }

  async function signTx(
    txAux: _TxAux,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<SignedTxCborHex> {
    const {
      paymentSigningFiles,
      stakeSigningFiles,
    } = filterSigningFiles(signingFiles)
    const inputs = txAux.inputs.map(
      (input, i) => prepareInput(input, getSigningPath(paymentSigningFiles, i)),
    )
    const outputs = txAux.outputs.map(
      (output) => prepareOutput(output, changeOutputFiles),
    )
    const certificates = txAux.certificates.map(
      (certificate) => prepareCertificate(certificate, stakeSigningFiles),
    )
    const { fee } = txAux
    const { ttl } = txAux
    const withdrawals = txAux.withdrawals.map(
      (withdrawal) => prepareWithdrawal(withdrawal, stakeSigningFiles),
    )

    const response = await TrezorConnect.cardanoSignTransaction({
      inputs,
      outputs,
      protocolMagic: network.protocolMagic,
      fee,
      ttl,
      networkId: network.networkId,
      certificates,
      withdrawals,
    })

    if (response.error || !response.success) {
      throw Error('TrezorSignTxError')
    }

    return response.payload.serializedTx as SignedTxCborHex
  }

  async function witnessTx(
    txAux: _TxAux,
    signingFile: HwSigningData,
    network: Network,
    changeOutputFiles: HwSigningData[],
  ): Promise<_ByronWitness | _ShelleyWitness> {
    const signedTx = await signTx(txAux, [signingFile], network, changeOutputFiles)
    return Witness(signedTx)
  }

  return {
    witnessTx,
    signTx,
    getXPubKey,
  }
}

export {
  TrezorCryptoProvider,
}
