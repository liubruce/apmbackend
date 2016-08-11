var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.post('/sdk/ios', function (req, res, next) {
    console.log(req.body);

    var result = '{"result":"1"}';
    var jsonObj = JSON.parse(result);
    res.json(jsonObj);
});


router.post('/sdk/android', function (req, res, next) {
    console.log(req.body);
    var result = '{"result":"1"}';
    var jsonObj = JSON.parse(result);
    res.json(jsonObj);
});



module.exports = router;
