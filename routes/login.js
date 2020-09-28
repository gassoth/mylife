//login route
var express = require('express');
var router = express.Router();
var bouncer = require ("express-bouncer")(5000, 900000, 5);
bouncer.whitelist.push("127.0.0.1");

// In case we want to supply our own error (optional)
bouncer.blocked = function (req, res, next, remaining)
{
    var time = remaining/1000;
    var e = new Error("Too many requests have been made.  Please wait " + time.toString() + " seconds");
    e.status = 429;
    return next(e);
};

//Require login controller modules
var login_controller = require('../controllers/loginController.js');

//Login page route. Loads login page, sets errors to false since page won't load if undefined,  Message is used if login attempt failed
router.get('/', function (req, res, next) {
    res.render('login', { 'errors': false, message: req.flash('error') });
});

//Create account route
router.get('/create', login_controller.account_create);

//create account post
router.post('/create', login_controller.account_create_post);

//Login post
router.post('/', bouncer.block, login_controller.account_login);

//Get reset pw page where you enter email
router.get('/resetemail', login_controller.get_reset_email);

//Sends the email to the user to reset their account
router.post('/resetemail', login_controller.post_reset_email);

//Get reset pw page where you actually reset the password
router.get('/reset/:ident/:today-:hash', login_controller.get_account_reset);

//Get reset pw page where you actually reset the password
router.post('/reset/:ident/:today-:hash', login_controller.post_account_reset);

module.exports = router;