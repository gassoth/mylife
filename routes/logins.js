//login route
var express = require('express');
var router = express.Router();
var Accounts = require('../db/models/accounts.js');
const passport = require('passport');


//idk why this next line is here might need to look into it, i don't think it's needed
//var accounts = require('../db/models/accounts.js');
//Require controller modules
var logins_controller = require('../controllers/loginController.js');

//Login page route.
router.get('/', function(req, res, next) {
    console.log(req.user);
    res.render('login', {'errors': false, message: req.flash('error')});
});

//Login post
router.post('/', function(req, res, next) {
    passport.authenticate('local', {
	successRedirect:'/',
	failureRedirect:'/login/',
	failureFlash: true
    })(req, res, next);
});

//Test Controller
router.get('/accounts', logins_controller.accounts_list);

    
module.exports = router;
