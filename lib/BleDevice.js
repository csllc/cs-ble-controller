/**
 * Object representing a BLE dongle or dongle-like device
 *
 * Keeps track of a device we are monitoring. This object is created in the top-level
 * module when a 'device' is requested and found; it allows inspection of the device 
 * and interaction with its services.
 *
 * At a minimum, it expects the device to support the private CSLLC controller service, 
 * with command, response, product, serial number, status(5) and fault characteristics.
 * 
 * The expected characteristics are defined on a per-dongle basis, with each supported
 * device having its own file in ./device/.
 *
 * Interfaces are bluebird promise-based.
 *
 * Events are emitted as follows:
 * - 'inspecting' - Peripheral inspection started
 * - 'inspected' - Peripheral inspection complete; information is available in this.periphInfo
 * - 'write' - Data written to transparent UART
 * - 'data' - Data received from transparent UART
 * - 'fault' - Fault status changed in controller service
 * - 'writeCharacteristic' - Any peripheral characteristic written
 * - 'sendCommand' - Will send command to peripheral
 * - 'watch' - A watcher has been set up
 * - 'superWatch' - Super-watcher has been set up
 * - 'unwatch' - A watcher has been cleared
 * - 'unwatchAll' - All watchers have been cleared
 * - (characteristic name) - Notification received from subscribed characteristic
 */

// Event emitter library
const EventEmitter = require('events').EventEmitter;

// utility libraries
const util = require('util');
const _ = require( 'underscore');
const promiseRetry = require('promise-retry');
const PromisePool = require('async-promise-pool');

// CS Modbus master
// In a typical application, BleController (our parent module) will be the
// 'device' used to create the application's Modbus master.
// We instantiate our own master in order to execute commands like keySwitch(),
// watch(), unwatch(), etc.; this one is not meant to be exposed to the world.
const Modbus = require('@csllc/cs-modbus');

// Known CS BLE devices
// When adding a new BLE device to support, its definition should be imported here.
const cs1814 = require('./device/cs1814');
const cs1816 = require('./device/cs1816');


