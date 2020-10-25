import {
  SignedTxCborHex,
  _TxAux,
  _ShelleyWitness,
  _ByronWitness,
  XPubKeyHex,
} from '../transaction/types'
import {
  HwSigningData,
  BIP32Path,
  Network,
  Address,
} from '../types'

export type CryptoProvider = {
  getVersion: () => Promise<string>
  showAddress: (paymentPath: BIP32Path, stakingPath: BIP32Path, address: Address) => Promise<void>
  signTx: (
    txAux: _TxAux,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ) => Promise<SignedTxCborHex>,
  witnessTx: (
    txAux: _TxAux,
    signingFile: HwSigningData,
    network: Network,
    changeOutputFiles: HwSigningData[],
  ) => Promise<_ShelleyWitness | _ByronWitness>
  getXPubKey: (path: BIP32Path) => Promise<XPubKeyHex>
}

export type _AddressParameters = {
  address: Buffer,
  addressType: number,
  paymentPath: BIP32Path,
  stakePath?: BIP32Path,
}
