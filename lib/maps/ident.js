/**
 * Memory map for IDENT fields in EEPROM
 *
 */
'use strict';

var Register = require('../Register');

module.exports = {

  /**
   * Stores the firmware version information
   *
   */
  firmware: new Register( {
    title: 'Revision',
    writable: false,
    type: 'ee',
    addr: [0x03, 0x04],
    format: function( values ) {
      return 'R' + this.zeroPad(values[0].toString(16),2) + '.' +
        this.zeroPad(values[1].toString(16),2);
    },
  }),

  /**
   * Stores the product information
   *
   * Example: 'CS1108'
   *
   */
  product: new Register({
    name: 'Product',
    writable: false,
    type: 'ee',
    addr: [0xF9, 0xFA],
    format: function( values ) {
      return 'CS' + this.zeroPad(values[0].toString(16),2) +
        this.zeroPad(values[1].toString(16),2);
    },
  }),

  /**
   * Stores the unit serial number
   *
   */
  serial: new Register({
    name: 'Serial',
    writable: false,
    type: 'ee',
    addr: [0xFB, 0xFC, 0xFD, 0xFE],
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
  })

/*        displayType       : new MapItem( EE_DISPLAY_TYPE,    { min: DISP_TYP_ACT_MASK, max: DISP_TYP_ACT_MASK, name: 'DISPLAY TYPE'    }),
        peripherals       : new MapItem( EE_PERIPHERALS,     { min: PERI_ACT_MASK,     max: PERI_ACT_MASK,     name: 'PERIPHERALS'     }),
        periPriority      : new MapItem( EE_PERI_PRIORITY,   { min: PERI_ACT_MASK,     max: PERI_ACT_MASK,     name: 'PERI PRIORITY'   }),
        boardLoByte       : new MapItem( EE_BOARD_LO_BYTE,   { min: 0x00,              max: 0xFF,              name: 'BOARD TYPE LO'   }),
        boardMidByte      : new MapItem( EE_BOARD_MID_BYTE,  { min: 0x00,              max: 0xFF,              name: 'BOARD TYPE MID'  }),
        boardHiByte       : new MapItem(  EE_BOARD_HIGH_BYTE,{ min: 0x00,              max: 0xFF,              name: 'BOARD TYPE HIGH' })
*/

};