var express = require('express');
var router = express.Router();

/* GET home page. User used to check if logged in.*/
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express', user: req.user });
});

// GET about page page
router.get('/about', function (req, res, next) {
    res.render('about');
});

module.exports = router;
