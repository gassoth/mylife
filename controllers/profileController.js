var Account = require('../db/models/account.js');
var Post = require('../db/models/posts.js');
var Comment = require('../db/models/comments.js');
var async = require('async');

//Controller for a profile
exports.get_profile = function(req, res, next) {
    async.parallel({
        account: async function(callback) {
            try {
                const user_profile = await Account.query().findById(req.params.id);
                return user_profile;
            } catch (err) {
                var err = new Error('Account not found');
                err.status = 404;
                return next(err);
            }
        }
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.account==null) { // No results.
            var err = new Error('Account not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render.
        if (req.user){
            res.render('profile', { account: results.account, user: req.user} );
        } else {
            res.render('profile', { account: results.account, user: ''} );
        }
    });
};

//Controller for getting a users posts
exports.get_profile_posts = function(req, res, next) {
    async.parallel({
        posts: async function(callback) {
            try {
                const post = await Post.query().select('posts.*').where('id_account', Number(req.params.id));
                return post;
            } catch (err) {
                var err = new Error('Posts returned an error.  Please email ohthatemailaddress@gmail.com');
                err.status = 404;
                return next(err);
            }
        }
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.posts<1) { // No results.
            res.render('profile_none', { id: req.params.id });
        }
        // Successful, so render.
            res.render('profile_posts', { posts: results.posts} );
    });
};

//Controller for getting a users comments
exports.get_profile_comments = function(req, res, next) {
    async.parallel({
        comments: async function(callback) {
                try {
                    const comment = await Comment.query().select('comments.*').where('id_account', Number(req.params.id));
                    return comment;
                } catch (err) {
                    var err = new Error('Posts returned an error.  Please email ohthatemailaddress@gmail.com');
                    err.status = 404;
                    return next(err);
                }
            }
        }, function(err, results) {
            if (err) { return next(err); }
            if (results.comments<1) { // No results.
                res.render('profile_none', { id: req.params.id });
            }
            // Successful, so render.
                res.render('profile_comments', { comments: results.comments} );
        });
    };
    