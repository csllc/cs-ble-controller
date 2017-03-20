/**
 * Scan for all controllers, connect to them, and watch for events
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

      // stop after the first found
      ble.stopScanning();

      // Create an object to manage the discovered peripheral
      var device = new ble.Controller( peripheral );

      var name = peripheral.advertisement.localName;

      console.log( 'Found ' + name );

      // Capture the event emitted when the device connects
      device.on('connect', function(){
        console.log( name + ': ' + 'Connected');
      });

      // Capture the event emitted when the device disconnects
      device.on('disconnect', function(){
        console.log( name + ': ' + 'Disconnected');

        // Go back to looking for a device
        ble.startScanning();
      });

      device.connect()
      .then( function() { 

        console.log( 'Connected to ' + device.deviceType + ' ' + device.serial );

        device.on( 'position', function( position ) {
          console.log( name + ': Position: ', position );
        });

        device.on( 'fault', function( fault ) {
          console.log(  name + ': ' + 'Fault: ', fault );
        });

        device.on( 'status', function( status ) {
          console.log( name + ': ' + 'Status: ', status );
        });

        device.on( 'status2', function( status ) {
          console.log( name + ': ' + 'Status2: ', status );
        });

        device.on( 'status3', function( status ) {
          console.log( name + ': ' + 'Status3: ', status );
        });

        device.on( 'status4', function( status ) {
          console.log( name + ': ' + 'Status4: ', status );
        });

        device.on( 'status5', function( status ) {
          console.log( name + ': ' + 'Status5: ', status );
        });

      })
      
      .catch( function( err ) { 
        console.error( 'Error:', err ); 
      });
    });

    // Capture the event that is emitted when bluetooth goes into scanning mode
    ble.on('scanStart', function(){
      console.log( 'Scanning...');
    });

    // Capture the event emitted when scan mode ends
    ble.on('scanStop', function(){
      console.log( 'Stopped Scanning...');
    });

    // Capture the event emitted when scan mode ends
    ble.on('warning', function( message ){
      console.log( 'BLE Warning: ', message );
    });

    // Put the bluetooth hardware into scan mode
    ble.startScanning();

  }

});
