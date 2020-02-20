const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
var async = require('async');
var Posts = require('../db/models/posts.js');

//Controller to get static page
exports.get_write = (req, res) => {
    if (req.user) {
        res.render('write', {errors: undefined });
    } else {
        res.redirect('/login');
    }
}

//Controller to get edit post
exports.get_edit = function(req, res, next) {
    async.parallel({
        posts: async function(callback) {
            try {
                const current_post = await Posts.query().findById(req.params.id);
                return current_post;
            } catch (err) {
                var err = new Error('Post not found');
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
        console.log(results.posts.title);
        //check if user is allowed to edit post, else just redirect to the post
        if (user != '' && user.id == results.posts.id_account) {
            res.render('edit', { posts: results.posts, errors: undefined } );
        } else {
            res.render('read', { posts: results.posts, user: user} );
        }
    });
};


//Controller for editing post
exports.post_edit = [

    //Validate
    //TODO
    //need validation styling and need to figure out maxlength
    body('deltaText').isLength({ min: 4 }).trim().withMessage('Content required'),
    body('htmlText').isLength({ min: 4 }).trim().withMessage('Content required'),
    body('title').isLength({ min: 1 }).trim().withMessage('Title required'),

    //sanitize
    sanitizeBody('deltaText'),
    sanitizeBody('htmlText'),
    sanitizeBody('title'),


    //test
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render('edit', { errors: errors.array() });
            return;
        }
        var visibility = 0;
        if (req.body.visibility != undefined) {
            visibility = 1;
        }
        //console.log(req.body.title);
        //var newPost = {
        //    title: req.body.title,
        //    body_delta: req.body.deltaText,
        //    body_html: req.body.htmlText,
        //    date_posted: time,
        //    author: req.user.generated_username,
        //    visibility: visibility,
        //    id_account: req.user.id
        //};

        //console.log(req.body.title);
        //console.log(req.body.deltaText);
        //console.log(req.body.htmlText);
        //console.log(req.user.id);
        //console.log(req.user.generated_username);
        console.log(req.params.id);
        const updatedAccount = await Posts.query().findById(req.params.id).patch({
            title: req.body.title,
            body_delta: req.body.deltaText,
            body_html: req.body.htmlText,
            visibility: visibility
        });
        res.redirect('/');
    }


]


//Controller for when form is posted
exports.post_write = [

    //Validate
    //TODO
    //need validation styling and need to figure out maxlength
    body('deltaText').isLength({ min: 4 }).trim().withMessage('Content required'),
    body('htmlText').isLength({ min: 4 }).trim().withMessage('Content required'),
    body('title').isLength({ min: 1 }).trim().withMessage('Title required'),

    //sanitize
    sanitizeBody('deltaText'),
    sanitizeBody('htmlText'),
    sanitizeBody('title'),


    //test
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render('write', { errors: errors.array() });
            return;
        }
        let time = new Date().toISOString();
        var visibility = 0;
        if (req.body.visibility != undefined) {
            visibility = 1;
        }
        //var delta = req.body.editor.getContents();
        //console.log(req.body.title);
        var newPost = {
            title: req.body.title,
            body_delta: req.body.deltaText,
            body_html: req.body.htmlText,
            date_posted: time,
            author: req.user.generated_username,
            visibility: visibility,
            id_account: req.user.id
        };
        console.log(newPost);
        console.log(req.body.title);
        console.log(req.body.deltaText);
        console.log(req.body.htmlText);

        if (req.body.visibility == undefined) {
            console.log('0');
        }
        else
        {
            console.log(req.body.visibility);
        }
        console.log(time);
        console.log(req.user.id);
        console.log(req.user.generated_username);
        const insertedAccount = await Posts.query().insert(newPost);
        res.redirect('/');
    }


]
