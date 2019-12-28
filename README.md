# JIGG
JavaScript implementation of garbled gates and 2PC boolean circuit protocols.

## Installation and Setup
This library is implemented entirely in JavaScript. Running the server requires [Node.js](https://nodejs.org/en/), [npm](https://www.npmjs.com/) (both installed via `yum install nodejs npm` or `brew install npm` on macOS), [Socket.IO](https://socket.io/), and [libsodium](https://www.npmjs.com/package/libsodium).

Run `npm` to install all JIGG dependencies:
```shell
npm install
```

## Running the Prototype
Start the communications server from server.js with the command below and optionally specify a port number such as:
```shell
node server 3000
```

### As a Browser Party
Parties can go to `http://localhost:port/` in a web browser supporting JavaScript to begin communications. This is strictly a two-party protocol at the moment.

### As a Node.js Party
Connect a new party in Node.js by running:
```shell
node demo/party.js <circuit> <role> <b16-input>
```
For example to join an AES-128 computation as the garbler, run:
```shell
node demo/party.js aes128.txt garbler 00000000000000000000000000000000  # message in base 16
```

### Demos
We have a 64-bit equal-to-zero test (`circuits/bristol/zero_equal_64.txt`) in `circuits/bristol` and several other circuits from the same [page](https://homes.esat.kuleuven.be/~nsmart/MPC/). Circuits larger than ~6000 gates seem to hang the JS engine (sometimes only temporarily) and so are now forced to run in sequence to prevent this from occurring.

There is now a SHA-256 demo at `sha256.html` and `client.html`.
The boolean circuit for SHA has +100,000 gates, and by limiting the number of gates encrypted in parallel, JIGG is able to compute it in under a minute in the browser. Test vectors are found [here](https://homes.esat.kuleuven.be/~nsmart/MPC/sha-256-test.txt) and in the `test/` folder.

### Circuit Format
JIGG can evaluate a boolean circuit in either of two formats. It supports a custom JSON circuit format:
```javascript
const circuit = {
  wires: 8, gates: 4,
  input: [1, 2, 3, 4], output: [5, 7, 8],
  gate: [
    {wirein: [1,2], wireout: 5, type: 'and'},
    {wirein: [3,4], wireout: 6, type: 'xor'},
    {wirein: [6], wireout: 7, type: 'not'},
    {wirein: [5,7], wireout: 8, type: 'and'}
  ]
};
```

It can also parse a circuit in the standardized '[Bristol](https://homes.esat.kuleuven.be/~nsmart/MPC/) [Format](https://homes.esat.kuleuven.be/~nsmart/MPC/old-circuits.html)' which is supported by several compiled MPC libraries such as [SCALE-MAMBA](https://homes.esat.kuleuven.be/~nsmart/SCALE/).
```ada
4 8
1 4
1 3
2 1 0 1 4 AND
2 1 2 3 5 XOR
1 1 5 6 INV
2 1 4 6 7 AND
```

### Circuit Assembler
To create a new circuit, write a macro with existing circuits as its gates and run the [macro-circuit-assembler](https://github.com/wyatt-howe/macro-circuit-assembler/tree/casm) with `npm run casm <path_to_macro> <output_path>`.

<!--For example, `npm run-script casm circuits/macros/and8.casm circuits/and8.txt` assembles the 8-bit AND circuit.-->

## Running Tests

### Unit Tests
Unit tests of functional components (single-process without sockets) can be run using [mocha](https://mochajs.org/):
```shell
mocha test
```

### End-to-end Tests
All of the built-in test vectors can be verified in `npm test` or, equivalently, `node test/suite/simulate.js`. Communications between the server, garbler and evaluator are automated. You do not need to already have a server running; tests are run over port 3001.
```shell
npm test
```
You may also run an individual test on a specific circuit file:
```shell
node test/suite/simulate.js <circuit-file-path>
```
For example, execute the following to test a computation using the 8-bit conjunction circuit:
```shell
node test/suite/simulate.js and8.txt
```

## Capabilities
JIGG is designed for semi-honest parties (in either node or in the browser). We support point-and-permute, free-XOR, free single-input gates, and encryption from a random oracle (fixed-key XChaCha20). The half-AND optimization is compatible but not yet supported. The default label size is 128 bits and relies on JavaScript's Uint8Array class. The [`simple-labels`](https://github.com/wyatt-howe/jigg/tree/simple-labels) branch demonstrates dynamically-sized labels (that are 53 bits in length or less) without using arrays. Some potential improvements are listed in the to-do section.

## To Do
- Change the current oblivious transfer to use ECC from libsodium
- Encrypt communications between parties (or use ECC)
- Half-AND gate optimization
- Standardize JSON, serialized, and compressed formats for inter-party messages
