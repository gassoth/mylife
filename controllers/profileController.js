var Account = require('../db/models/account.js');
var async = require('async');

//Controller for a profile
exports.get_profile = function(req, res, next) {
    async.parallel({
        account: async function(callback) {
            const user_profile = await Account.query().findById(req.params.id);
            return user_profile;
        }
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.account==null) { // No results.
            var err = new Error('User not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render.
        console.log(results.account);
        if (req.user){
            console.log(req.user.id);
            res.render('profile', { account: results.account, user: req.user} );
        } else {
            res.render('profile', { account: results.account, user: ''} );
        }
    });
};

//clean
//check if logging in actually changes profile page