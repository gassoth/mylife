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
            //time zone object
            let tzInts = [
                {"label":"Etc/GMT+12","value":-12},
                {"label":"Pacific/Midway","value":-11},
                {"label":"Pacific/Honolulu","value":-10},
                {"label":"US/Alaska","value":-9},
                {"label":"America/Los_Angeles","value":-8},
                {"label":"America/Tijuana","value":-8},
                {"label":"US/Arizona","value":-7},
                {"label":"America/Chihuahua","value":-7},
                {"label":"US/Mountain","value":-7},
                {"label":"America/Managua","value":-6},
                {"label":"US/Central","value":-6},
                {"label":"America/Mexico_City","value":-5},
                {"label":"Canada/Saskatchewan","value":-5},
                {"label":"America/Bogota","value":-5},
                {"label":"US/Eastern","value":-4},
                {"label":"US/East-Indiana","value":-4},
                {"label":"Canada/Atlantic","value":-4},
                {"label":"America/Caracas","value":-4},
                {"label":"America/Manaus","value":-3},
                {"label":"America/Santiago","value":-3},
                {"label":"Canada/Newfoundland","value":-3},
                {"label":"America/Sao_Paulo","value":-3},
                {"label":"America/Argentina/Buenos_Aires","value":-3},
                {"label":"America/Godthab","value":-3},
                {"label":"America/Montevideo","value":-3},
                {"label":"America/Noronha","value":-2},
                {"label":"Atlantic/Cape_Verde","value":-1},
                {"label":"Atlantic/Azores","value":-1},
                {"label":"Africa/Casablanca","value":0},
                {"label":"Etc/Greenwich","value":0},
                {"label":"Europe/Amsterdam","value":1},
                {"label":"Europe/Belgrade","value":1},
                {"label":"Europe/Brussels","value":1},
                {"label":"Europe/Sarajevo","value":1},
                {"label":"Africa/Lagos","value":1},
                {"label":"Asia/Amman","value":2},
                {"label":"Europe/Athens","value":2},
                {"label":"Asia/Beirut","value":2},
                {"label":"Africa/Cairo","value":2},
                {"label":"Africa/Harare","value":2},
                {"label":"Europe/Helsinki","value":2},
                {"label":"Asia/Jerusalem","value":2},
                {"label":"Europe/Minsk","value":2},
                {"label":"Africa/Windhoek","value":2},
                {"label":"Asia/Kuwait","value":3},
                {"label":"Europe/Moscow","value":3},
                {"label":"Africa/Nairobi","value":3},
                {"label":"Asia/Tbilisi","value":3},
                {"label":"Asia/Tehran","value":3},
                {"label":"Asia/Muscat","value":4},
                {"label":"Asia/Baku","value":4},
                {"label":"Asia/Yerevan","value":4},
                {"label":"Asia/Kabul","value":4},
                {"label":"Asia/Yekaterinburg","value":5},
                {"label":"Asia/Karachi","value":5},
                {"label":"Asia/Calcutta","value":5},
                {"label":"Asia/Calcutta","value":5},
                {"label":"Asia/Katmandu","value":5},
                {"label":"Asia/Almaty","value":6},
                {"label":"Asia/Dhaka","value":6},
                {"label":"Asia/Rangoon","value":6},
                {"label":"Asia/Bangkok","value":7},
                {"label":"Asia/Krasnoyarsk","value":7},
                {"label":"Asia/Hong_Kong","value":8},
                {"label":"Asia/Kuala_Lumpur","value":8},
                {"label":"Asia/Irkutsk","value":8},
                {"label":"Australia/Perth","value":8},
                {"label":"Asia/Taipei","value":8},
                {"label":"Asia/Tokyo","value":9},
                {"label":"Asia/Seoul","value":9},
                {"label":"Asia/Yakutsk","value":9},
                {"label":"Australia/Adelaide","value":9},
                {"label":"Australia/Darwin","value":9},
                {"label":"Australia/Brisbane","value":10},
                {"label":"Australia/Canberra","value":10},
                {"label":"Australia/Hobart","value":10},
                {"label":"Pacific/Guam","value":10},
                {"label":"Asia/Vladivostok","value":10},
                {"label":"Asia/Magadan","value":11},
                {"label":"Pacific/Auckland","value":-12},
                {"label":"Pacific/Fiji","value":-12},
                {"label":"Pacific/Tongatapu","value":-11}
            ]
            //Generates username.  Username is an adjective noun pair, like crazy diamond.
            //Permission is 0 for regular user
            var un = Sentencer.make("{{ adjective }} {{ noun }}");
            let time = new Date().toISOString();
            var emailEnabled = 0;
            if (req.body.email_enabled != undefined) {
                emailEnabled = 1;
            }
            let tz_preference = 7;
            for (let i = 0; i < tzInts.length; i++) {
                let entry = tzInts[i];
                if (entry.label == req.body.timezones) {
                    tz_preference = entry.value+12;
                }
            }

            var newAccount =
                {
                    email: req.body.username,
                    password: req.body.password,
                    permission: 0,
                    email_enabled: emailEnabled,
                    generated_username: un,
                    date_created: time,
                    tz_preference: tz_preference
                };
            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(req.body.password, salt, async function(err, hash) {
                    newAccount.password = hash;
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

//Actually reset the users password if it is correct
exports.post_account_reset = [

    //Validate
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
    //sanitize
    sanitizeBody('password').escape(),
    sanitizeBody('password_validate').escape(),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            console.log(errors.array());
            res.render('reset', { errors: errors.array(), message: req.flash('error') });
            return;
        } else {
            try {
                //Check if password request was generated more than 2 hours ago
                let urlToday = new Date(base64Decode(req.params.today));
                let serverToday = new Date();
                const milliseconds = Math.abs(serverToday - urlToday);
                const hours = milliseconds / 36e5;
                if (hours > 2) {
                    throw new Error("User requested password reset more than 2 hours ago");
                }
                let userId = base64Decode(req.params.ident);

                //Check if url account exists
                const resetAccount = await Account.query().select('id', 'generated_username', 'password', 'last_logged', 'email')
                    .findById(userId);
                if (resetAccount == undefined) {
                    throw new Error("Account was not found");
                }
                // Hash again all the data to compare it with the link
                // THe link in invalid when:
                // 1. If the lastLoginDate is changed, user has already do a login 
                // 2. If the password is changed, the user has already changed the password
                const data = {
                    today: base64Decode(req.params.today),
                    userId: userId.toString(),
                    lastLogin: resetAccount.last_logged.toString(),
                    password: resetAccount.password,
                    email: resetAccount.email.toString()
                };
                const hash = sha256(JSON.stringify(data), process.env.TOKENSECRET);
                if (hash == req.params.hash) {
                    bcrypt.genSalt(10, function(err, salt) {
                        bcrypt.hash(req.body.password, salt, async function(err, hash) {
                            const updatedPassword = await Account.query().findById(userId).patch({
                                password: hash
                            });
                            console.log('password changed');
                            res.redirect('/login');
                        });
                    });
                } else {
                    throw new Error("Hash does not match");
                }
                return;
            } catch (err) {
                return next(err)
            }
        }
    }
];

//Get the actual page where you change the password
exports.get_account_change = function (req, res, next) {
    res.render('reset', { errors: undefined, message: req.flash('error') });
};

//Actually reset the users password if it is correct
exports.post_account_change = [

    //Validate
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
    //sanitize
    sanitizeBody('password').escape(),
    sanitizeBody('password_validate').escape(),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            console.log(errors.array());
            res.render('reset', { errors: errors.array(), message: req.flash('error') });
            return;
        } else {
            try {
                //Check if user logged in, get logged in user, update their password
                if (req.user == undefined) {
                    throw new Error("Not logged in");
                }
                let userId = req.user.id;
                const resetAccount = await Account.query().select('email')
                    .findById(userId);
                if (resetAccount == undefined) {
                    throw new Error("Account was not found");
                }
                bcrypt.genSalt(10, function(err, salt) {
                    bcrypt.hash(req.body.password, salt, async function(err, hash) {
                        const updatedPassword = await Account.query().findById(userId).patch({
                            password: hash
                        });
                        console.log('password changed');
                        res.redirect('/');
                    });
                });
                return;
            } catch (err) {
                return next(err)
            }
        }
    }
];