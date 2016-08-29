/**
 * Created by bruceliu on 16/8/24.
 */

var MongoClient = require('mongodb').MongoClient
    , assert = require('assert');
var apmConfig = require('../config/config', 'dont-enclose');

var dburl = 'mongodb://' + apmConfig.mongodb.host + ':' + apmConfig.mongodb.port + '/' + apmConfig.mongodb.db;

// Use connect method to connect to the server

var Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server;

module.exports.mongodb = new Db(apmConfig.mongodb.db, new Server(apmConfig.mongodb.host, apmConfig.mongodb.port, {}), {safe: true});

module.exports.dburl = dburl;
module.exports.assert = assert;
module.exports.MongoClient = MongoClient;

