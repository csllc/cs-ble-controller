/**
 * Object representing a controller
 *
 * Keeps track of a controller we are monitoring.  This object is created when a 
 * 'peripheral' is scanned; it allows inspection of the peripheral and interaction with its
 * services.
 *
 * At a minimum, it expects the peripheral to support the controller service, with 
 * command, response, product, serial number, status(5) and fault characteristics.
 *
 * Interfaces are bluebird promise-based.
 *
 * Events are emitted as follows:
 *
 * connect:
 * Emitted when the BLE connection is made to the peripheral.
 * This is NOT the same as being ready to use the controller, as it occurs
 * BEFORE the device is interrogated and validated.  Use the 'ready' event
 * or the resolution of the connect() promise to determine when the controller is ready
 * to use. 
 *
 * disconnect:
 * Emitted when the BLE connection to the peripheral is lost.  You can basically 
 * delete this object at this point and create another one when a connection is
 * (re) established
 *
 */

'use strict';

// utility library
var util = require( 'util');

// include class that allows us to emit events
var EventEmitter = require('events').EventEmitter;

// utiity library
var _ = require( 'underscore');

// Promise library
var BPromise = require('bluebird');


/**
* Constructor
* 
* @param {[type]} peripheral [description]
*/
function Controller( peripheral, options ) {

  // subclass to event emitter
  EventEmitter.call( this );

  options = options || {};

  //------------------------------------//---------------------------------------
  // Definitions for BLE UUIDs 

  // UUID for the transparent data (UART) service
  this.uuidUartService = '49535343fe7d4ae58fa99fafd205e455';
  this.uuidRx          = '495353431e4d4bd9ba6123c647249616';
  this.uuidTx          = '49535343884143f4a8d4ecbe34729bb3';
  this.uuidUartControl = '495353434c8a39b32f49511cff073b7e';

  // UUID for the CSLLC private controller service
  this.uuidLocationService = '7765ed1f4de149e14771a14380c90000';
  // the characteristics for the Location service
  this.uuidPosition = '7765ed1f4de149e14771a14380c90001';


  // UUID for the CSLLC private controller service
  this.uuidControllerService = '6765ed1f4de149e14771a14380c90000';

  // the characteristics for the Controller service
  this.uuidCommand = '6765ed1f4de149e14771a14380c90001';
  this.uuidResponse = '6765ed1f4de149e14771a14380c90002';
  this.uuidProduct = '6765ed1f4de149e14771a14380c90003';
  this.uuidSerial = '6765ed1f4de149e14771a14380c90004';
  this.uuidFault =  '6765ed1f4de149e14771a14380c90005';
  this.uuidStatus =  '6765ed1f4de149e14771a14380c90006';
  this.uuidStatus2 =  '6765ed1f4de149e14771a14380c90007';
  this.uuidStatus3 =  '6765ed1f4de149e14771a14380c90008';
  this.uuidStatus4 =  '6765ed1f4de149e14771a14380c90009';
  this.uuidStatus5 =  '6765ed1f4de149e14771a14380c9000a';

  // UART service characteristics
  this.rxCharacteristic = null;
  this.txCharacteristic = null;
  this.uartCharacteristic = null;

  this.commandChar = null;
  this.responseChar = null;
  this.productChar = null;
  this.serialChar = null;
  this.faultChar = null;
  this.StatusChar = null;
  this.Status2Char = null;
  this.Status3Char = null;
  this.Status4Char = null;
  this.Status5Char = null;

  this.positionChar = null;

  // Info about this device that is discovered when connected
  this.deviceType = null;
  this.serial = null;
  this.fault = null;

  // store the whole peripheral reference
  this.peripheral = peripheral;

  // service needs to be discovered upon connecting
  this.controllerService = null;
  this.uartService = null;
  
  // the fd member indicates whether the 'serial port' is open or not
  this.fd = null;


  this.defaultTimeout = options.defaultTimeout || 1000;

  // Queue for outgoing commands
  this.commandQueue = [];

  // Counter to help match device responses with commands
  this.commandSequence = 0;

  // Pass noble BLE events through to our user
  this.peripheral.on('connect', this.emit.bind(this, 'connect'));
  this.peripheral.on('disconnect', this.emit.bind(this, 'disconnect'));

}

