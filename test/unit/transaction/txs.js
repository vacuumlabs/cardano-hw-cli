/* eslint-disable max-len */
const transactions = {
  SimpleTransaction: {
    unsignedCborHex: '82a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474cf6',
    hashHex: 'ca7b59e959a6a7cf570468438c728c7693bc1582450b89ea095f3d04ae312e6a',
    parsed: {
      inputs: [
        {
          txHash: Buffer.from('941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de00', 'hex'),
          outputIndex: 0,
        },
      ],
      outputs: [
        {
          address: Buffer.from(
            '0114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c',
            'hex',
          ),
          coins: BigInt(2829131),
          tokenBundle: [],
        },
      ],
      fee: BigInt(170869n),
      ttl: 11028300n,
      certificates: [],
      withdrawals: [],
      metaDataHash: null,
      mint: [],
      meta: null,
      validityIntervalStart: null,
      scriptWitnesses: [],
    },
  },
  SimpleTransactionWithEmptyScriptWitnesses: {
    unsignedCborHex: '83a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474c80f6',
    hashHex: 'ca7b59e959a6a7cf570468438c728c7693bc1582450b89ea095f3d04ae312e6a',
    parsed: {
      inputs: [
        {
          txHash: Buffer.from('941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de00', 'hex'),
          outputIndex: 0,
        },
      ],
      outputs: [
        {
          address: Buffer.from(
            '0114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c',
            'hex',
          ),
          coins: BigInt(2829131),
          tokenBundle: [],
        },
      ],
      fee: BigInt(170869n),
      ttl: 11028300n,
      certificates: [],
      withdrawals: [],
      metaDataHash: null,
      mint: [],
      meta: null,
      validityIntervalStart: null,
      scriptWitnesses: [],
    },
  },
  TxWithWithdrawal: {
    /*
    * txBody: a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aa
    * d1c0b700018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1
    * a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a05a1581de11d227aefa4b77314917088
    * 5aadba30aab3127cc611ddbc4999def61c186f
    */
    unsignedCborHex: '82a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b700018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a05a1581de11d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c186ff6',
    hashHex: 'dfc63f395fba4bbf8d3507d05c455f0db7d85d0cabdd6f033c6112d6c32a6b93',
    parsed: {
      inputs: [
        {
          txHash: Buffer.from('3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7', 'hex'),
          outputIndex: 0,
        },
      ],
      outputs: [
        {
          address: Buffer.from(
            '82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c2561',
            'hex',
          ),
          coins: BigInt(3003112),
          tokenBundle: [],
        },
      ],
      fee: BigInt(42),
      ttl: 10n,
      certificates: [],
      withdrawals: [
        {
          address: Buffer.from('e11d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c', 'hex'),
          coins: BigInt(111),
        },
      ],
      metaDataHash: null,
      mint: [],
      meta: null,
      validityIntervalStart: null,
      scriptWitnesses: [],
    },
  },
  TxWithRegistrationCertificate: {
    /*
    * txBody: a500818258201af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163
    * f63dcfc00018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2
    * e1a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a048182008200581c1d227aefa4b77
    * 3149170885aadba30aab3127cc611ddbc4999def61c
    */
    unsignedCborHex: '82a500818258201af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc00018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a048182008200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61cf6',
    hashHex: '15116b11165fe2dad588fe87ae64211ded6d47a5ac29c6b8c5e5008a820fe73a',
    parsed: {
      inputs: [
        {
          txHash: Buffer.from('1af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc', 'hex'),
          outputIndex: 0,
        },
      ],
      outputs: [
        {
          address: Buffer.from('82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c2561', 'hex'),
          coins: BigInt(3003112),
          tokenBundle: [],
        },
      ],
      fee: BigInt(42),
      ttl: 10n,
      certificates: [{
        type: 0,
        stakeCredentials: {
          type: 0,
          addrKeyHash: Buffer.from('1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c', 'hex'),
        },
      }],
      withdrawals: [],
      metaDataHash: null,
      mint: [],
      meta: null,
      validityIntervalStart: null,
      scriptWitnesses: [],
    },
  },
  TxWithDelegationCertificate: {
    /*
    * txBody: a500818258201af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163
    * f63dcfc00018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2
    * e1a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a048183028200581c1d227aefa4b77
    * 3149170885aadba30aab3127cc611ddbc4999def61c581cf61c42cbf7c8c53af3f520508212ad
    * 3e72f674f957fe23ff0acb4973
    */
    unsignedCborHex: '82a500818258201af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc00018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a048183028200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581cf61c42cbf7c8c53af3f520508212ad3e72f674f957fe23ff0acb4973f6',
    hashHex: '17c2cf344736b8f4dbbd7f0b57ec13cee79f77fb4df7b32d859d26efbffe918c',
    parsed: {
      inputs: [
        {
          txHash: Buffer.from('1af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc', 'hex'),
          outputIndex: 0,
        },
      ],
      outputs: [
        {
          address: Buffer.from('82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c2561', 'hex'),
          coins: BigInt(3003112),
          tokenBundle: [],
        },
      ],
      fee: BigInt(42),
      ttl: 10n,
      certificates: [{
        type: 2,
        stakeCredentials: {
          type: 0,
          addrKeyHash: Buffer.from('1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c', 'hex'),
        },
        poolHash: Buffer.from('f61c42cbf7c8c53af3f520508212ad3e72f674f957fe23ff0acb4973', 'hex'),
      }],
      withdrawals: [],
      metaDataHash: null,
      mint: [],
      meta: null,
      validityIntervalStart: null,
      scriptWitnesses: [],
    },
  },
  TxWithDeregistrationCertificate: {
    /*
    * txBody: a500818258201af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163
    * f63dcfc00018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2
    * e1a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a048182018200581c1d227aefa4b77
    * 3149170885aadba30aab3127cc611ddbc4999def61c
    */
    unsignedCborHex: '82a500818258201af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc00018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a048182018200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61cf6',
    hashHex: 'ef78852e3f95bf812a6974b1534831672d314a92cb947f5122345e7a1acadd7d',
    parsed: {
      inputs: [
        {
          txHash: Buffer.from('1af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc', 'hex'),
          outputIndex: 0,
        },
      ],
      outputs: [
        {
          address: Buffer.from('82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c2561', 'hex'),
          coins: BigInt(3003112),
          tokenBundle: [],
        },
      ],
      fee: BigInt(42),
      ttl: 10n,
      certificates: [{
        type: 1,
        stakeCredentials: {
          type: 0,
          addrKeyHash: Buffer.from('1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c', 'hex'),
        },
      }],
      withdrawals: [],
      metaDataHash: null,
      mint: [],
      meta: null,
      validityIntervalStart: null,
      scriptWitnesses: [],
    },
  },
  TxWithMetaData: {
    /*
    * txBody: a500818258201af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163
    * f63dcfc00018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2
    * e1a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a075820deadbeefdeadbeefdeadbee
    * fdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef
    */
    unsignedCborHex: '82a500818258201af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc00018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a075820deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeeff6',
    hashHex: 'a85a4830ae401ba3c9c6d1a1fa20357101928aaf4af977fff4a179be9076fe6f',
    parsed: {
      inputs: [
        {
          txHash: Buffer.from('1af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc', 'hex'),
          outputIndex: 0,
        },
      ],
      outputs: [
        {
          address: Buffer.from('82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c2561', 'hex'),
          coins: BigInt(3003112),
          tokenBundle: [],
        },
      ],
      fee: BigInt(42),
      ttl: 10n,
      certificates: [],
      withdrawals: [],
      metaDataHash: Buffer.from('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', 'hex'),
      mint: [],
      meta: null,
      validityIntervalStart: null,
      scriptWitnesses: [],
    },
  },
  TxWithPoolRegistrationCertficate: {
    /*
    * txBody: a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad848400190bb84436e44b9af68400190bb84436e44b9b500178ff2483e3a2330a34c4a5e576c2078301190bb86d616161612e626262622e636f6d82026d616161612e626262632e636f6d82782968747470733a2f2f7777772e76616375756d6c6162732e636f6d2f73616d706c6555726c2e6a736f6e5820cdb714fd722c24aeb10c93dbb0ff03bd4783441cd5ba2a8b6f373390520535bb
    */
    unsignedCborHex: '82a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad848400190bb84436e44b9af68400190bb84436e44b9b500178ff2483e3a2330a34c4a5e576c2078301190bb86d616161612e626262622e636f6d82026d616161612e626262632e636f6d82782968747470733a2f2f7777772e76616375756d6c6162732e636f6d2f73616d706c6555726c2e6a736f6e5820cdb714fd722c24aeb10c93dbb0ff03bd4783441cd5ba2a8b6f373390520535bbf6',
    hashHex: 'bc678441767b195382f00f9f4c4bddc046f73e6116fa789035105ecddfdee949',
    parsed: {
      inputs: [
        {
          txHash: Buffer.from('3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7', 'hex'),
          outputIndex: 0,
        },
      ],
      outputs: [
        {
          address: Buffer.from('017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b09', 'hex'),
          coins: BigInt(1),
          tokenBundle: [],
        },
      ],
      fee: BigInt(42),
      ttl: 10n,
      certificates: [
        {
          type: 3,
          poolKeyHash: Buffer.from('13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad', 'hex'),
          vrfPubKeyHash: Buffer.from('07821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d084450', 'hex'),
          pledge: BigInt(50000000000),
          cost: BigInt(340000000),
          margin: { numerator: 3, denominator: 100 },
          rewardAccount: Buffer.from('e1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad', 'hex'),
          poolOwnersPubKeyHashes: [
            Buffer.from('1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c', 'hex'),
            Buffer.from('794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad', 'hex'),
          ],
          relays: [
            {
              ipv4: Buffer.from('36e44b9a', 'hex'),
              ipv6: null,
              portNumber: 3000,
              type: 0,
            },
            {
              ipv4: Buffer.from('36e44b9b', 'hex'),
              ipv6: Buffer.from('0178ff2483e3a2330a34c4a5e576c207', 'hex'),
              portNumber: 3000,
              type: 0,
            },
            {
              dnsName: 'aaaa.bbbb.com',
              portNumber: 3000,
              type: 1,
            },
            {
              dnsName: 'aaaa.bbbc.com',
              type: 2,
            },
          ],
          metadata: {
            metadataUrl: 'https://www.vacuumlabs.com/sampleUrl.json',
            metadataHash: Buffer.from('cdb714fd722c24aeb10c93dbb0ff03bd4783441cd5ba2a8b6f373390520535bb', 'hex'),
          },
        },
      ],
      withdrawals: [],
      metaDataHash: null,
      mint: [],
      meta: null,
      validityIntervalStart: null,
      scriptWitnesses: [],
    },
  },
  TxWithPoolRetirementCertificate: {
    /*
    * txBody: // TODO
    */
    unsignedCborHex: '82a500818258201af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc00018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a04818304581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c186df6',
    hashHex: '1de14fdd8eadbf3b92e231f764c2817044259a90b81288794467be7df8dad5b3',
    parsed: {
      inputs: [
        {
          txHash: Buffer.from('1af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc', 'hex'),
          outputIndex: 0,
        },
      ],
      outputs: [
        {
          address: Buffer.from('82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c2561', 'hex'),
          coins: BigInt(3003112),
          tokenBundle: [],
        },
      ],
      fee: BigInt(42),
      ttl: BigInt(10),
      certificates: [{
        type: 4,
        poolKeyHash: Buffer.from('1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c', 'hex'), // TODO replace with 1853'/1852'/0'/0' or so
        retirementEpoch: BigInt(109),
      }],
      withdrawals: [],
      metaDataHash: null,
      mint: [],
      meta: null,
      validityIntervalStart: null,
      scriptWitnesses: [],
    },
  },
  TxWithMultiAssets: {
    /*
    * txBody: 82a50082825820a2218c7738c374fa68fed428bf28447f550c3c33cb92a5bd06e2b62f3777953900825820ade4616f96066ab24f49dcd4adbcae9ae83750d34e4620a49d737d4a66835d6400018282583900bf63a166d9c10d85e4fd3401de03907e232e7707218c3bfd5a570d7acab53e9efebb49bafb4e74d675c2d682dd8e402f15885fb6d1bc0023821a0095b050a2581c0b1bda00e69de8d554eeafe22b04541fbb2ff89a61d12049f55ba688a14a6669727374617373657404581c95a292ffee938be03e9bae5657982a74e9014eb4960108c9e23a5b39a24a66697273746173736574044b7365636f6e646173736574048258390014c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a0035476f021a0002e630031a0097fa40081a0089c970f6
    */
    unsignedCborHex: '82a50082825820a2218c7738c374fa68fed428bf28447f550c3c33cb92a5bd06e2b62f3777953900825820ade4616f96066ab24f49dcd4adbcae9ae83750d34e4620a49d737d4a66835d6400018282583900bf63a166d9c10d85e4fd3401de03907e232e7707218c3bfd5a570d7acab53e9efebb49bafb4e74d675c2d682dd8e402f15885fb6d1bc0023821a0095b050a2581c0b1bda00e69de8d554eeafe22b04541fbb2ff89a61d12049f55ba688a14a6669727374617373657404581c95a292ffee938be03e9bae5657982a74e9014eb4960108c9e23a5b39a24a66697273746173736574044b7365636f6e646173736574048258390014c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a0035476f021a0002e630031a0097fa40081a0089c970f6',
    hashHex: '28f655cb4baa746ed59d327362c09b1f5ca6a15d1edc9d8a7ec38b17196a10ac',
    parsed: {
      inputs: [
        {
          txHash: Buffer.from('a2218c7738c374fa68fed428bf28447f550c3c33cb92a5bd06e2b62f37779539', 'hex'),
          outputIndex: 0,
        },
        {
          txHash: Buffer.from('ade4616f96066ab24f49dcd4adbcae9ae83750d34e4620a49d737d4a66835d64', 'hex'),
          outputIndex: 0,
        },
      ],
      outputs: [
        {
          address: Buffer.from('00bf63a166d9c10d85e4fd3401de03907e232e7707218c3bfd5a570d7acab53e9efebb49bafb4e74d675c2d682dd8e402f15885fb6d1bc0023', 'hex'),
          coins: 9810000n,
          tokenBundle: [
            {
              policyId: Buffer.from('0b1bda00e69de8d554eeafe22b04541fbb2ff89a61d12049f55ba688', 'hex'),
              assets: [
                {
                  assetName: Buffer.from('66697273746173736574', 'hex'),
                  amount: 4n,
                },
              ],
            },
            {
              policyId: Buffer.from('95a292ffee938be03e9bae5657982a74e9014eb4960108c9e23a5b39', 'hex'),
              assets: [
                {
                  assetName: Buffer.from('66697273746173736574', 'hex'),
                  amount: 4n,
                },
                {
                  assetName: Buffer.from('7365636f6e646173736574', 'hex'),
                  amount: 4n,
                },
              ],
            },
          ],
        },
        {
          address: Buffer.from('0014c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c', 'hex'),
          coins: 3491695n,
          tokenBundle: [],
        },
      ],
      fee: 190000n,
      ttl: 9960000n,
      certificates: [],
      withdrawals: [],
      metaDataHash: null,
      mint: [],
      meta: null,
      validityIntervalStart: 9030000n,
      scriptWitnesses: [],
    },
  },
  TxWithMint: {
    /*
    * txBody: a400818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b700018182583901eb0baa5e570cffbe2934db29df0b6a3d7c0430ee65d4c3a7ab2fefb91bc428e4720702ebd5dab4fb175324c192dc9bb76cc5da956e3c8dff821a001e8480a1581c0d63e8d2c5a00cbcffbdf9112487c443466e1ea7d8c834df5ac5c425a14874657374436f696e1a0078386202182a09a1581c0d63e8d2c5a00cbcffbdf9112487c443466e1ea7d8c834df5ac5c425a24874657374436f696e1a007838624875657374436f696e3a00783861
    */
    unsignedCborHex: '83a400818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b700018182583901eb0baa5e570cffbe2934db29df0b6a3d7c0430ee65d4c3a7ab2fefb91bc428e4720702ebd5dab4fb175324c192dc9bb76cc5da956e3c8dff821a001e8480a1581c0d63e8d2c5a00cbcffbdf9112487c443466e1ea7d8c834df5ac5c425a14874657374436f696e1a0078386202182a09a1581c0d63e8d2c5a00cbcffbdf9112487c443466e1ea7d8c834df5ac5c425a24874657374436f696e1a007838624875657374436f696e3a007838619f8201858200581cc4b9265645fde9536c0795adbcc5291767a0c61fd62448341d7e03868202828200581cc4b9265645fde9536c0795adbcc5291767a0c61fd62448341d7e03868200581c0241f2d196f52a92fbd2183d03b370c30b6960cfdeae364ffabac889830302838200581cc4b9265645fde9536c0795adbcc5291767a0c61fd62448341d7e03868200581c0241f2d196f52a92fbd2183d03b370c30b6960cfdeae364ffabac8898200581ccecb1d427c4ae436d28cc0f8ae9bb37501a5b77bcc64cd1693e9ae2082041864820518c8fff6',
    hashHex: '3b2af509c0c52f728714afe2ca15c3965c03e775bca3a9279fb24a2e5c746f0d',
    parsed: {
      inputs: [
        {
          txHash: Buffer.from('3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7', 'hex'),
          outputIndex: 0,
        },
      ],
      outputs: [
        {
          address: Buffer.from('01eb0baa5e570cffbe2934db29df0b6a3d7c0430ee65d4c3a7ab2fefb91bc428e4720702ebd5dab4fb175324c192dc9bb76cc5da956e3c8dff', 'hex'),
          coins: 2000000n,
          tokenBundle: [
            {
              policyId: Buffer.from('0d63e8d2c5a00cbcffbdf9112487c443466e1ea7d8c834df5ac5c425', 'hex'),
              assets: [
                {
                  assetName: Buffer.from('74657374436f696e', 'hex'),
                  amount: 7878754n,
                },
              ],
            },
          ],
        },
      ],
      fee: 42n,
      ttl: null,
      certificates: [],
      withdrawals: [],
      metaDataHash: null,
      mint: [
        {
          policyId: Buffer.from('0d63e8d2c5a00cbcffbdf9112487c443466e1ea7d8c834df5ac5c425', 'hex'),
          assets: [
            {
              assetName: Buffer.from('74657374436f696e', 'hex'),
              amount: 7878754n,
            },
            {
              assetName: Buffer.from('75657374436f696e', 'hex'),
              amount: -7878754n,
            },
          ],
        },
      ],
      meta: null,
      validityIntervalStart: null,
      scriptWitnesses: [
        [
          1,
          [
            [
              0,
              Buffer.from('c4b9265645fde9536c0795adbcc5291767a0c61fd62448341d7e0386', 'hex'),
            ],
            [
              2,
              [
                [
                  0,
                  Buffer.from('c4b9265645fde9536c0795adbcc5291767a0c61fd62448341d7e0386', 'hex'),
                ],
                [
                  0,
                  Buffer.from('0241f2d196f52a92fbd2183d03b370c30b6960cfdeae364ffabac889', 'hex'),
                ],
              ],
            ],
            [
              3,
              2,
              [
                [
                  0,
                  Buffer.from('c4b9265645fde9536c0795adbcc5291767a0c61fd62448341d7e0386', 'hex'),
                ],
                [
                  0,
                  Buffer.from('0241f2d196f52a92fbd2183d03b370c30b6960cfdeae364ffabac889', 'hex'),
                ],
                [
                  0,
                  Buffer.from('cecb1d427c4ae436d28cc0f8ae9bb37501a5b77bcc64cd1693e9ae20', 'hex'),
                ],
              ],
            ],
            [
              4,
              100,
            ],
            [
              5,
              200,
            ],
          ],
        ],
      ],
    },
  },
}

module.exports = {
  transactions,
}
