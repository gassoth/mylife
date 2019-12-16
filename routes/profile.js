//profile route
var express = require('express');
var router = express.Router();
var profile_controller = require('../controllers/profileController.js');

//debug profile
router.get('/debugp', function(req, res, next) {
    res.render('debugp');
});

//Profile page route.
router.get('/:id', profile_controller.get_profile);

module.exports = router;