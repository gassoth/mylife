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
        },
        //posts count
        posts: async function(callback) {
            try {
                const post = await Post.query().count('posts.*').where('id_account', Number(req.params.id));
                return post;
            } catch (err) {
                var err = new Error('Posts returned an error.  Please email ohthatemailaddress@gmail.com');
                err.status = 404;
                return next(err);
            }
        },
        //comments count
        comments: async function(callback) {
            try {
                const comment = await Comment.query().count('comments.*').where('id_account', Number(req.params.id));
                return comment;
            } catch (err) {
                var err = new Error('Comment returned an error.  Please email ohthatemailaddress@gmail.com');
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

        //Checks if the count of users posts is valid and sends the correct value
        let postsCount = 0;
        let commentsCount = 0;
        if (results.posts[0].count != '0') {
            postsCount = results.posts[0].count;
        }
        if (results.comments[0].count != '0') {
            commentsCount = results.comments[0].count;
        }
        // Successful, so render.  Either send in defined user or empty user since gives error if user not found
        if (req.user){
            res.render('profile', { account: results.account, user: req.user, postsCount: postsCount, commentsCount: commentsCount} );
        } else {
            res.render('profile', { account: results.account, user: '', postsCount: postsCount, commentsCount: commentsCount} );
        }
    });
};

//Controller for getting a users posts
exports.get_profile_posts = function(req, res, next) {
    async.parallel({
        account: async function(callback) {
            try {
                const user_profile = await Account.query().findById(req.user.id);
                return user_profile;
            } catch (err) {
                var err = new Error('Account not found');
                err.status = 404;
                return next(err);
            }
        },
        posts: async function(callback) {
            try {
                const post = await Post.query().select('posts.*').where('id_account', Number(req.params.id));
                const postPublic = await Post.query().select('posts.*').where('id_account', Number(req.params.id)).where('visibility', 1);
                return [post,postPublic];
            } catch (err) {
                var err = new Error('Posts returned an error.  Please email ohthatemailaddress@gmail.com');
                err.status = 404;
                return next(err);
            }
        }
    }, function(err, results) {
        if (err) { return next(err); }
        let userId = '';
        try {
            userId = req.user.id;
        } catch (err) {

        }
        console.log(userId);
        if (results.posts[0]<1) { // No results.
            res.render('profile_none', { id: req.params.id });
        }
        if (userId == req.params.id || results.account.permission > 0) {
            // Successful and correct user is logged in, so private and public posts displayed
            res.render('profile_posts', { posts: results.posts[0]} );
        }
        //Post authors is not logged in, so only public posts are displayed
        if (results.posts[1]<1)  {//no public posts available 
            res.render('profile_none', { id: req.params.id } );
        }
        res.render('profile_posts', { posts: results.posts[1]} );
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
                    var err = new Error('Comments returned an error.  Please email ohthatemailaddress@gmail.com');
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
    