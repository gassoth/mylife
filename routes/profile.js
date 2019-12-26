//profile route
var express = require('express');
var router = express.Router();
var profile_controller = require('../controllers/profileController.js');

//debug profile.  Just a static profile
router.get('/debugp', function(req, res, next) {
    res.render('debugp');
});

//Profile page route. Gets profile with id match.
router.get('/:id', profile_controller.get_profile);

module.exports = router;