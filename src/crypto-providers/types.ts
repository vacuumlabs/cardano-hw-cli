import { KesVKey, OpCertIssueCounter, SignedOpCertCborHex } from '../opCert/opCert'
import {
  SignedTxCborHex,
  _ShelleyWitness,
  _ByronWitness,
  VotingRegistrationMetaDataCborHex,
  _UnsignedTxParsed,
} from '../transaction/types'
import {
  HwSigningData,
  BIP32Path,
  Network,
  Address,
  XPubKeyHex,
  VotePublicKeyHex,
} from '../types'

export type CryptoProvider = {
  getVersion: () => Promise<string>,
  showAddress: (paymentPath: BIP32Path, stakingPath: BIP32Path, address: Address) => Promise<void>,
  signTx: (
    unsignedTxParsed: _UnsignedTxParsed,
    signingFiles: HwSigningData[],
    network: Network,
    changeOutputFiles: HwSigningData[],
  ) => Promise<SignedTxCborHex>,
  witnessTx: (
    unsignedTxParsed: _UnsignedTxParsed,
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
    rewardAddressSigningFiles: HwSigningData[],
    hwStakeSigningFile: HwSigningData,
    rewardAddressBech32: string,
    votePublicKeyHex: VotePublicKeyHex,
    network: Network,
    nonce: BigInt,
  ) => Promise<VotingRegistrationMetaDataCborHex>
}

export type _AddressParameters = {
  address: Buffer,
  addressType: number,
  paymentPath?: BIP32Path,
  stakePath?: BIP32Path,
}

export type DeviceVersion = {
  major: number,
  minor: number,
  patch: number,
}
