/* eslint-disable no-console */
import * as InteropLib from 'cardano-hw-interop-lib'
import {  TransportHID } from '@keystonehq/hw-transport-usb';
import {Errors} from '../errors'
import {isChainCodeHex, isPubKeyHex, isXPubKeyHex} from '../guards'
import {
    CIP36RegistrationAuxiliaryData,
    CIP36RegistrationMetaDataCborHex,
  TxWitnesses,
  TxWitnessKeys,
} from '../transaction/txTypes'
import {
  BIP32Path,
  CVoteDelegation,
  HexString,
  NativeScript,
  NativeScriptHashKeyHex,
  Network,
  XPubKeyHex,
} from '../basicTypes'
import {
  HwSigningData,
  ParsedShowAddressArguments,
  ParsedSignMessageArguments,
} from '../command-parser/argTypes'
import {
  CryptoProvider,
  NativeScriptDisplayFormat,
  TxSigningParameters,
} from './cryptoProvider'
import Cardano from './keystoneUtils'
import { classifyPath, encodeAddress, encodeCIP36RegistrationMetaData, extractStakePubKeyFromHwSigningData,  formatCIP36RegistrationMetaData, PathTypes, splitXPubKeyCborHex } from './util';
import { TxByronWitnessData, TxShelleyWitnessData } from '../transaction/transaction';
import {encodeCbor, partition} from '../util'
import { KesVKey, OpCertIssueCounter,  SignedOpCertCborHex } from '../opCert/opCert';
import { SignedMessageData } from '../signMessage/signMessage';
import {CardanoSignCip8MessageData} from '@keystonehq/keystone-sdk/dist/types/props'
import { uuid } from 'uuidv4';
import { MessageAddressFieldType } from '@keystonehq/bc-ur-registry-cardano';
const {bech32,blake2b} = require('cardano-crypto.js')
const failedMsg = (e: unknown): string => `The requested operation failed. \
Check that your Keystone device is connected.
Details: ${e}`

