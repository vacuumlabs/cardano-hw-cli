import {
  SignedTxCborHex,
  _TxAux,
  _ShelleyWitness,
  _ByronWitness,
  XPubKeyHex,
} from '../transaction/types'
import { HwSigningData, BIP32Path, Network } from '../types'

export type CryptoProvider = {
  signTx: (
    txAux: _TxAux,
    signingFiles:
    HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ) => Promise<SignedTxCborHex>,
  witnessTx: (
    txAux: _TxAux,
    signingFile: HwSigningData,
    network: Network,
    changeOutputFiles: HwSigningData[],
  ) => Promise<_ShelleyWitness | _ByronWitness>
  getXPubKey: (path: BIP32Path) => Promise<XPubKeyHex>,
}

export type _AddressParameters = {
  address: Buffer,
  addressType: number,
  paymentPath: BIP32Path,
  stakePath?: BIP32Path,
}
