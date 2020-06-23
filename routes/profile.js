//profile route
var express = require('express');
var router = express.Router();
var profile_controller = require('../controllers/profileController.js');
var multer  = require('multer');
const path = require('path');

var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) {
        cb(null, './public/temp_upload/')
    },
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, req.user.generated_username+'.'+file.originalname.split('.')[file.originalname.split('.').length - 1]);
    }
});

var upload = multer({ //multer settings
    storage: storage,
    fileFilter: function (req, file, callback) {
        var ext = path.extname(file.originalname);
        if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
            return callback(new Error('Only images are allowed'));
        }
        callback(null, true);
    },
    limits: {
        fileSize: 1024 * 1024
    }
});

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
router.post('/settings/:id', upload.single('avatar'), profile_controller.post_profile_settings);

module.exports = router;