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
  NativeScript,
  NativeScriptHashKeyHex,
  NativeScriptDisplayFormat,
  ParsedShowAddressArguments,
  CardanoEra,
  DerivationType,
  GovernanceVotingDelegation,
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
    delegations: GovernanceVotingDelegation[],
    hwStakeSigningFile: HwSigningData, // describes stake_credential
    rewardAddressBech32: string,
    nonce: BigInt,
    votingPurpose: BigInt,
    network: Network,
    rewardAddressSigningFiles: HwSigningData[],
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
