import {
  // TxWitnessKeys,
  SignedTxCborHex,
  _TxAux,
  _Input,
  _Output,
  // _XPubKey,
  _ByronWitness,
  _ShelleyWitness,
  // Withdrawal,
  // TxWitnessByron,
  // TxWitnessShelley,
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
import { BIP32Path, HwSigningData } from '../types'

const {
  getAddressType,
  AddressTypes,
  base58,
  bech32,
} = require('cardano-crypto.js')

const TrezorConnect = require('trezor-connect').default

const TrezorCryptoProvider: () => Promise<CryptoProvider> = async () => {
  TrezorConnect.manifest({
    email: 'todo',
    appUrl: 'todo',
  })

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
    // }
  }

  // function prepareCertificate(cert): CardanoCertificate {
  //   return cert.poolHash
  //     ? {
  //       type: cert.type,
  //       path: addressToAbsPathMapper(cert.accountAddress),
  //       pool: cert.poolHash,
  //     }
  //     : {
  //       type: cert.type,
  //       path: addressToAbsPathMapper(cert.accountAddress),
  //     }
  // }

  // function prepareWithdrawal(withdrawal: Withdrawal): CardanoWithdrawal {
  //   return {
  //     path: withdrawal.address,
  //     amount: `${withdrawal.coins}`,
  //   }
  // }

  async function signTx(
    txAux: _TxAux, signingFiles: HwSigningData[], network: any,
  ): Promise<SignedTxCborHex> {
    const inputs = txAux.inputs.map((input, i) => prepareInput(input, signingFiles[i].path))

    const outputs = txAux.outputs.map((output) => prepareOutput(output))

    const certificates = [] as TrezorCertificate[]

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
