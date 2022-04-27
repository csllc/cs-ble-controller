/**
 * Test that covers BLE scanning 
 * 
 */

'use strict';

// Load the class that handles communication to the device
const BleController = require('..');

var expect = require('chai').expect;
var Buffers = require( 'h5.buffers');
var sinon = require('sinon');

var ble = null;
var foundPeripheral = null;


describe('Transparent UART and MBAP communication', function() {
  before('Create BleController instance', function(done) {
    ble = new BleController({
      uuid: 'default',
      autoConnect: true,
    });

    expect(ble).to.be.an('object');

    // ble.on('data', (data) => {
    //   console.log("data", data);
    // });
    //
    // ble.on("write", (data) => {
    //   console.log("write", data);
    // });

    done();
  });

  after('Disconnect from peripheral', function(done) {
    ble.close()
    .then(() => {
      done();
    });
  });

  describe('Scan for a device', function() {
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


    it('should connect to the peripheral', function(done) {
      ble.open(foundPeripheral)
      .then(() => {
        done();
      });
    });
  });


  describe('MBAP Data', function() {

    this.timeout(2000);

    // send data to the BLE peripheral using the loopback feature.  We should
    // get the same data back
    // 
    // Note - Modbus function code 0x08 (loopback) isn't implemented on some dongles,
    // so we use protocol 0xFFFF instead.
    function sendLoopback( id, len, cb ) {

      var builder = new Buffers.BufferBuilder();

      if (len < 2) {
        throw new Error("Minimum data length is 2");
      }

      builder.pushUInt16( id );      // Transaction ID
      builder.pushUInt16( 0xFFFF ); // Loopback protocol
      builder.pushUInt16( len );    // Length

      // Fill rest of buffer with data to be echoed
      var packet = Buffer.alloc( len );
      packet.fill( 0xCA );
      builder.pushBuffer( packet );

      // Create Buffer
      var buffer = builder.toBuffer();

      // spy on the data events to capture the data as it arrives
      var spy = sinon.spy();

      ble.on('data', spy);

      // Write to BLE peripheral
      ble.write(buffer);

      // Return to caller after a set timeout.
      // If all goes well, a response is received and captured by the spy within that time.
      setTimeout(function() {

        // remove the event spy
        ble.off( 'data', spy );

        // Pass both the spy object and the written data back to the caller
        cb(spy, buffer);

      }, 5000 );

    }

    it('should loop back minimum length (2 byte) payload', function(done) {

      this.timeout(10000);

      sendLoopback( 1, 2, function( spy, writeData ) {

        expect(spy.callCount).to.equal( 1 );
        expect(Buffer.compare(spy.firstCall.args[0], writeData)).to.equal(0);

        done();

      });

    });

    it('should loop back large payload', function(done) {

      // Length of payload experimentally determined & may change depending on buffering
      // in the peripheral. 50 bytes was chosen for CS1816 running software 1.5, however
      // larger payloads seem to cause the dongle to crash; Mantis case # TBD.
      // Realistically it should handle 90 bytes.

      this.timeout(10000);

      sendLoopback( 1, 50, function( spy, writeData ) {

        expect( spy.callCount ).to.be.above( 0 );

        done();

      });
    });


    it('should ignore too large of a payload', function(done) {
      
      this.timeout(10000);

      sendLoopback( 1, 300, function( spy, writeData ) {

        // console.log(spy);

        expect( spy.callCount ).to.equal( 0 );

        done();

      });

    });


    it('should loop back a medium-sized payload', function(done) {
      
      this.timeout(10000);

      sendLoopback( 1, 20, function( spy, writeData ) {

        expect( spy.callCount ).to.be.above( 0 );

        done();

      });


    });


    it('should ignore a too-short header', function(done) {

      this.timeout(3000);

      var buf = new Buffers.BufferBuilder();

      buf.pushUInt16( 1 );      // transaction id
      buf.pushUInt16( 0xFFFF ); // protocol
      buf.pushUInt16( 1 );      //length
      buf.pushUInt8( 1 );      // unit

      var spy = sinon.spy();

      ble.on('data', spy );

      ble.write( buf.toBuffer() );

      setTimeout( function() {
        // success if no data arrived
        ble.off( 'data', spy );
        expect( spy.called ).to.equal(false);

        done();
      }, 1000 );

    });

    it('should timeout on incomplete message', function(done) {

      this.timeout(3000);

      var buf = new Buffers.BufferBuilder();

      buf.pushUInt16( 1 );      // transaction id
      buf.pushUInt16( 0xFFFF ); // protocol
      buf.pushUInt16( 3 );      //length
      buf.pushUInt8( 1 );      // unit
      buf.pushUInt8( 1 );      // function code

      var spy = sinon.spy();

      ble.on('data', spy );

      ble.write( buf.toBuffer() );

      setTimeout( function() {
        // success if no data arrived
        ble.off( 'data', spy );
        expect( spy.called ).to.equal(false);

        done();
      }, 1000 );

    });

    // This test currently doesn't pass on CS1816. Only the first 32 or so messages receive a
    // response, and they're grouped into several large characteristic notifications.
    // This means that the number of calls to the spy will never equal the number of
    // individual messages transmitted.
    it('should handle many messages (not mandatory)', function(done) {

      this.timeout(40000);
      
      // how many messages to send
      var numMessages = 100;

      // length of payload; note on response the BLE splits up the data into
      // chunks (right now 100 bytes) so choosing a packet size smaller than 
      // one chunk means the number of chunks received should equal the number
      // of packets sent
      var len = 5;

      var spy = sinon.spy();

      ble.on('data', spy );

      function send( id ) {

        var buf = new Buffers.BufferBuilder();

        buf.pushUInt16( i, false );      // transaction id
        buf.pushUInt16( 0xFFFF ); // protocol
        buf.pushUInt16( len );      //length
        
        // fill buffer less the unit/function code already 
        var packet = Buffer.alloc( len );
        packet.fill( 0xCA );

        buf.pushBuffer( packet );


        ble.write( buf.toBuffer() );

      }

      for( var i = 0; i < numMessages; i++ ){
        send( i );
      }

      setTimeout( function() {

        // remove the event spy
        ble.off( 'data', spy );

        expect( spy.callCount ).to.equal( numMessages );

        done();
      }, 30000 );

    });

  });

});

