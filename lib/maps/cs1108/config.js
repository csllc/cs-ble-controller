/**
 * Memory map for Configuration in CS1108
 *
 */
'use strict';

var Register = require('../../Register');

var cs1108 = require('./cs1108_def');

module.exports = function() {

  /**
   * Settings used when the IN/OUT discrete is in the OUT position
   *
   */
  this.outdoor = {
    forwardSpeed : new Register({
      title: 'Fwd Speed',
      writable: true,
      type: 'ee',
      addr: cs1108.EE | 0x2C,
      units: '%',
      min: 0,
      max: 0xFF,
      format: function() { return this.toPercent( this.value[0] );}
    }),
  };

  this.indoor = {
    forwardSpeed: new Register({
      title: 'Fwd Speed',
      writable: true,
      type: 'ee',
      addr: cs1108.EE | 0x2E,
      units: '%',
      min: 0,
      max: 0xFF,
      format: function() { return this.toPercent( this.value[0] );}
    }),
  };

/*
var EE_OUTDOOR_MOTOR_COMP        = 0x2A;
var EE_INDOOR_MOTOR_COMP         = 0x2B;
var EE_FORWARD_SPEED             = 0x2C;
var EE_REVERSE_SPEED             = 0x2D;
var EE_INDOOR_FWD_SPEED          = 0x2E;
var EE_INDOOR_RVS_SPEED          = 0x2F;
var EE_OUT_STEERING_PWM_SCALING  = 0x30;
var EE_IN_STEERING_PWM_SCALING   = 0x31;
var EE_MINIMUM_SPEED             = 0x32;
var EE_MINIMUM_SPEED_STEERING    = 0x33;
var EE_MAX_STEERING_DRIVE_PWM    = 0x34;
var EE_EMB_BRAKE_TIME            = 0x35;

//--- Outdoor Movement EEPROM addresses
var EE_FORWARD_ACCEL             = 0x36;
var EE_FORWARD_DECEL             = 0x37;
var EE_FWD_RVS_DECEL             = 0x38;
var EE_REVERSE_ACCEL             = 0x39;
var EE_REVERSE_DECEL             = 0x3A;
var EE_RVS_FWD_DECEL             = 0x3B;
    forwardSpeed: new MapItem( EE_FORWARD_SPEED, RAM_FORWARD_SPEED, { min: 0x00, max: FULL_SCALE, format: valueToPercent, unformat: valueFromPercent, name: 'Forward Speed', units: '%' }),
    reverseSpeed      : new MapItem( EE_REVERSE_SPEED, RAM_REVERSE_SPEED, { min: 0x00, max: FULL_SCALE, format: valueToPercent, unformat: valueFromPercent, name: 'Reverse Speed', units: '%' }),
    minimumSpeed      : { addr: EE_MINIMUM_SPEED, value: 0x00, min: 0x00,      max: MIN_SPEED_MAX, toFriendly: valueToPercent, fromFriendly: valueFromPercent, name: "Minimum Speed" },
    forwardAccel      : { addr: EE_FORWARD_ACCEL, value: 0x00, min: MIN_ACCEL, max: MAX_ACCEL,     toFriendly: valueToPercent, fromFriendly: valueFromPercent, name: "Forward Accel" },
    forwardDecel      : { addr: EE_FORWARD_DECEL, value: 0x00, min: MIN_ACCEL, max: MAX_ACCEL,     toFriendly: valueToPercent, fromFriendly: valueFromPercent, name: "Forward Decel" },
    forwardRevDecel   : { addr: EE_FWD_RVS_DECEL, value: 0x00, min: MIN_ACCEL, max: MAX_ACCEL,     toFriendly: valueToPercent, fromFriendly: valueFromPercent, name: "Fwd Rvs Decel" },
    reverseAccel      : { addr: EE_REVERSE_ACCEL, value: 0x00, min: MIN_ACCEL, max: MAX_ACCEL,     toFriendly: valueToPercent, fromFriendly: valueFromPercent, name: "Reverse Accel" },
    reverseDecel      : { addr: EE_REVERSE_DECEL, value: 0x00, min: MIN_ACCEL, max: MAX_ACCEL,     toFriendly: valueToPercent, fromFriendly: valueFromPercent, name: "Reverse Decel" },
    reverseFwdDecel   : { addr: EE_RVS_FWD_DECEL, value: 0x00, min: MIN_ACCEL, max: MAX_ACCEL,     toFriendly: valueToPercent, fromFriendly: valueFromPercent, name: "Rvs Fwd Decel" },
  },
*/

};