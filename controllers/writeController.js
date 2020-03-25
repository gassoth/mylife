const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
var async = require('async');
var Posts = require('../db/models/posts.js');
var Comment = require('../db/models/comments.js');
var Tags = require('../db/models/tags.js');

//Controller to get static page
exports.get_write = (req, res) => {
    if (req.user) {
        res.render('write', {errors: undefined, posts: '', title: '' });
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
        console.log(results.posts.title);
        //check if user is allowed to edit post, else just redirect to the post
        if (user != '' && (user.id == results.posts.id_account || user.permission > 0)) {
            res.render('edit', { posts: results.posts, errors: undefined } );
        } else {
            res.render('read', { posts: results.posts, user: user, comments: results.comments} );
        }
    });
};


//Controller for editing post
exports.post_edit = [

    //Validate
    //TODO
    //need validation styling and need to figure out maxlength
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
            let post = await Posts.query().findById(req.params.id);
            res.render('edit', { errors: errors.array(), posts: post });
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
    body('htmlText').isLength({ min: 4 }).trim().withMessage('Content required'),
    body('title').isLength({ min: 1 }).trim().withMessage('Title required'),

    //sanitize
    sanitizeBody('deltaText'),
    sanitizeBody('htmlText'),
    sanitizeBody('title'),
    sanitizeBody('tags'),

    //test
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render('write', { errors: errors.array(), posts: req.body.htmlText, title: req.body.title });
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
        const insertedPost = await Posts.query().insert(newPost);

        //creates tags for this post, removes whitespace and then duplicates, then inserts
        let tags = '';
        if (req.body.tags.trim().length > 0) {
            tags = req.body.tags.split(" ");
        }
        const setTags = function(a) { return [...new Set(a)]};

        if (tags != '') {
            let setOfTags = setTags(tags);
            for (let i = 0; i < setOfTags.length; i++) {
                var newTag = {
                    tag: setOfTags[i],
                    id_posts: insertedPost.id
                };
                const insertedTag = await Tags.query().insert(newTag);
            }
        }

        res.redirect('/');
    }
]

//Controller to get tags page
exports.get_tags = async (req, res) => {
    const current_post = await Posts.query().findById(req.params.id);
    if (req.user && (req.user.id == current_post.id_account || req.user.permission > 0)) {
        const queried_tags = await Tags.query().select('tags.*').where('id_posts', Number(req.params.id));
        console.log(queried_tags);
        res.render('tags', {tags: queried_tags, errors: ''});
    } else {
        console.log('Cannot edit another users post')
        res.redirect('/');
    }


}

//Controller for when tag is edited
exports.post_tags = [

    //Validate
    //TODO
    //need validation styling and need to figure out maxlength
    body('tags').isLength({ min: 1 }).trim().withMessage('Tags required'),

    //sanitize
    sanitizeBody('tags'),

    //test
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            const queried_tags = await Tags.query().select('tags.*').where('id_posts', Number(req.params.id));
            res.render('tags', { tags: queried_tags, errors: errors.array() });
            return;
        }
        //separates tags, trims it, removes duplicates
        let tags = '';
        if (req.body.tags.trim().length > 0) {
            tags = req.body.tags.split(" ");
        }
        const setTags = function(a) { return [...new Set(a)]};
        if (req.body.btn_submit == 'add') {
            if (tags != '') {
                let setOfTags = setTags(tags);
                for (let i = 0; i < setOfTags.length; i++) {
                    var newTag = {
                        tag: setOfTags[i],
                        id_posts: parseInt(req.params.id)
                    };
                    const insertedTag = await Tags.query().insert(newTag).catch(error => { console.log('caught', error.message); });
                }
            }
        } else {
            if (tags != '') {
                let setOfTags = setTags(tags);
                for (let i = 0; i < setOfTags.length; i++) {
                    const deletedTag = await Tags.query().delete().where('tag', setOfTags[i]).where('id_posts', req.params.id);
                }
            }
        }
        
        res.redirect('/read/'+req.params.id);
    }
]