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

module.exports = {

  ident: require( './ident'),

  meters: require( './meters'),

  fault: require( './fault'),

  config: require( './config'),

  status: require( './status')

};
