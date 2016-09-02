var express = require('express');
var router = express.Router();
var log = require('log4js').getLogger("apiformobile");

var formidable = require('formidable');
var request = require('request');
//   os = require('os');

router.post('/mobile/device', function (req, res, next) {
    log.debug(req.body);
    var result = '{"result":"1"}';
    var jsonObj = JSON.parse(result);
    res.json(jsonObj);
});

router.post('/crash', function (req, res, next) {
    log.debug(req.body);
    var result = '{"result":"1"}';
    var jsonObj = JSON.parse(result);
    res.json(jsonObj);
});

/*
 router.get('/i', function (req, res, next) {
 console.log('Get:req.query:' + JSON.stringify(req.query));
 log.debug('Get:req.query:' + JSON.stringify(req.query));
 var result = '{"result":"Success"}';
 var jsonObj = JSON.parse(result);
 res.json(jsonObj);
 });



 router.post('/i', function (req, res, next) {
 console.log('Post:req.query:' + JSON.stringify(req.query));
 log.debug('Post:req.query:' + JSON.stringify(req.query));
 var result = '{"result":"Success"}';
 var jsonObj = JSON.parse(result);
 res.json(jsonObj);
 });

 router.post('/i/users', function (req, res, next) {

 //accessdb.createUser(req, res);

 });

 */

//http.globalAgent.maxSockets = countlyConfig.api.max_sockets || 1024;

/*
 router.post('/i', function (req, res, next) {

 var crashinfo = {
 "app_key": req.body.app_key,
 "device_id": req.body.device_id,
 "timestamp": req.body.timestamp,
 "hour": req.body.hour,
 "dow": req.body.dow,
 "sdk_version": req.body.sdk_version,
 "sdk_name": req.body.sdk_name,
 "crash": req.body.crash
 }
 console.log(crashinfo);
 //common.db.collection('apps').findOne({'key': app_key}, function (err, app) {

 request.post({url: 'http://localhost:3000/newCrash', form: req.body}, function optionalCallback(err, httpResponse, body) {
 if (err) {
 return console.error('upload failed:', err);
 }
 console.log('Upload successful!  Server responded with:', body);
 });

 var result = '{"result":"Success"}';
 var jsonObj = JSON.parse(result);
 res.json(jsonObj);
 });
 */

/*
 router.post('/i/bulk', function (req, res, next) {

 console.log(req.body);
 console.log(req.query);
 request.post({url: 'http://localhost:3000/newBulk', form: req.body}, function optionalCallback(err, httpResponse, body) {
 if (err) {
 return console.error('upload failed:', err);
 }
 console.log('Upload successful!  Server responded with:', body);
 //var result = '{"result":"Success"}';
 //var jsonObj = JSON.parse(body);
 res.json(body);
 });


 });
 */


//var dbconnect = require('../dbconfig/dbconnect');

router.use(function (req, res, next) {

    console.log('get' + req.url)
    //if (req.body)
    request({url: 'http://localhost:3000/api' + req.url}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('upload failed:', err);
        }
        console.log('Upload successful!  Server responded with:', body);

        var result = '{"result":"Success"}';
        //var jsonObj = JSON.parse(body);
        res.send(body);
    });


});


router.post(function (req, res, next) {

    if (req.body)
        request({
            url: 'http://localhost:3000/api',
            form: req.body
        }, function optionalCallback(err, httpResponse, body) {
            if (err) {
                return console.error('upload failed:', err);
            }
            console.log('Upload successful!  Server responded with:', body);
        });
    else {
        request.post({
            url: 'http://localhost:3000/api' + req.url
        }, function optionalCallback(err, httpResponse, body) {
            if (err) {
                return console.error('upload failed:', err);
            }
            console.log('Upload successful!  Server responded with:', body);
        });
    }

    var result = '{"result":"Success"}';
    var jsonObj = JSON.parse(result);
    res.json(jsonObj);

});

module.exports = router;