/**
 * Memory map for Status fields in CS1108 RAM
 *
 */
'use strict';

var Register = require('../../Register');

var cs1108 = require('./cs1108_def');

module.exports = function() {

  this.targetPortB = new Register( {
    title: 'Target Port B',
    writable: false,
    type: 'uint8',
    addr: cs1108.LORAM | 0x06,
    format: function() {
      return {
        key: !(this.value[0] & 0x01),
        charging: !(this.value[0] & 0x02),
        indoor: !(this.value[0] & 0x20),
      };
    },
  });

  this.targetPortC = new Register( {
    title: 'Target Port C',
    writable: false,
    type: 'uint8',
    addr: cs1108.LORAM | 0x07,
    format: function() {
      return {
        reverse: !(this.value[0] & 0x01),
        quickstop: !(this.value[0] & 0x40),
        brakeRelease: !(this.value[0] & 0x80),
      };
    },
  });

  this.throttlePercent = new Register( {
    title: 'Throttle %',
    writable: false,
    type: 'uint8',
    addr: cs1108.LORAM | 0x29,
    units: '%',
    min: 0,
    max: 0xFF,
    format: function() { return this.toPercent( this.value[0] );}
  });

  this.pwm = new Register( {
    title: 'PWM',
    writable: false,
    type: 'uint8',
    addr: cs1108.LORAM | 0x2E,
    units: '%',
    min: 0,
    max: 0xFF,
    format: function() { return this.toPercent( this.value[0] );}
  });

  this.speed = new Register( {
    title: 'Speed',
    writable: false,
    type: 'uint8',
    addr: cs1108.LORAM | 0x2A,
    units: '%',
    min: 0,
    max: 0xFF,
    format: function() { return this.toPercent( this.value[0] );}
  });

  this.batteryV = new Register( {
    title: 'Battery V',
    writable: false,
    type: 'uint8',
    addr: cs1108.LORAM | 0x56,
    length: 2,
    units: 'V',
    format: function() {
      // 16-bit word
      var val = this.value[0] * 256 + this.value[1];

      val = val * 1469.0;
      val = val / 3.0;
      val = val / 16777216.0;
      val = val * 24;

      return val;
    },
  });

  this.throttleV = new Register( {
    title: 'Throttle V',
    writable: false,
    type: 'uint8',
    addr: cs1108.LORAM | 0x60,
    length: 2,
    units: 'V',
    format: function() {
      // ram value is a 16 bit word representing a voltage
      // between 0 and 5.0 volts. The throt_volt is a
      // raw non-dimensioned value between 0.00 and ~1.00

      // 16-bit word
      var val = this.value[0] * 256 + this.value[1];

      val = val / ( 255.0 * 256 );

      return val * 5.0;
    },
  });

  this.temperature = new Register( {
    title: 'Temperature',
    writable: false,
    type: 'uint8',
    addr: cs1108.LORAM | 0x62,
    length: 2,
    units: 'C',
    format: function() {

      // MSB less a magic offset
      var val = this.value[0] - 0x6C;

      val = val + (this.value[1] / 255 );

      return val;
    },
  });


  this.current = new Register( {
    title: 'Current',
    writable: false,
    type: 'uint8',
    addr: cs1108.LORAM | 0x66,
    length: 2,
    units: 'A',
    format: function() {
      // Take the 16-bit value
      var val = this.value[0] * 256 + this.value[1];

      // divide by a magic number to get floating point amps
      var amps = (val / 0x69);

      // if the ram value has the lower bit set, negate the current
      if( 0 === val & 0x0001 ) {
        amps = -amps;
      }

      return amps;
    },
  });


    //  RAM_THROTTLE_VALUE, { min: 0x00, max: FULL_SCALE, format: valueToPercent, unformat: valueFromPercent, name: 'Throttle Value', units: '%' }),
/*
    pwm      : new MapItem( EE_PWM, RAM_PWM, { min: 0x00, max: FULL_SCALE, format: valueToPercent, unformat: valueFromPercent, name: 'PWM', units: '%' }),
   speed      : new MapItem( EE_SPEED, RAM_SPEED, { min: 0x00, max: FULL_SCALE, format: valueToPercent, unformat: valueFromPercent, name: 'Speed', units: '%' }),
*/

/*
         tempLo      : new MapItem( EE_FET_TEMP_LO, RAM_FET_TEMP_LO, { min: 0x00, max: FULL_SCALE, format: valueToPercent, unformat: valueFromPercent, name: 'Temp', units: '%' }),
         tempHi      : new MapItem( EE_FET_TEMP_HI, RAM_FET_TEMP_HI, { min: 0x00, max: FULL_SCALE, format: valueToPercent, unformat: valueFromPercent, name: 'Temp', units: '%' }),
      //   volts      : new MapItem( EE_PWM, RAM_PWM, { min: 0x00, max: FULL_SCALE, format: valueToPercent, unformat: valueFromPercent, name: 'PWM', units: '%' }),
      //   current      : new MapItem( EE_PWM, RAM_PWM, { min: 0x00, max: FULL_SCALE, format: valueToPercent, unformat: valueFromPercent, name: 'PWM', units: '%' }),

         targetPortB      : new MapItem( EE_TARGET_PORT_B, RAM_TARGET_PORT_B, { min: 0x00, max: FULL_SCALE, format: valueToTargetBflags, name: 'Target Port B' }),
         targetPortC      : new MapItem( EE_TARGET_PORT_C, RAM_TARGET_PORT_C, { min: 0x00, max: FULL_SCALE, format: valueToTargetCflags, name: 'Target Port C' }),
*/


};