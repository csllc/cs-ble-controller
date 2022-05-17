// Renderer process

const { ipcRenderer } = require('electron');
const CsMbBle = require('../..');

ipcRenderer.on('bleSetup', () => {
  console.log("bleSetup()");

  document.getElementById('button-refresh-connections').addEventListener('click', testBluetooth);
});

// Test bluetooth features
let testBluetooth = function() {

  console.log("testBluetooth");

  let ble = new CsMbBle({ bluetooth: navigator.bluetooth,
                          name: 'CS1816' });


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
        resolve({
          text: `${device.name} (${device.id})`, // TODO: Truncate ID
          value: device.id,
          type: "ble",
          typeText: "Bluetooth Dongle",
          module: "cs-mb-ble",
          bus: device,
          port: `${device.name} (ID ${device.id})`,
        });
      });
    });
  })
  .then(() => {
    ble.open();
  })
}

