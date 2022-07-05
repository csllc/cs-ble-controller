# cs-mb-ble

NodeJS module that interfaces with Control Solutions LLC Bluetooth dongles, and provides a connection interface for the `@csllc/cs-modbus` module.

## Version 2.0 Breaking Changes

To extend this module's compatibility to include Electron GUI apps, the dependency on `@abandonware/noble` in version 1.0.x has been replaced with `webbluetooth`. Breaking changes stemming from this include: 

- Events forwarded from the native BLE module have changed. See Events Emitted, below.
- The `startScanning()` method now handles device selection in addition to scanning
- The `startScanning()` method returns a `Promise` that waits for a callback to be called. This callback is sent in a `discover` event emitted by the `webbluetooth` instance. The `Promise` will resolve to a `BluetoothDevivce`, which is also stored as `this.peripheral`.
- The `name` or `uuid` options passed to the constructor must be set. `default` is an acceptable UUID.
- The `stopScanning()` method has been removed
- The `warning` event from Noble is no longer emitted
- New BLE devices must have corresponding files added to the `lib/device/` directory, and `lib/BleDevice.js` must be updated to import and use them in the appropriate places.
- The `installed` property has been replaced by the `getAvailability()` method, which returns a Promise that resolves to a Boolean.
- The `deviceType` property of the `BleDevice` instance has been renamed to `product` for simpler underlying code.

## Usage

See the files in the `examples` directory for working examples of how to use this module.

### Constructor options

- `uuid` - (required) GATT service UUID to use in peripheral scan filter. `'default'` can be used to specify the CSLLC Private Controller service.
- `name` - (optional) Device name to use in peripheral scan filter.
- `bluetooth` - (optional) Instance of `navigator.bluetooth` to use instead of creating our own instance of `webbluetooth.Bluetooth`.
- `autoConnect` - (optional) Automatically connect to the first device found while scanning. *Default value: false*

#### Web Bluetooth compatibility

A `navigator.bluetooth` object (e.g., provided by Electron) can be passed as an option for the constructor. If this is done, this module will not create its own `webbluetooth` instance.

Web Bluetooth is a new and unstable standard. A few things to note about the state of Web Bluetooth in Chrome/Electron as of June 2022:

- Electron doesn't support the device selection workflow that Chrome uses involving a device selection prompt presented to the user after calling `bluetooth.requestDevice()`, nor does it seem to follow the specification's proposal to emit a `discover` event Electron's main process. This is worked around in this module's `BleController.constructor()`.
- Despite the CS1816 dongle reporting controller product ID and serial number in its advertisement and scan data in firmware version 1.6+, Electron applications cannot access it to display this information prior to connecting for various reasons. They must read this from the respective characteristics instead. This appears to be due to a few different reasons:
  - Despite specifying the correct manufacturer data company ID value when requesting a device, the `manufacturerData` member of the `BluetoothAdvertisingEvent` remains empty when advertisements are received on both macOS and Windows 10.
  - On macOS 11+, this may be due to Chrome/Electron failing to obtain permissions from the operating system. See https://bugs.chromium.org/p/chromium/issues/detail?id=1155557
  - On Windows 10, manufacturer data in the advertisement is empty, and device scans do not execute under typical circumstances. See https://bugs.chromium.org/p/chromium/issues/detail?id=1137504

### Watchers

Watchers are characteristics (`statusN`) that are associated with a specific memory location on the connected device, e.g., the motor controller.

Support for watchers varies by BLE dongle and firmware revision. Typically there are at least 5 watchers supporting read lengths of 0 to 4 contiguous bytes. When these memory locations change, the provided callback function is called with the new value of the memory.

Some dongles also support a 'super-watcher', which is comprised of several single-byte members. When any of the watched memory locations change, the provided callback function is called with the address of the changed memory and the new value.

### Methods

#### Management

- `startScanning()` - Using the filter parameters supplied to the constructor, start scanning for devices. The returned `Promise` will resolve when the callback passed in the `discover` event is called with a device ID.
- `getAvailability()` - Get the system's BLE availability as a `Promise` that resolves to a `Boolean`
- `isOpen()` - Get the status of the BLE module. Return a truthy value if the peripheral is connected, there's a `BleDevice` instance, and the module has been flagged as ready.

#### Connectivity

- `open()` - Open the peripheral that was requested and found in `startScanning()`
- `close()` - Close the open connection to a peripheral
- `getInfo()` - Get identity information about the connected peripheral as a `Promise` that resolves to an `Object`

#### Communication

- `write()` - Write data to the transparent UART, i.e., to the Modbus interface.

#### Configuration

- `configure()` - Configure the BLE peripheral. Not implemented yet. Returns a `Promise`.
- `keyswitch(state)` - Set the keyswitch state, a boolean. Returns a `Promise` that resolves when the command is complete.
- `watch(slot, id, address, length, cb)` - Sets a watcher using the specified slot, device ID, device memory address, memory read length, and callback function. Returns a `Promise` that resolves when the command is complete.
- `superWatch(id, address, cb)` - Sets the super-watcher using the specified device ID, array of device memory addresses, and callback function. Returns a `Promise` that resolves when the command is complete.
- `unwatch(slot)` - Clears a watcher at the specified slot. The super-watcher's slot may be used.
- `unwatchAll()` - Clears all watchers and super-watcher.
- `getWatchers()` - Returns a `Promise` that resolves to an array of objects, each corresponding to an active watcher.
- `getSuperWatcher()` - Returns a `Promise` that resolves to an array of objects, each corresponding to an active member of the super-watcher.

