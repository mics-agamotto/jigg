const JIGG = require('../src/jigg.js');
const fs = require('fs');
const circuitParser = require('../src/parse/circuit.js');
const hexutils = require('../src/util/hexutils.js');
const http = require('http');
const evaluate = require('../src/evaluate.js');
const jiggAgamotto = require('../src/jiggAgamotto.js');

var initCircuitResp, otResp;
var circuit, wires, inputArr, ot;

var prevResp;

// call init circuit
new Promise(resolve => {
  http.get('http://localhost:9999/init_circuit', res => {
    let rawData = '';
    res.on('data', chunk => rawData += chunk);
    res.on('end', () => {
      const parsedData = JSON.parse(rawData);
      resolve(parsedData);
    });
  });
}).then(parsedData => {
  // initCircuitResp = parsedData;

  // circuit = circuitParser(atob(initCircuitResp.circuit));

  // wires = evaluate.parseInputLabels(circuit, initCircuitResp.wires);

  // let input = process.argv[4];
  // inputArr = hexutils.hex2bin(input).split('').map(function (bit) {
  //   return parseInt(bit);
  // }).reverse();

  // while (inputArr.length < circuit.evaluatorInputSize) {
  //   inputArr.push(0);
  // }

  // ot = evaluate.performOT(circuit, initCircuitResp.As, inputArr);

  const resp = jiggAgamotto.handleInitCircuit(parsedData, process.argv[4]);
  prevResp = resp;

  return new Promise(resolve => {
    const postData = JSON.stringify(resp.nextReq);
    
    const options = {
      hostname: 'localhost',
      port: 9999,
      path: '/perform_ot',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, res => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        const parsedData = JSON.parse(rawData);
        resolve(parsedData);
      });
    });

    console.log(postData.length);
    req.write(postData);
    req.end();
  });
}).then(parsedData => {
  // otResp = parsedData;

  // const labels = evaluate.finalizeOTAndCompute(circuit, wires, initCircuitResp.As, ot.bs, inputArr, otResp.es);
  
  const resp = jiggAgamotto.handleOT(prevResp, parsedData);

  return new Promise(resolve => {
    const postData = JSON.stringify(resp.nextReq);
    
    const options = {
      hostname: 'localhost',
      port: 9999,
      path: '/reveal_answer',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, res => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        const parsedData = JSON.parse(rawData);
        resolve(parsedData);
      });
    });

    console.log(postData.length);
    req.write(postData);
    req.end();
  });
}).then(parsedData => {
  console.log(jiggAgamotto.revealAnswer(parsedData));
});