// Add event emitter functionality to our class
util.inherits( Controller, EventEmitter );


/**
 * Test to see if we are connected to a device
 * 
 * @return {Boolean} true if connnected
 */
Controller.prototype.isConnected = function() {

  return( this.peripheral && this.controllerService && this.uartService );

};


/**
 * Read a characteristic and return its value
 * 
 * @return {Promise} resolves when the characteristic is read
 */
Controller.prototype.readCharacteristic = function( characteristic ) {

  var me = this;

  return new BPromise( function( resolve, reject ){

    // If there is a controller service, we are connected
    if( me.isConnected() ) {

      characteristic.read( function( err, data ) {

      resolve(data);

      });
     
    }
    else {
      reject();
    }
  });

};


/**
 * Write a characteristic to the specified value
 * 
 * @return {Promise} resolves when the write is finished
 */
Controller.prototype.writeCharacteristic = function( characteristic, value ) {

  var me = this;

  return new BPromise( function( resolve, reject ){

    // If there is a controller service, we are connected
    if( me.isConnected() ) {

      characteristic.write( value, function( err, data ) {
        if( err ) {
          reject( err );
        }
        else {
          resolve( data );
        }

      });
     
    }
    else {
      reject();
    }
  });

};


/**
 * Subscribe for notification on updates for a characteristic
 *
 *
 *
 * 
 * @return {Promise} resolves when the subscription is complete
 */
Controller.prototype.subscribe = function( characteristic ) {

  //var me = this;

  return new BPromise( function( resolve, reject ){

    characteristic.subscribe(function(err) {
      if( err ) {
        reject( new Error( 'Failed to subscribe to characteristic'));
      }
      else {
        resolve();
      }
    });
  });

};

Controller.prototype.onResponse = function( response ) {

/*
  var me = this;

  var reader = new Buffers.BufferReader( response );

  if( reader.length >= 2 ) {
    var seq = reader.shiftUInt8();
    var code = reader.shiftUInt8();
    var data = reader.shiftBuffer( reader.length );

    console.log( 'Rx Response seq: ' + seq + ' code: ' + code + ' buf: ', data );

    if( me.commandQueue.length > 0 ) {

      var command = me.commandQueue[0];

      if( command.sequence === seq ) {
        // this is a response we are waiting for
        // notify the callback      
        command.callback( null, data );

        // discard the queued command and send the next one
        me.commandQueue.shift();
        me.sendNextCommand();
      }
      else {
        console.log( 'Rxd sequence ' + seq + ' while waiting for ' + command.sequence );
      }

    }
  }
  */

};


/**
 * Query the characteristics of the connected device
 */
