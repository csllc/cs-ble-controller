// This demo script scans for CS1816 BLE dongles, connects to the first one found, and
// inspects it. Then it reads and writes memory using the transparent UART, and sets up
// and clears several watchers. Almost all features of @csllc/cs-mb-ble are demonstrated here.
//
// This is more or less a re-implementation of @csllc/cs1816-demo. The main difference is
// that this demo uses @csllc/cs-mb-ble, which uses webbluetooth instead of
// @abandonware/noble directly.

// Increase Node's event listener limit - we know what we're doing
import EventEmitter from 'node:events';
EventEmitter.prototype._maxListeners = 50;

// CS Modbus library
import * as Modbus from '@csllc/cs-modbus';

import PromisePool from 'async-promise-pool';

// For pretty printing
import chalk from 'chalk';
const error = chalk.bold.red;
const label = chalk.blue;

// Our BLE library
import  BleController from '../index.js';

// Motor controller library
import Controller from './lib/controller.js';

// ID of motor controller
const CONTROLLER_ID = 0x01;

// Create BLE instance
let ble = new BleController({
  uuid: 'default',
  autoConnect: true, // Use first device found
});

// Create Modbus master
let master = Modbus.createMaster({
  transport: { type: 'ip',
               eofTimeout: 10,
               connection: {
                 type: 'generic',
                 device: ble
               }
             },
  suppressTransactionErrors: true,
  retryOnException: false,
  maxConcurrentRequests: 2,
  defaultUnit: CONTROLLER_ID,
  defaultMaxRetries: 0,
  defaultTimeout: 5000,
});

// Create motor controller
let controller = new Controller({
  master: master,
  id: CONTROLLER_ID,
});


ble.getAvailability()
.then(() => {
  ble.on('availabilitychanged', (event) => {
    console.log(label("BLE availability changed"), event);
  });

  ble.on('gattserverdisconnected', (event) => {
    console.log(label("BLE connection lost"), event);
  });

  ble.on('scanStart', (filter) => {
    console.log(label("Scanning started using filter"), filter);
  });

  ble.on('scanStop', () => {
    console.log(label("Scanning stopped"));
  });

  ble.on('discover', (newDevice) => {
    console.log(label("Discovered BLE device:"), newDevice);
  });

  ble.on('inspecting', () => {
    console.log(label("Inspecting BLE dongle..."));
  });

  ble.on('inspected', () => {
    console.log(label("Inspection complete."));

    ble.getInfo()
    .then((info) => {
      console.log(label("Device information:"));
      console.log("  System ID:             ", info.systemId);
      console.log("  Manufacturer:          ", info.manufacturerName);
      console.log("  Model Number:          ", info.modelNumber);
      console.log("  Serial Number:         ", info.dongleSerialNumber);
      console.log("  Software Revision:     ", info.softwareRevision);
      console.log("  Firmware Revision:     ", info.firmwareRevision);
      console.log("  Hardware Revision:     ", info.hardwareRevision);
      console.log("  Dongle Modbus ID:      ", info.modbusId);
      console.log("  Product:               ", info.product);
      console.log("  Product Serial Number: ", info.serial);
    });
  });

  ble.on('connecting', () => {
    console.log(label("Connecting..."));
  });

  ble.on('connected', () => {
    console.log(label("Connected."));
  });

  ble.on('ready', () => {
    console.log(label("Ready."));

    ble.configure({})
    // .then(() => ble.keyswitch(true))
    .then(() => memoryTest())
    .then(() => setWatchers());
    // .then(() => testPseudoEE());

  });

  ble.on('disconnecting', () => {
    console.log(label("Disconnecting..."));
  });

  ble.on('disconnected', () => {
    console.log(label("Disconnected."));
  });

  ble.on('data', (data) => {
    console.log(label("RX"), data);
  });

  ble.on('write', (data) => {
    console.log(label("TX"), data);
  });

  ble.on('fault', (data) => {
    console.log(label("Fault"), data);
  });

  // ble.on('writeCharacteristic', (uuid, data) => {
  //   console.log("writeCharacteristic", uuid, data);
  // });

  ble.on('watch', (watcherData) => {
    console.log(label("Watcher set"), watcherData);
  });

  ble.on('superWatch', (watcherData) => {
    console.log(label("Super-watcher set"), watcherData);
  });

  ble.on('unwatch', (watcherData) => {
    console.log(label("Watcher unset"), watcherData);
  });

  // Start scanning for devices and connect automatically
  ble.startScanning()
  .then((device) => {
    return ble.open()
    .catch((error) => {
      console.error("Error opening device", error);
    });
  });

});

