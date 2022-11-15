'use strict';

const fs = require('fs');
const express = require('express');
const http = require('http');
const garble = require('../src/garble.js');
const circuitParser = require('../src/parse/parse.js');
const hexutils = require('../src/util/hexutils.js');

const app = express();
const httpServer = http.createServer(app);

const circuitPath = __dirname + '/../circuits/bristol/' + 'sha-256-flipped.txt';
const circuitData = fs.readFileSync(circuitPath, 'utf8');

var circuit;
var garbledAssignment;
var aAs;
var input = process.argv[4];

// Static routes
app.get('/', (request, response) => response.sendFile(__dirname + '/client.html'));
app.use('/client', express.static(__dirname + '/client/'));
app.use('/dist', express.static(__dirname + '/../dist/'));
app.use('/circuits', express.static(__dirname + '/../circuits/'));
app.use(express.json({limit: '50mb'}));
app.post('/update_salt', (req, resp) => {
  input = req.body.salt;
  resp.send({});
});
app.get('/init_circuit', (req, resp) => {
  circuit = circuitParser(circuitData);

  let inputArr = hexutils.hex2bin(input).split('').map(function (bit) {
    return parseInt(bit);
  }).reverse();

  while (inputArr.length < circuit.garblerInputSize) {
    inputArr.push(0);
  }

  let response = garble.initCircuit(circuit, inputArr);
  garbledAssignment = response.garbledAssignment;
  aAs = response.aAs;

  resp.send(response.response);
});
app.post('/perform_ot', (req, resp) => {
  const ot_result = garble.performOT(circuit, garbledAssignment, aAs, req.body.Bs);

  resp.send({
    es: ot_result,
  });
});
app.post('/reveal_answer', (req, resp) => {
  const bits = garble.computeOutput(circuit, garbledAssignment, req.body.labels);

  resp.send({
    output: bits,
  })
});

const port = parseInt(process.argv[2]);
httpServer.listen(port, function () {
  console.log('listening on *:', port);
});
