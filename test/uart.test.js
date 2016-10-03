/**
 * Test that covers the UART streaming data function of the BleController 
 * 
 */

'use strict';

// Load the object that handles communication to the device
var ble = require('..');

var expect = require('chai').expect;

// Keep track of the device we are talking to
var device;


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


      ble.once('discover', function( peripheral ) {

        ble.stopScanning();

        device = new ble.Controller( peripheral );

        device.connect()
        .then( function() { return device.enableUart(); } )
        .then( function() {
          done();
        })
        .catch( function( err ) { 
          console.log( 'before err: ', err );

          done( new Error(err)  ); 
        });
      });


      ble.startScanning();
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

describe('Send Data', function() {

  this.timeout(20000);


  it('should send 20 bytes', function(done) {

    var buf = new Buffer(20);
    buf.fill( 0x30 );

    device.on('data', function( data ) {
      console.log( 'Received ' , data );
    });

    device.sendUart( buf )
    .delay( 15000 )
    //.then( function() { return device.readUart(); })
    //.then( function(data) { console.log( 'DATA: ', data ); })
    .then( function() {

      //setTimeout( function() {  done(); }, 15000 );
      done();
     
    })
    .catch( function( err ) {
      console.log( 'caught: ', err );
      throw( new Error(err) );
    });


  });

});

