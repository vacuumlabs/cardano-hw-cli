export enum ExitCode {
  Success = 0,
  Error = 1,
  UnfixableValidationErrorsFound = 2,
  FixableValidationErrorsFound = 3,
}

/* eslint-disable max-len */
export const enum Errors {
  HwTransportNotFoundError = 'Error occurred while trying to find hw transport, make sure Ledger or Trezor is connected to your computer',
  InvalidPathError = 'Can not parse path',
  InvalidFileTypeError = 'Invalid file type of hw-signing-file',
  InvalidHwSigningFileError = 'Invalid file contents of hw-signing-file',
  InvalidTxFileError = 'Invalid file contents of tx-file',
  InvalidKesVKeyFileError = 'Invalid KES verification key file',
  InvalidOpCertIssueCounterFileError = 'Invalid operational certificate issue counter file',
  InvalidNodeKeyGenInputsError = 'Invalid node key-gen inputs',
  InvalidDerivationTypeError = 'Invalid derivation type',
  TxSerializationMismatchError = 'Tx serialization mismatch',
  MetadataSerializationMismatchError = 'Metadata serialization mismatch',
  MissingHwSigningDataAtPathError = 'Can not find hw signing data by path',
  MissingHwSigningDataAtXPubKeyError = 'Can not find hw signing data by extended public key',
  UndefinedCommandError = 'command undefined',
  UnknownCertificateTypeError = 'unknown certificate type',
  TooManyPaymentFilesWithPoolRegError = 'Unexpected payment hardware signing file with pool registration certificate found',
  MissingPaymentSigningFileError = 'Missing payment hardware signing file',
  MissingStakeSigningFileError = 'Missing staking signing file',
  MissingPoolColdSigningFileError = 'Missing pool cold key signing file',
  TooManyPaymentSigningFilesError = 'Too many payment signing files',
  TooManyStakeSigningFilesError = 'Too many stake signing files',
  TooManyPoolColdSigningFilesError = 'Too many pool cold key signing files',
  TooManyMintSigningFilesError = 'Too many mint signing files',
  TooManyMultisigSigningFilesError = 'Too many multisig signing files',
  MissingSigningFileForCertificateError = 'Missing signing file for certificate',
  OwnerMultipleTimesInTxError = 'Owner multiple times in tx',
  UnsupportedRelayTypeError = 'Unsupported relay type',
  UnknownCertificateError = 'Unknown certificate',
  InvalidAddressError = 'Invalid address',
  InvalidAddressParametersProvidedError = 'Invalid address parameters provided',
  InvalidKeyGenInputsError = 'Invalid key gen inputs error',
  TrezorPassphraseNotInsertableOnDevice = 'Trezor passphrase not insertable on the device',
  TrezorXPubKeyCancelled = 'Extended public key export cancelled by user',
  UnsupportedCryptoProviderCall = 'The call is not supported by the chosen crypto provider',
  MissingAuxiliaryDataSupplement = 'Missing auxiliary data supplement in response.',
  MissingCIP36RegistrationSignature = 'Missing CIP36 voting signature',
  InternalInvalidTypeError = 'Internal invalid type error',
  InvalidCVotePublicKey = 'Invalid CIP36 vote public key',
  InvalidCVoteWeight = 'Invalid CIP36 vote weight',
  InvalidCVoteVotingPurpose = 'Invalid CIP36 voting purpose',
  InvalidCVoteDelegations = 'Invalid CIP36 delegations (either a single vote public key or several vote public keys with their weights are expected)',
  ByronSigningFilesFoundInCIP36Registration = 'Byron addresses are not allowed for CIP36 registration',
  TrezorVersionError = 'Failed to retrieve trezor version',
  InvalidCIP36RegistrationAddressType = 'CIP36 registration address type must be either BASE or REWARD',
  InvalidTransactionType = 'Invalid transaction type',
  InvalidScriptHashHex = 'Invalid script hash hex',
  InvalidNativeScriptFile = 'Invalid native script file',
  Unreachable = 'Unreachable code reached',
  TrezorPoolRegistrationAsOperatorNotSupported = 'Trezor does not support signing pool registration certificate as operator',
  InvalidInputError = 'Invalid input',
  InvalidCollateralInputError = 'Invalid collateral input',
  TxContainsUnfixableErrors = 'Transaction CBOR contains unfixable errors',
  TxContainsFixableErrors = 'Transaction CBOR contains fixable errors, please run "transform" command first',
  CannotTransformSignedTx = 'Transaction contains vkey witnesses, transformation would invalidate them',
  NetworkIdMismatchError = 'Provided network id differs from network id included in transaction body',
  NotEnoughOutFilesError = 'Not enough output files specified',
  TestnetProtocolMagicMissing = 'Testnet protocol magic is missing',
}
