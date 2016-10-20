/**
 * Memory map for IDENT fields in EEPROM
 *
 * Use like this:
 *   var x = new require('ident');
 *
 */
'use strict';

var Register = require('../../Register');

var cs1108 = require('./cs1108_def');


module.exports = function() {

  /**
   * Stores the firmware version information
   *
   */
  this.firmware = new Register( {
    title: 'Revision',
    writable: false,
    type: 'uint8',
    addr: cs1108.EE | 0x03,
    length: 2,
    format: function( values ) {

      return 'R' + this.zeroPad(values[0].toString(16),2) + '.' +
        this.zeroPad(values[1].toString(16),2);
    },
  });

  /**
   * Stores the product information
   *
   * Example: 'CS1108'
   *
   */
  this.product = new Register({
    title: 'Product',
    writable: false,
    type: 'uint8',
    addr: cs1108.EE | 0xF9,
    length: 2,
    format: function( values ) {
      return 'CS' + this.zeroPad(values[0].toString(16),2) +
        this.zeroPad(values[1].toString(16),2);
    },
  });

  /**
   * Stores the unit serial number
   *
   */
  this.serial = new Register({
    title: 'Serial Number',
    writable: false,
    type: 'uint8',
    addr: cs1108.EE | 0xFB, 
    length: 4,
    format: function( values ) {

      // checksum is the xor of the nibbles of the 3 serial number bytes.
      // On my dev board, this calculation does not match what is stored in value[0]
      // so the checksum is ignored (until I can verify it is working correctly)
      /*var cks =
        ((values[1] & 0xF0) / 16)
        ^ (values[1] & 0x0F)
        ^ ((values[2] & 0xF0) / 16)
        ^ (values[2] & 0x0F)
        ^ ((values[3] & 0xF0) / 16)
        ^ (values[3] & 0x0F); */

      //if( ((values[0] & 0x0F) === cks) && ((values[0] & 0xF0) === 0x20)) {
      if( (values[0] & 0xF0) === 0x20) {

        // valid serial number, prepend the S, zero pad, and convert to decimal
        var n = (values[1]*65536 + values[2] * 256 + values[3] ).toString(10);

        return 'S' + this.zeroPad( n, 7 );

      }
      else {
        // serial number not programmed
        return '';
      }
    },
  });

};



