var Post = require('../db/models/posts.js');
var Comment = require('../db/models/comments.js')
var async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

//Controller to get static page
exports.get_debug = (req, res) => {
        res.render('debugread');
}

//Controller for getting a blog post
exports.get_read = function(req, res, next) {
    async.parallel({
        posts: async function(callback) {
            try {
                const current_post = await Post.query().findById(req.params.id);
                return current_post;
            } catch (err) {
                var err = new Error('Post not found');
                err.status = 404;
                return next(err);
            }
        },
        comments: async function(callback) {
            try {
                const comments = await Comment.query().select('comments.*').where('id_posts', Number(req.params.id));
                return comments;
            } catch (err) {
                var err = new Error('Comment returned an error.  Please email ohthatemailaddress@gmail.com');
                err.status = 404;
                return next(err);
            }
        }
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.posts==null) { // No results.
            var err = new Error('Post not found');
            err.status = 404;
            return next(err);
        }
        var user = '';
        if (req.user) {
            user = req.user;
        }
        // Successful, so render.
        res.render('read', { posts: results.posts, user: user, comments: results.comments} );
    });
};


//Controller for when comment is posted
exports.post_read = [

    //Validate
    body('comment').isLength({ min: 1 }).trim().withMessage('Content required'),

    //sanitize
    sanitizeBody('comment'),

    //test
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render('/read/'+req.params.id, { errors: errors.array() });
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
        console.log(newComment);

        const insertedComment = await Comment.query().insert(newComment);
        res.redirect('/');
    }


]

//Controller for confirming delete post
exports.get_delete_post = function(req, res, next) {
    async.parallel({
        posts: async function(callback) {
            try {
                const current_post = await Post.query().findById(req.params.id);
                return current_post;
            } catch (err) {
                var err = new Error('Post not found');
                err.status = 404;
                return next(err);
            }
        },
    }, async function(err, results) {
        if (err) { return next(err); }
        if (results.posts==null) { // No results.
            var err = new Error('Post not found');
            err.status = 404;
            return next(err);
        }
        if (!req.user || results.posts.id_account != req.user.id) {
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
exports.get_delete_comment = function(req, res, next) {
    async.parallel({
        comments: async function(callback) {
            try {
                const current_comment = await Comment.query().findById(req.params.id);
                return current_comment;
            } catch (err) {
                var err = new Error('Comment not found');
                err.status = 404;
                return next(err);
            }
        },
    }, async function(err, results) {
        if (err) { return next(err); }
        if (results.comments==null) { // No results.
            var err = new Error('Comment not found');
            err.status = 404;
            return next(err);
        }
        if (!req.user || results.comments.id_account != req.user.id) {
            var err = new Error('Attempted to delete another users comment');
            err.status = 403;
            return next(err);
        }
        // Successful, so delete.
        const numDeleted = await Comment.query().deleteById(req.params.id);
        res.redirect('/');
    });
};