### Events emitted

Currently, events for watcher updates are not forwarded from the BleDevice instance, since callback functions have been sufficient for use-cases so far. It may make sense to add this in a future version.

#### Originating from @csllc/cs-mb-ble

- `scanStart` - Emitted when device scanning starts
- `scanStop` - Emitted when a device scanning stops because a peripheral was selected
- `discover` - Emitted during scanning as new peripherals are discovered. A callback function to select a peripheral by ID is included in the event data.
- `connecting` - Emitted when the BLE connection to the selected peripheral is attempted.
- `connected` - Emitted when the BLE connection to the selected peripheral is established.
  This is not the same as being ready to use the controller, as it occurs before the peripheral is interrogated and validated.  Use the `ready` event or the resolution of the `open()` promise to determine when the BLE dongle is ready to communicate with the connected controller.
- `ready` - Emitted when the BLE peripheral is ready to communicate with the device it is connected to.
- `disconnecting` - Emitted when disconnecting from the BLE peripheral is requested.
- `disconnected` - Emitted when the BLE connection to the peripheral has finished disconnecting. This object can be deleted afterwards.

### Forwarded from the `BleDevice` instance

- `inspecting` - Peripheral inspection started
- `inspected` - Peripheral inspection complete; information is available via the `getInfo()` method
- `write` - Data written to transparent UART
- `data` - Data received from transparent UART
- `fault` - Connected device fault status changed
- `writeCharacteristic` - Any peripheral characteristic written
- `sendCommand` - Will send command to peripheral
- `watch` - A watcher has been set up
- `superWatch` - The super-watcher has been set up
- `unwatch` - A watcher has been cleared
- `unwatchAll` - All watchers have been cleared

### Forwarded from the `bluetooth` instance

- `availabilitychanged` - Fired when the Bluetooth system as a whole becomes available or unavailable
- `gattserverdisconnected` - Fired when an active BLE connection is lost.

## CS1814 Bluetooth Low Energy description

The CS1814 and CS1816 dongles act as Bluetooth LE peripherals, which exposes one or more of the following services:

### Controller Service

UUID `6765ed1f-4de1-49e1-4771-a14380c90000`

The Controller Service exposes characteristics related to a device, which may be monitored by the central device.  The interpretation of some characteristics is product-specific.

Characteristics:
* Product (UUID `6765ed1f-4de1-49e1-4771-a14380c90003`, (Read)) which contains a string identifying the product type.  This product type is a primary means of determining how the rest of the characteristics and commands are to be interpreted.

* Serial (UUID `6765ed1f-4de1-49e1-4771-a14380c90004`, (Read)) which contains a string identifying the product. 

* Fault (UUID `6765ed1f-4de1-49e1-4771-a14380c90005`, (Read, Notify)).  Contains the device's fault information (interpreted according to the Product's user guide).  The central device may subscribe to this characteristic to receive updates when the fault status changes.

* Status1-n (UUID `6765ed1f-4de1-49e1-4771-a14380c90006` to `6765ed1f-4de1-49e1-4771-a14380c900nn`, (Read, Notify)).  Contains the device's status information (interpreted according to the Product's user guide).  The central device may subscribe to these characteristics to receive updates when status changes.


### Transparent UART Service

UUID `49535343-fe7d-4ae5-8fa9-9fafd205e455`

The Command Service allows the central device to send commands to the peripheral device and receive responses.

Characteristics:
* Transmit (UUID `49535343-1e4d-4bd9-ba61-23c647249616`, (Write)) 

* Receive (UUID `49535343-8841-43f4-a8d4-ecbe34729bb3`, (Notify)) 

To send a command to the device, the Transmit characteristic is written with a header followed by a number of payload bytes.  The header consists of 6 bytes:

Byte 0:	 transactionId (MSB)
Byte 1:  transactionId (LSB)
Byte 2:  protocol (MSB)
Byte 3:  protocol (LSB)
Byte 4:  payload length (MSB)
Byte 5:  payload length (LSB)

The transactionId is assigned by the central device; the peripheral simply includes it in the corresponding response.  This can be used by the central device to match responses to the commands that were sent.

The protocol is 0x0000 for MODBUS type messages.

The payload length is the number of bytes that follow the header.  For MODBUS (protocol 0x0000) messages, the payload must be at least 2 bytes (a unit ID and function code).

The peripheral device accepts payload lengths up to at least 120 bytes.  Payloads longer than the maximum are silently discarded.

The peripheral device will notify the Receive characteristic with a response when the command has been processed.  The response consists of a header (containing the same transactionId and protocol as the request) as well as the payload length and payload bytes.

The maximum delay to process a command varies by the type of peripheral; consult device documentation for expected command processing delays.

The peripheral accepts at least two commands at a time, which are processed in order.  Sending more than two commands without waiting for a response may result in the extra commands being silently ignored by the peripheral.

### Device information service

Certain characteristics may not be readable when this module is incorporated into an Electron app due to a GATT blocklist. Affected characteristics listed in the device files in `lib/device/` are marked as `optional` and any errors relating to them during inspection are ignored.

See the blocklist here: https://github.com/WebBluetoothCG/registries/blob/master/gatt_blocklist.txt


## Development

### Unit Tests

Several unit tests are available for this module. To execute them, run:

`npx mocha`

Not every test will pass for every dongle or configuration. Some known issues are documented in the comments of the `.test.js` files.
