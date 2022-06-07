/**
 * Scan for controllers and print a list of discovered devices.
 *
 */
'use strict';

// Increase Node's event listener limit - we know what we're doing
require('events').EventEmitter.prototype._maxListeners = 50;

// Our BLE library
const BleController = require('..');

// Create BLE instance
let ble = new BleController({
  name: 'CS1816',
  autoConnect: false, // Wait for application to select device; just keep scanning
});


ble.getAvailability()
.then(() => {
  ble.on('discover', (newDevice) => {
    console.log("Discovered BLE device:", newDevice);
  });

  ble.on('scanStart', (filter) => {
    console.log("Scanning started using filter", filter);
  });

  ble.on('scanStop', (peripheral) => {
    console.log("Scanning stopped", peripheral);
  });

  return ble.startScanning();

});

