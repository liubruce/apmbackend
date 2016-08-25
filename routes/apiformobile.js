var express = require('express');
var router = express.Router();
var log = require('log4js').getLogger("apiformobile");


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


module.exports = router;