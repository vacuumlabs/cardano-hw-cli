import {
  SignedTxCborHex,
  _TxAux,
  _ShelleyWitness,
  _ByronWitness,
  XPubKeyHex,
} from '../transaction/types'
import { HwSigningData, BIP32Path, Network } from '../types'

export type CryptoProvider = {
  signTx: (txAux: _TxAux, signingFiles: HwSigningData[], network: Network) => Promise<SignedTxCborHex>,
  witnessTx: (
    txAux: _TxAux, signingFile: HwSigningData, network: Network
  ) => Promise<_ShelleyWitness | _ByronWitness>
  getXPubKey: (path: BIP32Path) => Promise<XPubKeyHex>,
}
