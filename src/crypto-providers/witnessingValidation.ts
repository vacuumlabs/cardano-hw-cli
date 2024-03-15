import {
  CertificateType,
  TransactionBody,
  Uint,
  VoterType,
} from 'cardano-hw-interop-lib'
import {Errors} from '../errors'
import {HwSigningData} from '../command-parser/argTypes'
import {SigningMode, TxSigningParameters} from './cryptoProvider'
import {filterSigningFiles} from './util'

const _countWitnessableItemsForOrdinaryMode = (body: TransactionBody) => {
  let numDRepItems = 0
  let numCommitteeColdItems = 0
  let numCommitteeHotItems = 0
  let numPoolColdItems = 0

  body.certificates?.items.forEach((cert) => {
    switch (cert.type) {
      case CertificateType.POOL_RETIREMENT:
        numPoolColdItems += 1
        break

      case CertificateType.DREP_REGISTRATION:
      case CertificateType.DREP_DEREGISTRATION:
      case CertificateType.DREP_UPDATE:
        numDRepItems += 1
        break

      case CertificateType.AUTHORIZE_COMMITTEE_HOT:
      case CertificateType.RESIGN_COMMITTEE_COLD:
        numCommitteeColdItems += 1
        break

      default:
        break
    }
  })

  body.votingProcedures?.forEach((vv) => {
    switch (vv.voter.type) {
      case VoterType.DREP_KEY:
        numDRepItems += 1
        break

      case VoterType.COMMITTEE_KEY:
        numCommitteeHotItems += 1
        break

      case VoterType.STAKE_POOL:
        numPoolColdItems += 1
        break

      default:
        break
    }
  })
  return {
    numDRepItems,
    numCommitteeColdItems,
    numCommitteeHotItems,
    numPoolColdItems,
  }
}

const validateOrdinaryWitnesses = (
  body: TransactionBody,
  hwSigningFileData: HwSigningData[],
) => {
  const {
    dRepSigningFiles,
    committeeColdSigningFiles,
    committeeHotSigningFiles,
    poolColdSigningFiles,
    mintSigningFiles,
    multisigSigningFiles,
  } = filterSigningFiles(hwSigningFileData)

  const {
    numDRepItems,
    numCommitteeColdItems,
    numCommitteeHotItems,
    numPoolColdItems,
  } = _countWitnessableItemsForOrdinaryMode(body)

  if (numDRepItems === 0 && dRepSigningFiles.length > 0) {
    throw Error(Errors.TooManyDRepSigningFilesError)
  }
  if (numCommitteeColdItems === 0 && committeeColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyCommitteeColdSigningFilesError)
  }
  if (numCommitteeHotItems === 0 && committeeHotSigningFiles.length > 0) {
    throw Error(Errors.TooManyCommitteeHotSigningFilesError)
  }
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

const validatePoolOwnerWitnesses = (
  body: TransactionBody,
  hwSigningFileData: HwSigningData[],
) => {
  const {
    paymentSigningFiles,
    stakeSigningFiles,
    dRepSigningFiles,
    committeeColdSigningFiles,
    committeeHotSigningFiles,
    poolColdSigningFiles,
    mintSigningFiles,
    multisigSigningFiles,
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

  if (dRepSigningFiles.length > 0) {
    throw Error(Errors.TooManyDRepSigningFilesError)
  }
  if (committeeColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyCommitteeColdSigningFilesError)
  }
  if (committeeHotSigningFiles.length > 0) {
    throw Error(Errors.TooManyCommitteeHotSigningFilesError)
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

const validatePoolOperatorWitnesses = (
  body: TransactionBody,
  hwSigningFileData: HwSigningData[],
) => {
  const {
    stakeSigningFiles,
    dRepSigningFiles,
    committeeColdSigningFiles,
    committeeHotSigningFiles,
    poolColdSigningFiles,
    mintSigningFiles,
    multisigSigningFiles,
  } = filterSigningFiles(hwSigningFileData)

  if (stakeSigningFiles.length > 0) {
    throw Error(Errors.TooManyStakeSigningFilesError)
  }
  if (dRepSigningFiles.length > 0) {
    throw Error(Errors.TooManyDRepSigningFilesError)
  }
  if (committeeColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyCommitteeColdSigningFilesError)
  }
  if (committeeHotSigningFiles.length > 0) {
    throw Error(Errors.TooManyCommitteeHotSigningFilesError)
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

const validateMultisigWitnesses = (
  body: TransactionBody,
  hwSigningFileData: HwSigningData[],
) => {
  const {
    paymentSigningFiles,
    stakeSigningFiles,
    dRepSigningFiles,
    committeeColdSigningFiles,
    committeeHotSigningFiles,
    poolColdSigningFiles,
    mintSigningFiles,
  } = filterSigningFiles(hwSigningFileData)

  if (paymentSigningFiles.length > 0) {
    throw Error(Errors.TooManyPaymentSigningFilesError)
  }
  if (stakeSigningFiles.length > 0) {
    throw Error(Errors.TooManyStakeSigningFilesError)
  }
  if (dRepSigningFiles.length > 0) {
    throw Error(Errors.TooManyDRepSigningFilesError)
  }
  if (committeeColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyCommitteeColdSigningFilesError)
  }
  if (committeeHotSigningFiles.length > 0) {
    throw Error(Errors.TooManyCommitteeHotSigningFilesError)
  }
  if (poolColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }
  if (!body.mint?.length && mintSigningFiles.length > 0) {
    throw Error(Errors.TooManyMintSigningFilesError)
  }
}

const validatePlutusWitnesses = (
  body: TransactionBody,
  hwSigningFileData: HwSigningData[],
) => {
  const {poolColdSigningFiles} = filterSigningFiles(hwSigningFileData)

  if (poolColdSigningFiles.length > 0) {
    throw Error(Errors.TooManyPoolColdSigningFilesError)
  }
}

const validateNetworkId = (
  cliNetworkId: number,
  bodyNetworkId: Uint | undefined,
): void => {
  if (bodyNetworkId !== undefined && bodyNetworkId !== cliNetworkId) {
    throw Error(Errors.NetworkIdMismatchError)
  }
}

const validateWitnessing = (params: TxSigningParameters): void => {
  // verifies whether signing parameters correspond to each other
  const {body} = params.tx
  const {hwSigningFileData} = params

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

export {validateWitnessing}
