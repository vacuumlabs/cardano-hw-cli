// Copy pasted from trezor connect
// because using these enums directly from trezor connect causes them to be undefined during runtime
// TODO: would be nice if we could make these work without redefining them here

export enum CardanoAddressType {
    BASE = 0,
    BASE_SCRIPT_KEY = 1,
    BASE_KEY_SCRIPT = 2,
    BASE_SCRIPT_SCRIPT = 3,
    POINTER = 4,
    POINTER_SCRIPT = 5,
    ENTERPRISE = 6,
    ENTERPRISE_SCRIPT = 7,
    BYRON = 8,
    REWARD = 14,
    REWARD_SCRIPT = 15,
}

export enum CardanoCertificateType {
    STAKE_REGISTRATION = 0,
    STAKE_DEREGISTRATION = 1,
    STAKE_DELEGATION = 2,
    STAKE_POOL_REGISTRATION = 3,
}

export enum CardanoPoolRelayType {
    SINGLE_HOST_IP = 0,
    SINGLE_HOST_NAME = 1,
    MULTIPLE_HOST_NAME = 2,
}

export enum CardanoAuxiliaryDataType {
    BLOB = 0,
    TUPLE = 1,
}

export enum CardanoMetadataType {
    CATALYST_REGISTRATION = 0,
}
