var Post = require('../db/models/posts.js');
var Comment = require('../db/models/comments.js');
var Account = require('../db/models/account.js');
var async = require('async');
const { body, validationResult, sanitizeBody } = require('express-validator');

//Controller for getting a blog post
exports.get_read = function (req, res, next) {
    async.parallel({
        account: async function (callback) {
            try {
                if (req.user) {
                    const user_profile = await Account.query().findById(req.user.id);
                    return user_profile;
                }
                return;
            } catch (err) {
                var updatedErr = new Error('Either user is not logged in or account is not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
        posts: async function (callback) {
            try {
                const current_post = await Post.query().findById(req.params.id);
                return current_post;
            } catch (err) {
                var updatedErr = new Error('Post not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
        comments: async function (callback) {
            try {
                const comments = await Comment.query().select('comments.*').where('id_posts', Number(req.params.id));
                return comments;
            } catch (err) {
                var updatedErr = new Error('Comment returned an error.  Please email ohthatemailaddress@gmail.com');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
        tags: async function (callback) {
            try {
                const queried_tags = await Post.query().select('tags').findById(req.params.id);
                return queried_tags;
            } catch (err) {
                var updatedErr = new Error('Tags returned an error.  Please email ohthatemailaddress@gmail.com');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        }
    }, async function (err, results) {
        if (err) { return next(err); }
        if (results.posts == null) { // No results.
            var err = new Error('Post not found');
            err.status = 404;
            return next(err);
        }
        var user = '';
        if (req.user) {
            user = req.user;
        }

        //gets readers for a posts, checks if logged in user is in that list. if not, adds.
        if (user != '') {
            try {
                var readers = await results.posts.$relatedQuery('read');
                var swi = 0;
                for (let i = 0; i < readers.length; i++) {
                    if (user.id == readers[i].id) {
                        swi = 1;
                        break;
                    }
                }
                if (swi) {
                    console.log('UserFound');
                } else {
                    await results.account.$relatedQuery('read').relate(results.posts);
                }
            } catch (err) {
                var updatedErr = new Error('Reading returned an error.  Please email ohthatemailaddress@gmail.com');
                updatedErr.status = 500
                return (next(updatedErr));
            }
        } else {
            console.log('NotLoggedIn');
        }

        let bookmarked = 0;
        //gets bookmarks for a posts, checks if logged in user is in that list to determine whether or not to display bookmark or unbookmark
        if (user != '') {
            try {
                var bookmarks = await results.posts.$relatedQuery('bookmarks');
                console.log(bookmarks);
                for (let i = 0; i < bookmarks.length; i++) {
                    if (user.id == bookmarks[i].id) {
                        bookmarked = 1;
                        break;
                    }
                }
            } catch (err) {
                var updatedErr = new Error('Bookmarks returned an error.  Please email ohthatemailaddress@gmail.com');
                updatedErr.status = 500
                return (next(updatedErr));
            }
        } else {
            console.log('NotLoggedIn');
        }
    
        //user should not be able to view a private post.
        try {
            if (results.posts.visibility == 0 && (req.user.id != results.posts.id_account && results.account.permission < 1)) {
                var err = new Error('Unauthorized access to private post');
                err.status = 403;
                return next(err);
            }
        } catch (err) {
            var err = new Error('Unauthorized access to private post');
            err.status = 403;
            return next(err);
        }
        // Successful, so render.
        res.render('read', { posts: results.posts, user: user, comments: results.comments, bookmark: bookmarked, tags: results.tags.tags });
    });
};


//Controller for when comment is posted
exports.post_read = [

    //Validate
    body('comment').trim().isLength({ min: 1 }).withMessage('Content required'),

    //sanitize
    sanitizeBody('comment'),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.redirect('/read/' + req.params.id);
            return;
        }
        if (req.user == undefined) {
            res.redirect('/login');
            return;
        }
        let time = new Date().toISOString();
        var newComment = {
            author: req.user.generated_username,
            body: req.body.comment,
            date_posted: time,
            id_posts: Number(req.params.id),
            id_account: Number(req.user.id)
        };
        const insertedComment = await Comment.query().insert(newComment);
        console.log('Success' + insertedComment);
        res.redirect('back');
    }
]

//Controller for confirming delete post
exports.get_delete_post = function (req, res, next) {
    async.parallel({
        account: async function (callback) {
            try {
                const user_profile = await Account.query().findById(req.user.id);
                return user_profile;
            } catch (err) {
                var updatedErr = new Error('User not logged in or account is not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
        posts: async function (callback) {
            try {
                const current_post = await Post.query().findById(req.params.id);
                return current_post;
            } catch (err) {
                var updatedErr = new Error('Post not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
    }, async function (err, results) {
        if (err) { return next(err); }
        if (results.posts == null) { // No results.
            var err = new Error('Post not found');
            err.status = 404;
            return next(err);
        }
        //check permissions if user is allowed to delete posts (admins have greater than 0 permission)
        if (!req.user || (results.posts.id_account != req.user.id && results.account.permission == 0)) {
            var err = new Error('Attempted to delete another users posts');
            err.status = 403;
            return next(err);
        }
        // Successful, so delete.
        const numDeleted = await Post.query().deleteById(req.params.id);
        res.redirect('/');
    });
};

//Controller for confirming delete comment
exports.get_delete_comment = function (req, res, next) {
    async.parallel({
        account: async function (callback) {
            try {
                const user_profile = await Account.query().findById(req.user.id);
                return user_profile;
            } catch (err) {
                var updatedErr = new Error('User not logged in or account not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
        comments: async function (callback) {
            try {
                const current_comment = await Comment.query().findById(req.params.id);
                return current_comment;
            } catch (err) {
                var updatedErr = new Error('Comment not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
    }, async function (err, results) {
        if (err) { return next(err); }
        if (results.comments == null) { // No results.
            var err = new Error('Comment not found');
            err.status = 404;
            return next(err);
        }
        if (!req.user || (results.comments.id_account != req.user.id && results.account.permission == 0)) {
            var err = new Error('Attempted to delete another users comment');
            err.status = 403;
            return next(err);
        }
        // Successful, so delete.
        const numDeleted = await Comment.query().deleteById(req.params.id);
        res.redirect('/');
    });
};

//Controller for confirming bookmark post
exports.get_bookmark = function (req, res, next) {
    async.parallel({
        account: async function (callback) {
            try {
                const user_profile = await Account.query().findById(req.user.id);
                return user_profile;
            } catch (err) {
                var updatedErr = new Error('User not logged in or account is not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
        posts: async function (callback) {
            try {
                const current_post = await Post.query().findById(req.params.id);
                return current_post;
            } catch (err) {
                var updatedErr = new Error('Post not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
    }, async function (err, results) {
        if (err) { return next(err); }
        if (results.posts == null) { // No results.
            var err = new Error('Post not found');
            err.status = 404;
            return next(err);
        }

        //gets bookmarks for a posts, checks if logged in user is in that list. if they are, it ends execution.
        try {
            if (!req.user) {
                console.log('NotLoggedIn');
                res.redirect('/login/');
                return;
            }
            var bookmarks = await results.posts.$relatedQuery('bookmarks');
            var swi = 0;
            for (let i = 0; i < bookmarks.length; i++) {
                if (req.user.id == bookmarks[i].id) {
                    swi = 1;
                    break;
                }
            }
            if (swi) {
                console.log('User already bookmarked');
                res.redirect('/');
                return
            } else {
                await results.account.$relatedQuery('bookmarks').relate(results.posts);
            }
        } catch (err) {
            var updatedErr = new Error('Bookmarks returned an error.  Please email ohthatemailaddress@gmail.com');
            updatedErr.status = 500
            return (next(updatedErr));
        }

        // Successful, so redirect.
        res.redirect('/read/' + results.posts.id);
    });
};

//Controller for confirming unbookmark post
exports.get_delete_bookmark = function (req, res, next) {
    async.parallel({
        account: async function (callback) {
            try {
                const user_profile = await Account.query().findById(req.user.id);
                return user_profile;
            } catch (err) {
                var updatedErr = new Error('User not logged in or account is not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
        posts: async function (callback) {
            try {
                const current_post = await Post.query().findById(req.params.id);
                return current_post;
            } catch (err) {
                var updatedErr = new Error('Post not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
    }, async function (err, results) {
        if (err) { return next(err); }
        if (results.posts == null) { // No results.
            var err = new Error('Post not found');
            err.status = 404;
            return next(err);
        }

        //gets bookmarks for a posts, checks if logged in, then removes bookmark
        try {
            if (!req.user) {
                console.log('NotLoggedIn');
                res.redirect('/login/');
                return;
            }
            await results.account.$relatedQuery('bookmarks').unrelate().where({ id_post: results.posts.id });
        } catch (err) {
            var updatedErr = new Error('Bookmarks returned an error.  Please email ohthatemailaddress@gmail.com');
            updatedErr.status = 500
            return (next(updatedErr));
        }

        // Successful, so delete.
        res.redirect('/read/' + results.posts.id);
    });
};