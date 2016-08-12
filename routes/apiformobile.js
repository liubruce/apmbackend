var express = require('express');
var router = express.Router();



router.post('/mobile/device', function (req, res, next) {
    console.log(req.body);

    var result = '{"result":"1"}';
    var jsonObj = JSON.parse(result);
    res.json(jsonObj);
});

router.post('/crash', function (req, res, next) {
    console.log(req.body);

    var result = '{"result":"1"}';
    var jsonObj = JSON.parse(result);
    res.json(jsonObj);
});





module.exports = router;