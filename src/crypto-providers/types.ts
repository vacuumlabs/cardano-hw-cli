import { Transaction } from 'cardano-hw-interop-lib'
import { KesVKey, OpCertIssueCounter, SignedOpCertCborHex } from '../opCert/opCert'
import {
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
  CVoteDelegation,
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
  tx: Transaction,
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
    delegations: CVoteDelegation[],
    hwStakeSigningFile: HwSigningData, // describes stake_credential
    paymentAddressBech32: string,
    nonce: BigInt,
    votingPurpose: BigInt,
    network: Network,
    paymentAddressSigningFiles: HwSigningData[],
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
