/**
 * Scan for all controllers, connect to them, and poll the crap out of them
 *
 */
'use strict';

var BleControllerFactory = require('..');
var ble = new BleControllerFactory();


/**
 * Polls the specified device forever
 *
 * The device parameter should be a controller object that is already
 * connected.
 *  
 * @param  {[type]} device BLE Controller Object
 */
function pollDevice( device ) {

  // Read the whole memory map
  device.readMap( device.map )
  .then( function( result)  {
    
    // Output all the results to console
    result.forEach( function( register ) {
      console.log( register.title + ': ', register.format() );
    });

  })
  .then( function() {

    //setImmediate( function() { pollDevice( device ); });
    setTimeout( function() { pollDevice( device ); }, 10000);
  })
  .catch( function(err) {

    console.error( 'Poll Error: ', err );

    // Keep polling but put in a little delay
    setTimeout( function() { pollDevice(device );}, 1000 );

  });
}


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

      // Capture the event emitted when the device connects
      device.on('connect', function(){
        console.log( 'Connected');
      });

      // Capture the event emitted when the device disconnects
      device.on('disconnect', function(){
        console.log( 'Disconnected');

        // Go back to looking for a device
        ble.startScanning();
      });

      device.connect()
      .then( function() { 

        console.log( 'Connected to ' + device.deviceType + ' ' + device.serial );

        pollDevice( device );
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
