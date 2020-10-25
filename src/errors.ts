/* eslint-disable max-len */
const errors: {[key: string]: ({ message } : { message?: string }) => string} = {
  TrezorSignTxError: () => 'TrezorSignTxError: Error occured while signing the transaction with Trezor',
  HwTransportNotFoundError: () => 'HwTransportNotFoundError: Error occured while trying to find hw transport, make sure Ledger or Trezor is connected to you computer',
  InvalidPathError: ({ message }) => `InvalidPathError: can not parse path: ${message}`,
  InvalidFileTypeError: ({ message }) => `InvalidFileTypeError: Invalid file type of hw-signing-file at path: ${message}`,
  InvalidHwSigningFileError: ({ message }) => `InvalidHwSigningFileError: Invalid file contents of hw-signing-file at ${message}`,
  InvalidTxBodyFileError: ({ message }) => `InvalidTxBodyFileError: Invalid file contents of tx-body-file at ${message}`,
  TxSerializationMismatchError: () => 'TxSerializationMismatchError: Tx serialization mismatch',
  MissingHwSigningDataAtPathError: ({ message }) => `MissingHwSigningDataAtPathError: Can not find hw signing data with path ${message}`,
  MultipleWitnessesError: () => 'MultipleWitnessesError: Multiple witnesses found',
  UndefinedCommandError: () => 'UndefinedCommandError: command undefined',
  MissingSigningFileError: () => 'MissingSigningFileError: missing signing file',
  UnknownCertificateTypeError: () => 'UnknownCertificateTypeError: unknown certificate type',
  MultipleCertificatesWithPoolRegError: () => 'MultipleCertificatesWithPoolRegError: Multiple pool registration certificates found, expected one',
  WithdrawalIncludedWithPoolRegError: () => 'WithdrawalIncludedWithPoolRegError: Withdrawal certificate and pool registration certificate found, expected one',
  PaymentFileInlucedWithPoolRegError: () => 'PaymentFileInlucedWithPoolRegError: Unexpected payment hardware signing file with pool registration certificate found',
  MultipleStakingSigningFilesWithPoolRegError: () => 'MultipleStakingSigningFilesWithPoolRegError: Multiple staking signing files with pool registration certificate found, expected only one staking signing file',
  MissingPaymentSigningFileError: () => 'MissingPaymentSigningFileError: Missing payment hardware signing file',
  TooManySigningFilesError: () => 'TooManySigningFilesError: Too many signing files',
  MissingStakingSigningFileError: () => 'MissingStakingSigningFileError',
  MissingInputError: () => 'MissingInputError: Missing input',
  MissingOutputError: () => 'MissingOutputError: Missing output',
  TrezorError: () => 'TrezorError: Trezor operation failed, please make sure you are using the latest version of Trezor firmware',
  TxInputParseError: () => 'TxInputParseError: Failed to parse input',
  TxOutputParseError: () => 'TxOutputParseError: Failed to parse output',
  WithrawalsParseError: () => 'WithrawalsParseError: Failed to parse withdrawals',
  TxStakingKeyRegistrationCertParseError: () => 'TxStakingKeyRegistrationCertParseError: Failed to parse staking key registration certificate',
  TxStakingKeyDeregistrationCertParseError: () => 'TxStakingKeyDeregistrationCertParseError: Failed to parse staking key deregistration certificate',
  TxDelegationCertParseError: () => 'TxDelegationCertParseError: Failed to parse delegation certificate',
  TxStakepoolRegistrationCertParseError: () => 'TxStakepoolRegistrationCertParseError: Failed to parse stakepool registration certificate',
  TxSingleHostIPRelayParseError: () => 'TxSingleHostIPRelayParseError: Failed to parse single host IP relay',
  TxSingleHostNameRelayParseError: () => 'TxSingleHostNameRelayParseError: Failed to parse single host name relay',
  TxMultiHostNameRelayParseError: () => 'TxMultiHostNameRelayParseError: Failed to parse multi host name relay',
  MissingSigningFileForCertficateError: () => 'MissingSigningFileForCertficateError: Missing signing file for certficate',
  OwnerMultipleTimesInTxError: () => 'OwnerMultipleTimesInTxError: Owner multiple times in tx',
  UnsupportedRelayTypeError: () => 'UnsupportedRelayTypeError: Unsupported relay type',
  UnknownCertificateError: () => 'UnknownCertificateError: Unknown certificate',
  UnsupportedCertificateTypeError: () => 'UnsupportedCertificateTypeError: Unsupported certificate type',
  MissingSigningFileForWithdrawalError: () => 'MissingSigningFileForWithdrawalError: Missing signing file for withdrawal',
}

const getErrorTranslation = (
  error: Error,
): string => {
  const translation = errors[error.name]
  if (translation !== undefined) {
    return translation(error)
  }

  return 'UknownError: An unkwown error has occured'
}

export {
  getErrorTranslation,
}
