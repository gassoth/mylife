var Account = require('../db/models/account.js');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
const passport = require('passport');
var bcrypt = require('bcryptjs');
const crypto = require('crypto');
var Sentencer = require('sentencer');
const emailer = require('../emailer');
const fs = require('fs');

//Display all accounts
//exports.accounts_list = async (req, res) => {
//    const person = await Accounts.query();
//    res.json(person);
//};

//encode in base 64
const base64Encode = (data) => {
    let buff = new Buffer.from(data);
    return buff.toString('base64');
}

//decode in base 64
const base64Decode = (data) => {
    let buff = new Buffer.from(data, 'base64');
    return buff.toString('ascii');
}

//hash function
const sha256 = (salt, password) => {
    var hash = crypto.createHash('sha512', password);
    hash.update(salt);
    var value = hash.digest('hex');
    return value;
}

//Registration page route. Loads registration page, sets errors to undef since page won't load if not set to anything  Message is used if attempt failed
exports.account_create = (req, res) => {
    res.render('register', {errors: undefined, message: req.flash('error')});
}

exports.account_create_post = [
    
    //Validate
    body('username').isLength({ min: 1 }).trim().withMessage('Username field empty'),
    body('password_validate').isLength({ min: 1 }).trim().withMessage('Validation field empty'),
    body('password').isLength({ min: 8 }).trim().withMessage('Password is too short'),
    body('password')
    .custom((value,{req, loc, path}) => {
        if (value !== req.body.password_validate || req.body.password_validate == '') {
            // throw error if passwords do not match
            throw new Error("Passwords don't match");
        } else {
            return value;
        }
    }),
    body('username')
    .custom(async function(value, {req, loc, path}) {
        const user = await Account.query().where('email', req.body.username);
        if (user.length != 0) {
            console.log(user);
            throw new Error("User with that email already exists");
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
            console.log(errors.array());
            res.render('register', { errors: errors.array(), message: req.flash('error') });
            return;
        }
        else {
            //Generates username.  Username is an adjective noun pair, like crazy diamond.
            //Permission is 0 for regular user
            var un = Sentencer.make("{{ adjective }} {{ noun }}");
            let time = new Date().toISOString();
            var emailEnabled = 0;
            if (req.body.email_enabled != undefined) {
                emailEnabled = 1;
            }
            var newAccount =
                {
                    email: req.body.username,
                    password: req.body.password,
                    permission: 0,
                    email_enabled: emailEnabled,
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
    body('username').isLength({ min: 5 }).trim().withMessage('Username too short'),
    body('password').isLength({ min: 8 }).trim().withMessage('Password too short'),

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

//Get the page where you enter your email to reset
exports.get_reset_email = function (req, res, next) {
    res.render('email_reset', { errors: undefined, message: req.flash('error') });
};

//Authenticate user and send email with reset url
exports.post_reset_email = [

    //Validate
    body('username').isLength({ min: 1 }).trim().withMessage('Username field empty'),

    //sanitize
    sanitizeBody('username').escape(),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            console.log(errors.array());
            res.render('email_reset', { errors: errors.array(), message: req.flash('error') });
            return;
        }
        else {
            try {
                //Get the user from the database
                const resetAccount = await Account.query().select('id', 'generated_username', 'password', 'last_logged')
                    .where('email', req.body.username);
                if (resetAccount.length == 0) {
                    throw new Error("Account was not found");
                }

                //Creates the matcher to determine if url is valid
                const todayUnencoded = new Date().toISOString()
                const today = base64Encode(todayUnencoded);
                const ident = base64Encode(resetAccount[0].id.toString())
                const data = {
                    today: todayUnencoded,
                    userId: resetAccount[0].id.toString(),
                    lastLogin: resetAccount[0].last_logged.toString(),
                    password: resetAccount[0].password,
                    email: req.body.username
                };
                const hash = sha256(JSON.stringify(data), process.env.TOKENSECRET);
                //link user clicks on to reset pass
                const url = 'localhost:3000/login/reset/' + ident + '/:' + today + "-" + hash;
                //Reads credentials and preps to send email to user
                fs.readFile('credentials.json', async (err, content) => {
                    if (err) return console.log('Error loading client secret file:', err);
                    // Authorize a client with credentials, then call the Gmail API.
                    emailer.authResetEmail(JSON.parse(content), req.body.username, url)
                });
                res.redirect('/');
                return;
            } catch (err) {
                if (err.message == "Account was not found") {
                    err.status = 404;
                }
                return next(err);
            }
        }
    }
]

//Get the actual page where you reset the password
exports.get_account_reset = function (req, res, next) {
    res.render('reset', { errors: undefined, message: req.flash('error') });
};