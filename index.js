/**
 * Library module for Bluetooth Low Energy interface to Control Solutions Controllers
 *
 * This is a client library that handles finding, connecting to, and interacting with
 * Control Solutions controllers that support the proprietary 'Controller' BLE service.
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

//var Promise = require('bluebird');

// For the Nordic/Adafruit BLE Friend UART service
var uuidUartService = '6e400001b5a3f393e0a9e50e24dcca9e';


//------------------------------------//---------------------------------------

function BleControllerFactory() {

  var factory = this;

  // subclass to event emitter
  EventEmitter.call( this );

  // Pass on BLE state change events 
  ble.on('stateChange', this.emit.bind(this, 'stateChange'));

  ble.on('discover', this.emit.bind(this, 'discover'));

  this.startScanning = function() {

    //console.log( Controller.uuidUartService );
    // the Adafruit BLE friend advertises the UART service in its 
    // advertising packets (probably possible to reconfigure).  For
    // now, scan for the uart service
    ble.startScanning([ uuidUartService ], false);

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
module.exports = new BleControllerFactory();
