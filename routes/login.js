//login route
var express = require('express');
var router = express.Router();

//Require login controller modules
var login_controller = require('../controllers/loginController.js');

//Login page route. Loads login page, sets errors to false since page won't load if undefined,  Message is used if login attempt failed
router.get('/', function(req, res, next) {
    res.render('login', {'errors': false, message: req.flash('error')});
});

//Create account route
router.get('/create', login_controller.account_create);

//create account post
router.post('/create', login_controller.account_create_post);

//Login post
router.post('/', login_controller.account_login);

//Get reset pw page where you enter email
router.get('/resetemail', login_controller.get_reset_email);

//Sends the email to the user to reset their account
router.post('/resetemail', login_controller.post_reset_email);

//Get reset pw page where you actually reset the password
router.get('/reset/:ident/:today-:hash', login_controller.get_account_reset);

//Test Controller
//router.get('/accounts', logins_controller.accounts_list);
    
module.exports = router;