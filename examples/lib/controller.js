// Object representing a CS1108 or Phoenix motor controller

const modbusCommands = {
  'reset': { id: 0xFB, value: [ 0x01 ] },
};

module.exports = class Controller {
  constructor(options) {
    this.master = options.master;
    this.id = options.id
  }

  // Read device memory using the MODBUS read memory function code
  // returns a Promise that resolves when the read is complete
  readMemory(address, length, options) {

    let me = this;

    return new Promise(function(resolve, reject) {

      options = options || {};

      options.onComplete = function(err, response) {
        if (response && response.exceptionCode) {
          // i'm not sure how to catch exception responses from the
          // slave in a better way than this
          err = new Error('Exception ' + response.exceptionCode);
        }
        if (err) {
          reject(err);
        } else {
          resolve(response.values);
        }
      };

      //options.onError = reject;
      options.unit = me.id;

      me.master.readMemory(address, length, options);

    });
  }

  // Write to device memory using the MODBUS write memory function code
  // returns a Promise that resolves when the write is complete
  writeMemory(address, data, options) {

    let me = this;

    return new Promise(function(resolve, reject) {

      options = options || {};

      options.onComplete = function(err, response) {
        if (response && response.exceptionCode) {
          // i'm not sure how to catch exception responses from the
          // slave in a better way than this
          err = new Error('Exception ' + response.exceptionCode);
        }
        if (err) {
          reject(err);
        } else {
          if (response.status === 0) {
            resolve();
          } else {
            reject('Error writing to device ');
          }
        }
      };

      options.unit = me.id;

      me.master.writeMemory(address, data, options);

    });
  }

  // Write to device memory and verify using the MODBUS verified write memory
  // function code
  // returns a Promise that resolves when the write is complete
  writeMemoryVerify(address, data, options) {

    let me = this;

    return new Promise(function(resolve, reject) {

      options = options || {};

      options.onComplete = function(err, response) {
        if (response && response.exceptionCode) {
          // i'm not sure how to catch exception responses from the
          // slave in a better way than this
          err = new Error('Exception ' + response.exceptionCode);
        }
        if (err) {
          reject(err);
        } else {
          if (response.status === 0) {
            resolve();
          } else {
            reject('Error writing to device ');
          }
        }
      };

      options.unit = me.id;

      me.master.writeMemoryVerify(address, data, options);

    });
  }

  // Send a command PDU to the device
  command(id, values, options) {

    let me = this;

    return new Promise(function(resolve, reject) {

      options = options || {};

      options.onComplete = function(err, response) {
        if (response && response.exceptionCode) {
          // i'm not sure how to catch exception responses from the
          // slave in a better way than this
          err = new Error('Exception ' + response.exceptionCode);
        }
        // console.log(response);
        if (err) {
          reject(err);
        } else {
          resolve(response.values);
        }
      };

      options.unit = me.id;

      me.master.command(id, values, options);

    });
  }

  reset(options) {
    return this.command(modbusCommands['reset'].id,
                        Buffer.from(modbusCommands['reset'].value),
                        options)
    .catch((err) => {
      console.error(err);
      return;
    });
  }


}
