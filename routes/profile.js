//profile route
var express = require('express');
var router = express.Router();
var profile_controller = require('../controllers/profileController.js');
var multer = require('multer');
var Account = require('../db/models/account.js');
const path = require('path');

var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) {
        cb(null, './public/temp_upload/')
    },
    filename: async function (req, file, cb) {
        var datetimestamp = Date.now();
        const user = await Account.query().select('generated_username').findById(req.params.id);
        console.log(user);
        cb(null, user.generated_username + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1]);
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

//Profile page route. Gets profile with id match.
router.get('/:id', profile_controller.get_profile);

//Profile posts page route.  Gets the users posts with id match.
router.get('/posts/:id/:pageNum', profile_controller.get_profile_posts);

//Profile comments page route.  Gets the users comments with id match.
router.get('/comments/:id/:pageNum', profile_controller.get_profile_comments);

//Profile attempt to subscribe route.
router.get('/subscribe/:id', profile_controller.get_profile_subscribe);

//Profile attempt to unsubscribe route.
router.get('/unsubscribe/:id', profile_controller.get_profile_unsubscribe);

//Profile get settings page
router.get('/settings/:id', profile_controller.get_profile_settings);

//Profile post setting page
var protectedUpload = [profile_controller.check_permission, upload.single('avatar')];
router.post('/settings/:id', protectedUpload, profile_controller.post_profile_settings);

//Deletes account and all associated posts and comments
router.get('/settings/:id/delete', profile_controller.get_delete_account);

//Get reset pw page when a user is logged in
router.get('/reset/:id', profile_controller.check_permission, profile_controller.get_account_change);

//Post reset pw page when a user is logged in
router.post('/reset/:id', profile_controller.check_permission, profile_controller.post_account_change);

module.exports = router;