import {
  SignedTxCborHex,
  TxWitnessByron,
  TxWitnessShelley,
  TxWitnessKeys,
  _TxAux,
} from '../transaction/types'
import { HwSigningData, BIP32Path } from '../types'

export type CryptoProvider = () => Promise<{
  signTx: (txAux: _TxAux, signingFiles: HwSigningData[], network: any) => Promise<SignedTxCborHex>,
  witnessTx: (txAux: _TxAux, signingFiles: HwSigningData[], network: any) => Promise<{
    type: TxWitnessKeys,
    witness: TxWitnessByron | TxWitnessShelley,
  }>
  getSigningFile: (path: BIP32Path) => Promise<any>,
  getVerificationKeyFile: (path: BIP32Path) => Promise<string>,
}>
