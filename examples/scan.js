/**
 * Scan for controllers and print a list
 *
 */
'use strict';

var BleControllerFactory = require('..');
var ble = new BleControllerFactory();


// Wait for the bluetooth hardware to become ready
ble.once('stateChange', function(state) {

  if(state === 'poweredOff') {
    console.error( 'Bluetooth must be turned on before you run this example');

  }
  else if(state === 'poweredOn') {


    ble.on('discover', function( peripheral ) {

      console.log( 'Found ' + peripheral.advertisement.localName );

    });

    ble.startScanning();

  }

});
