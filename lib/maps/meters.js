/**
 * Memory map for METERs in EEPROM
 *
 */
'use strict';

var Register = require('../Register');

module.exports = {

  runtimeHours: new Register({
    name: 'Runtime Hours',
    writable: false,
    type: 'ee',
    addr: [0x62, 0x63],
    format: function() { return this.value8();}
  }),

  chargeNoFloat: new Register({
    name: 'Incomplete Charge',
    writable: false,
    type: 'ee',
    addr: 0x64,
    format: function() { return this.value8();}
  }),


  lowBattHours: new Register({
    name: 'Low Batt Hours',
    writable: false,
    type: 'ee',
    addr: [0x65, 0x66],
    format: function() { return this.value16();}
  }),

  overtempCounter: new Register({
    name: 'Overtemp Faults',
    writable: false,
    type: 'ee',
    addr: 0x67,
    format: function() { return this.value8();}
  }),

  throttleFaultCounter: new Register({
    name: 'Throttle Faults',
    writable: false,
    type: 'ee',
    addr: 0x68,
    format: function() { return this.value8();}
  }),

};