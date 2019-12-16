var Account = require('../db/models/account.js');
const { body,validationResult } = require('express-validator/check');
const check = require('express-validator/check')
const { sanitizeBody } = require('express-validator/filter');
const passport = require('passport');
var bcrypt = require('bcryptjs');
var randomWords = require('random-words');
var Sentencer = require('sentencer');

//Display all accounts
//exports.accounts_list = async (req, res) => {
//    const person = await Accounts.query();
//    res.json(person);
//};

exports.account_create = (req, res) => {
    res.render('register', {'errors': false, message: req.flash('error')});
}

exports.account_create_post = [
    
    //Validate
    body('password').isLength({ min: 8 }).trim().withMessage('Password too short'),
    body('password')
    .custom((value,{req, loc, path}) => {
        if (value !== req.body.password_validate) {
            // throw error if passwords do not match
            throw new Error("Passwords don't match");
        } else {
            return value;
        }
    }),
    
    //sanitize
    sanitizeBody('username').escape(),
    sanitizeBody('password').escape(),
    sanitizeBody('password_validate').escape(),

    //create new account in the database
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render('register', { errors: errors.array(), message: undefined });
            return;
        }
        else {
            var un = Sentencer.make("{{ adjective }} {{ noun }}");
            let time = new Date().toISOString();
            var newAccount =
                {
                    email: req.body.username,
                    password: req.body.password,
                    permission: 0,
                    generated_username: un,
                    date_created: time
                };
            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(req.body.password, salt, async function(err, hash) {
                    newAccount.password = hash;
                    console.log(hash);
                    const insertedAccount = await Account.query().insert(newAccount);
                    res.redirect('/');
                });
            });
        }
    }
]

//Post login info
exports.account_login = [
    
    //Validate
    body('username').isLength({ min: 6 }).trim().withMessage('Username too short'),
    body('password').isLength({ min: 2 }).trim().withMessage('Password too short'),

    //Sanitize
    sanitizeBody('username').escape(),
    sanitizeBody('password').escape(),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render('login', { errors: errors.array(), message: undefined });
            return;
        }
        else {
        passport.authenticate('local', {
        successRedirect:'/',
        failureRedirect:'/login/',
        failureFlash: true
        })(req, res, next);
        }   
    }
];