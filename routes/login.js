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

//Test Controller
//router.get('/accounts', logins_controller.accounts_list);
    
module.exports = router;