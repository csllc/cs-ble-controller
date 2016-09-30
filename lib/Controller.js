/**
 * Object representing a controller
 *
 * Keeps track of a controller we are monitoring
 *
 */

'use strict';

// utility library
var util = require( 'util');

// include class that allows us to emit events
var EventEmitter = require('events').EventEmitter;


/**
* Constructor
* 
* @param {[type]} peripheral [description]
*/
function Controller( peripheral ) {

  // subclass to event emitter
  EventEmitter.call( this );

  //------------------------------------//---------------------------------------
  // Definitions for BLE UUIDs 

  // For the CSLLC private controller service
  this.uuidControllerService = '6765ed1f4de149e14771a14380c9a5ad';

  this.uuidUartService = '6E400001B5A3F393E0A9E50E24DCCA9E';


  // Characteristic UUIDs....
  this.uuidReadCharacteristic = '0001';
  this.uuidWriteCharacteristic = '0002';

  this.uuidUartRx = '0x0003';
  this.uuidUartTx = '0x0002';

  this.rxCharacteristic = null;
  this.txCharacteristic = null;

  this.deviceType = null;

  this.peripheral = peripheral;

  // service needs to be discovered upon connecting
  this.controllerService = null;

}

// Add event emitter functionality to our class
util.inherits( Controller, EventEmitter );


/**
 * Test to see if we are connected to a device
 * 
 * @return {Boolean} true if connnected
 */
Controller.prototype.isConnected = function() {

  return( this.peripheral && this.controllerService );

};


Controller.prototype.sendUart = function( data ) {

  var me = this;

  return new Promise( function( resolve, reject ){

    // If there is a controller service, we are connected
    if( me.controllerService && me.txCharacteristic ) {

      me.txCharacteristic.write( data, false, function( error ) {
        console.log( err );
        if( error ) {
          reject();
        }
        else {
          resolve();
        }
      });

    }
    else {
      reject();
    }
  });


};




Controller.prototype.inspectDevice = function() {

var me = this;

return new Promise(function(resolve, reject){

  //
  // Once the peripheral has been connected, then inspect the
  // services and characteristics
   
  var serviceUUIDs = [ me.uuidControllerService, me.uuidUartService ];
  var characteristicUUIDs = [ me.uuidUartRx, me.uuidUartTx ];

  me.peripheral.discoverSomeServicesAndCharacteristics(
    serviceUUIDs, characteristicUUIDs, function(error, services, characteristics){


  //me.peripheral.discoverServices([ ], function(err, services) {

    if( error ) {
      reject( error );
    }
    else {
      console.log( services );
      console.log( characteristics );
      
      services.forEach(function(service) {
      
        //
        // This must be the service we were looking for.
        //
        console.log('found service:', service.uuid );

        //
        // So, discover its characteristics.
        //
        service.discoverCharacteristics([], function(err, characteristics) {

          if( err ) {
            reject( err );
          }
          else {

            if( service.uuid === me.uuidControllerService ) {

              me.controllerService = service;


              characteristics.forEach(function(characteristic) {
                //
                // Loop through each characteristic and match them to the
                // UUIDs that we know about.
                //
                console.log('found controller characteristic:', characteristic.uuid );

                switch( characteristic.uuid ) {
                  case me.uuidReadCharacteristic:
                    //me.rxCharacteristic = characteristic;
                    break;

                  case me.uuidWriteCharacteristic:
                    //me.txCharacteristic = characteristic;
                    break;

                  default:
                    console.log( 'ignoring characteristic ' + characteristic.uuid );
                    break;
                }


              });
            }
            else if( service.uuid === me.uuidUartService ) {
              
              characteristics.forEach(function(characteristic) {
                //
                // Loop through each characteristic and match them to the
                // UUIDs that we know about.
                //
                console.log('found uart characteristic:', characteristic.uuid );

                switch( characteristic.uuid ) {
                  case me.uuidUartRx:
                    me.rxCharacteristic = characteristic;
                    break;

                  case me.uuidUartTx:
                    me.txCharacteristic = characteristic;
                    break;

                  default:
                    console.log( 'ignoring characteristic ' + characteristic.uuid );
                    break;
                }


              });

            resolve();
            }

            // @todo determine device type a better way
            if( me.rxCharacteristic && me.txCharacteristic ) {
              me.deviceType = 1;
            }

            // listen for incoming data and emit a 'data' event

          }
        });
      });
    }
  });
});

};


/**
 * Set up to send and receive data over the UART TX and RX characteristics
 * 
 * @return {[type]} [description]
 */
Controller.prototype.enableUart = function() {

  var me = this;

  return new Promise( function( resolve, reject ){

    // If there is a controller service, we are connected
    if( me.controllerService && me.txCharacteristic && me.rxCharacteristic ) {

      console.log( 'enabling uart');

      me.rxCharacteristic.on('read', me.emit.bind(me, 'data'));

      me.rxCharacteristic.subscribe( function () {
        console.log( 'subscribed');
        resolve();
      });

      
    }
    else {
      reject();
    }
  });

};


/**
 * Set up to send and receive data over the UART TX and RX characteristics
 * 
 * @return {[type]} [description]
 */
Controller.prototype.readUart = function() {

  var me = this;

  return new Promise( function( resolve, reject ){

    // If there is a controller service, we are connected
    if( me.controllerService && me.rxCharacteristic ) {


      me.rxCharacteristic.read( function( err, data ) {
        console.log( err );
        console.log( data );

        resolve(data);

      });

      
    }
    else {
      reject();
    }
  });

};


Controller.prototype.connect = function() {


  var me = this;

  return new Promise(function(resolve, reject){

    console.log( 'connecting');

    me.peripheral.connect(function(err) {
      
      if( err ) {
        reject( err );
      }
      else {

        me.inspectDevice()
        .then( function() {

          if( me.deviceType ) {

            me.emit('connected');

            resolve();
          }
          else{
            reject();
          }
        })
        .catch( function() {
          reject();
        });

      }
    });
  });
          
};


Controller.prototype.disconnect = function() {


  var me = this;

  return new Promise(function(resolve, reject){

    me.peripheral.disconnect(function(err) {

      me.rxCharacteristic = null;
      me.txCharacteristic = null;
      me.deviceType = null;
      me.peripheral = null;
      me.controllerService = null;

      if( err ) {
        reject( err );
      }
      else {

        me.emit('disconnected');
            
        resolve();
      }
    });

  });
          
};



/**
 * Exports
 *
 * @ignore
 */
module.exports = Controller;

