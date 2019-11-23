var Accounts = require('../db/models/accounts.js');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');


//Display all accounts
exports.accounts_list = async (req, res) => {
    const person = await Accounts.query();
    res.json(person);
};

//Post login info
exports.account_login = [
    //Validate
    body('username').isLength({ min: 2 }).trim().withMessage('Username required'),
    body('password').isLength({ min: 2 }).trim().withMessage('Password required'),

    //Sanitize
    sanitizeBody('username').escape(),
    sanitizeBody('password').escape(),

    (req, res, next) => {
        // Extract the validation errors from a request.
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render('login', { errors: errors.array() });
            return;
        }
        else {
            // Data from form is valid.
            // Create an Author object with escaped and trimmed data.
	    console.log(req.body.username);
	    console.log(req.body.password);
	}
        
    }
];

//Post login info
//exports.account_login 
