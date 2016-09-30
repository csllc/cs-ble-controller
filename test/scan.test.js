/**
 * Test that covers BLE scanning 
 * 
 */

'use strict';

// Load the object that handles communication to the device
var ble = require('..');

var expect = require('chai').expect;

/**
 * Pre-test
 *
 * Runs once, before all tests in this block.
 * Calling the done() callback tells mocha to proceed with tests
 *
 */
before(function( done ) {

  // Wait for the bluetooth hardware to become ready
	ble.once('stateChange', function(state) {
    if(state === 'poweredOn') {
      done();
    }

  });

});

after(function( done ) {
  // runs after all tests in this block
  done();
});

beforeEach(function( done ) {
  // runs before each test in this block
  done();
});

afterEach(function( done ) {
  // runs after each test in this block
  done();
});

describe('Scan for devices', function() {

  // time to find a device depends on, for example, the advertising intervals
  this.timeout(10000);

  it.skip('should find a device', function(done) {

    // time to find a device depends on, for example, the advertising intervals
    this.timeout = 10000;

    ble.once('discover', function( peripheral ) {
      ble.stopScanning();

      expect( peripheral ).to.be.an('object');
      expect( peripheral.advertisement ).to.be.an('object');
      expect( peripheral.advertisement.localName ).to.be.a('string');

      done();

    });

    ble.startScanning();

  });

  it('should connect to a device', function(done) {


    ble.once('discover', function( peripheral ) {
      ble.stopScanning();

      var device = new ble.Controller( peripheral );

      device.connect()
      .then( function() {

        expect( device.deviceType ).to.not.equal( null );
        done();
      })
      .catch( function( err ) { 
        done( err ); 
      });
    });


    ble.startScanning();

  });

});

