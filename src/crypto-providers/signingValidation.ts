import {
  CertificateType,
  TransactionBody,
  Uint,
} from 'cardano-hw-interop-lib'
import { Errors } from '../errors'
import { HwSigningData } from '../types'
import {
  SigningMode,
  SigningParameters,
} from './types'
import {
  filterSigningFiles,
} from './util'

const _countWitnessableItems = (body: TransactionBody) => {
  // we count stake registrations separately because they don't necessarily require a staking witness
  let numStakeRegistrationItems = 0
  let numStakeOtherItems = body.withdrawals?.length || 0
  let numPoolColdItems = 0
  body.certificates?.forEach((cert) => {
    switch (cert.type) {
      case CertificateType.STAKE_REGISTRATION:
        numStakeRegistrationItems += 1
        break

      case CertificateType.STAKE_DEREGISTRATION:
      case CertificateType.STAKE_DELEGATION:
        numStakeOtherItems += 1
        break

      case CertificateType.POOL_RETIREMENT:
        numPoolColdItems += 1
        break

      default:
        break
    }
  })
  return { numStakeRegistrationItems, numStakeOtherItems, numPoolColdItems }
}

const validateOrdinaryWitnesses = (body: TransactionBody, hwSigningFileData: HwSigningData[]) => {
  const {
    poolColdSigningFiles, mintSigningFiles, multisigSigningFiles,
  } = filterSigningFiles(hwSigningFileData)

  const { numPoolColdItems } = _countWitnessableItems(body)

  if (numPoolColdItems === 0 && poolColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }
  if (!body.mint?.length && mintSigningFiles.length > 0) {
    throw Error(Errors.TooManyMintSigningFilesError)
  }
  if (multisigSigningFiles.length > 0) {
    throw Error(Errors.TooManyMultisigSigningFilesError)
  }
}

const validateOrdinarySigning = (body: TransactionBody, hwSigningFileData: HwSigningData[]) => {
  validateOrdinaryWitnesses(body, hwSigningFileData)
  // these checks should be performed only with createSignedTx call (when the signing file set is
  // expected to be complete) on top of validateOrdinaryWitnesses

  const {
    paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles,
  } = filterSigningFiles(hwSigningFileData)

  if (paymentSigningFiles.length === 0) {
    throw Error(Errors.MissingPaymentSigningFileError)
  }

  const {
    numStakeOtherItems, numPoolColdItems,
  } = _countWitnessableItems(body)

  if (numStakeOtherItems > 0 && (stakeSigningFiles.length === 0)) {
    throw Error(Errors.MissingStakeSigningFileError)
  }
  if (numPoolColdItems > 0 && (poolColdSigningFiles.length === 0)) {
    throw Error(Errors.MissingPoolColdSigningFileError)
  }
}

const validatePoolOwnerWitnesses = (body: TransactionBody, hwSigningFileData: HwSigningData[]) => {
  const {
    paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles, mintSigningFiles, multisigSigningFiles,
  } = filterSigningFiles(hwSigningFileData)

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

const validatePoolOperatorWitnesses = (body: TransactionBody, hwSigningFileData: HwSigningData[]) => {
  const {
    stakeSigningFiles, poolColdSigningFiles, mintSigningFiles, multisigSigningFiles,
  } = filterSigningFiles(hwSigningFileData)

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

const validateMultisigWitnesses = (body: TransactionBody, hwSigningFileData: HwSigningData[]) => {
  const {
    paymentSigningFiles, stakeSigningFiles, poolColdSigningFiles, mintSigningFiles,
  } = filterSigningFiles(hwSigningFileData)

  if (paymentSigningFiles.length > 0) {
    throw Error(Errors.TooManyPaymentSigningFilesError)
  }
  if (stakeSigningFiles.length > 0) {
    throw Error(Errors.TooManyStakeSigningFilesError)
  }
  if (poolColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }
  if (!body.mint?.length && mintSigningFiles.length > 0) {
    throw Error(Errors.TooManyMintSigningFilesError)
  }
}

const validateMultisigSigning = (body: TransactionBody, hwSigningFileData: HwSigningData[]) => {
  validateMultisigWitnesses(body, hwSigningFileData)
  // there are no checks that can be done (except those in validateMultisigWitnesses)
}

const validatePlutusWitnesses = (body: TransactionBody, hwSigningFileData: HwSigningData[]) => {
  const { poolColdSigningFiles } = filterSigningFiles(hwSigningFileData)

  if (poolColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }
}

const validatePlutusSigning = (body: TransactionBody, hwSigningFileData: HwSigningData[]) => {
  validatePlutusWitnesses(body, hwSigningFileData)
  // there are no checks that can be done (except those in validatePlutusWitnesses)
}

const validateNetworkId = (cliNetworkId: number, bodyNetworkId: Uint | undefined): void => {
  if (bodyNetworkId !== undefined && bodyNetworkId !== cliNetworkId) {
    throw Error(Errors.NetworkIdMismatchError)
  }
}

const validateWitnessing = (params: SigningParameters): void => {
  // verifies whether signing parameters correspond to each other
  const body = (params.rawTx?.body ?? params.tx?.body)!
  const { hwSigningFileData } = params

  validateNetworkId(params.network.networkId, body.networkId)

  switch (params.signingMode) {
    case SigningMode.ORDINARY_TRANSACTION:
      validateOrdinaryWitnesses(body, hwSigningFileData)
      break

    case SigningMode.POOL_REGISTRATION_AS_OWNER:
      validatePoolOwnerWitnesses(body, hwSigningFileData)
      break

    case SigningMode.POOL_REGISTRATION_AS_OPERATOR:
      validatePoolOperatorWitnesses(body, hwSigningFileData)
      break

    case SigningMode.MULTISIG_TRANSACTION:
      validateMultisigWitnesses(body, hwSigningFileData)
      break

    case SigningMode.PLUTUS_TRANSACTION:
      validatePlutusWitnesses(body, hwSigningFileData)
      break

    default:
      throw Error(Errors.Unreachable)
  }
}

const validateSigning = (params: SigningParameters): void => {
  const body = (params.rawTx?.body ?? params.tx?.body)!
  const { hwSigningFileData } = params

  validateNetworkId(params.network.networkId, body.networkId)

  switch (params.signingMode) {
    case SigningMode.ORDINARY_TRANSACTION:
      validateOrdinarySigning(body, hwSigningFileData)
      break

    case SigningMode.POOL_REGISTRATION_AS_OWNER:
    case SigningMode.POOL_REGISTRATION_AS_OPERATOR:
      throw Error(Errors.CantSignTxWithPoolRegError)

    case SigningMode.MULTISIG_TRANSACTION:
      validateMultisigSigning(body, hwSigningFileData)
      break

    case SigningMode.PLUTUS_TRANSACTION:
      validatePlutusSigning(body, hwSigningFileData)
      break

    default:
      throw Error(Errors.Unreachable)
  }
}

export {
  validateSigning,
  validateWitnessing,
}
