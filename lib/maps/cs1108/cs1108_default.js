/**
 * This module exports an object that represents the memory map of a controller.
 *
 * The memory map is built by including various portions of the map
 * Usage:
 *  var map = require('./lib/maps/cs1108_default.js')
 *
 *
 */
'use strict';

var Ident = require('./ident');
var Meters = require('./meters');
var Fault = require('./fault');
var Config = require('./config');
var Status = require('./status');


function Cs1108DefaultMap() {

  this.ident = new Ident();

  this.meters = new Meters();

  this.fault = new Fault();

  this.config = new Config();

  this.status = new Status();

  this.WRITE_COMMAND = 1;
  this.READ_COMMAND = 2;

}



module.exports = Cs1108DefaultMap;