function memoryTest() {

  let pool = new PromisePool({concurrency: 1});

  pool.add(() => {
    // Write 0x300
    return controller.writeMemory(0x0300, Buffer.from([1]))
    .then(() => {
      console.log(label("Wrote EEPROM address 0x00"));
    });
  });

  pool.add(() => {
    // Read 0x300 - 0x37F
    return controller.readMemory(0x0300, 128)
    .then((data) => {
      console.log(label("Read memory:"));
      printData(0x300, data);
    });
  });

  pool.add(() => {
    // Read 0x380 - 0x3FF
    return controller.readMemory(0x0380, 128)
    .then((data) => {
      console.log(label("Read more memory:"));
      printData(0x380, data);
    });
  });

  pool.add(() => {
    // Write Phoenix fault log to 0xFF
    return controller.writeMemoryVerify(0x0370, Buffer.alloc(4, 0xFF))
    .then(() => {
      console.log(label("Wrote EEPROM 0x70-0x74 = 0xFF"));
    });
  });

  pool.add(() => {
    // Write Phoenix fault log to 0x00
    return controller.writeMemoryVerify(0x0370, Buffer.alloc(4, 0x00))
    .then(() => {
      console.log(label("Wrote EEPROM 0x70-0x74 = 0x00"));
    });
  });

  pool.add(() => {
    return controller.writeMemory(0x0300, Buffer.from([0]))
    .then(() => {
      console.log(label("Wrote EEPROM address 0x00 again"));
    });
  });

  return pool.all();
}

function testPseudoEE() {
  // Create test buffer
  let bufferTest = Buffer.from([...Array(128).keys()]);

  return ble.writeObject(0, bufferTest)
  .then(() => {
    ble.readObject(0)
    .then((buffer) => {
      console.log("Read back:", buffer);
    });
  });

  // return ble.readObject(0)
  // .then((buffer) => {
  //   console.log("Read back:", buffer);
  // });
}

function setWatchers() {
  return ble.unwatchAll()
  .then(() => {
    return ble.watch(0, CONTROLLER_ID, 0x005F, 1, (value) => {
      console.log(label('Charge mode:'), value);
    });
  })
  .then(() => {
    return ble.watch(1, CONTROLLER_ID, 0x0038, 1, (value) => {
      console.log(label('Fault code:'), value);
    });
  })
  .then(() => {
    return ble.watch(2, CONTROLLER_ID, 0x0110, 1, (value) => {
      console.log(label('Supply voltage:'), value);
    });
  })
  .then(() => {
    return ble.watch(3, CONTROLLER_ID, 0x0113, 1, (value) => {
      console.log(label('PWM:'), value);
    });
  })
  .then(() => {
    return ble.watch(4, CONTROLLER_ID, 0x111, 1, (value) => {
      console.log(label('Board Temperature:'), value);
    });
  })
  .then(() => {
    return ble.watch(5, CONTROLLER_ID, 0x112, 1, (value) => {
      console.log(label('Output Current:'), value);
    });
  })
  .then(() => {
    return ble.watch(6, CONTROLLER_ID, 0x0114, 1, (value) => {
      console.log(label('Scaled Throttle:'), value);
    });
  })
  .then(() => {
    return ble.watch(7, CONTROLLER_ID, 0x118, 1, (value) => {
      console.log(label('System State:'), value);
    });
  })
  .then(() => {
    return ble.watch(8, CONTROLLER_ID, 0x0119, 1, (value) => {
      console.log(label('Motor State:'), value);
    });
  })
  .then(() => {
    return ble.watch(9, CONTROLLER_ID, 0x0060, 2, (value) => {
      console.log(label('Analog Throttle:'), value);
    });
  })
  // .then(() => {
  //   return ble.unwatch(9);
  // })
  // .then(() => {
  //   return ble.unwatch(4);
  // })
  .then(() => {
    // Add superwatcher - up to 25 addresses
    let superWatcherMembers = [0x0001, 0x0002, 0x0003, 0x0004, 0x0005,
                               0x0006, 0x0007, 0x0008, 0x0009, 0x000A,
                               0x000B, 0x000C, 0x000D, 0x000E, 0x000F,
                               0x0010, 0x0011, 0x0012, 0x0013, 0x0014,
                               0x0015, 0x0016, 0x0017, 0x0018, 0x0019];

    return ble.superWatch(CONTROLLER_ID, superWatcherMembers, (value) => {
      console.log(label('SuperWatcher: '), value);
    });
  })
  .then(() => {
    return new Promise((resolve) => {
      setTimeout(resolve, 5000);
    });
  })
  .then(() => {
    return ble.getWatchers().then((watchers) => {
      console.log(label("Watchers:"), watchers);
    });
  })
  .then(() => {
    return ble.getSuperWatcher().then((members) => {
      console.log(label("SuperWatcher Members:"), members);
    });
  })
  .then(() => {
    return ble.unwatch(0xFF);
  })

}

// Prints a nicely formatted Buffer of data
function printData(address, buf) {

  const lineLen = 16;
  let displayIndex = Math.floor(address / lineLen) * lineLen;
  let offset = address % lineLen;
  let index = 0;
  let str;

  str = (chalk.green(zeroPad(displayIndex.toString(16), 4) + ': '));
  while (offset > 0) {
    str += ('   ');
    offset--;
    displayIndex++;
  }

  while (index < buf.length) {

    str += (' ' + zeroPad(buf[index].toString(16), 2));
    index++;
    displayIndex++;

    if ((displayIndex) % lineLen === 0 || index === buf.length) {
      console.log(str);
      str = (chalk.green(zeroPad(displayIndex.toString(16), 4) + ': '));
    }

  }

}


// returns a string with prepended zeros to the requested length
function zeroPad(number, length) {
  var pad = new Array(length + 1).join('0');
  return (pad + number).slice(-pad.length);
}

