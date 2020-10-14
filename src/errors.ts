const errors: {[key: string]: string} = {
  TrezorSignTxError: 'TrezorSignTxError: Error occured while signing the transaction with Trezor',
}

const getErrorTranslation = (
  error: Error,
) => errors[error.message] || 'UknownError: An unkwown error has occured'

export {
  getErrorTranslation,
}
