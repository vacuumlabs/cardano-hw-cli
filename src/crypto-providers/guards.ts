import {
  _Certificate,
  _StakepoolRegistrationCert,
  _StakingKeyRegistrationCert,
  TxCertificateKeys,
  _StakingKeyDeregistrationCert,
  _DelegationCert,
} from '../transaction/types'

export const isStakingKeyDeregistrationCertificate = (
  cert: _Certificate,
): cert is _StakingKeyDeregistrationCert => cert.type === TxCertificateKeys.STAKING_KEY_DEREGISTRATION

export const isStakingKeyRegistrationCertificate = (
  cert: _Certificate,
): cert is _StakingKeyRegistrationCert => cert.type === TxCertificateKeys.STAKING_KEY_REGISTRATION

export const isDelegationCertificate = (
  cert: _Certificate,
): cert is _DelegationCert => cert.type === TxCertificateKeys.DELEGATION

export const isStakepoolRegistrationCertificate = (
  cert: _Certificate,
): cert is _StakepoolRegistrationCert => cert.type === TxCertificateKeys.STAKEPOOL_REGISTRATION
