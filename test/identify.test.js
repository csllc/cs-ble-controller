/**
 * Test that covers unit identification
 * 
 */

'use strict';

// Load the object that handles communication to the device
var ble = require('..');

var expect = require('chai').expect;

// Include the memory map for product identification
var map = require('../lib/maps/ident.js');

var thePeripheral = null;

/**
 * Pre-test
 *
 * Runs once, before all tests in this block.
 * Calling the done() callback tells mocha to proceed with tests
 *
 */
before(function( done ) {

  this.timeout(10000);
  
  // Wait for the bluetooth hardware to become ready
	ble.once('stateChange', function(state) {
    if(state === 'poweredOn') {
      
      ble.once('discover', function( peripheral ) {
        ble.stopScanning();

        thePeripheral = peripheral;

        done();

      });

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

  it('should find a device', function(done) {

    // time to find a device depends on, for example, the advertising intervals
  this.timeout(10000);

    ble.on('discover', function( peripheral ) {
      ble.stopScanning();

      expect( peripheral ).to.be.an('object');
      expect( peripheral.advertisement ).to.be.an('object');
      expect( peripheral.advertisement.localName ).to.be.a('string');

      done();

    });

    ble.startScanning();

  });

});

