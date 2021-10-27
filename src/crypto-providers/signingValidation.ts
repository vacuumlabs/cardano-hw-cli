import { Errors } from '../errors'
import {
  TxCertificateKeys,
  _UnsignedTxParsed,
} from '../transaction/types'
import {
  SigningMode,
  SigningParameters,
} from './types'
import {
  filterSigningFiles,
} from './util'

const _countWitnessableItems = (unsignedTxParsed: _UnsignedTxParsed) => {
  // we count stake registrations separately because they don't necessarily require a staking witness
  let numStakeRegistrationItems = 0
  let numStakeOtherItems = unsignedTxParsed.withdrawals.length
  let numPoolColdItems = 0
  unsignedTxParsed.certificates.forEach((cert) => {
    switch (cert.type) {
      case TxCertificateKeys.STAKING_KEY_REGISTRATION:
        numStakeRegistrationItems += 1
        break

      case TxCertificateKeys.STAKING_KEY_DEREGISTRATION:
      case TxCertificateKeys.DELEGATION:
        numStakeOtherItems += 1
        break

      case TxCertificateKeys.STAKEPOOL_RETIREMENT:
        numPoolColdItems += 1
        break

      default:
        break
    }
  })
  return { numStakeRegistrationItems, numStakeOtherItems, numPoolColdItems }
}

const validateOrdinaryWitnesses = (params: SigningParameters) => {
  const {
    poolColdSigningFiles, mintSigningFiles, multisigSigningFiles,
  } = filterSigningFiles(params.hwSigningFileData)

  const { numPoolColdItems } = _countWitnessableItems(params.unsignedTxParsed)

  if (numPoolColdItems === 0 && poolColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }
  if (!params.unsignedTxParsed.mint && mintSigningFiles.length > 0) {
    throw Error(Errors.TooManyMintSigningFilesError)
  }
  if (multisigSigningFiles.length > 0) {
    throw Error(Errors.TooManyMultisigSigningFilesError)
  }
}

const validateOrdinarySigning = (params: SigningParameters) => {
  validateOrdinaryWitnesses(params)
  // these checks should be performed only with createSignedTx call (when the signing file set is
  // expected to be complete) on top of validateOrdinaryWitnesses

  const {
    paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles,
  } = filterSigningFiles(params.hwSigningFileData)

  if (paymentSigningFiles.length === 0) {
    throw Error(Errors.MissingPaymentSigningFileError)
  }

  const {
    numStakeOtherItems, numPoolColdItems,
  } = _countWitnessableItems(params.unsignedTxParsed)

  if (numStakeOtherItems > 0 && (stakeSigningFiles.length === 0)) {
    throw Error(Errors.MissingStakeSigningFileError)
  }
  if (numPoolColdItems > 0 && (poolColdSigningFiles.length === 0)) {
    throw Error(Errors.MissingPoolColdSigningFileError)
  }
}

const validatePoolOwnerWitnesses = (params: SigningParameters) => {
  const {
    paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles, mintSigningFiles, multisigSigningFiles,
  } = filterSigningFiles(params.hwSigningFileData)

  if (paymentSigningFiles.length > 0) {
    throw Error(Errors.TooManyPaymentFilesWithPoolRegError)
  }

  // we need exactly one signing file in order to unambiguously determine the owner to be witnessed
  if (stakeSigningFiles.length === 0) {
    throw Error(Errors.MissingStakeSigningFileError)
  }
  if (stakeSigningFiles.length > 1) {
    throw Error(Errors.TooManyStakeSigningFilesError)
  }

  if (poolColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }
  if (mintSigningFiles.length > 0) {
    throw Error(Errors.TooManyMintSigningFilesError)
  }
  if (multisigSigningFiles.length > 0) {
    throw Error(Errors.TooManyMultisigSigningFilesError)
  }
}

const validatePoolOperatorWitnesses = (params: SigningParameters) => {
  const {
    stakeSigningFiles, poolColdSigningFiles, mintSigningFiles, multisigSigningFiles,
  } = filterSigningFiles(params.hwSigningFileData)

  if (stakeSigningFiles.length > 0) {
    throw Error(Errors.TooManyStakeSigningFilesError)
  }
  if (poolColdSigningFiles.length === 0) {
    throw Error(Errors.MissingPoolColdSigningFileError)
  }
  if (poolColdSigningFiles.length > 1) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }
  if (mintSigningFiles.length > 0) {
    throw Error(Errors.TooManyMintSigningFilesError)
  }
  if (multisigSigningFiles.length > 0) {
    throw Error(Errors.TooManyMultisigSigningFilesError)
  }
}

const validateMultisigWitnesses = (params: SigningParameters) => {
  const {
    paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles, mintSigningFiles,
  } = filterSigningFiles(params.hwSigningFileData)

  if (paymentSigningFiles.length > 0) {
    throw Error(Errors.TooManyPaymentSigningFilesError)
  }
  if (stakeSigningFiles.length > 0) {
    throw Error(Errors.TooManyStakeSigningFilesError)
  }
  if (poolColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }
  if (!params.unsignedTxParsed.mint && mintSigningFiles.length > 0) {
    throw Error(Errors.TooManyMintSigningFilesError)
  }
}

const validateMultisigSigning = (params: SigningParameters) => {
  validateMultisigWitnesses(params)
  // there are no checks that can be done (except those in validateMultisigWitnesses)
}

const validateWitnessing = (params: SigningParameters): void => {
  // verifies whether the tx and signing files correspond to to each other and to the signing mode
  if (params.unsignedTxParsed.inputs.length === 0) {
    throw Error(Errors.MissingInputError)
  }

  switch (params.signingMode) {
    case SigningMode.ORDINARY_TRANSACTION:
      validateOrdinaryWitnesses(params)
      break

    case SigningMode.POOL_REGISTRATION_AS_OWNER:
      validatePoolOwnerWitnesses(params)
      break

    case SigningMode.POOL_REGISTRATION_AS_OPERATOR:
      validatePoolOperatorWitnesses(params)
      break

    case SigningMode.MULTISIG_TRANSACTION:
      validateMultisigWitnesses(params)
      break

    default:
      throw Error(Errors.Unreachable)
  }
}

const validateSigning = (params: SigningParameters): void => {
  if (params.unsignedTxParsed.inputs.length === 0) {
    throw Error(Errors.MissingInputError)
  }

  switch (params.signingMode) {
    case SigningMode.ORDINARY_TRANSACTION:
      validateOrdinarySigning(params)
      break

    case SigningMode.POOL_REGISTRATION_AS_OWNER:
    case SigningMode.POOL_REGISTRATION_AS_OPERATOR:
      throw Error(Errors.CantSignTxWithPoolRegError)

    case SigningMode.MULTISIG_TRANSACTION:
      validateMultisigSigning(params)
      break

    default:
      throw Error(Errors.Unreachable)
  }
}

export {
  validateSigning,
  validateWitnessing,
}
