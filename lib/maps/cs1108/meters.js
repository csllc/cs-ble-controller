/**
 * Memory map for METERs in EEPROM
 *
 */
'use strict';

// utility class for registers
var Register = require('../../Register');

// controller constants
var cs1108 = require('./cs1108_def');

// buffer utilities
var buffers = require('h5.buffers');

// Export an object constructor
module.exports = function() {

  this.meters = new Register({
    title: 'Meters',
    writeable: true,
    type: 'uint8',
    addr: cs1108.HIRAM | 0xA0,
    length: 10,
    format: function( values ) {
      if( values.length !== this.length ) {
        throw( new Error( 'Meters Register incorrect length'));
      } 

      var reader = new buffers.BufferReader( values );

      return {
        runtimeHours: reader.shiftUInt16(),
        chargeNoFloat: reader.shiftUInt8(),
        lowBattHours: reader.shiftUInt16(),
        overtempCounter: reader.shiftUInt8(),
        throttleFaultCounter: reader.shiftUInt8(),
      };

    }

  });

 

};