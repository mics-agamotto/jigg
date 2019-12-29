/**
 * Data structure for a map from wire indices to one or two labels.
 * @module src/data/association
 */

'use strict';

const gate = require('./gate.js');
const circuit = require('./circuit.js');
const label = require('./label.js');

/**
 * Create a new wire-to-labels map data structure instance;
 * note that the domain of the map begins at 1 and not 0.
 * @constructor
 */
function Association() {
  this.mapping = {};
}

/**
 * Associate a wire index with a list of labels.
 * @param {number} index - Index of wire to associate with labels
 * @param {Object[]} labels - Array of one or two labels
 */
Association.prototype.set = function (index, labels) {
  this.mapping[index] = labels;
};

/**
 * Get the labels at the specified wire index.
 * @param {number} index - Index of wire for which to return the label
 * @param {Object[]} labels - Array of one or two labels
 */
Association.prototype.get = function (index) {
  return (this.mapping[index].isLabel) ? [this.mapping[index]]: this.mapping[index];
};

/**
 * Return the data structure instance as a JSON object.
 * @returns {Object} Data structure as a JSON object
 */
Association.prototype.toJSON = function () {
  var json = {};
  for (var index in this.mapping) {
    if (this.mapping[index].isLabel == true) {
      json[index] = [this.mapping[index].toJSON()];
    } else {
      var chk = function (l) { return l.isLabel ? l.toJSON() : l; };
      json[index] = this.mapping[index].map(chk);
    }
  }
  return json;
};

/**
 * Build a data structure instance from its JSON representation.
 * @returns {Object} Instance of the data structure
 */
Association.prototype.fromJSON = function (json) {
  var assoc = new Association();
  for (var index in json) {
    var labelsCurrent = json[index].map(label.Label.prototype.fromJSON);
    assoc.set(index, labelsCurrent);
  }
  return assoc;
};

/**
 * Return a subset of the map corresponding to the supplied indices.
 * @param {number[]} indices - Indices of map entries to keep in result
 * @returns {Object} Data structure as a JSON object
 */
Association.prototype.copyWithOnlyIndices = function (indices) {
  var association = new Association();
  for (var k = 0; k < indices.length; k++) {
    association.set(indices[k], this.mapping[indices[k]]);
  }
  return association;
};

module.exports = {
  Association: Association
};
