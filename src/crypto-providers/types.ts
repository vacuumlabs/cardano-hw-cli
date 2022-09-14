import { RawTransaction, Transaction } from 'cardano-hw-interop-lib'
import { KesVKey, OpCertIssueCounter, SignedOpCertCborHex } from '../opCert/opCert'
import {
  TxCborHex,
  TxWitnesses,
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
  DerivationType,
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
  rawTx?: RawTransaction,
  tx?: Transaction,
  txBodyHashHex: string,
  hwSigningFileData: HwSigningData[],
  network: Network,
  era: CardanoEra,
  derivationType?: DerivationType,
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
  ) => Promise<TxWitnesses>,
  getXPubKeys: (
    paths: BIP32Path[],
    derivationType?: DerivationType,
  ) => Promise<XPubKeyHex[]>,
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
    derivationType?: DerivationType,
  ) => Promise<VotingRegistrationMetaDataCborHex>
  deriveNativeScriptHash: (
    nativeScript: NativeScript,
    signingFiles: HwSigningData[],
    displayFormat: NativeScriptDisplayFormat,
    derivationType?: DerivationType,
  ) => Promise<NativeScriptHashKeyHex>,
}

export type _AddressParameters = {
  address: Buffer,
  addressType: number,
  paymentPath?: BIP32Path,
  stakePath?: BIP32Path,
}
