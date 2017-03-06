# cs-ble-controller

NodeJS module that interfaces with Control Solutions LLC CS1814 BLE interfaces.

## CS1814 Bluetooth Low Energy description

The CS1814 acts as a Bluetooth LE peripheral, which exposes one or more
of the following services:

### Controller Service
uuid: `6765ed1f4de149e14771a14380c90000`
The Controller Service exposes characteristics related to a device, which may be monitored by the central device.  The interpretation of some characteristics is product-specific.

Characteristics:
* Product (uuid `6765ed1f4de149e14771a14380c90003`, (Read)) which contains a string identifying the product type.  This product type is a primary means of determining how the rest of the characteristics and commands are to be interpreted.

* Serial (uuid `6765ed1f4de149e14771a14380c90004`, (Read)) which contains a string identifying the product. 

* Fault (uuid `6765ed1f4de149e14771a14380c90005`, (Read, Notify)).  Contains the device's fault information (interpreted according to the Product's user guide).  The central device may subscribe to this characteristic to receive updates when the fault status changes.

* Status1-5 (uuid `6765ed1f4de149e14771a14380c90006` to `6765ed1f4de149e14771a14380c9000a`, (Read, Notify)).  Contains the device's status information (interpreted according to the Product's user guide).  The central device may subscribe to these characteristics to receive updates when status changes.


### Command Service
uuid: `49535343fe7d4ae58fa99fafd205e455`

The Command Service allows the central device to send commands to the peripheral device and receive responses.

Characteristics:
* Send (uuid `49535343884143f4a8d4ecbe34729bb3`, (Write)) 

* Receive (uuid `495353431e4d4bd9ba6123c647249616`, (Notify)) 

To send a command to the device, the Send characteristic is written with a header followed by a number of payload bytes.  The header consists of 6 bytes:

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

