import { KesVKey, OpCertIssueCounter, SignedOpCertCborHex } from '../opCert/opCert'
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
  CborHex,
} from '../types'

export type CryptoProvider = {
  getVersion: () => Promise<string>,
  showAddress: (paymentPath: BIP32Path, stakingPath: BIP32Path, address: Address) => Promise<void>,
  signTx: (
    txAux: _TxAux,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ) => Promise<SignedTxCborHex>,
  witnessTx: (
    txAux: _TxAux,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ) => Promise<Array<_ShelleyWitness | _ByronWitness>>,
  getXPubKeys: (paths: BIP32Path[]) => Promise<XPubKeyHex[]>,
  signOperationalCertificate: (
    kesVKey: KesVKey,
    kesPeriod: BigInt,
    issueCounter: OpCertIssueCounter,
    signingFile: HwSigningData[],
  ) => Promise<SignedOpCertCborHex>
  signVotingRegistrationMetaData: (
    auxiliarySigningFiles: HwSigningData[],
    hwStakeSigningFile: HwSigningData,
    paymentAddressBech32: string,
    votingPublicKeyHex: string,
    network: Network,
    nonce: BigInt,
  ) => Promise<CborHex>
}

export type _AddressParameters = {
  address: Buffer,
  addressType: number,
  paymentPath: BIP32Path,
  stakePath?: BIP32Path,
}

export type DeviceVersion = {
  major: number,
  minor: number,
  patch: number,
}
