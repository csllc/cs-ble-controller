'use strict';

var ControllerFactory = require( './lib/Controller');

var _ = require('underscore');

var ble = require('noble');

// UUIDs....
// For the CSLLC private controller service
var controllerServiceUuid = '6765ed1f4de149e14771a14380c9a5ad';

// For the Nordic/Adafruit BLE Friend UART service
var uartServiceUuid = '6e400001b5a3f393e0a9e50e24dcca9e';

// Characteristic UUIDs....

var readCharacteristicUuid = '0001';
var writeCharacteristicUuid = '0002';


ble.on('stateChange', function(state) {

  if (state === 'poweredOn') {
    //
    // Once the BLE radio has been powered on, it is possible
    // to begin scanning for devices offering the service we care about
    //
    console.log('scanning...');
    
    // the Adafruit BLE friend advertises the UART service in its 
    // advertising packets (probably possible to reconfigure).  For
    // now, scan for the uart service
    ble.startScanning([ uartServiceUuid ], false);
  }
  else {
    console.log('not scanning...');
    ble.stopScanning();
  }
});


var readCharacteristic = null;

var writeCharacteristic = null;


function inspectPeripheral( peripheral ) {

  peripheral.connect(function(err) {

    //
    // Once the peripheral has been connected, then inspect the
    // services and characteristics to see if it is a device we care about
    //
    peripheral.discoverServices([ controllerServiceUuid ], function(err, services) {
    
      services.forEach(function(service) {
        
        //
        // This must be the service we were looking for.
        //
        console.log('found service:', service.uuid );

        //
        // So, discover its characteristics.
        //
        service.discoverCharacteristics([], function(err, characteristics) {

          // Make a new controller instance and store the 

          characteristics.forEach(function(characteristic) {
            //
            // Loop through each characteristic and match them to the
            // UUIDs that we know about.
            //
            console.log('found characteristic:', characteristic.uuid );

            switch( characteristic.uuid ) {
              case readCharacteristicUuid:
                readCharacteristic = characteristic;
                break;

              case writeCharacteristicUuid:
                writeCharacteristic = characteristic;
                break;

              default:
                console.log( 'ignoring characteristic ' + characteristic.uuid );
                break;
            }

          });

          //
          // Check to see if we found all of our characteristics.
          //
          if (readCharacteristic && writeCharacteristic ) {


          //
          // Subscribe to the bake notification, so we know when
          // our pizza will be ready.
          //
          readCharacteristic.on('read', function(data, isNotification) {
            console.log('Our pizza is ready!');
            if (data.length === 1) {
              var result = data.readUInt8(0);
              console.log('The result is ', result );
            }
            else {
              console.log('result length incorrect')
            }
          });

          readCharacteristic.subscribe(function(err) {
            //
            // Bake at 450 degrees!
            //
            var address = new Buffer(2);
            address.writeUInt16BE(450, 0);
            readCharacteristic.write(address, false, function(err) {
              if (err) {
                console.log('address error');
              }
            });
          });

 
/*
            //
            // Subscribe to the bake notification, so we know when
            // our pizza will be ready.
            //
            pizzaBakeCharacteristic.on('read', function(data, isNotification) {
              console.log('Our pizza is ready!');
              if (data.length === 1) {
                var result = data.readUInt8(0);
                console.log('The result is',
                  result == pizza.PizzaBakeResult.HALF_BAKED ? 'half baked.' :
                  result == pizza.PizzaBakeResult.BAKED ? 'baked.' :
                  result == pizza.PizzaBakeResult.CRISPY ? 'crispy.' :
                  result == pizza.PizzaBakeResult.BURNT ? 'burnt.' :
                  result == pizza.PizzaBakeResult.ON_FIRE ? 'on fire!' :
                    'unknown?');
              }
              else {
                console.log('result length incorrect')
              }
            });
            */

          }
          else {
            console.log('missing characteristics');
          }

        }); 
      });
    });
  });
}


ble.on('discover', function(peripheral) {
  // we found a peripheral, stop scanning
  //ble.stopScanning();

  //
  // The advertisment data contains a name, power level (if available),
  // certain advertised service uuids, as well as manufacturer data,
  // which could be formatted as an iBeacon.
  //
  console.log('found peripheral:', peripheral.advertisement);

  inspectPeripheral( peripheral );
/*
  if( peripheral.advertisement.localName && 
    'string' === typeof( peripheral.advertisement.localName ) ) {

    var localName = peripheral.advertisement.localName.split(' ');

    if( localName.length === 2 && localName[0] === 'Amigo') {

      // localName[1] has the unit's serial number
      console.log( 'Found amigo serial number ' + localName[1] );

      inspectPeripheral( peripheral );

    }
  }
  */
 
});


/*
function bakePizza() {
  //
  // Pick the crust.
  //
  var crust = new Buffer(1);
  crust.writeUInt8(pizza.PizzaCrust.THIN, 0);
  pizzaCrustCharacteristic.write(crust, false, function(err) {
    if (!err) {
      //
      // Pick the toppings.
      //
      var toppings = new Buffer(2);
      toppings.writeUInt16BE(
        pizza.PizzaToppings.EXTRA_CHEESE |
        pizza.PizzaToppings.CANADIAN_BACON |
        pizza.PizzaToppings.PINEAPPLE,
        0
      );
      pizzaToppingsCharacteristic.write(toppings, false, function(err) {
        if (!err) {
          //
          // Subscribe to the bake notification, so we know when
          // our pizza will be ready.
          //
          pizzaBakeCharacteristic.on('read', function(data, isNotification) {
            console.log('Our pizza is ready!');
            if (data.length === 1) {
              var result = data.readUInt8(0);
              console.log('The result is',
                result == pizza.PizzaBakeResult.HALF_BAKED ? 'half baked.' :
                result == pizza.PizzaBakeResult.BAKED ? 'baked.' :
                result == pizza.PizzaBakeResult.CRISPY ? 'crispy.' :
                result == pizza.PizzaBakeResult.BURNT ? 'burnt.' :
                result == pizza.PizzaBakeResult.ON_FIRE ? 'on fire!' :
                  'unknown?');
            }
            else {
              console.log('result length incorrect')
            }
          });
          pizzaBakeCharacteristic.subscribe(function(err) {
            //
            // Bake at 450 degrees!
            //
            var temperature = new Buffer(2);
            temperature.writeUInt16BE(450, 0);
            pizzaBakeCharacteristic.write(temperature, false, function(err) {
              if (err) {
                console.log('bake error');
              }
            });
          });

        }
        else {
          console.log('toppings error');
        }
      });
    }
    else {
      console.log('crust error');
    }
  })
}

*/
