/**
 * Test that covers BLE scanning 
 * 
 */

'use strict';

// Load the object that handles communication to the device
var BleControllerFactory = require('..');
var ble = new BleControllerFactory();

var expect = require('chai').expect;

/**
 * Pre-test
 *
 * Runs once, before all tests in this block.
 * Calling the done() callback tells mocha to proceed with tests
 *
 */
before(function( done ) {

  // allow time for scan and connect
  this.timeout(20000);

  // Wait for the bluetooth hardware to become ready
	ble.once('stateChange', function(state) {

    if(state === 'poweredOff') {
      done( new Error( 'Bluetooth must be powered on before you run this test')) ;

    }
    else if(state === 'poweredOn') {
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
  this.timeout(20000);

  it('should find a device', function(done) {

    // time to find a device depends on, for example, the advertising intervals
    this.timeout = 10000;

    console.log( 'Searching for BLE device...');
            
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
        expect( device.deviceType ).to.be.a( 'string' );
        expect( device.deviceType ).to.have.length.above( 0 );

        expect( device.serial ).to.not.equal( null );
        expect( device.serial ).to.be.a( 'string' );
        expect( device.serial ).to.have.length.above( 0 );

        expect( device.fault ).to.not.equal( null );
        expect( device.fault ).to.be.an.instanceof( Buffer );
        expect( device.fault ).to.have.length.above(0);

        done();
      })
      .catch( function( err ) { 
        done( err ); 
      });
    });


    ble.startScanning();

  });

});

