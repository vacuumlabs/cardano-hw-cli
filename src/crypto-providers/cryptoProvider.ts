import {Transaction} from 'cardano-hw-interop-lib'
import {
  KesVKey,
  OpCertIssueCounter,
  SignedOpCertCborHex,
} from '../opCert/opCert'
import {
  TxWitnesses,
  CIP36RegistrationMetaDataCborHex,
} from '../transaction/txTypes'
import {
  BIP32Path,
  XPubKeyHex,
  NativeScriptHashKeyHex,
  CardanoEra,
  DerivationType,
  NativeScript,
  Network,
  CVoteDelegation,
  HumanAddress,
} from '../basicTypes'
import {
  ParsedShowAddressArguments,
  HwSigningData,
  ParsedSignMessageArguments,
} from '../command-parser/argTypes'
import {SignedMessageData} from '../signMessage/signMessage'

export enum SigningMode {
  ORDINARY_TRANSACTION,
  POOL_REGISTRATION_AS_OWNER,
  POOL_REGISTRATION_AS_OPERATOR,
  MULTISIG_TRANSACTION,
  PLUTUS_TRANSACTION,
}

export type TxSigningParameters = {
  signingMode: SigningMode
  tx: Transaction
  txBodyHashHex: string
  hwSigningFileData: HwSigningData[]
  network: Network
  era: CardanoEra
  derivationType?: DerivationType
}

export enum NativeScriptDisplayFormat {
  BECH32,
  POLICY_ID,
}

export type CryptoProvider = {
  getVersion: () => Promise<string>
  showAddress: (args: ParsedShowAddressArguments) => Promise<void>
  witnessTx: (
    params: TxSigningParameters,
    changeOutputFiles: HwSigningData[],
  ) => Promise<TxWitnesses>
  getXPubKeys: (
    paths: BIP32Path[],
    derivationType?: DerivationType,
  ) => Promise<XPubKeyHex[]>
  signOperationalCertificate: (
    kesVKey: KesVKey,
    kesPeriod: bigint,
    issueCounter: OpCertIssueCounter,
    signingFile: HwSigningData[],
  ) => Promise<SignedOpCertCborHex>
  signCIP36RegistrationMetaData: (
    delegations: CVoteDelegation[],
    hwStakeSigningFile: HwSigningData, // describes stake_credential
    paymentAddressBech32: HumanAddress,
    nonce: bigint,
    votingPurpose: bigint,
    network: Network,
    paymentAddressSigningFiles: HwSigningData[],
    derivationType?: DerivationType,
  ) => Promise<CIP36RegistrationMetaDataCborHex>
  signMessage: (args: ParsedSignMessageArguments) => Promise<SignedMessageData>
  deriveNativeScriptHash: (
    nativeScript: NativeScript,
    signingFiles: HwSigningData[],
    displayFormat: NativeScriptDisplayFormat,
    derivationType?: DerivationType,
  ) => Promise<NativeScriptHashKeyHex>
}
