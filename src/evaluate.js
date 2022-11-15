'use strict';

const circuitParser = require('./parse/circuit.js');
const labelParser = require('./parse/label.js');
const OT = require('./comm/ot.js');

const crypto = require('./util/crypto.js');

const receiveInputLabels = function (agent, circuit) {
  const garblerInputSize = circuit.garblerInputSize;
  const evaluatorInputSize = circuit.evaluatorInputSize;

  // send garbler input labels
  const promises = [];
  for (let i = 0; i < garblerInputSize; i++) {
    promises.push(agent.socket.hear('wire' + i).then(labelParser));
  }

  // Send the evaluator the first half of the input labels directly.
  for (let i = 0; i < evaluatorInputSize; i++) {
    const index = i + garblerInputSize;
    promises.push(agent.OT.receive('wire' + index, agent.input[i]));
  }

  return Promise.all(promises);
};

const evaluateAnd = function (agent, garbledGate, garbledAssignment) {
  const in1 = garbledGate.inputWires[0];
  const in2 = garbledGate.inputWires[1];
  const out = garbledGate.outputWire;

  const label1 = garbledAssignment[in1];
  const label2 = garbledAssignment[in2];

  const point = 2 * label1.getPoint() + label2.getPoint();
  const cipher = garbledGate.truthTable[point];

  garbledAssignment[out] = crypto.decrypt(label1, label2, garbledGate.id, cipher);
};

const evaluateXor = function (agent, garbledGate, garbledAssignment) {
  const in1 = garbledGate.inputWires[0];
  const in2 = garbledGate.inputWires[1];
  const out = garbledGate.outputWire;

  garbledAssignment[out] = garbledAssignment[in1].xor(garbledAssignment[in2]);
};

const evaluateNot = function (agent, garbledGate, garbledAssignment) {
  const in1 = garbledGate.inputWires[0];
  const out = garbledGate.outputWire;

  garbledAssignment[out] = garbledAssignment[in1];
};

const run = function (agent) {
  // receive circuit
  agent.socket.hear('circuit').then(function (circuit) {
    // parse circuit
    circuit = circuitParser(circuit);

    agent.progress('OT');

    // receiver garbled inputs and OT for evaluator inputs
    receiveInputLabels(agent, circuit).then(function (garbledAssignment) {
      // evaluate one gate at a time
      for (let i = 0; i < circuit.gates.length; i++) {
        if (i % 2500 === 0) {
          agent.progress('evaluating', i, circuit.gates.length);
        }

        const garbledGate = circuit.gates[i];

        if (garbledGate.operation === 'AND') {
          evaluateAnd(agent, garbledGate, garbledAssignment);
        } else if (garbledGate.operation === 'LOR') {
          evaluateAnd(agent, garbledGate, garbledAssignment);
        } else if (garbledGate.operation === 'XOR') {
          evaluateXor(agent, garbledGate, garbledAssignment);
        } else if (garbledGate.operation === 'NOT' || garbledGate.operation === 'INV') {
          evaluateNot(agent, garbledGate, garbledAssignment);
        } else {
          throw new Error('Unrecognized gate: ' + garbledGate.operation);
        }
      }
      agent.progress('evaluating', circuit.gates.length, circuit.gates.length);

      // send garbled output to garbler
      agent.progress('output');
      const garbledOutput = garbledAssignment.slice(circuit.wiresCount - circuit.outputSize);
      agent.socket.send('output', garbledOutput.map(function (label) {
        return label.serialize();
      }));

      // retrieve de-garbled output
      agent.socket.hear('output').then(function (bits) {
        agent._outputResolve(bits);
      });
    });
  });
};

const parseInputLabels = function (circuit, wires) {
  // send garbler input labels
  const labels = [];
  for (let i = 0; i < circuit.garblerInputSize; i++) {
    labels.push(labelParser(wires[i]));
  }

  return labels;
}

const performOT = function (circuit, As, inputArr) {
  const ot = new OT(null);
  let bBs = ot.generateBatchOT(circuit.evaluatorInputSize);
  let bs = bBs.map(v => v[0]);
  let Bs = bBs.map(v => v[1]);
  Bs = ot.handleBatchOT(circuit.evaluatorInputSize, As, Bs, inputArr);

  return {
    bs: bs,
    Bs: Bs,
  };
}

const finalizeOTAndCompute = function (circuit, wires, As, bs, inputArr, es) {
  const ot = new OT(null);
  const garbledAssignment = wires.concat(ot.finalizeBatchOT(circuit.evaluatorInputSize, As, bs, inputArr, es));

  // evaluate one gate at a time
  for (let i = 0; i < circuit.gates.length; i++) {
    if (i % 2500 === 0) {
      console.log('evaluating', i, circuit.gates.length);
    }

    const garbledGate = circuit.gates[i];

    if (garbledGate.operation === 'AND') {
      evaluateAnd({}, garbledGate, garbledAssignment);
    } else if (garbledGate.operation === 'LOR') {
      evaluateAnd({}, garbledGate, garbledAssignment);
    } else if (garbledGate.operation === 'XOR') {
      evaluateXor({}, garbledGate, garbledAssignment);
    } else if (garbledGate.operation === 'NOT' || garbledGate.operation === 'INV') {
      evaluateNot({}, garbledGate, garbledAssignment);
    } else {
      throw new Error('Unrecognized gate: ' + garbledGate.operation);
    }
  }
  console.log('evaluating', circuit.gates.length, circuit.gates.length);

  return garbledAssignment.slice(circuit.wiresCount - circuit.outputSize);
}

module.exports = {
  run: run,
  parseInputLabels: parseInputLabels,
  performOT: performOT,
  finalizeOTAndCompute: finalizeOTAndCompute,
};