Controller.prototype.inspectDevice = function() {

  var me = this;

  return new BPromise(function(resolve, reject){

    me.commandChar = null;
    me.responseChar = null;
    me.productChar = null;
    me.serialChar = null;
    me.faultChar = null;
    me.statusChar = null;
    me.status2Char = null;
    me.status3Char = null;
    me.status4Char = null;
    me.status5Char = null;

    //
    // Once the peripheral has been connected, then inspect the
    // services and characteristics
     
    var serviceUUIDs = [ 
      me.uuidControllerService, 
      me.uuidLocationService,
      me.uuidUartService 
      ];

    var characteristicUUIDs = [ ];

    // interrogate the device for the stuff we care about
    // We could also use me.peripheral.discoverServices([ ], function(err, services)
    // Which would just read all without filtering
    //me.peripheral.discoverServices([ ], function(err, services) {
    
    //me.peripheral.discoverAllServicesAndCharacteristics( function(err, services, characteristics) {
  
    me.peripheral.discoverSomeServicesAndCharacteristics(
      serviceUUIDs, characteristicUUIDs, function(err, services, characteristics){

      if( err ) {
        reject( err );
      }
      else {
        
        me.controllerService = _.findWhere(services, {uuid: me.uuidControllerService });
        me.uartService = _.findWhere(services, {uuid: me.uuidUartService });

        me.commandChar = _.findWhere(characteristics, {uuid: me.uuidCommand });
        me.responseChar = _.findWhere(characteristics, {uuid: me.uuidResponse });
        me.productChar = _.findWhere(characteristics, {uuid: me.uuidProduct });
        me.serialChar = _.findWhere(characteristics, {uuid: me.uuidSerial });
        me.faultChar = _.findWhere(characteristics, {uuid: me.uuidFault });
        me.statusChar = _.findWhere(characteristics, {uuid: me.uuidStatus });
        me.status2Char = _.findWhere(characteristics, {uuid: me.uuidStatus2 });
        me.status3Char = _.findWhere(characteristics, {uuid: me.uuidStatus3 });
        me.status4Char = _.findWhere(characteristics, {uuid: me.uuidStatus4 });
        me.status5Char = _.findWhere(characteristics, {uuid: me.uuidStatus5 });

        me.txCharacteristic = _.findWhere(characteristics, {uuid: me.uuidTx });
        me.rxCharacteristic = _.findWhere(characteristics, {uuid: me.uuidRx });
        me.uartCharacteristic = _.findWhere(characteristics, {uuid: me.uuidUartControl });
        
        me.positionChar = _.findWhere(characteristics, {uuid: me.uuidPosition });

        // Make sure the device has all the expected characteristics
        if( me.commandChar && 
          me.responseChar &&
          me.controllerService && 
          me.productChar &&
          me.serialChar &&
          me.faultChar &&
          me.statusChar &&
          me.status2Char &&
          me.status3Char &&
          me.status4Char &&
          me.status5Char &&
          me.txCharacteristic &&
          me.rxCharacteristic &&
          me.uartCharacteristic
          ) {
          
          // read the characteristics
          me.readCharacteristic( me.productChar )
          .then( function( product ) {
            me.deviceType = product.toString();
          })
          .then( function() { return me.readCharacteristic( me.serialChar ); })
          .then( function( serial ) {
            me.serial = serial.toString();
          })
          .then( function() { return me.readCharacteristic( me.faultChar ); })
          .then( function( fault ) {
            me.fault = fault;
          })
          .then( function() {

            // Catch emitted events from this controller
            me.statusChar.on('data', me.emit.bind(me, 'status'));
            me.status2Char.on('data', me.emit.bind(me, 'status2'));
            me.status3Char.on('data', me.emit.bind(me, 'status3'));
            me.status4Char.on('data', me.emit.bind(me, 'status4'));
            me.status5Char.on('data', me.emit.bind(me, 'status5'));
            me.faultChar.on('data', me.emit.bind(me, 'fault'));

            me.rxCharacteristic.on('data', me.emit.bind(me, 'data'));

            me.responseChar.on('data', me.onResponse.bind(me));
            
          })
          .then( function() { return me.subscribe( me.responseChar ); })
          .then( function() { return me.subscribe( me.faultChar ); })
          .then( function() { return me.subscribe( me.statusChar ); })
          .then( function() { return me.subscribe( me.status2Char ); })
          .then( function() { return me.subscribe( me.status3Char ); })
          .then( function() { return me.subscribe( me.status4Char ); })
          .then( function() { return me.subscribe( me.status5Char ); })
          .then( function() { return me.subscribe( me.uartCharacteristic ); })
          .then( function() { return me.subscribe( me.rxCharacteristic ); })

          .then( function() { 
            resolve();
          })

          .catch( function( err ) {
            reject( err );
          });

            
        }
        else {
          reject( new Error( 'Device services/characteristics are not compatible'));
        }
      }

    });
  });

};


