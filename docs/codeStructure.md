# Code structure

## 1. Input arguments parsing 

Input arguments are parsed according to [parserConfig.ts](../src/command-parser/parserConfig.ts). 

The first one or two arguments determine what action will be taken (see `CommandType`). 

## 2. Input files parsing

Most input data are contained in files that are given by their respective paths in arguments.

For instance, the transaction that is to be signed is read from the input file and parsed by `parseUnsignedTx`.

## 3. Executing the command

The given command is then executed by [`CommandExecutor`](../src/commandExecutor.ts) which is responsible for passing the parsed arguments to the relevant cryptoprovider.

The cryptoprovider translates command arguments into a form suitable for the particular hardware wallet (Ledger or Trezor), including mapping transaction elements into hierarchic derivation (BIP44-like) paths, and passes on the response acquired from the hw wallet.

## 4. Processing hw wallet response

`CommandExecutor` is then responsible for processing the hw wallet response data, typically writing them into the given output files.

# Tests

Steps (1) and (2) are tested via unit tests in [commandParser.js](../test/unit/commandParser/commandParser.js).

Step (3) is covered by [integration tests](../test/integration).

Step (4) is not covered anywhere (apart from manually running command-line examples): TODO
