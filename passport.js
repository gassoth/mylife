var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var Accounts = require('./db/models/account.js');
var bcrypt = require('bcryptjs');

//What i did
//added passport.js, removed the post in the route/controller and instead it posts to this file instead.
//what i need to do
//continue passport js, try to actually make it login. refractor then upload to github.


//might need error handling
module.exports = function(passport) {
    // Configure the local strategy for use by Passport.
    //
    // The local strategy require a `verify` function which receives the credentials
    // (`username` and `password`) submitted by the user.  The function must verify
    // that the password is correct and then invoke `cb` with a user object, which
    // will be set at `req.user` in route handlers after authentication.
    passport.use(new Strategy(
	async function(username, password, done) {
	    const user = await Accounts.query().where('email', username).first();
	    if (!user) { return done(null, false); }
        console.log(password);
        bcrypt.compare(password, user.password, function(err, res) {
            if (res) {
                return done(null, user);
            } else {
                return done(null, false, {message: 'Incorrect login attempt'});
            }
        });
	}));


    // Configure Passport authenticated session persistence.
    //
    // In order to restore authentication state across HTTP requests, Passport needs
    // to serialize users into and deserialize users out of the session.  The
    // typical implementation of this is as simple as supplying the user ID when
    // serializing, and querying the user record by ID from the database when
    // deserializing.
    passport.serializeUser(function(user, done) {
	done(null, user.id);
    });

    passport.deserializeUser(async function(id, done) {
	const user = await Accounts.query().findById(id);
	done(null, user);
    });
}
