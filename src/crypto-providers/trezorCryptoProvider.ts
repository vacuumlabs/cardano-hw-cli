import {
  SignedTxCborHex,
  _TxAux,
  _Input,
  _Output,
  _ByronWitness,
  _ShelleyWitness,
  TxCertificateKeys,
  _Certificate,
} from '../transaction/types'
import { CryptoProvider } from './types'
import {
  TrezorInput,
  TrezorOutput,
  TrezorWithdrawal,
  TrezorCertificate,
} from './trezorTypes'
import {
  Witness, XPubKey,
} from '../transaction/transaction'
import { BIP32Path, HwSigningData } from '../types'
import {
  isDelegationCertificate,
  isStakepoolRegistrationCertificate,
  isStakingKeyDeregistrationCertificate,
  isStakingKeyRegistrationCertificate,
} from './guards'

const {
  getAddressType,
  AddressTypes,
  base58,
  bech32,
  getPubKeyBlake2b224Hash,
} = require('cardano-crypto.js')

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

  function prepareInput(input: _Input, path: BIP32Path): TrezorInput {
    return {
      path,
      prev_hash: input.txHash.toString('hex'),
      prev_index: input.outputIndex,
    }
  }

  function prepareOutput(output: _Output): TrezorOutput {
    const address = getAddressType(output.address) === AddressTypes.ENTERPRISE
      ? base58.encode(output.address)
      : bech32.encode('addr', output.address)
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

  function findSigningPath(certPubKeyHash: Buffer, stakingSigningFiles: HwSigningData[]) {
    const signingFile = stakingSigningFiles.find((file) => {
      const { pubKey } = XPubKey(file.cborXPubKeyHex)
      const pubKeyHash = getPubKeyBlake2b224Hash(pubKey)
      return !Buffer.compare(pubKeyHash, certPubKeyHash)
    })
    if (!signingFile) throw Error('Missing signing file')
    return signingFile.path
  }

  function prepareStakingKeyRegistrationCert(
    cert: _Certificate, stakingSigningFiles: HwSigningData[],
  ): TrezorCertificate {
    if (
      !isStakingKeyRegistrationCertificate(cert) && !isStakingKeyDeregistrationCertificate(cert)
    ) throw Error()
    const path = findSigningPath(cert.pubKeyHash, stakingSigningFiles)
    return {
      type: cert.type,
      path,
    }
  }

  function prepareDelegationCert(
    cert: _Certificate, stakingSigningFiles: HwSigningData[],
  ): TrezorCertificate {
    if (!isDelegationCertificate(cert)) throw Error()
    const path = findSigningPath(cert.pubKeyHash, stakingSigningFiles)
    return {
      type: cert.type,
      path,
      pool: cert.poolHash.toString('hex'),
    }
  }

  function prepareStakePoolRegistrationCert(
    cert: _Certificate, stakingSigningFiles: HwSigningData[],
  ): TrezorCertificate {
    if (!isStakepoolRegistrationCertificate(cert)) throw Error()
    const path = findSigningPath(cert.ownerPubKeys[0], stakingSigningFiles)
    // TODO: we need to iterate through the owner pubkeys
    return { // TODO: proper pool reg cert
      type: cert.type,
      path,
    }
  }

  function prepareCertificate(
    certificate: _Certificate, stakingSigningFiles: HwSigningData[],
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
    return certificatePreparerers[certificate.type](certificate, stakingSigningFiles)
  }

  // function prepareWithdrawal(withdrawal: Withdrawal): CardanoWithdrawal {
  //   return {
  //     path: withdrawal.address,
  //     amount: `${withdrawal.coins}`,
  //   }
  // }

  async function signTx(
    txAux: _TxAux, signingFiles: HwSigningData[], network: any,
  ): Promise<SignedTxCborHex> {
    const paymentSigningFiles = signingFiles.filter(
      (signingFile) => signingFile.type === 0,
    )
    const stakingSigningFiles = signingFiles.filter(
      (signingFile) => signingFile.type === 1,
    )
    const inputs = txAux.inputs.map(
      (input, i) => prepareInput(input, paymentSigningFiles[i].path),
    )
    const outputs = txAux.outputs.map(
      (output) => prepareOutput(output),
    )
    const certificates = txAux.certificates.map(
      (certificate) => prepareCertificate(certificate, stakingSigningFiles),
    )
    const { fee } = txAux
    const { ttl } = txAux
    const withdrawals = [] as TrezorWithdrawal[]

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
    txAux: _TxAux, signingFile: HwSigningData, network: any,
  ): Promise<_ByronWitness | _ShelleyWitness> {
    const signedTx = await signTx(txAux, [signingFile], network)
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
