/**
 * Main module: garbled circuit protocol agents.
 * @module src/jigg
 */

'use strict';

const LABEL_SIZE = 16; // 16 bytes => 128 bits

const garble = require('./garble.js');
const evaluate = require('./evaluate.js');

const circuitParser = require('./parse/parse.js');

const Socket = require('./comm/clientSocket.js');
const OT = require('./comm/ot.js');

const hexutils = require('./util/hexutils.js');


/**
 * Create a new agent for the circuit at the given URL with the given input.
 * @param {string} role - Agent role ('Garbler' or 'Evaluator')
 * @param {string} hostname - hostname and port of the server, should be acceptable by socket.io
 * @param {object} [options] - additional optional options including:
 *                             debug - boolean defaults to false
 *                             throttle - number defaults to no throttling
 *                             parallel - number defaults to infinity
 *                             labelSize - number defaults to 16 bytes
 * @constructor
 */
function Agent(role, hostname, options) {
  const self = this;

  this.role = role;
  this.socket = new Socket(hostname);
  this.OT = new OT(this.socket);

  this.listeners = [];
  this.log = function () {};

  this._outputPromise = new Promise (function (resolve) {
    self._outputResolve = resolve;
  });
  this._outputPromise.then(this.socket.disconnect.bind(this.socket));

  if (options == null) {
    options = {};
  }

  this.throttle = options.throttle == null ? 0 : options.throttle;
  this.parallel = options.parallel == null ? Number.MAX_VALUE : options.parallel;
  this.labelSize = options.labelSize == null ? LABEL_SIZE : options.labelSize;

  if (options.debug) {
    this.log = console.log.bind(console, this.role);
    this.addProgressListener(this.log);
  }
}

/**
 * Loads the given circuit.
 * @param {string|Circuit} circuit - the circuit encoded as specified in encoding
 * @param {string} [encoding='text'] - the encoding of the circuit, defaults to 'text' indicating a text encoding of a bristol fashion circuit.
 *                                     Alternatively, 'object' can be used for parsed circuits provided as a Circuit object
 */
Agent.prototype.loadCircuit = function (circuit, encoding) {
  if (encoding == null || encoding === 'text') {
    this.circuit = circuitParser(circuit);
  } else {
    this.circuit = circuit;
  }
};

/**
 * Sets the input of this party.
 * @param {number[]} input - the input to the circuit
 * @param [encoding='bits'] - the encoding of the input, defaults to 'bits' for array of 0|1 from most to least significant.
 *                            Alternatively, it accepts 'number' and 'hex' for a number and a hex string.
 */
Agent.prototype.setInput = function (input, encoding) {
  if (encoding === 'number') {
    this.input = input.toString(2).split('').map(function (bit) {
      return parseInt(bit);
    });

    const size = (this.role === 'Garbler' ? this.circuit.garblerInputSize : this.circuit.evaluatorInputSize);
    while (this.input.length < size) {
      this.input.unshift(0);
    }
  }

  if (encoding === 'hex') {
    this.input = hexutils.hex2bin(input).map(function (bit) {
      return parseInt(bit);
    });
  }

  if (encoding === 'bits' || encoding == null) {
    this.input = input.slice();
  }
};

/**
 * Returns a promise to the output encoded as specified by the encoding.
 * @param [encoding='bits'] - the encoding of the input, defaults to 'bits' for array of 0|1 from most to least significant.
 *                            Alternatively, it accepts 'number' and 'hex' for a number and a hex string.
 */
Agent.prototype.getOutput = function (encoding) {
  return this._outputPromise.then(function (output) {
    if (encoding == null || encoding === 'bits') {
      return output.slice();
    }

    if (encoding === 'hex') {
      return hexutils.bin2hex(output.join(''));
    }

    if (encoding === 'number') {
      return parseInt(output.join(''), 2);
    }
  });
};

/**
 * This callback logs or displays progress.
 *
 * @callback progressListener
 * @param {string} state - one of of the following states: 'connected', 'garbling', 'OT', 'evaluating', 'output', 'error'.
 *                         OT is called after oblivious transfer is executed for the current party, if
 *                         state is garbling or evaluating, then current and total are provided
 * @param {number} [current] - Progress so far (i.e., numerator)
 * @param {number} [total] - Target total (i.e., the denominator)
 * @param {string|Error} [error] - If any error occured, this will be passed with state 'error'
 */

/**
 * Adds a listener for progress events.
 * @param {progressListener} progressListener
 */
Agent.prototype.addProgressListener = function (progressListener) {
  this.listeners.push(progressListener);
};

/**
 * Report progress to all listeners
 * @param {string} state - one of of the following states: 'connected', 'garbling', 'OT', 'evaluating', 'error'.
 *                         OT is called after oblivious transfer is executed for the current party, if
 *                         state is garbling or evaluating, then current and total are provided
 * @param {number} [current] - Progress so far (i.e., numerator)
 * @param {number} [total] - Target total (i.e., the denominator)
 * @param {string|Error} [error] - If any error occured, this will be passed with state 'error'
 */
Agent.prototype.progress = function (state, current, total, error) {
  for (let i = 0; i < this.listeners.length; i++) {
    this.listeners[i](state, current, total, error);
  }
};

/**
 * Run the agent on the circuit.
 */
Agent.prototype.start = function () {
  const self = this;

  this.socket.join(this.role);
  this.socket.hear('go').then(function () {
    self.progress('connected');
    if (self.role === 'Garbler') {
      garble(self);
    } else {
      evaluate(self);
    }
  });
};

module.exports = Agent;