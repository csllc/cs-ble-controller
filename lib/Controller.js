/**
 * Object representing a controller
 *
 * Keeps track of a controller we are monitoring.  This object is created when a 
 * 'peripheral' is scanned; it allows inspection of the peripheral and interaction with its
 * services.
 *
 * At a minimum, it expects the peripheral to support the controller service, with 
 * command, response, product, serial number, and fault characteristics.
 *
 * Upon connection, the product's memory map is determined.  Items in the memory map
 * can be read or written using the readMap and writeMap methods.
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

// basic memory map item definition
var Register = require('./Register');

// helper library for manipulating buffers
var Buffers = require( 'h5.buffers' );

/**
 * Recursively find registers in a register map object
 * 
 * @param  {[type]} mapItem [description]
 * @param {function} wrapFunc Function to wrap the register before it is appended to the list
 * @return {array}  array containing wrapped Register objects
 */
function buildRegisterList( mapItem, wrapFunc ) {

  var result = [];

  if( mapItem instanceof Register ) {

    if( 'function' === typeof(wrapFunc) ) {
      result.push( wrapFunc(mapItem));
    }
    else {
      result.push( mapItem );

    }

  }
  else if( 'object' === typeof( mapItem )) {

    for (var prop in mapItem) {
      if( mapItem.hasOwnProperty( prop ) ) {
        result = result.concat( buildRegisterList( mapItem[ prop ], wrapFunc ));
      }
    }

  }

  return result;
}


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

  // store the characteristics when discovered
  //this.rxCharacteristic = null;
  //this.txCharacteristic = null;

  this.commandChar = null;
  this.responseChar = null;
  this.productChar = null;
  this.serialChar = null;
  this.faultChar = null;
  this.positionChar = null;

  // The type of product(model)
  this.deviceType = null;

  // store the whole peripheral reference
  this.peripheral = peripheral;

  // service needs to be discovered upon connecting
  this.controllerService = null;
  //this.uartService = null;
  //
  
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

  return( this.peripheral && this.controllerService );

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

};

Controller.prototype.onFault = function( fault ) {
  //console.log( 'on fault: ', fault );
};




/**
 * Uses the deviceType, etc to determine the memory map to use when interacting with the device
 *
 * @throws {Error} If the device type is unknown
 */
Controller.prototype.determineMap = function() {

  var Constructor;

  switch( this.deviceType ) {
    case 'CS1108':
      Constructor = require('./maps/cs1108/cs1108_default');
      this.map = new Constructor();
      break;

    default:
      throw new Error( 'Cannot determine memory map for unknown device type' );
  }
};


