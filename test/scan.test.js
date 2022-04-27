/**
 * Test that covers BLE scanning 
 * 
 */

'use strict';

// Load the class that handles communication to the device
const BleController = require('..');

var expect = require('chai').expect;

var ble = null;
var foundPeripheral = null;

describe('BLE Peripheral Connection', function() {
  before('Create BleController instance', function(done) {
    ble = new BleController({
      uuid: 'default',
      autoConnect: true,
    });

    expect(ble).to.be.an('object');

    done();
  });

  after('Disconnect from peripheral', function(done) {
    ble.close()
    .then(() => {
      done();
    });
  });

  describe('Scan for peripheral', function() {
    // time to find a device depends on, for example, the advertising intervals
    this.timeout(20000);

    it('should find a BLE peripheral', function(done) {
      // Wait for the bluetooth hardware to become ready
      ble.getAvailability()
      .then(() => {

        // after we power on, start scanning for devices
        ble.startScanning()
        .then((peripheral) => {
          // then wait for a matching device to be discovered

          foundPeripheral = peripheral;

          // got one, we are done. Save the discovered peripheral for
          // use in the test(s)
          done();
        });

      })
      .catch(() => {
        done( new Error( 'Bluetooth must be enabled and turned on before this test can be run')) ;
      });
    });

  });

  describe('Connect and read identity', function() {

    it('should connect to the peripheral', function(done) {
      ble.open(foundPeripheral)
      .then(() => {
        done();
      });
    });


    it('should read peripheral identity', function(done) {
      ble.getInfo()
      .then((info) => {

        expect(info.manufacturerName).to.equal('Control Solutions LLC');
        expect(info.modelNumber.startsWith("CS")).to.be.true;
        expect(info.modbusId).to.be.a('number');

        done();
      });
    });

  });


});

