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

//Profile posts page route.  Gets the users posts with id match.
router.get('/posts/:id', profile_controller.get_profile_posts);

//Profile comments page route.  Gets the users comments with id match.
router.get('/comments/:id', profile_controller.get_profile_comments);

//Profile attempt to subscribe route.
router.get('/subscribe/:id', profile_controller.get_profile_subscribe);

//Profile attempt to unsubscribe route.
router.get('/unsubscribe/:id', profile_controller.get_profile_unsubscribe);

//Profile get settings page
router.get('/settings/:id', profile_controller.get_profile_settings);

//Profile post setting page
router.post('/settings/:id', profile_controller.post_profile_settings);

module.exports = router;