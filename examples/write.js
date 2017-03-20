/**
 * Example for writing and receiving data via transparent data service
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

      console.log( 'Found ' + peripheral.advertisement.localName );

      device.connect()
      .then( function() { 
        console.log( 'Connected to ' + device.deviceType );
        console.log( 'Serial: ' + device.serial );
        console.log( 'Fault: ' + device.fault );

        device.on('data', function( data ) {
          console.log( 'RX ' + data.length + ': ', data );
        });

        device.on('fault', function( data ) {
          console.log( 'FAULT ' + data.length + ': ', data );
        });

      })
      .then( function() { 

        device.write( new Buffer([ 0,0, 0, 0, 0, 2, 0x10, 0x11 ]));

        //device.write( new Buffer(255));

        //wait for response
        // finished; exit program
        //        process.exit(0);
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

    // Put the bluetooth hardware into scan mode
    ble.startScanning();

  }

});
