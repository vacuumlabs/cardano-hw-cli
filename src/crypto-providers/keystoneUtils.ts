import {
    QRHardwareCall, CryptoKeypath, PathComponent, KeyDerivation, KeyDerivationSchema, Curve,
    DerivationAlgorithm, QRHardwareCallType, CryptoMultiAccounts, QRHardwareCallVersion,
} from '@keystonehq/bc-ur-registry';
import { UR, UREncoder, URDecoder } from '@ngraveio/bc-ur';
import { Actions, TransportHID } from '@keystonehq/hw-transport-usb';
import { throwTransportError, Status } from '@keystonehq/hw-transport-error';
import KeystoneSDK, { CardanoCatalystRequestProps, CardanoSignCip8MessageData, CardanoSignDataRequestProps } from "@keystonehq/keystone-sdk"
import * as TxTypes from 'cardano-hw-interop-lib'
const pathToKeypath = (path: string): CryptoKeypath => {
    const paths = path.replace(/[m|M]\//, '').split('/');
    const pathComponents = paths.map(path => {
        const index = parseInt(path.replace('\'', ''), 10);
        const isHardened = path.endsWith('\'');
        return new PathComponent({ index, hardened: isHardened });
    });
    return new CryptoKeypath(pathComponents);
};
const parseResponoseUR = (urPlayload: string): UR => {
    const decoder = new URDecoder();
    decoder.receivePart(urPlayload);
    if (!decoder.isComplete()) {
        throwTransportError(Status.ERR_UR_INCOMPLETE);
    }
    const resultUR = decoder.resultUR();
    return resultUR;
};

export default class Cardano {
    private transport: TransportHID;
    private mfp: string | undefined;

    /**
     * Constructs a new instance of the class.
     *
     * @param transport - An object of type TransportWebUSB
     * @param mfp - Optional parameter of type string, default is undefined, but the mfp should exist in the signing process.
     */
    constructor(transport: TransportHID, mfp?: string) {
        this.transport = transport;
        if (mfp) {
            this.mfp = mfp;
        }
    }

    private precheck() {
        if (!this.transport) {
            throwTransportError(Status.ERR_TRANSPORT_HAS_NOT_BEEN_SET);
        }
        if (!this.mfp) {
            throw new Error('missing mfp for this wallet');
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async sendToDevice(actions: Actions, data: any): Promise<any> {
        return this.transport.send(actions, data);
    }

    private async checkDeviceLockStatus(): Promise<boolean> {
        const result = await this.sendToDevice(Actions.CMD_CHECK_LOCK_STATUS, '');
        return result.payload;
    }
    async getDeviceInfo(): Promise<{firmwareVersion: string, walletMFP: string}> {
        const result = await this.sendToDevice(Actions.CMD_GET_DEVICE_VERSION, '');
        return Promise.resolve(result)
    }

    async getExtendedPublicKeys(paths: string[]): Promise<{ publicKey: string, mfp: string, chainCode: string }[]> {
        // Send a request to the device to get the address at the specified path
        const curve = Curve.ed25519;
        const algo = DerivationAlgorithm.bip32ed25519;
        const schemas = [];
        for (const path of paths) {
            const kds = new KeyDerivationSchema(pathToKeypath(path), curve, algo, 'ADA');
            schemas.push(kds);
        }
        const keyDerivation = new KeyDerivation(schemas);
        const hardwareCall = new QRHardwareCall(QRHardwareCallType.KeyDerivation, keyDerivation, 'Keystone USB SDK', QRHardwareCallVersion.V1);
        const ur = hardwareCall.toUR();
        const encodedUR = new UREncoder(ur, Infinity).nextPart().toUpperCase();

        const response = await this.sendToDevice(Actions.CMD_RESOLVE_UR, encodedUR);
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const resultUR = parseResponoseUR(response.payload);

        const account = CryptoMultiAccounts.fromCBOR(resultUR.cbor);

        const keys = account.getKeys();
        const result = []
        for (const key of keys) {
            result.push({
                publicKey: key.getKey().toString('hex'),
                mfp: account.getMasterFingerprint().toString('hex'),
                chainCode: key.getChainCode().toString('hex')
            })
         }
         return result
    }

    private prepareInput = (
        _input: TxTypes.TransactionInput,
      ): CardanoSignDataRequestProps => {
        // *  const cardanoSignDataRequest = {
        // *      requestId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        // *      path: 'm/1852\'/1815\'/0\'/0/0',
        // *      xfp: '52744703',
        // *      pubKey: 'ca0e65d9bb8d0dca5e88adc5e1c644cc7d62e5a139350330281ed7e3a6938d2c',
        // *      sigStructure: '846a5369676e6174757265315882a301270458390069fa1bd9338574702283d8fb71f8cce1831c3ea4854563f5e4043aea33a4f1f468454744b2ff3644b2ab79d48e76a3187f902fe8a1bcfaad676164647265737358390069fa1bd9338574702283d8fb71f8cce1831c3ea4854563f5e4043aea33a4f1f468454744b2ff3644b2ab79d48e76a3187f902fe8a1bcfaad4043abc123',
        // *      origin: 'cardano-wallet',
        // *   };
        return {
            requestId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
            path: 'm/1852\'/1815\'/0\'/0/0',
            xfp: '52744703',
            pubKey: 'ca0e65d9bb8d0dca5e88adc5e1c644cc7d62e5a139350330281ed7e3a6938d2c',
            sigStructure: '846a5369676e6174757265315882a301270458390069fa1bd9338574702283d8fb71f8cce1831c3ea4854563f5e4043aea33a4f1f468454744b2ff3644b2ab79d48e76a3187f902fe8a1bcfaad676164647265737358390069fa1bd9338574702283d8fb71f8cce1831c3ea4854563f5e4043aea33a4f1f468454744b2ff3644b2ab79d48e76a3187f902fe8a1bcfaad4043abc123',
            origin: 'cardano-wallet',
        }
      }

    /**
     * Signs a Cardano data transaction.
     * 
     * @param props - The properties for the Cardano data transaction.
     * @returns A Promise that resolves to an object containing the signature.
     * @throws Will throw an error if the device communication fails or if the response cannot be parsed.
     * 
     * @example 
     *  const cardanoSignDataRequest = {
     *      requestId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
     *      path: 'm/1852\'/1815\'/0\'/0/0',
     *      xfp: '52744703',
     *      pubKey: 'ca0e65d9bb8d0dca5e88adc5e1c644cc7d62e5a139350330281ed7e3a6938d2c',
     *      sigStructure: '846a5369676e6174757265315882a301270458390069fa1bd9338574702283d8fb71f8cce1831c3ea4854563f5e4043aea33a4f1f468454744b2ff3644b2ab79d48e76a3187f902fe8a1bcfaad676164647265737358390069fa1bd9338574702283d8fb71f8cce1831c3ea4854563f5e4043aea33a4f1f468454744b2ff3644b2ab79d48e76a3187f902fe8a1bcfaad4043abc123',
     *      origin: 'cardano-wallet',
     *   };
    * */
    async signCardanoDataTransaction(
       props: CardanoSignDataRequestProps
      ): Promise<{ signature: Buffer }>{
        this.precheck();
        const keystoneSDK = new KeystoneSDK();
        const ur = keystoneSDK.cardano.generateSignDataRequest(props);
        const encodedUR = new UREncoder(ur, Infinity).nextPart().toUpperCase();
        const response = await this.sendToDevice(Actions.CMD_RESOLVE_UR, encodedUR);
        const resultUR = parseResponoseUR(response.payload);
        // parse signature
        const signature = keystoneSDK.cardano.parseSignDataSignature(resultUR);
        return {
            signature:Buffer.from(signature.signature, 'hex'),
        };
    }

    /**
     * Signs a Cardano transaction.
     * 
     * @param props - The properties for the Cardano transaction.
     * @returns A Promise that resolves to an object containing the signature.
     * @throws Will throw an error if the device communication fails or if the response cannot be parsed.
     * 
     * @example 
     *  const cardanoSignRequest = {
     *       requestId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
     *      signData: Buffer.from('84a400828258204e3a6e7fdcb0d0efa17bf79c13aed2b4cb9baf37fb1aa2e39553d5bd720c5c99038258204e3a6e7fdcb0d0efa17bf79c13aed2b4cb9baf37fb1aa2e39553d5bd720c5c99040182a200581d6179df4c75f7616d7d1fd39cbc1a6ea6b40a0d7b89fea62fc0909b6c370119c350a200581d61c9b0c9761fd1dc0404abd55efc895026628b5035ac623c614fbad0310119c35002198ecb0300a0f5f6', 'hex'),
     *      utxos: [
     *          {
     *               transactionHash:
     *                   '4e3a6e7fdcb0d0efa17bf79c13aed2b4cb9baf37fb1aa2e39553d5bd720c5c99',
     *               index: 3,
     *               amount: '10000000',
     *               xfp: '73c5da0a',
     *               hdPath: 'm/1852\'/1815\'/0\'/0/0',
     *               address:
     *                   'addr1qy8ac7qqy0vtulyl7wntmsxc6wex80gvcyjy33qffrhm7sh927ysx5sftuw0dlft05dz3c7revpf7jx0xnlcjz3g69mq4afdhv',
     *           },
     *           {
     *               transactionHash:
     *                   '4e3a6e7fdcb0d0efa17bf79c13aed2b4cb9baf37fb1aa2e39553d5bd720c5c99',
     *               index: 4,
     *               amount: '18020000',
     *               xfp: '73c5da0a',
     *               hdPath: 'm/1852\'/1815\'/0\'/0/1',
     *               address:
     *                   'addr1qyz85693g4fr8c55mfyxhae8j2u04pydxrgqr73vmwpx3azv4dgkyrgylj5yl2m0jlpdpeswyyzjs0vhwvnl6xg9f7ssrxkz90',
     *           },
     *       ],
     *       extraSigners: [
     *           {
     *               keyHash: 'e557890352095f1cf6fd2b7d1a28e3c3cb029f48cf34ff890a28d176',
     *               xfp: '73c5da0a',
     *               keyPath: 'm/1852\'/1815\'/0\'/2/0',
     *           },
     *       ],
     *       requestId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
     *       origin: 'cardano-wallet',
     *   }; 
     * 
     * */
    async signCardanoTransaction({
        signData,
        utxos,
        extraSigners,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }: {signData:Buffer, utxos:any, extraSigners:any}):Promise<{ signature: Buffer}>{
        const requestId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
        const origin = 'cardano-wallet';
        this.precheck();
        const keystoneSDK = new KeystoneSDK();
        const ur = keystoneSDK.cardano.generateSignRequest({
            signData,
            utxos,
            extraSigners,
            requestId,
            origin,
        });
        const encodedUR = new UREncoder(ur, Infinity).nextPart().toUpperCase();
        // const encodedUR = "UR:CARDANO-SIGN-REQUEST/ONADTPDAGDJSKKOLMERPCPGLDMMTLOMNFLRTIOBWVYAOHDVYLROLAELYLFHDCXTTEERPOLOLFGLGDPWMDLRFATWTLEHLWDMWJOGRVSPKMOCFCWPALPEEBSREJTFRGSAEADLFLFHDESADLGTDUODMDPSOPDDRPDEMTNHDKGQDWLMOGUIADIWFNEJYHEKOFLEHZOCXHFSFGMOYJZOYHPDALEVLVAGEZMBKLDBTAHRKBNJOOSRKFWDWVLYLLSLTCYAEBSFWFZLFHDESADINZSCWTAEOLPJYJOCPLSTPZOJSYASFVYLSCEFMOXLPFEIAYKVEAAFTWDEOOXWNWKISFEFLFYPRZMENFYPRPYKKTYMNKOOTCSLBMHDLVSOYRFZSPMCYAEDNWSSOAOCYAEAOPTHSAXCYAYDIRFETAHOYHDCAVYEOOXWNWKISFEFLFYPRZMENFYPRPYKKTYMNKOOTCSLBMHDLVSOYRFZSPMCFEMVOAYAENBYKYNAXLYTAAYNLONADHDCXTTEERPOLOLFGLGDPWMDLRFATWTLEHLWDMWJOGRVSPKMOCFCWPALPEEBSREJTFRGSAOAEAXIOEEDYEOESECENDYAATAADDYOEADLECFATFNYKCFATCHYKAEYKAEWKAEWKAOCYGMJYFLAXAHKSIOHSIEIEJPEHJSESECJZECKSEMIHKSKTKNISIOKPJOKNJKDYKODYJEKPDYIAIHJTJKIAKSETJOEMECIMKNECEYIAJZEEKPJKKNJPEEENEOJTECJTIAJZIOENKNESIOHSKNJYESJZIHJEIOIMIHEYJEEMKTECEOIHJNEYKSKSJPJZIMJSISEMEOIOIEKPJZEYJEJKESKNKSIMEEIEAALYTAAYNSOEADHDCEEOOXWNWKISFEFLFYPRZMENFYPRPYKKTYMNKOOTCSLBMHDLVSOYRFZSPMAOTAADDYOEADLECFATFNYKCFATCHYKAEYKAOWKAEWKAOCYGMJYFLAXAHIYIHJYIHJPJTJZFXWYHTCH";
        // console.log("========== encodedUR ===========")
        const response = await this.sendToDevice(Actions.CMD_RESOLVE_UR, encodedUR);
        const resultUR = parseResponoseUR(response.payload);
        // parse signature
        const cardanoSignResult = keystoneSDK.cardano.parseSignature(resultUR);
        const witnessSet = cardanoSignResult.witnessSet
        // split 32 bytes
        const signature = witnessSet.slice(-128)
        return {
            signature:Buffer.from(signature, 'hex'),
        };
    }
    /**
     * Signs a Cardano catalyst request.
     * 
     * @param props - The properties for the Cardano catalyst request.
     * @returns A Promise that resolves to an object containing the signature.
     * @throws Will throw an error if the device communication fails or if the response cannot be parsed.
     * 
     * @example 
     *   const cardanoCatalystVotingRequest = {
     *       requestId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
     *       path: 'm/1852\'/1815\'/0\'/2/0',
     *       delegations: [{
     *           pubKey: 'a6a3c0447aeb9cc54cf6422ba32b294e5e1c3ef6d782f2acff4a70694c4d1663',
     *           weight: 1,
     *       }],
     *       stakePub: 'ca0e65d9bb8d0dca5e88adc5e1c644cc7d62e5a139350330281ed7e3a6938d2c',
     *       paymentAddress: '0069fa1bd9338574702283d8fb71f8cce1831c3ea4854563f5e4043aea33a4f1f468454744b2ff3644b2ab79d48e76a3187f902fe8a1bcfaad',
     *       nonce: 100,
     *       voting_purpose: 0,
     *       xfp: '52744703',
     *       origin: 'cardano-wallet',
     *   };
     */
    async signCardanoCatalystRequest(props: CardanoCatalystRequestProps): Promise<{ signature: Buffer }>{
        const keystoneSDK = new KeystoneSDK();
        const ur = keystoneSDK.cardano.generateCatalystRequest(props);
        const encodedUR = new UREncoder(ur, Infinity).nextPart().toUpperCase();
        const response = await this.sendToDevice(Actions.CMD_RESOLVE_UR, encodedUR);
        const resultUR = parseResponoseUR(response.payload);
        // parse signature
        const signature = keystoneSDK.cardano.parseCatalystSignature(resultUR);
        return {
            signature:Buffer.from(signature.signature, 'hex'),
        };
    }



    async signCardanoCip8DataTransaction(
        props: CardanoSignCip8MessageData
    ): Promise<{ signature: string,publicKey:string,addressFieldHex:string }> {
        this.precheck();
        const keystoneSDK = new KeystoneSDK();
        const ur = keystoneSDK.cardano.generateSignCip8DataRequest(props);
        const encodedUR = new UREncoder(ur, Infinity).nextPart().toUpperCase();
        console.log("========== encodedUR ===========",encodedUR)
        const response = await this.sendToDevice(Actions.CMD_RESOLVE_UR, encodedUR);
        const resultUR = parseResponoseUR(response.payload);
        const result = keystoneSDK.cardano.parseSignCip8DataSignature(resultUR);
        console.log("========== result ===========",result)
        return {
            signature: result.signature,
            publicKey: result.publicKey,
            addressFieldHex: result.addressField
        };
    }
}

