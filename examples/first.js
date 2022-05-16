/**
 * Scan for the first controller found, and inspect it
 *
 */
'use strict';

// Our BLE library
const BleController = require('..');

// Create BLE instance
let ble = new BleController({
  uuid: 'default', // Scan for the private CSLLC controller service
  autoConnect: true, // Use first device found
});

ble.getAvailability()
.then(() => {
  console.log("BLE interface is available on this platform");

  ble.on('discover', (newDevice) => {
    console.log("Discovered BLE device:", newDevice);
  });

  ble.on('scanStart', (filter) => {
    console.log("Scanning started using filter", filter);
  });

  ble.on('scanStop', () => {
    console.log("Scanning stopped");
  });

  ble.on('inspecting', () => {
    console.log("Inspecting BLE dongle...");
  });

  ble.on('inspected', () => {
    console.log("Inspection complete.");
  });

  ble.startScanning()
  .then((device) => {
    return ble.open()
    .then(() => {
      return ble.getInfo()
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
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error opening device", error);
    });

  })
  .catch(() => {
    console.error("BLE interface is not available on this platform");
  })
});

