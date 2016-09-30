/**
 * Memory map for Status fields in RAM
 *
 */
'use strict';

var Register = require('../Register');

module.exports = {

  targetPortB: new Register( {
    name: 'Target Port B',
    writable: false,
    type: 'ram',
    addr: 0x06,
    format: function() {
      return {
        key: !(this.value[0] & 0x01),
        charging: !(this.value[0] & 0x02),
        indoor: !(this.value[0] & 0x20),
      };
    },
  }),

  targetPortC: new Register( {
    name: 'Target Port C',
    writable: false,
    type: 'ram',
    addr: 0x07,
    format: function() {
      return {
        reverse: !(this.value[0] & 0x01),
        quickstop: !(this.value[0] & 0x40),
        brakeRelease: !(this.value[0] & 0x80),
      };
    },
  }),

  throttlePercent: new Register( {
    name: 'Throttle %',
    writable: false,
    type: 'ram',
    addr: 0x29,
    format: function() {
      return this.value8ToPercent();
    },
  }),

  pwm: new Register( {
    name: 'PWM',
    writable: false,
    type: 'ram',
    addr: 0x2E,
    format: function() {
      return this.value8ToPercent();
    },
  }),

  speed: new Register( {
    name: 'Speed',
    writable: false,
    type: 'ram',
    addr: 0x2A,
    format: function() {
      return this.value8ToPercent();
    },
  }),

  batteryV: new Register( {
    name: 'Battery V',
    writable: false,
    type: 'ram',
    addr: [0x56, 0x57],
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
  }),

  throttleV: new Register( {
    name: 'Throttle V',
    writable: false,
    type: 'ram',
    addr: [0x60, 0x61],
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
  }),

  temperature: new Register( {
    name: 'Temperature',
    writable: false,
    type: 'ram',
    addr: [0x62, 0x63],
    units: 'C',
    format: function() {

      // MSB less a magic offset
      var val = this.value[0] - 0x6C;

      val = val + (this.value[1] / 255 );

      return val;
    },
  }),


  current: new Register( {
    name: 'Current',
    writable: false,
    type: 'ram',
    addr: [0x66, 0x67],
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
  }),


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