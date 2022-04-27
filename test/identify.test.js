/**
 * Test that covers unit identification
 * 
 */

'use strict';

// Load the class that handles communication to the device
const BleController = require('..');

var expect = require('chai').expect;

var ble = null;

describe('BLE Peripheral Scanning', function() {
  before(function(done) {
    ble = new BleController({
      uuid: 'default',
      autoConnect: true,
    });

    expect(ble).to.be.an('object');

    done();
  });


  describe('Scan for a device', function() {

    this.timeout(5000);

    it('should find a BLE peripheral', function(done) {

      // Wait for the bluetooth hardware to become ready
      ble.getAvailability()
      .then((available) => {

        // after we power on, start scanning for devices
        ble.startScanning()
        .then((peripheral) => {
          // then wait for a matching device to be discovered

          expect(peripheral).to.be.an('object');
          expect(peripheral.id).to.be.a('string');
          expect(peripheral.gatt).to.be.an('object');
          expect(peripheral.adData).to.be.an('object');

          // got one, we are done. Save the discovered peripheral for
          // use in the test(s)
          done();
        });

      })
      .catch(() => {
        done( new Error( 'Bluetooth must be enabled and turned on before you run this test')) ;
      });
    });

  });

});