Controller.prototype.inspectDevice = function() {

  var me = this;

  return new BPromise(function(resolve, reject){

    me.commandChar = null;
    me.responseChar = null;
    me.productChar = null;
    me.serialChar = null;
    me.faultChar = null;

    //
    // Once the peripheral has been connected, then inspect the
    // services and characteristics
     
    var serviceUUIDs = [ 
      me.uuidControllerService, 
      me.uuidLocationService 
      ];

    var characteristicUUIDs = [ 
      me.uuidCommand, 
      me.uuidResponse,
      me.uuidProduct,
      me.uuidSerial,
      me.uuidFault,

      me.uuidPosition 
      ];

      // interrogate the device for the stuff we care about
      // We could also use me.peripheral.discoverServices([ ], function(err, services)
      // Which would just read all without filtering
    //me.peripheral.discoverServices([ ], function(err, services) {
    
    //me.peripheral.discoverAllServicesAndCharacteristics( function(err, services, characteristics) {
  
    me.peripheral.discoverSomeServicesAndCharacteristics(
      serviceUUIDs, characteristicUUIDs, function(err, services, characteristics){

      //me.peripheral.discoverServices(serviceUUIDs, function( err, services ) {

//console.log( serviceUUIDs );

        //console.log( services );
        //var characteristics = services[0].characteristics;
        //console.log( characteristics );
      if( err ) {
        reject( err );
      }
      else {
        
        me.controllerService = _.findWhere(services, {uuid: me.uuidControllerService });
        //me.uartService = _.findWhere(services, {uuid: me.uuidUartService });

        me.commandChar = _.findWhere(characteristics, {uuid: me.uuidCommand });
        me.responseChar = _.findWhere(characteristics, {uuid: me.uuidResponse });
        me.productChar = _.findWhere(characteristics, {uuid: me.uuidProduct });
        me.serialChar = _.findWhere(characteristics, {uuid: me.uuidSerial });
        me.faultChar = _.findWhere(characteristics, {uuid: me.uuidFault });

        me.positionChar = _.findWhere(characteristics, {uuid: me.uuidPosition });

        //console.log( me.faultChar.uuid );
        //console.log( me.responseChar.uuid );
        //console.log( me.productChar.uuid );
        //console.log( me.serialChar.uuid );
        //console.log( me.commandChar.uuid );

        // Make sure the device has all the expected characteristics
        if( me.commandChar && 
          me.responseChar &&
          me.controllerService && 
          me.productChar &&
          me.serialChar &&
           me.faultChar ) {
          
          // read the characteristics
          me.readCharacteristic( me.productChar )
          .then( function( product ) {
            console.log( 'Product: ', product.toString() );

            me.deviceType = product.toString();
          })
          .then( function() { return me.readCharacteristic( me.serialChar ); })
          .then( function( serial ) {
            me.serial = serial.toString();
          })
          .then( function() { return me.readCharacteristic( me.faultChar ); })
          .then( function( fault ) {
            me.fault = fault[0];
          })
          .then( function() {

            // Catch emitted events from this controller
            me.responseChar.on('data', me.onResponse.bind(me));
            me.faultChar.on('data', me.onFault.bind(me));

            me.determineMap();

            //console.log( 'Memory Map: ', me.map );
            
          })
          .then( function() { return me.subscribe( me.responseChar ); })
          .then( function() { return me.subscribe( me.faultChar ); })

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
 * Set up to send and receive data over the UART TX and RX characteristics
 * 
 * @return {[type]} [description]
 */
/*
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
*/

/**
 * Set up to send and receive data over the UART TX and RX characteristics
 * 
 * @return {[type]} [description]
 */
/*
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
*/

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


Controller.prototype.readRegister = function( reg ) {

  var me = this;

  return new BPromise(function(resolve, reject){

    //console.log( 'Reading register ', reg);
    //console.log( ' seq ' + me.commandSequence );


    var builder = new Buffers.BufferBuilder();

    builder
      .pushUInt8( me.commandSequence )
      .pushUInt8( me.map.READ_COMMAND )
      .pushUInt16( reg.addr, false )
      .pushUInt8( reg.length );

    me.command( builder.toBuffer(), function( err, value ) {

      if( err ) {
        reject( err );

      }
      else {
        // set the value and return the register object
        reg.set( value );
        resolve( reg );
      }
    });

  });

};


Controller.prototype.readMap = function( mapItem ) {

  var me = this;

  return new BPromise(function(resolve, reject){

    var list = buildRegisterList( mapItem );

    var todo = [];

    _.each( list, function( reg ) {
      todo.push( me.readRegister( reg ));
    });
    //console.log( 'list: ', list );

    BPromise.all( todo )
    .then( function( result ) {

      resolve( result);
    })
    .catch( function(err) {

      reject( err );
    });

  });
          
};



Controller.prototype.onPosition = function( data ) {

  var reader = new Buffers.BufferReader( data );

  // make sure it's a complete message
  if( reader.length >= 13 ) {

    this.emit( 'position', {
      valid: reader.shiftByte(),
      latitude: reader.shiftUInt32( false ),
      longitude: reader.shiftUInt32( false ),
      ephe: reader.shiftUInt32( false ),

    });
  }
};


Controller.prototype.watchPosition = function() {

  var me = this;

  if( me.positionChar ) {

    me.positionChar.on('data', me.onPosition.bind(me));
    return me.subscribe( me.positionChar )
    .then( function() { return me.readCharacteristic( me.positionChar ); });
  }

};


Controller.prototype.getPosition = function() {

  var me = this;

  if( me.positionChar ) {

    return me.readCharacteristic( me.positionChar );
  }

};


/**
 * Exports
 *
 * @ignore
 */
module.exports = Controller;