module.exports = class BleDevice extends EventEmitter {

  constructor(peripheral, server, options) {
    super();

    this._peripheral = peripheral;
    this._server = server;
    this._options = options;

    this.inspectionComplete = false;

    // Reference to a local Modbus master
    this._master = null;

    // Watcher information
    this._watcherMax = 0;
    this._watcherCb = [];
    this._superWatcherCb = null;

    // Object containing expected service and characteristic UUIDs, and references to
    // them when they're found in this.inspect()
    this.periphInfo = {};

    // Modbus ID of the peripheral itself, populated by this.inspect()
    this.id = null;

    // Human-readable peripheral info, populated by this.inspect().
    this.product = null;
    this.serial = null;
    this.fault = null;

    // Queue for outgoing commands
    this._commandQueue = [];

    // Counter to help match peripheral responses with commands
    this._commandSequence = 0;

    // Select the base periphInfo object
    this._periphInfoBase = {};

    // When adding support for a new BLE peripheral, a clause must be added here
    // to associate its name with its definition.
    switch(this._peripheral.name) {
    case 'CS1814':
      this._periphInfoBase = cs1814;
      break;
    case 'CS1816':
      this._periphInfoBase = cs1816;
      break;
    default:
      let errorMessage = `No peripheral information for ${this._peripheral.name}`;
      throw new Error(errorMessage);
    }

    // Create Modbus master, with ourselves as the device
    this._master = Modbus.createMaster({
      transport: {
        type: 'ip',
        eofTimeout: 10,
        connection: {
          type: 'generic',
          device: this
        }
      },
      suppressTransactionErrors: true,
      retryOnException: false,
      maxConcurrentRequests: 2,
      defaultUnit: this.id,
      defaultMaxRetries: 0,
      defaultTimeout: 1000,
    });

  }


  /**
   * Return a de-duplicated list of all known private service UUIDs.
   * When adding support for a new BLE peripheral, its controller service UUID should
   * be added here.
   */
  static uuids() {
    return Array.from(new Set([
      cs1814.services.controller.uuid,
      cs1816.services.controller.uuid,
    ]));
  }


  /**
   * Return a list of all known device names.
   * When adding support for a new BLE peripheral, its name should be added here.
   */
  static names() {
    return [
      cs1814.name,
      cs1816.name,
    ];
  }

  /**
   * Return a list of all service UUIDs, given a device name.
   * When adding support for a new BLE peripheral, its name and object should
   * be added here.
   */
  static serviceUuids(name) {
    let periphInfo;
    
    switch(name) {
    case 'CS1816':
      periphInfo = cs1816;
      break;
    case 'CS1814':
      periphInfo = cs1814;
      break;
    default:
      periphInfo = null;
    }

    return (periphInfo ? Object.values(periphInfo.services).map(s => s.uuid) : null);
  }


  /**
   * Read a characteristic and return its value
   * 
   * @param {BluetoothRemoteGATTCharacteristic} characteristic
   * @return {Promise} resolves when the characteristic is read
   */
  _readCharacteristic( characteristic ) {

    if (characteristic) {
      return characteristic.readValue()
      .then((data) => {
        return Buffer.from(data.buffer);
      });
    } else {
      return Promise.reject('Characteristic does not exist');
    }

  }


  /**
   * Write a characteristic to the specified value
   * 
   * @param {BluetoothRemoteGATTCharacteristic} characteristic
   * @param {Buffer} value
   * @param {withResponse} boolean
   * @return {Promise} resolves when the write is finished
   */
  _writeCharacteristic( characteristic, value, withResponse ) {
    this.emit('writeCharacteristic', characteristic.uuid, value, withResponse);

    if (withResponse) {
      return characteristic.writeValueWithResponse(value);
    } else {
      return characteristic.writeValue(value);
    }

  }

  /**
   * Write data to the peripheral's transparent UART, i.e., to the Modbus interface. 
   * Ultimately, this operation ends up being broken into one or more 
   * this._writeCharacteristic() calls with the transparent UART TX characteristic, 
   * depending on data length.
   *
   * @param {Buffer}  data  Data to be written
   * @return {promise} Resolves when the write is finished.
   */
  write(data) {

    let uartService = this.periphInfo.services['transparentUart'];
    let txChar = uartService.characteristics['tx'].char;

    if( txChar ) {

      var writePool = new PromisePool({concurrency: 1});

      var index = 0;
      var chunkSize = 20;

      while( index < data.length )
      {
        var bytes = Math.min( data.length - index, chunkSize  );
        var chunk = Buffer.alloc(chunkSize);
        data.copy(chunk, 0, index, index + chunkSize);
        
        writePool.add(() => {
          return this._writeCharacteristic( txChar, chunk, true );
        });

        index += chunkSize;
      }

      promiseRetry((retry, number) => {
        if (number > 1) {
          console.log("BleDevice::write attempt", number);
        }

        this.emit('writeAttempt', number)

        return writePool.all()
        .then(() => {
          this.emit('write', data);
        })
        .catch((e) => {
          console.log("Error at characteristic write:", e.message);
          if (e.message == "GATT operation already in progress.") {
            retry(e);
          } else {
            throw e;
          }
        });
      });

    } else {
      return Promise.reject("No UART TX characteristic");
    }
  }


  /**
   * Queues a command to be sent to the controller, using the peripheral's command/response
   * characteristics.
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
  command( command, callback, options ) {

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
      me._sendNextCommand();
    }

  }


  /**
   * Sends the next queued command to the peripheral
   * 
   * @return {none}
   */
  _sendNextCommand() {

    var me = this;

    if( me.commandQueue.length > 0 ) {

      var command = me.commandQueue[0];

      // Emit what is being sent (probably mostly for diagnostics)
      me.emit( 'sendCommand', command.command );

      let controllerService = me.periphInfo.services['controller'];
      let commandChar = controllerService.characteristics['command'].char;

      me._writeCharacteristic(commandChar, command.command)
      .then(() => {
        command.responseTimer = setTimeout( me._handleResponseTimeout.bind(this), command.options.timeout );
      })
      .catch((err) => {
        command.callback( err );
        me._commandQueue.shift();
        setImmediate( me._sendNextCommand() );
      });
    }

  }


  /**
   * Callback used by the timeout created by this._sendNextCommand() for the currently
   * active command
   *
   * @param {Integer} Timer ID
   * @return {none}
   */
  _handleResponseTimeout( timer ) {

    var me = this;

    if( me._commandQueue.length > 0 ) {

      var command = me._commandQueue[0];

      if( command.responseTimer === timer ) {
        // the command timed out, fail it
        command.callback( new Error('Timeout') );

        me._commandQueue.shift();
        me._sendNextCommand();
      }

    }

  }


  /**
   * Subscribe for notification on updates for a characteristic
   * 
   * @return {Promise} resolves when the subscription is complete
   */
  subscribe( characteristic ) {

    return characteristic.startNotifications();

  }

  
  /**
   * Unsubscribe from notification on updates for a characteristic
   * 
   * @return {Promise} resolves when the subscription is complete
   */
  unsubscribe(characteristic) {
    return characteristic.stopNotifications();
  }


  /**
   * Return the GATT server connection status
   *
   * @return {Boolean}
   */
  checkConnected() {
    return this._server.connected;
  }


  /**
   * Enumerate all GATT services advertised by the BLE peripheral and their
   * characteristics. For services and characteristics listed in the base
   * periphInfo object (assigned to this.periphInfo prior to calling this 
   * method), store references to these objects.
   * 
   * @return {Promise} Resolves when discovery is complete.
   */
  _discoverGattServices() {
    // Get GATT services

    return this._getServices()
    .then((services) => {
      let promises = services.map((service) => {
        this.emit('discoveredService', service.uuid);

        // Save a reference to the service in our periphInfo object

        let matchingService = _.findWhere(this.periphInfo.services,
                                          { uuid: service.uuid });

        if (matchingService) {
          matchingService['service'] = service;
        }
        
        return this._getCharacteristics(service, matchingService);

      });

      return Promise.all(promises);
    })
    .then((characteristics) => {
      // Save references to all of the discovered characteristics
      characteristics = characteristics.flat();

      characteristics.forEach((characteristic) => {

        let serviceUuid = characteristic.service.uuid;
        let charUuid = characteristic.uuid;

        this.emit('discoveredCharacteristic', serviceUuid, charUuid);

        let matchingService = _.findWhere(this.periphInfo.services, { uuid: serviceUuid });

        if (matchingService) {
          // Save a reference to the characteristic in our periphInfo object

          let matchingChar = _.findWhere(matchingService.characteristics, { uuid: charUuid });
          
          if (matchingChar) {
            matchingChar['char'] = characteristic;
          }
        }
      });
    });
  }


  /**
   * Iterate through this.periphInfo and verify that all required services and characteristics
   * were discovered in this._discoverGattServices().
   *
   * @return {Promise} Resolves when verification is complete, rejects with message if any
   *                   items are missing.
   */
  _checkGattServicesAndChars() {

    return new Promise((resolve, reject) => {

      let foundServices = 0;
      let foundChars = 0;

      // Find any missing services or characteristics in this.periphInfo
      for (let [sKey, service] of Object.entries(this.periphInfo.services)) {
        if (!service.service) {
          // Service missing

          let errorMessage = `Peripheral missing GATT service '${sKey}' with UUID ${service.uuid}`;
          reject(errorMessage);
        } else {
          foundServices++;
        }

        for (let [cKey, characteristic] of Object.entries(service.characteristics)) {

          if (!characteristic.char && !characteristic.optional) {
            // Characteristic missing

            let errorMessage = `Peripheral missing characteristic '${cKey}' of GATT service '${sKey}' with UUID ${characteristic.uuid}`;
            reject(errorMessage);
          } else {
            foundChars++;
          }
        }
      }

      resolve({services: foundServices, chars: foundChars});
    });
  }


  /**
   * Enumerate GATT service information and verify the expected characteristics
   * are available on the peripheral. Then read the characteristics of the deviceInformation 
   * service and subscribe to the characteristics of the controller and transparent
   * UART services.
   *
   * @return {Promise} Resolves when inspection is complete
   */
  inspect() {
    // Start with a base periphInfo object, containing service and characteristic UUIDs
    // that we'll search for
    this.periphInfo = Object.assign({}, this._periphInfoBase);

    this.id = this.periphInfo.id;

    this.emit('inspecting');

    // Populate this.periphInfo with discovered services and characteristics
    return this._discoverGattServices()
    .then(() => {
      // Iterate through this.periphInfo and verify that all the expected services and
      // characteristics were found
      return this._checkGattServicesAndChars();
    })
    .then(() => {
      let controllerService = this.periphInfo.services['controller'];

      // Read device info characteristics from the peripheral and save the results in our instance

      let controllerTodo = [
        this._readCharacteristic(controllerService.characteristics['product'].char)
        .then((data) => {
          this.product = data.toString();
        }),

        this._readCharacteristic(controllerService.characteristics['serial'].char)
        .then((data) => {
          this.serial = data.toString();
        }),
        
        this._readCharacteristic(controllerService.characteristics['fault'].char)
        .then((data) => {
          this.fault = data.readUInt8();
        })
      ];

      return Promise.all(controllerTodo);
    })
    .then(() => {
      let deviceInfoService = this.periphInfo.services['deviceInformation'];
      let deviceInfoChars = deviceInfoService.characteristics;

      let todo = [];

      Object.keys(deviceInfoChars).forEach((charKey) => {
        todo.push(
          this._readCharacteristic(deviceInfoChars[charKey].char)
          .then((data) => {
            this.periphInfo[charKey] = data.toString();
          })
        );
      });

      // Using Proimse.allSettled here because some deviceInfo characteristics
      // may not be available. See README.md.
      return Promise.allSettled(todo);
    })
    .then(() => {
      let uartService = this.periphInfo.services['transparentUart'];
      let controllerService = this.periphInfo.services['controller'];

      // Build lists of characteristics to subscribe to
      let uartChars = [ 'control', 'rx' ];
      let controllerChars = [ 'fault' ];

      Object.keys(controllerService.characteristics).forEach((key) => {
        if (key.startsWith('status')) {
          controllerChars.push(key);
          this._watcherMax++;
        }
      });

      if (controllerService.characteristics['superWatcher']) {
        controllerChars.push('superWatcher');
      }

      // Build list of promise chains to execute
      let todo = [];

      uartChars.forEach((charKey) => { todo.push(this.subscribeChar(charKey, uartService)); });
      controllerChars.forEach((charKey) => { todo.push(this.subscribeChar(charKey, controllerService)); });

      return Promise.all(todo);

    })
    .then(() => {
      // Set up a 'data' event that corresponds to the 'rx' characteristic of the
      // transparent UART service for a Modbus master (ours or an application's) to use
      let uartService = this.periphInfo.services['transparentUart'];
      let uartRxChar = uartService.characteristics['rx'].char;
      
      uartRxChar.addEventListener('characteristicvaluechanged', this._handleCharNotify.bind(this, 'data'));

      // Set up 'fault' event that corresponds to the 'fault' characteristic of the
      // controller service
      let controllerService = this.periphInfo.services['controller']
      let controllerFaultChar = controllerService.characteristics['fault'].char;

      controllerFaultChar.addEventListener('characteristicvaluechanged', this._handleCharNotify.bind(this, 'fault'));
      
    })
    .then(() => {
      this.inspectionComplete = true;
      this.emit('inspected');
    });

  }


  /**
   * Subscribe to a characteristic given its 'key' string and reference to the service
   * from this.periphInfo, and an optional callback to called when a notification is received.
   * 
   * @param {String}   charKey   Key of characteristic object in service.characteristics
   * @param {Object}   service   Reference to service in this.periphInfo.services
   * @param {Function} callback  Callback function
   * @return {Promise} Resolves when the subscription is successful and the event listener
   *                   is added to the characteristic
   */
  subscribeChar(charKey, service, callback) {
    let char = service.characteristics[charKey].char;

    // Subscribe to characteristic
    return this.subscribe(char)
    .then(() => {
      // Set up event
      char.addEventListener('characteristicvaluechanged', this._handleCharNotify.bind(this, charKey));

      // Set up callback, if provided
      if (callback) {
        char.addEventListener('characteristicvaluechanged', callback);
      }

    });
  }


  /**
   * Proxy function for watcher characteristic notification callback, which
   * pulls the characteristic value out of the notification event and passes 
   * it to the callback.
   *
   * @param {Function} callback  Callback function to be executed
   * @param {Object}   event     Characteristic notification event 
   * @return {} Return value from original callback
   */
  _watcherCallbackProxy(callback, event) {
    return callback(Buffer.from(event.target.value.buffer));
  }


  /**
   * Unsubscribe from a characteristic given its 'key' string, reference to the service 
   * from this.periphInfo, and callback function
   *
   * @param {String}   charKey   Key of characteristic object in service.characteristics
   * @param {Object}   service   Reference to service in this.periphInfo.services
   * @param {Function} callback  Callback function
   * @return {Promise} Resolves when the unsubscribe operation is successful and the event
   *                   listener is removed
   */
  unsubscribeChar(charKey, service, callback) {
    let char = service.characteristics[charKey].char;

    // Remove event listener
    return new Promise((resolve) => {
      char.removeEventListener('characteristicvaluechanged', this._handleCharNotify.bind(this, charKey))
      // Clear callback, if provided
      if (callback) {
        char.removeEventListener('characteristicvaluechanged', callback);
      }

      resolve();
    })
    .then(() => {
      // Unsubscribe from characteristic      
      return this.unsubscribe(char);
    });
  }


  /**
   * Default notification handler for characteristics, which emits the new values as
   * events using the same name as the characteristic's key in this.periphInfo
   *
   * @param {String} eventName  Name of event to be emitted
   * @param {Object} event      Notification event
   * @return {None}
   */
  _handleCharNotify(eventName, event) {
    this.emit(eventName, Buffer.from(event.target.value.buffer));
  }


  /**
   * Return an object containing peripheral identity information obtained by this.inspect().
   *
   * @return {Promise} Resolves with object containing device information
   */
  getInfo() {
    return new Promise((resolve) =>  {
      resolve({
        systemId: this.periphInfo.systemId,
        manufacturerName: this.periphInfo.manufacturerName,
        modelNumber: this.periphInfo.modelNumber,
        dongleSerialNumber: this.periphInfo.dongleSerialNumber,
        softwareRevision: this.periphInfo.softwareRevision,
        firmwareRevision: this.periphInfo.firmwareRevision,
        hardwareRevision: this.periphInfo.hardwareRevision,
        modbusId: this.periphInfo.id,
        product: this.product,
        serial: this.serial,
      });
    });
  }


  /**
   * Sets the peripheral's configuration via Modbus command, if supported
   * Not fully implemented as of time of writing.
   *
   * @param {Object}   configuration  Peripheral configuration (TBD)
   * @return {Promise} Resolves when the command is complete
   */
  configure(configuration) {
    let configure = this.periphInfo.commands.configure;

    if (configure) {
      return this._modbusCommand(this.id, configure.opCode, Buffer.from([]));
    } else {
      return Promise.reject(`'configure' is not implemented on ${this.periphInfo.modelNumber}`);
    }
  }


  /**
   * Set the keyswitch signal of the peripheral via Modbus command, if supported
   *
   * @param {Boolean}  state  New keyswitch state, true = on, false = off
   * @return {Promise} Resolves when the command is complete
   */
  keyswitch(state) {
    // Check if keyswitch command exists
    let keySwitch = this.periphInfo.commands.keySwitch;

    if (keySwitch) {
      return this._modbusCommand(this.id, keySwitch.opCode, Buffer.from([(state) ? 1 : 0]));
    } else {
      return Promise.reject(`'keyswitch' is not implemented on ${this.periphInfo.modelNumber}`);
    }
    
  }


  /**
   * Sets a watcher on the peripheral via Modbus command, if supported.
   * This associates a 'status' characteristic of the controller service with a
   * memory location on the device connected to the peripheral.
   *
   * @param {Number}    slot     Watcher slot
   * @param {Number}    id       Device ID
   * @param {Number}    address  Device memory address to read
   * @param {Number}    length   Device memory read length
   * @param {Function}  cb       Callback function
   * @return {Promise} Resolves when the command is complete
   */
  watch(slot, id, address, length, cb) {
    let watch = this.periphInfo.commands.watch;

    if (watch) {

      if ((slot >= 0) && (slot < this._watcherMax)) {
        if (length <= watch.maxLen) {
          let controllerService = this.periphInfo.services['controller'];

          let charKey = `status${slot+1}`;

          return this.unsubscribeChar(charKey, controllerService)
          .then(() => {
            return this._modbusCommand(this.id, watch.opCode, Buffer.from([slot, id, (address >> 8), (address & 0xFF), length]));
          })
          .then(() => {
            this._watcherCb[slot] = this._watcherCallbackProxy.bind(this, cb);
            return this.subscribeChar(charKey, controllerService, this._watcherCb[slot]);
          })
          .then(() => {
            this.emit('watch', { event: charKey, slot: slot, id: id, address: address, length: length });
          });
        } else {
          return Promise.reject(`watch: Read length exceeds maximum length of ${watch.maxLen} bytes.`);
        }

      } else {
        return Promise.reject(`watch: Invalid slot ${slot}. Range for ${this.periphInfo.modelNumber} is 0 to ${this._watcherMax-1}.`);
      }
    } else {
      return Promise.reject(`'watch' is not implemented on ${this.periphInfo.modelNumber}`);
    }
  }


  /**
   * Sets the super-watcher on the peripheral via Modbus command, if supported.
   * This associates a 'superWatcher' characteristic of the controller service with
   * one or more single-byte memory locations on the device connected to the peripheral.
   *
   * @param {Number}           id       Device ID
   * @param {Array<Number>}    address  Array of device memory addresses to read
   * @param {Function}         cb       Callback function
   * @return {Promise} Resolves when the command is complete
   */
  superWatch(id, addresses, cb) {
    let superwatch = this.periphInfo.commands.superWatch;

    let supported = this._modbusCommandSupported('superWatch')

    if (supported.supported) {

      let controllerService = this.periphInfo.services['controller'];
      let charKey = "superWatcher";

      return this.unsubscribeChar(charKey, controllerService)
      .then(() => {
        let commandArray = [superwatch.slot, id];

        addresses.forEach((address) => {
          commandArray.push((address >> 8) & 0xFF);
          commandArray.push(address & 0xFF);
        });

        return this._modbusCommand(this.id, superwatch.opCode, Buffer.from(commandArray));
      })
      .then(() => {
        this._superWatcherCb = this._watcherCallbackProxy.bind(this, cb);
        return this.subscribeChar(charKey, controllerService, this._superWatcherCb);
      })
      .then(() => {
        this.emit('superWatch', { event: charKey, slot: superwatch.slot, id: id, addresses: addresses });
      });

    } else {
      return Promise.reject(`'superwatch' is not implemented on ${this.periphInfo.modelNumber}: ${supported.reason}`);
    }
  }


  /**
   * Clears a watcher on the peripheral via Modbus command, if supported.
   *
   * @param {Number}    slot     Watcher slot
   * @return {Promise} Resolves when the command is complete
   */
  unwatch(slot) {
    let unwatch = this.periphInfo.commands.unwatch;
    let superwatch = this.periphInfo.commands.superWatch;

    if (unwatch) {
      let controllerService = this.periphInfo.services['controller'];

      let charKey = null;
      let callback = null;
      let callbackSlot = null;

      if ((slot >= 0) && (slot < this._watcherMax)) {
        charKey = `status${slot+1}`;
        callback = '_watcherCb';
        callbackSlot = slot;
      } else if ((this._modbusCommandSupported('superWatch')) && (slot == superwatch.slot)) {
        charKey = 'superWatcher';
        callback = '_superWatcherCb';
      }

      if (charKey && slot) {
        return this.unsubscribeChar(charKey, controllerService)
        .then(() => {
          return this._modbusCommand(this.id, unwatch.opCode, Buffer.from([slot]));
        })
        .then(() => {
          // Set the watcher's callback to null
          this[callback][callbackSlot] = null;
        })
        .then(() => {
          this.emit('unwatch', { event: charKey, slot: slot });
        });

      } else {
        return Promise.reject(`unwatch: Invalid slot ${slot}. Range for ${this.periphInfo.modelNumber} is 0 to ${this._watcherMax-1}.`);

      }

    } else {
      return Promise.reject(`'unwatch' is not implemented on ${this.periphInfo.modelNumber}`);
    }
  }


  /**
   * Clears all watchers on the peripheral via Modbus command, if supported.
   * 
   * @return {Promise} Resolves when the command is complete
   */
  unwatchAll() {
    let unwatchAll = this.periphInfo.commands.unwatchAll;

    if (unwatchAll) {
      // Unsubscribe from all 'status' watcher and the superWatcher characteristics
      let controllerService = this.periphInfo.services['controller'];

      let statusChars = [];

      Object.keys(controllerService.characteristics).forEach((key) => {
        if (key.startsWith('status')) {
          statusChars.push(key);
        }
      });

      if (controllerService.characteristics['superWatcher']) {
        statusChars.push('superWatcher');
      }

      let todo = [];

      statusChars.forEach((charKey) => { todo.push(this.unsubscribeChar(charKey, controllerService)); });

      return Promise.all(todo)
      .then(() => {
        return this._modbusCommand(this.id, unwatchAll.opCode, Buffer.from([]));
      });
    } else {
      return Promise.reject(`'unwatchAll' is not implemented on ${this.periphInfo.modelNumber}`);
    }
  }


  /**
   * Gets all watchers currently configured on the peripheral via Modbus command, if supported.
   * Results are compiled into an array of objects.
   * 
   * @return {Promise} Resolves into an array of objects, each member corresponding to an 
   *                   active watcher
   */
  getWatchers() {
    if (this._modbusCommandSupported('getWatcher')) {
      let getwatcher = this.periphInfo.commands.getWatcher;
      let watchers = [];

      return this._modbusCommand(this.id, getwatcher.opCode, Buffer.from([getwatcher.params.getWatchers]))
      .then((response) => {
        // Parse the response and build a list of active watchers
        for (let offset = 1; offset < response.values.length; offset += 5) {
          watchers.push({
            slot: response.values.readUInt8(offset),
            id: response.values.readUInt8(offset+1),
            address: response.values.readUInt16BE(offset+2),
            length: response.values.readUInt8(offset+4),
          });
        }

        return watchers;
      });

    } else {
      return Promise.reject(`'getWatchers' is not implemented on ${this.periphInfo.modelNumber}`);
    }
  }


  /**
   * Gets all active members of the peripheral's super-watcher via Modbus command, if supported.
   * Results are compiled into an array of objects.
   *
   * @return {Promise} Resolves into an array of object, each member corresponding to an active
   *                   super-watcher member.
   */
  getSuperWatcher() {
    if (this._modbusCommandSupported('getWatcher')) {
      let getwatcher = this.periphInfo.commands.getWatcher;
      let superWatcherMembers = [];

      return this._modbusCommand(this.id, getwatcher.opCode, Buffer.from([getwatcher.params.getSuperWatcher]))
      .then((response) => {
        // Parse the response and build a list of active super-watcher members
        for (let offset = 3; offset < response.values.length; offset += 2) {
          superWatcherMembers.push({
            address: response.values.readUInt16BE(offset),
          });
        }

        return superWatcherMembers;
      });
    } else {
      return Promise.reject(`'getSuperWatcher' is not implemented on ${this.periphInfo.modelNumber}`);
    }
  }

  readObject(objectId, options) {

    return this._modbusReadObject(this.id, objectId, options);

  }

  writeObject(objectId, values, options) {

    return this._modbusWriteObject(this.id, objectId, values, options);

  }


  /**
   * Checks if the specified command is supported by the currently connected peripheral, first by
   * checking for its existence in this.periphInfo.commands, and then by comparing the
   * command's 'requirements' entry. If any of these conditions are not met, the 'reason' 
   * member of the return value is set to a string detailing the reason.
   *
   * @param {String}  commandKey  Peripheral command in question
   * @return {Object} Object with members:
   *                  'supported' {Boolean}: true if command supported, false if not
   *                  'reason'    {String}:  null if supported == true, string if supported == false
   */
  _modbusCommandSupported(commandKey) {
    let command = this.periphInfo.commands[commandKey];

    let supported = true;
    let reason = null;

    if (command) {
      if (command.requriements) {
        for (let [key, value] of Object.entries(command.requirements)) {
          if (this.periphInfo[key] != value) {
            reason = `'${commandKey}' requires ${key} == ${value}, this peripheral reports ${this.periphInfo[key]}`;
            supported = false;
          }
        }
      }
    } else {
      supported = false;
      reason = `${commandKey} is not defined.`;
    }
    
    return { supported: supported, reason: reason };
  }


  /**
   * Executes a Modbus command against the BLE peripheral itself - not the device it's attached to
   * 
   * @param {Number} dest  Destination address, i.e., address of the peripheral
   * @param {Number} id  Command opcode
   * @param {Array<Number>} values  Array of parameters for the Modbus command
   * @param {Object} options  Options for the Modbus master
   * @return {Promise} Resolves with result of command, if any
   */
  _modbusCommand(dest, id, values, options) {

    let me = this;

    return new Promise((resolve, reject) => {

      options = options || {};
      options.timeout = 5000;

      options.onComplete = function(err, response) {
        if (response && response.exceptionCode) {
          // i'm not sure how to catch exception responses from the
          // slave in a better way than this
          err = new Error('Exception ' + response.exceptionCode);
        }

        if (err) {
          reject(err);
        } else {
          if (response.values && response.values[0] === 0) {
            resolve(response);
          } else {
            reject('Error issuing command ' + id);
          }
        }
      };

      options.unit = dest;

      this._master.command(id, values, options);
    });
  }


  _modbusReadObject(dest, id, options) {
    let me = this;

    return new Promise((resolve, reject) => {

      options = options || {};
      options.timeout = 5000;
      options.maxRetries = 0;

      options.onComplete = function(err, response) {
        if (response && response.exceptionCode) {
          // i'm not sure how to catch exception responses from the
          // slave in a better way than this
          err = new Error('Exception ' + response.exceptionCode);
        }

        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      };

      options.unit = dest;

      this._master.readObject(id, options);
    });

  }

  _modbusWriteObject(dest, id, values, options) {
    let me = this;

    return new Promise((resolve, reject) => {

      options = options || {};
      options.timeout = 5000;

      options.onComplete = function(err, response) {
        if (response && response.exceptionCode) {
          // i'm not sure how to catch exception responses from the
          // slave in a better way than this
          err = new Error('Exception ' + response.exceptionCode);
        }

        if (err) {
          reject(err);
        } else {
          if (response && response.status === 0) {
            resolve(response);
          } else {
            reject('Error writing object ' + id + ': ' + response.values);
          }
        }
      };

      options.unit = dest;

      this._master.writeObject(id, values, options);
    });
  }

  /**
   * Enumerate GATT services of the connected device.
   * 
   * This function was broken out of this._discoverGattServices due to slight
   * differences in how the 'real' Web Bluetooth implementation works versus
   * how the noble-based implementation works.
   *
   * @return {Promise} Resolves with array when services list is available
   */
  _getServices() {
    if (this._options.usingNodeModule) {
      // If we're using the NodeJS web-bluetooth module, just use the provided
      // function
      return this._server.getPrimaryServices()
    } else {
      // Otherwise, iterate through the BLE dongle's list of services and
      // request each service
      let promises = [];

      module.exports.serviceUuids(this._peripheral.name).forEach((serviceUuid) => {
        promises.push(this._server.getPrimaryService(serviceUuid));
      })

      return Promise.all(promises);
    }
  }


  /**
   * Enumerate GATT characteristics for a given service of the connected device.
   * 
   * This function was broken out of this._discoverGattServices due to slight
   * differences in how the 'real' Web Bluetooth implementation works versus
   * how the noble-based implementation works.
   *
   * @return {Promise} Resolves with array when characteristics list is available
   */
  _getCharacteristics(service, matchingService) {
    if (this._options.usingNodeModule) {
      return service.getCharacteristics();
    } else {
      // Read characteristics
      let charPromises = [];

      Object.values(matchingService.characteristics).forEach((charInfo) => {
        charPromises.push(
          service.getCharacteristic(charInfo.uuid)
        );
      });

      return Promise.allSettled(charPromises)
      .then((promises) => {
        let characteristics = [];
        
        promises = promises.flat();

        promises.forEach((promise) => {
          if (promise.status == 'fulfilled') {
            characteristics.push(promise.value);
          }
        })

        return characteristics;
      })

    }
  }

  /**
   * Returns whether the connection is open for Modbus use
   *
   * @return {Boolean} True if open, false otherwise
   */
  isOpen() {
    // If inspection completed successfully, it's safe to assume that we can support
    // a Modbus master
    return this.inspectionComplete;
  }

}
