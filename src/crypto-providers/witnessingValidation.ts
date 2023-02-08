import {
  CertificateType,
  TransactionBody,
  Uint,
} from 'cardano-hw-interop-lib'
import { Errors } from '../errors'
import { HwSigningData } from '../basicTypes'
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

const validatePlutusWitnesses = (body: TransactionBody, hwSigningFileData: HwSigningData[]) => {
  const { poolColdSigningFiles } = filterSigningFiles(hwSigningFileData)

  if (poolColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }
}

const validateNetworkId = (cliNetworkId: number, bodyNetworkId: Uint | undefined): void => {
  if (bodyNetworkId !== undefined && bodyNetworkId !== cliNetworkId) {
    throw Error(Errors.NetworkIdMismatchError)
  }
}

const validateWitnessing = (params: SigningParameters): void => {
  // verifies whether signing parameters correspond to each other
  const { body } = params.tx
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

export {
  validateWitnessing,
}
