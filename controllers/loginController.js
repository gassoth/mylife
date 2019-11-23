var Accounts = require('../db/models/account.js');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
const passport = require('passport');

//Display all accounts
//exports.accounts_list = async (req, res) => {
//    const person = await Accounts.query();
//    res.json(person);
//};

exports.account_create = (req, res) => {
    res.send('respond with a resource');
}

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