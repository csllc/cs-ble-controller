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

// utiity library
var _ = require( 'underscore');

var BPromise = require('bluebird');


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

  // The Adafruit UART service
  this.uuidUartService = '6e400001b5a3f393e0a9e50e24dcca9e';

  // the characteristics for the UART service
  this.uuidUartRx = '6e400003b5a3f393e0a9e50e24dcca9e';
  this.uuidUartTx = '6e400002b5a3f393e0a9e50e24dcca9e';

  // For the CSLLC private controller service
  this.uuidControllerService = '6765ed1f4de149e14771a14380c9a5ad';

  // Characteristic UUIDs....
  this.uuidReadCharacteristic = '0001';
  this.uuidWriteCharacteristic = '0002';


  this.rxCharacteristic = null;
  this.txCharacteristic = null;

  this.deviceType = null;

  this.peripheral = peripheral;

  // service needs to be discovered upon connecting
  this.controllerService = null;
  this.uartService = null;

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

  return new BPromise( function( resolve, reject ){

    // If there is a controller service, we are connected
    if( me.controllerService && me.txCharacteristic ) {

      me.txCharacteristic.write( data, false, function( error ) {
        
        if( error ) {
          reject();
        }
        else {
          resolve();
        }
      });

    }
    else {
      reject( new Error('enableUart was not successfully called.'));
    }
  });


};




Controller.prototype.inspectDevice = function() {

  var me = this;

  return new BPromise(function(resolve, reject){

    me.rxCharacteristic = null;
    me.txCharacteristic = null;
    me.controllerService = null;
    me.uartService = null;

    //
    // Once the peripheral has been connected, then inspect the
    // services and characteristics
     
    var serviceUUIDs = [ me.uuidControllerService, me.uuidUartService ];
    var characteristicUUIDs = [ me.uuidUartRx, me.uuidUartTx ];

    // this seems like it would be the right way, but the noble library
    // is giving an xpcError: connection interrupted so I changed to just
    // discover all services
    me.peripheral.discoverSomeServicesAndCharacteristics(
      serviceUUIDs, characteristicUUIDs, function(err, services, characteristics){


    //me.peripheral.discoverServices([ ], function(err, services) {

      if( err ) {
        reject( err );
      }
      else {
        
        me.controllerService = _.findWhere(services, {uuid: me.uuidControllerService });
        me.uartService = _.findWhere(services, {uuid: me.uuidUartService });

        me.rxCharacteristic = _.findWhere(characteristics, {uuid: me.uuidUartRx });
        me.txCharacteristic = _.findWhere(characteristics, {uuid: me.uuidUartTx });

        if( me.rxCharacteristic && me.txCharacteristic &&
          me.controllerService && me.uartService ) {
          
          // @todo determine device type a better way
          me.deviceType = 1;
          resolve();
        }
        else {
          reject( new Error( 'Device services/characteristics are not compatible'));
        }
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

  return new BPromise( function( resolve, reject ){

    // If there is a controller service, we are connected
    if( me.controllerService && me.txCharacteristic && me.rxCharacteristic ) {

      me.rxCharacteristic.on('read', me.emit.bind(me, 'data'));

      me.rxCharacteristic.subscribe( function () {
        resolve();
      });

      
    }
    else {
      reject( new Error( 'unable to enableUart'));
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

  return new BPromise( function( resolve, reject ){

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

  return new BPromise(function(resolve, reject){

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
            reject( new Error( 'Unknown Device Type'));
          }
        })
        .catch( function(err) {
          reject( err );
        });

      }
    });
  });
          
};


Controller.prototype.disconnect = function() {


  var me = this;

  return new BPromise(function(resolve, reject){

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

