// Renderer process

const { ipcRenderer } = require('electron');
const CsMbBle = require('../..');

const PromisePool = require('async-promise-pool');

ipcRenderer.on('bleSetup', () => {
  console.log("bleSetup()");

  document.getElementById('button-refresh-connections').addEventListener('click', testBluetooth);
});

// Test bluetooth features
let testBluetooth = function() {

  console.log("testBluetooth");

  let ble = new CsMbBle({ bluetooth: navigator.bluetooth,
                          uuid: 'default' });


  ble.on('availabilitychanged', (event) => {
    console.log("BLE availability changed", event);
  });

  ble.on('gattserverdisconnected', (event) => {
    console.log("BLE connection lost", event);
  });

  ble.on('scanStart', (filter) => {
    console.log("BLE scanning started, using filter", filter);
  });

  ble.on('scanStop', () => {
    console.log("BLE scanning stopped");
  });

  ble.on('discover', (newDevice) => {
    console.log("BLE device discovered:", newDevice);
  });

  ble.on('connecting', () => {
    console.log("Connecting to BLE device...");
  });

  ble.on('connected', () => {
    console.log("Connected to BLE device.");
  });

  ble.on('disconnecting', () => {
    console.log("Disconnecting from BLE device...");
  });

  ble.on('disconnected', () => {
    console.log("Disconnected from BLE device.");
  });

  ble.on('inspecting', () => {
    console.log("Inspecting BLE dongle...");
  });

  ble.on('inspected', () => {
    console.log("Inspection complete.");

    ble.getInfo()
    .then((info) => {
      console.log("Device information:");
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
    })
    .then(() => {
      // Set up watchers

      let pool = new PromisePool({concurrency: 1});

      let handleError = function(e, index) {
        console.error("Watcher error", e, index);
      }

      let deviceId = 0x01;

      pool.add(() => {
        // Watcher for HRAM 0x10, 0x11, 0x12
        return ble.watch(0, deviceId, 0x110, 3, (data) => {
          console.log("watcher 0:", data);
        })
        .catch((e) => handleError(e, 0));
      });

      pool.add(() => {
        // Watcher for HRAM 0x13, 0x14, 0x15
        return ble.watch(1, deviceId, 0x113, 3, (data) => {
          console.log("watcher 1:", data);
        })
        .catch((e) => handleError(e, 1));
      });

      pool.add(() => {
        // Watcher for HRAM 0x18, 0x19
        return ble.watch(2, deviceId, 0x118, 2, (data) => {
          console.log("watcher 2:", data);
        })
        .catch((e) => handleError(e, 2));
      });

      pool.add(() => {
        // Watcher for HRAM 0x1C, 0x1D
        return ble.watch(3, deviceId, 0x11C, 2, (data) => {
          console.log("watcher 3:", data);
        })
        .catch((e) => handleError(e, 3));
      });

      pool.add(() => {
        // Watcher for HRAM 0x1E, 0x1F
        return ble.watch(4, deviceId, 0x11E, 2, (data) => {
          console.log("watcher 4:", data);
        })
        .catch((e) => handleError(e, 4));
      });

      pool.add(() => {
        // Watcher for HRAM 0x29, 0x2A, 0x2B
        return ble.watch(5, deviceId, 0x129, 3, (data) => {
          console.log("watcher 5:", data);
        })
        .catch((e) => handleError(e, 5));
      });

      pool.add(() => {
        // Watcher for LRAM 0x56
        return ble.watch(6, deviceId, 0x056, 1, (data) => {
          console.log("watcher 6:", data);
        })
        .catch((e) => handleError(e, 6));
      });

      pool.add(() => {
        // Watcher for LRAM 0x5F, 0x60, 0x61
        return ble.watch(7, deviceId, 0x05F, 3, (data) => {
          console.log("watcher 7:", data);
        })
        .catch((e) => handleError(e, 7));
      });

      pool.add(() => {
        // Watcher for LRAM 0x6A, 0x6B
        return ble.watch(8, deviceId, 0x06A, 2, (data) => {
          console.log("watcher 8:", data);
        })
        .catch((e) => handleError(e, 8));
      });

      return pool.all();

    })
    .then(() => {
      let pool = new PromisePool({concurrency: 1});

      for (let i = 0; i < 9; i ++) {
        pool.add(() => {
          return ble.readWatcher(i)
          .catch((err) => {
            console.error("error reading watcher " + i, err);
          })
        });
      }

      return pool.all();
    })
    .then((results) => {
      console.log("readWatcher results", results);
    });
  });

  ble.on('discoveredService', (uuid) => {
    console.log("Discovered", uuid);
  });

  ble.on('discoveredCharacteristic', (serviceUuid, charUuid) => {
    console.log("Discovered", serviceUuid, "/", charUuid);
  });

  console.log("ble", ble);

  return new Promise((resolve, reject) => {
    ble.getAvailability()
    .then(() => {
      ble.startScanning()
      .then((device) => {
        console.log("device", device);

        

        let handleAdvertisement = (event) => {

          console.log("handleAdvertisement", event);

          // device.removeEventListener('advertisementreceived', handleAdvertisement);

          // Using 0xFFFF for Company ID for now, but that may change if
          // CS registers for their own.
          let manufacturerData = event.manufacturerData.get(0xFFFF);

          console.log("manufacturerData", manufacturerData);

          resolve({
            text: `${device.name} (${device.id})`, // TODO: Truncate ID
            value: device.id,
            type: "ble",
            typeText: 'ble',
            module: "cs-mb-ble",
            bus: device,
            port: `${device.name} (ID ${device.id})`,
          });
        };

        device.addEventListener('advertisementreceived', handleAdvertisement);

        device.watchAdvertisements();

        // resolve({
        //   text: `${device.name} (${device.id})`, // TODO: Truncate ID
        //   value: device.id,
        //   type: "ble",
        //   typeText: "Bluetooth Dongle",
        //   module: "cs-mb-ble",
        //   bus: device,
        //   port: `${device.name} (ID ${device.id})`,
        // });
      });
    });
  })
  .then(() => {
    ble.open();
  })
}

