'use strict';

const circuitParser = require('../src/parse/circuit.js');
const hexutils = require('../src/util/hexutils.js');
const evaluate = require('../src/evaluate.js');

const handleInitCircuit = function (initCircuitResp, input) {
    let circuit = circuitParser(atob(initCircuitResp.circuit));
    let wires = evaluate.parseInputLabels(circuit, initCircuitResp.wires);
    let inputArr = hexutils.hex2bin(input).split('').map(function (bit) {
        return parseInt(bit);
    }).reverse();

    while (inputArr.length < circuit.evaluatorInputSize) {
        inputArr.push(0);
    }

    let ot = evaluate.performOT(circuit, initCircuitResp.As, inputArr);
    return {
        circuit: circuit,
        wires: wires,
        inputArr: inputArr,
        ot: ot,
        As: initCircuitResp.As,
        nextReq: {
            Bs: ot.Bs.map(v => Array.from(v)),
        },
    };
}

const handleOT = function (prevResp, otResp) {
    const labels = evaluate.finalizeOTAndCompute(prevResp.circuit, prevResp.wires, prevResp.As, prevResp.ot.bs, prevResp.inputArr, otResp.es);
    return {
        nextReq: {
            labels: labels.map(v => v.serialize()),
        },
    };
}

const revealAnswer = function (resp) {
    return hexutils.bin2hex(resp.output.reverse().join(''));
}

module.exports = {
    handleInitCircuit: handleInitCircuit,
    handleOT: handleOT,
    revealAnswer: revealAnswer,
}
