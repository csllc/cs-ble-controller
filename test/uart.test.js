/**
 * Test that covers the UART streaming data function of the BleController 
 * 
 */

'use strict';

// Load the object that handles communication to the device
var BleControllerFactory = require('..');
var ble = new BleControllerFactory();

var Buffers = require( 'h5.buffers');

var expect = require('chai').expect;

// Test spy library
var sinon = require('sinon');

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

      console.log( 'Searching for BLE device...');
            
      ble.once('discover', function( peripheral ) {

        ble.stopScanning();

        device = new ble.Controller( peripheral );

        device.connect()
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

describe('MBAP Data', function() {

  this.timeout(2000);

  // send data to the BLE peripheral using the loopback feature.  We should
  // get the same data back
  function sendLoopback( id, len, cb ) {

    var buf = new Buffers.BufferBuilder();

    buf.pushUInt16( id, false );      // transaction id
    buf.pushUInt16( 0xFFFF ); // protocol
    buf.pushUInt16( len );      //length
  
    // fill buffer less the unit/function code already 
    var packet = new Buffer( len );
    packet.fill( 0xCA );

    buf.pushBuffer( packet );

    // spy on the data events to capture the data as it arrives
    var spy = sinon.spy();
    device.on('data', spy );

    device.write( buf.toBuffer() );

    setTimeout( function() {

      // remove the event spy
      device.removeListener( 'data', spy );

      cb( spy );

    }, 2000 );

  }

  it('Minimum length loopback', function(done) {

    var buf = new Buffers.BufferBuilder();

    buf.pushUInt16( 0 );      // transaction id
    buf.pushUInt16( 0xFFFF ); // protocol
    buf.pushUInt16( 2 );      //length
    buf.pushUInt8( 1 );      // unit
    buf.pushUInt8( 0x11 );   // function code


    device.once('data', function( data ) {
      //console.log( 'Received ' + data.length, data );

      expect( data ).to.be.an.instanceof( Buffer );
      expect( data.length ).to.equal( 8 );

      var reader = new Buffers.BufferReader( data );

      // should get back exactly the same data
      expect( reader.shiftUInt16() ).to.equal( 0 );
      expect( reader.shiftUInt16() ).to.equal( 0xFFFF );
      expect( reader.shiftUInt16() ).to.equal( 2 );

      expect( reader.shiftUInt8() ).to.equal( 1 );
      expect( reader.shiftUInt8() ).to.equal( 0x11 );

      done();
    });

    device.write( buf.toBuffer() );


  });

  it('Maximum length loopback', function(done) {

    // length of payload; experimentally determined & may change depending
    // on buffering in the peripheral

    this.timeout(10000);

    sendLoopback( 1, 249, function( spy ) {

      expect( spy.callCount ).to.be.above( 0 );

      done();

    });
  });


  it('More than Maximum length loopback', function(done) {

 
    this.timeout(10000);

    sendLoopback( 1, 251, function( spy ) {

      expect( spy.callCount ).to.equal( 0 );

      done();

    });

  });


  it('Medium length loopback', function(done) {

 
    this.timeout(10000);

    sendLoopback( 3, 50, function( spy ) {

      expect( spy.callCount ).to.be.above( 0 );

      done();

    });


  });


  it('Should ignore a too-short header', function(done) {

    this.timeout(3000);

    var buf = new Buffers.BufferBuilder();

    buf.pushUInt16( 1 );      // transaction id
    buf.pushUInt16( 0xFFFF ); // protocol
    buf.pushUInt16( 1 );      //length
    buf.pushUInt8( 1 );      // unit

    var spy = sinon.spy();

    device.on('data', spy );

    device.write( buf.toBuffer() );

    setTimeout( function() {
      // success if no data arrived
      device.removeListener( 'data', spy );
      expect( spy.called ).to.equal(false);

      done();
    }, 1000 );

  });

  it('Should timeout on incomplete message', function(done) {

    this.timeout(3000);

    var buf = new Buffers.BufferBuilder();

    buf.pushUInt16( 1 );      // transaction id
    buf.pushUInt16( 0xFFFF ); // protocol
    buf.pushUInt16( 3 );      //length
    buf.pushUInt8( 1 );      // unit
    buf.pushUInt8( 1 );      // function code

    var spy = sinon.spy();

    device.on('data', spy );

    device.write( buf.toBuffer() );

    setTimeout( function() {
      // success if no data arrived
      device.removeListener( 'data', spy );
      expect( spy.called ).to.equal(false);

      done();
    }, 1000 );

  });

  it('Should handle many messages', function(done) {

    this.timeout(30000);
    
    // how many messages to send
    var numMessages = 100;

    // length of payload; note on response the BLE splits up the data into
    // chunks (right now 100 bytes) so choosing a packet size smaller than 
    // one chunk means the number of chunks received should equal the number
    // of packets sent
    var len = 94;

    var spy = sinon.spy();

    device.on('data', spy );

    function send( id ) {

      var buf = new Buffers.BufferBuilder();

      buf.pushUInt16( id, false );      // transaction id
      buf.pushUInt16( 0xFFFF ); // protocol
      buf.pushUInt16( len );      //length
  
      // fill buffer less the unit/function code already 
      var packet = new Buffer( len );
      packet.fill( 0xCA );

      buf.pushBuffer( packet );

      device.write( buf.toBuffer() );

    }

    for( var i = 0; i < numMessages; i++ ){
      send( i );
    }

    setTimeout( function() {

      // remove the event spy
      device.removeListener( 'data', spy );

      expect( spy.callCount ).to.equal( numMessages );

      done();
    }, 10000 );

  });

});

