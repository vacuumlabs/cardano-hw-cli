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
  NativeScript,
  NativeScriptHashKeyHex,
  NativeScriptDisplayFormat,
} from '../types'

export enum SigningMode {
  ORDINARY_TRANSACTION,
  POOL_REGISTRATION_AS_OWNER,
  POOL_REGISTRATION_AS_OPERATOR,
  MULTISIG_TRANSACTION,
}

export type SigningParameters = {
  signingMode: SigningMode,
  unsignedTxParsed: _UnsignedTxParsed,
  hwSigningFileData: HwSigningData[],
  network: Network,
}

export type CryptoProvider = {
  getVersion: () => Promise<string>,
  showAddress: (
    paymentPath: BIP32Path,
    paymentScriptHash: string,
    stakingPath: BIP32Path,
    stakingScriptHash: string,
    address: Address,
  ) => Promise<void>,
  signTx: (
    params: SigningParameters,
    changeOutputFiles: HwSigningData[],
  ) => Promise<SignedTxCborHex>,
  witnessTx: (
    params: SigningParameters,
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
  deriveNativeScriptHash: (
    nativeScript: NativeScript,
    signingFiles: HwSigningData[],
    displayFormat: NativeScriptDisplayFormat,
  ) => Promise<NativeScriptHashKeyHex>,
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
