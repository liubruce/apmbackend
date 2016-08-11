var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.post('/sdk/ios', function (req, res, next) {
    console.log(req.body);
    res.send('ok ios');
});


router.post('/sdk/andorid', function (req, res, next) {
    console.log(req.body);
    res.send('ok android');
});



module.exports = router;
