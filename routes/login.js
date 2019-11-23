//login route
var express = require('express');
var router = express.Router();

//idk why this next line is here might need to look into it, i don't think it's needed
//var accounts = require('../db/models/accounts.js');
//Require controller modules
var login_controller = require('../controllers/loginController.js');

//Login page route.
router.get('/', function(req, res, next) {
    res.render('login', {'errors': false, message: req.flash('error')});
});

//Create account route
router.get('/create', login_controller.account_create);

//Login post
router.post('/', login_controller.account_login);

//Test Controller
//router.get('/accounts', logins_controller.accounts_list);
    
module.exports = router;