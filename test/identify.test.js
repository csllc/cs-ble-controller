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
      name: 'CS1816',
      autoConnect: true,
    });

    expect(ble).to.be.an('object');

    done();
  });

  after('Disconnect from peripheral', function(done) {
    ble.close()
    .then(() => {
      done();
    })
    .finally(() => {
      // Kludge so we actually exit the Node process due to bug in underlying Noble:
      // https://github.com/abandonware/noble/issues/248
      process.exit(0);
    });
  });

  describe('Scan for a device', function() {

    this.timeout(5000);

    it('should find a BLE peripheral', function(done) {

      // Wait for the bluetooth hardware to become ready
      ble.getAvailability()
      .then(() => {

        // after we power on, start scanning for devices
        return ble.startScanning()
        .then((peripheral) => {
          // then wait for a matching device to be discovered
          expect(peripheral).to.be.an('object');
          expect(peripheral.id).to.be.a('string');
          expect(peripheral.gatt).to.be.an('object');
          expect(peripheral.adData).to.be.an('object');

        })
        .then(() => {
          expect(ble.isReady).to.be.false;
          done();
        })
        .catch((err) => {
          done(err);
        });

      })
      .catch((err) => {
        done(err);
      });

    });


  });

});