const WALLET_NAME = "cardano_cli_wallet"
export const KeystoneCryptoProvider: (
  transport: TransportHID,
  // eslint-disable-next-line require-await
) => Promise<CryptoProvider> = async (transport) => {
  let  keystone = new Cardano(transport)

  const getVersion = async (): Promise<string> => {
    try {
      const result = await keystone.getDeviceInfo()
      return `Keystone app version ${result.firmwareVersion}`
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const showAddress = async ({
    paymentPath,
    paymentScriptHash,
    stakingPath,
    stakingScriptHash,
    address,
  }: ParsedShowAddressArguments): Promise<void> => {
    console.log('showAddress function parameters:');
    console.log('paymentPath:', JSON.stringify(paymentPath, null, 2));
    console.log('paymentScriptHash:', paymentScriptHash);
    console.log('stakingPath:', JSON.stringify(stakingPath, null, 2));
    console.log('stakingScriptHash:', stakingScriptHash);
    console.log('address:', address);
    throw Error(Errors.Keystone3ProShowAddress)
  }


  function bip32PathToString(path: BIP32Path): string {
    return `m/${  path.map((element, index) => {
      // add ' for first three elements
      if (index < 3) {
        return `${element- 2147483648}'`;
      }
      return element.toString();
    }).join('/')}`;
  }

  const getXPubKeys = async (paths: BIP32Path[]): Promise<XPubKeyHex[]> => {
    try {
      const stringPaths: string[] = []
      for (const path of paths) {
        stringPaths.push(bip32PathToString(path))
      }
      const xPubKeys = await keystone.getExtendedPublicKeys(stringPaths);
      const xPubKeysHex:XPubKeyHex[] = []
      xPubKeys.forEach((xPubKey) => {
        if (!isPubKeyHex(xPubKey.publicKey) || !isChainCodeHex(xPubKey.chainCode)) {
            throw Error(Errors.InternalInvalidTypeError)
        }
        const xPubKeyHex = xPubKey.publicKey + xPubKey.chainCode;
        if (!isXPubKeyHex(xPubKeyHex)) {
            throw Error(Errors.InternalInvalidTypeError)
        }
        xPubKeysHex.push(xPubKeyHex)
      })
      return xPubKeysHex
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }

  const createWitnesses = (
    keystoneSignatureHex: string,
    signingFiles: HwSigningData[],
  ): TxWitnesses => {
    const witnessesWithKeys = signingFiles.map((signingFile) => {
      const {pubKey, chainCode} = splitXPubKeyCborHex(
        signingFile.cborXPubKeyHex,
      )
      return {
        path: signingFile.path,
        signature: Buffer.from(keystoneSignatureHex, 'hex'),
        pubKey,
        chainCode,
      }
    })
    const [byronWitnesses, shelleyWitnesses] = partition(
      witnessesWithKeys,
      (witness) =>
        classifyPath(witness.path) === PathTypes.PATH_WALLET_SPENDING_KEY_BYRON,
    )

    return {
      byronWitnesses: byronWitnesses.map((witness) => ({
        key: TxWitnessKeys.BYRON,
        data: TxByronWitnessData(
          witness.pubKey,
          witness.signature,
          witness.chainCode,
          {},
        ),
        path: witness.path,
      })),
      shelleyWitnesses: shelleyWitnesses.map((witness) => ({
        key: TxWitnessKeys.SHELLEY,
        data: TxShelleyWitnessData(witness.pubKey, witness.signature),
        path: witness.path,
      })),
    }
  }
  const witnessTx = async (
    params: TxSigningParameters,
    _changeOutputFiles: HwSigningData[],
  ): Promise<TxWitnesses> => {
    try {
      const {walletMFP} = (await keystone.getDeviceInfo())
      const { tx, hwSigningFileData} = params
      const hdPaths:string[] = []
      hwSigningFileData.forEach((data) => {
        hdPaths.push(bip32PathToString(data.path))
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const utxos:any[] = []
      const outputs = tx.body.outputs;
      tx.body.inputs.items.forEach((input, index) => {
        utxos.push({
          transactionHash: input.transactionId.toString('hex'),
          index: input.index,
          amount: outputs[index].amount.coin.toString(),
          xfp: walletMFP,
          hdPath:hdPaths[index],
          address:encodeAddress(outputs[index].address)
        })
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      keystone = new Cardano(transport,walletMFP)
      // eslint-disable-next-line no-undef
      const witnesses = await keystone.signCardanoTransaction({
        signData:InteropLib.encodeTx(tx),
        utxos,
        extraSigners: []
      })

      return createWitnesses(witnesses.signature.toString('hex'), hwSigningFileData)
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }
 
  const signCIP36RegistrationMetaData = async (
    delegations: CVoteDelegation[],
    hwStakeSigningFile: HwSigningData, 
    paymentAddressBech32: string, 
    nonce: bigint,
    votingPurpose: bigint,
    _network: Network, 
    _paymentAddressSigningFiles: HwSigningData[], 
  ): Promise<CIP36RegistrationMetaDataCborHex> => {
    const serializedDelegations: [Buffer, bigint][] = delegations.map(
      ({votePublicKey, voteWeight}) => [
        Buffer.from(votePublicKey, 'hex'),
        voteWeight,
      ],
    )
    const {walletMFP} = (await keystone.getDeviceInfo())
    const keystoneDelegations = delegations.map((delegation) => ({
      pubKey: delegation.votePublicKey,
      weight: Number(delegation.voteWeight),
    }))
    const {data: address}: {data: Buffer} = bech32.decode(paymentAddressBech32)

    const stakePubHex = extractStakePubKeyFromHwSigningData(hwStakeSigningFile)

    const cardanoCatalystVotingRequest = {
        requestId: uuid(),
        path: bip32PathToString(hwStakeSigningFile.path),
        delegations: keystoneDelegations,
        stakePub: stakePubHex,
        paymentAddress: address.toString('hex'),
        nonce: Number(nonce),
        voting_purpose: Number(votingPurpose),
        xfp: walletMFP,
        origin: WALLET_NAME
    }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      keystone = new Cardano(transport,walletMFP)
      const result = await keystone.signCardanoCatalystRequest(cardanoCatalystVotingRequest)
      try {
        const metadata = formatCIP36RegistrationMetaData(
            serializedDelegations,
            Buffer.from(stakePubHex, 'hex'),
            address,
            nonce,
            votingPurpose,
            result.signature,
          )
          // we serialize the entire (Mary-era formatted) auxiliary data only to check that its hash
          // matches the hash computed by the HW wallet
          const auxiliaryData: CIP36RegistrationAuxiliaryData = [metadata, []]
          const auxiliaryDataCbor = encodeCbor(auxiliaryData)
          const auxiliaryDataHashHex = blake2b(auxiliaryDataCbor, 32).toString('hex')
        return encodeCIP36RegistrationMetaData(
          delegations,
          hwStakeSigningFile,
          address,
          nonce,
          votingPurpose,
          auxiliaryDataHashHex,
          result.signature.toString('hex') as HexString,
        )
      } catch (err) {
        throw Error(failedMsg(err))
      }
  }

  const signOperationalCertificate = async (
    _kesVKey: KesVKey,
    _kesPeriod: bigint,
    _issueCounter: OpCertIssueCounter,
    _signingFile: HwSigningData[],
    // eslint-disable-next-line require-await
  ): Promise<SignedOpCertCborHex> => {
    throw Error(Errors.UnsupportedCryptoProviderCall)
  }
  
  // https://github.com/input-output-hk/cardano-js-sdk/blob/master/packages/key-management/src/cip8/cip30signData.ts#L52
  const signMessage = async (
    args: ParsedSignMessageArguments,
  ): Promise<SignedMessageData> => {
    const {walletMFP} = (await keystone.getDeviceInfo())
    const {hwSigningFileData} = args
    const {pubKey} = splitXPubKeyCborHex(
        hwSigningFileData.cborXPubKeyHex,
      )
      const cardanoSignCip8DataRequest = {
        requestId: uuid(), 
        xfp: walletMFP,
        messageHex: args.messageHex,
        hashPayload: args.hashPayload,
        preferHexDisplay: args.preferHexDisplay,
        xpub: pubKey.toString('hex'),
        path: bip32PathToString(hwSigningFileData.path),
        origin: WALLET_NAME,
        signingPath: bip32PathToString(hwSigningFileData.path),
    }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let keystoneArgs: CardanoSignCip8MessageData 
      if (args.address !== undefined) {
        keystoneArgs = {
          ...cardanoSignCip8DataRequest,
          addressFieldType: MessageAddressFieldType.ADDRESS,
          address:args.address,
        }
      } else {
        keystoneArgs = {
          ...cardanoSignCip8DataRequest,
          addressFieldType: MessageAddressFieldType.KEY_HASH,
        }
      }
      

    try {
      keystone = new Cardano(transport,walletMFP)
      const response = await keystone.signCardanoCip8DataTransaction(keystoneArgs)
      return {
        signatureHex: response.signature, 
        signingPublicKeyHex: pubKey.toString('hex'),
        addressFieldHex: response.addressFieldHex
      } as SignedMessageData
    } catch (err) {
      throw Error(failedMsg(err))
    }
  }
  
  
  const deriveNativeScriptHash = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nativeScript: NativeScript,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    signingFiles: HwSigningData[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    displayFormat: NativeScriptDisplayFormat,
  ): Promise<NativeScriptHashKeyHex> => {
    throw Error(Errors.Keystone3ProUnsupportedThisCommand)
}

  return {
    showAddress,
    getVersion,
    witnessTx,
    getXPubKeys,
    signCIP36RegistrationMetaData,
    signOperationalCertificate,
    signMessage,
    deriveNativeScriptHash
  }
}