/**
 * Write data to the transparent UART characteristic
 */
Controller.prototype.write = function( data ) {

  var me = this;

  //console.log( 'Controller::write', data );

  if( me.txCharacteristic ) {

    var writes = [];

    var index = 0;
    var chunkSize = 20;

    while( index < data.length )
    {
      var bytes = Math.min( data.length - index, chunkSize  );
      var chunk = data.slice( index, index+chunkSize );
      
      writes.push( me.writeCharacteristic( me.txCharacteristic, chunk ));
      index += chunkSize;
    }

    BPromise.all( writes )
    .then( function(  ) {

      //resolve( result);
    })
    .catch( function() {

      //reject( err );
    });

  }

};



/**
 * Attempt to connect to the device
 *
 * If a bluetooth connection is established, the device is inspected
 * and its type, serial number, and memory map are determined.
 * 
 * @return {[Promise]} resolves when the device is connected
 */
Controller.prototype.connect = function() {


  var me = this;

  return new BPromise(function(resolve, reject){

    // Make a bluetooth connection to the device
    me.peripheral.connect(function(err) {
      
      if( err ) {
        reject( err );
      }
      else {

        // interrogate the device type, etc and register for events
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

/**
 * Disconnects from the peripheral
 * 
 * @return {[type]} [description]
 */
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



Controller.prototype.sendNextCommand = function() {

  var me = this;

  if( me.commandQueue.length > 0 ) {

    var command = me.commandQueue[0];

    if(0) {
      console.log( 'send cmd: ', command );
    }

    // Emit what is being sent (probably mostly for diagnostics)
    me.emit( 'sendCommand', command.command );

    me.writeCharacteristic( me.commandChar, command.command , function (err)  {

        if( err ) {
          command.callback( err );
          me.commandQueue.shift();
          setImmediate( me.sendNextCommand() );

        }
        else {

          //if( me.queue[0].response ) {
            // wait for a response
            command.responseTimer = setTimeout( me.handleResponseTimeout.bind(this), command.options.timeout );
          //}
          //else {
          //  me.queue[0].callback( null, null );
          //  me.queue.shift();
          //  setImmediate( me.sendNextCommand.bind(me) );
          //}

        }

      });
  }
};


Controller.prototype.handleResponseTimeout = function( timer ) {

  var me = this;

  console.log( 'timeout ', timer  );

  if( me.commandQueue.length > 0 ) {

    var command = me.commandQueue[0];

    if( command.responseTimer === timer ) {
      // the command timed out, fail it
      command.callback( new Error('Timeout') );

      me.commandQueue.shift();
      me.sendNextCommand();
    }

  }

};


/**
 * Sends a command to the controller, using the command/response characteristics
 *
 * The command is queued and is read as soon as earlier commands are completed.
 * A device command consists of 4 bytes (sequence, function, addrHi, addrLow)
 * followed by up to 16 bytes of data
 * 
 * @param  {[type]}   command  [description]
 * @param  {[type]}   data     [description]
 * @param  {Function} callback [description]
 * @param  {[type]}   options  [description]
 * @return {[type]}            [description]
 */
Controller.prototype.command = function( command, callback, options ) {

  var me = this;

  options = options || {};
  options.timeout = options.timeout || me.defaultTimeout;

  me.commandQueue.push( {
    command: command,
    sequence: me.commandSequence,
    responseTimer: null,
    options: options,
    callback: callback
  });

  // increment the sequence number to help us match the response from the device
  // with the command we sent
  me.commandSequence = (me.commandSequence + 1) & 0xFF;

  if( me.commandQueue.length === 1 ) {
    // try to start the command
    me.sendNextCommand();
  }

};


/**
 * Exports
 *
 * @ignore
 */
module.exports = Controller;

