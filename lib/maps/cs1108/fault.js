/**
 * Memory map for FAULTS in CS1108
 *
 */
'use strict';

// utility class for registers
var Register = require('../../Register');

// controller constants
var cs1108 = require('./cs1108_def');

// Export an object constructor
module.exports = function() {

  // The active system fault code
  this.active = new Register({
    title: 'Fault',
    writable: false,
    type: 'uint8',
    addr: cs1108.LOWRAM | 0x64,
    format: function() { return this.value[0];}
  });

  // The pointer to the circular buffer of faults
  this.pointer = new Register({
    title: 'Fault Ptr',
    writable: false,
    type: 'uint8',
    addr: cs1108.LORAM | 0x01, 
    format: function() { return this.value[0];}
  });

  // A circular buffer of faults.  If you also read the pointer
  // you can put these in chronological order
  this.log = new Register({
    title: 'Fault Log',
    writable: true,
    type: 'uint8',
    addr: cs1108.EE | 0x70, 
    length: 16
  });

};