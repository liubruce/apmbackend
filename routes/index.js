var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.post('/sdk/ios', function (req, res, next) {
    console.log(req.body);
    res.json('ok ios');
});


router.post('/sdk/android', function (req, res, next) {
    console.log(req.body);
    res.json('ok android');
});



module.exports = router;
