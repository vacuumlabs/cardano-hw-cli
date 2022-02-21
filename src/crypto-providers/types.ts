import { RawTransaction } from 'cardano-hw-interop-lib'
import { KesVKey, OpCertIssueCounter, SignedOpCertCborHex } from '../opCert/opCert'
import {
  TxCborHex,
  _ShelleyWitness,
  _ByronWitness,
  VotingRegistrationMetaDataCborHex,
} from '../transaction/types'
import {
  HwSigningData,
  BIP32Path,
  Network,
  XPubKeyHex,
  VotePublicKeyHex,
  NativeScript,
  NativeScriptHashKeyHex,
  NativeScriptDisplayFormat,
  ParsedShowAddressArguments,
  CardanoEra,
} from '../types'

export enum SigningMode {
  ORDINARY_TRANSACTION,
  POOL_REGISTRATION_AS_OWNER,
  POOL_REGISTRATION_AS_OPERATOR,
  MULTISIG_TRANSACTION,
  PLUTUS_TRANSACTION,
}

export type SigningParameters = {
  signingMode: SigningMode,
  rawTx: RawTransaction,
  txBodyHashHex: string,
  hwSigningFileData: HwSigningData[],
  network: Network,
  era: CardanoEra,
}

export type CryptoProvider = {
  getVersion: () => Promise<string>,
  showAddress: (
    args: ParsedShowAddressArguments,
  ) => Promise<void>,
  signTx: (
    params: SigningParameters,
    changeOutputFiles: HwSigningData[],
  ) => Promise<TxCborHex>,
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
