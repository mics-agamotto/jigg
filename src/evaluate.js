/**
 * Stateless evaluation functions for garbled circuits protocol.
 * @module src/evaluate
 */

'use strict';

const label = require('./data/label.js');
const gate = require('./data/gate.js');
const assignment = require('./data/assignment.js');
const crypto = require('./util/crypto.js');

/**
 * Receive garbled gates and wire-to-label map from garbler.
 * @param {Object} channel - Communication channel to use
 * @param {Object} circuit - Circuit being evaluated
 * @param {number[]} input - This party's input (second/right-hand input)
 * @returns {Object[]} Array of messages from garbler
 */
function receiveMessages(channel, circuit, input) {
  const inputPair = (new Array(1 + input.length)).concat(input);

  // Receive the list of garbled gates.
  var messages = [channel.receiveDirect('gatesGarbled')];

  // Receive each of the garbler's input labels.
  for (var i = 0; i < circuit.wire_in_count/2; i++) {
    messages.push(channel.receiveDirect('wire[' + circuit.wire_in_index[i] + ']'));
  }

  // Receive each of the evaluator's input labels using the input bits
  // available to the evaluator.
  for (i = circuit.wire_in_count/2; i < circuit.wire_in_count; i++) {
    messages.push(channel.receiveOblivious(inputPair[circuit.wire_in_index[i]]));
  }

  return messages;
}

/**
 * Process garbled gates and wire label information received from garbler.
 * @param {Object} circuit - Circuit being evaluated
 * @param {Object[]} messages - Array of messages from garbler
 * @returns {Object[]} Pair containing the received gates and wire-to-label map
 */
function processMessages(circuit, messages) {
  var gatesGarbled = gate.GatesGarbled.prototype.fromJSONString(messages[0]);
  var wireToLabels = new assignment.Assignment();
  for (var i = 0; i < circuit.wire_in_count; i++) {
    var j = circuit.wire_in_index[i];
    wireToLabels.set(j, [label.Label(messages[j])]);
  }
  return [gatesGarbled, wireToLabels];
}

/**
 * Decrypt a single garbled gate; the resulting label is stored automatically and also returned.
 * @param {Object} gate - Corresponding gate from the original circuit
 * @param {Object} gateGarbled - Garbled gate to evaluate
 * @param {Object} wireToLabels - Mapping from each wire index to two labels
 */
function evaluateGate(gate_id, gate, gateGarbled, wireToLabels) {
  const i = gate.wire_in_index[0];
  const j = (gate.wire_in_index.length === 2) ? gate.wire_in_index[1] : i;
  const k = (gate.wire_out_index != null) ? gate.wire_out_index[0] : 0; // If null, just return decrypted.
  const l = 2 * wireToLabels.get(i)[0].pointer() + wireToLabels.get(j)[0].pointer();

  if (gate.operation === 'xor') {
    wireToLabels.set(k, [wireToLabels.get(i)[0].xor(wireToLabels.get(j)[0])]);
  } else if (gate.operation === 'not') {
    wireToLabels.set(k, [wireToLabels.get(i)[0]]);  // Already inverted.
  } else if (gate.operation === 'and') {
    wireToLabels.set(k, [crypto.decrypt(wireToLabels.get(i)[0], wireToLabels.get(j)[0], gate_id, label.Label(gateGarbled.get(l)))]);
  }
}

/**
 * Evaluate all the gates (stateless version).
 * @param {Object} circuit - Circuit in which to garble the gates
 * @param {Object} gatesGarbled - Ordered collection of garbled gates
 * @param {Object} wireToLabels - Labeled wire data structure
 * @returns {Object} Mapping from each wire index to two labels
 */
function evaluateGates(circuit, gatesGarbled, wireToLabels) {
  for (var i = 0; i < circuit.gate_count; i++) {
    this.evaluateGate(i, circuit.gate[i], gatesGarbled.get(i), wireToLabels);
  }
  return wireToLabels;
}

module.exports = {
  receiveMessages: receiveMessages,
  processMessages: processMessages,
  evaluateGate: evaluateGate,
  evaluateGates: evaluateGates
};
