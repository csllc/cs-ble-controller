/**
 * Library module for Bluetooth Low Energy interface to CS1814 type BLE interfaces
 *
 * This is a client library that handles finding, connecting to, and interacting with
 * Control Solutions CS1814 dongles that support the proprietary 'Controller' BLE service.
 *
 * @ignore
 */
'use strict';

var ble = require('noble');

var Controller = require( './lib/Controller');

// built-in node utility module
var util = require('util');

// Node event emitter module
var EventEmitter = require('events').EventEmitter;

// For the private CSLLC controller service
var uuidControllerService = '6765ed1f4de149e14771a14380c90000';


//------------------------------------//---------------------------------------

function BleControllerFactory() {

  var factory = this;

  // subclass to event emitter
  EventEmitter.call( this );

  // Pass on BLE state change events (noble library events passed
  // through to our event listeners)

  ble.on('stateChange', this.emit.bind(factory, 'stateChange'));
  ble.on('scanStart', this.emit.bind(factory, 'scanStart'));
  ble.on('scanStop', this.emit.bind(factory, 'scanStop'));
  ble.on('discover', this.emit.bind(factory, 'discover'));
  ble.on('warning', this.emit.bind(factory, 'warning'));

  // API to start the bluetooth scanning
  this.startScanning = function() {

    // Scan for devices with the service we care about
    // This does not connect; just emits a discover event
    // when one is detected 
    ble.startScanning([uuidControllerService], false);

  };

  this.stopScanning = function() {
    ble.stopScanning();
  };


  // Make constructor available in the exported object
  factory.Controller = Controller;



}

// This object can emit events.  Note, the inherits
// call needs to be before .prototype. additions for some reason
util.inherits( BleControllerFactory, EventEmitter );


//BleControllerFactory.prototype.stateChange = function()

/**
 * Public interface to this module
 *
 * The object constructor is available to our client
 *
 * @ignore
 */
module.exports = BleControllerFactory;
