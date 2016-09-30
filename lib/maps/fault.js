/**
 * Memory map for FAULTS in EEPROM
 *
 */
'use strict';

var Register = require('../Register');

module.exports = {

  active: new Register({
    name: 'Fault',
    writable: false,
    type: 'ram',
    addr: 0x64,
    format: function() { return this.value8();}
  }),

  /**
   * Reads the fault log
   *
   * The fault log is a circular buffer that is 16 bytes long.  A pointer (at 0x01) points
   * at the last-recorded fault.  A fault code of 0xFF is an empty slot.
   */
  log: new Register({
    name: 'Fault Log',
    writable: false,
    type: 'ee',
    addr: [0x01, 0x70, 0x71,0x72,0x73,0x74,0x75,0x76,0x77,0x78,0x78,0x7A,0x7B,0x7C,0x7D,0x7E,0x7F],
    format: function() {

      var faults = [];

      // Remember the pointer to the most recent fault, and remove it from the value array
      var log = this.value;
      var ptr = log.shift();

      // The PTR could be 0xFF if the fault log has been reset - in that case we return an empty array
      if( ptr < 16 && log.length > 15 ) {
        while( ptr > 0) {
          log.push(log.shift());
          ptr--;
        }
      }

      log.forEach( function( v ) {
        if( 0xFF !== v ){
          faults.push( v );
        }
      });
      return faults;
    }
  })

};