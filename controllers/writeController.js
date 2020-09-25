const { raw } = require('objection');
const { body, validationResult, sanitizeBody } = require('express-validator');
var async = require('async');
var Posts = require('../db/models/posts.js');
var Comment = require('../db/models/comments.js');

//Controller to get static page
exports.get_write = (req, res) => {
    if (req.user) {
        res.render('write', { errors: undefined, posts: '', title: '', tags: '', vis: '' });
    } else {
        res.redirect('/login');
    }
}

//Controller to get edit post
exports.get_edit = function (req, res, next) {
    async.parallel({
        posts: async function (callback) {
            try {
                const current_post = await Posts.query().findById(req.params.id);
                return current_post;
            } catch (err) {
                var err = new Error('Post not found');
                err.status = 404;
                return next(err);
            }
        },
        comments: async function (callback) {
            try {
                const comments = await Comment.query().select('comments.*').where('id_posts', Number(req.params.id));
                return comments;
            } catch (err) {
                var err = new Error('Comment returned an error.  Please email ohthatemailaddress@gmail.com');
                err.status = 404;
                return next(err);
            }
        }
    }, function (err, results) {
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
        console.log(results.posts.title);
        //check if user is allowed to edit post, else just redirect to the post
        if (user != '' && (user.id == results.posts.id_account || user.permission > 0)) {
            res.render('edit', { posts: results.posts, title: '', post: '', errors: undefined, vis: '' });
        } else {
            res.redirect('/read/' + results.posts.id);
        }
    });
};


//Controller for editing post
exports.post_edit = [

    //Validate
    body('htmlText').isLength({ min: 4 }).trim().withMessage('Content required'),
    body('title').isLength({ min: 1 }).trim().withMessage('Title required'),

    //sanitize
    sanitizeBody('deltaText'),
    sanitizeBody('htmlText'),
    sanitizeBody('stringText'),
    sanitizeBody('title'),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            let post = await Posts.query().findById(req.params.id);
            res.render('edit', { errors: errors.array(), posts: post, post: req.body.htmlText, title: req.body.title, vis: req.body.visibility });
            return;
        }

        var visibility = 0;
        if (req.body.visibility != undefined) {
            visibility = 1;
        }

        //Check if user can edit post
        const postTitle = await Posts.query().select('title', 'id_account').findById(req.params.id);
        if (!req.user || (req.user.id != postTitle.id_account && req.user.permission == 0)) {
            var err = new Error('Unauthorized access');
            err.status = 403;
            return next(err);
        }

        //Modify tags to delete old title
        if (postTitle != undefined) {
            const deletedTag = await Posts.query().findById(req.params.id).patch({
                tags: raw('array_remove("tags", ?)', [postTitle.title.toLowerCase()])
            });
        }

        //Update post
        const updatedPost = await Posts.query().findById(req.params.id).patch({
            title: req.body.title,
            body_delta: req.body.deltaText,
            body_html: req.body.htmlText,
            visibility: visibility,
            body: req.body.stringText
        });
        console.log('Success' + updatedPost);

        //Modify tags to add new title
        const insertedTag = await Posts.query().findById(req.params.id).patch({
            tags: raw('array_append("tags", ?)', [req.body.title.toLowerCase()])
        });
        res.redirect('/');
    }


]

//Controller for when form is posted
exports.post_write = [

    //Validate
    body('htmlText').isLength({ min: 4 }).trim().withMessage('Content required'),
    body('title').isLength({ min: 1 }).trim().withMessage('Title required'),

    //sanitize
    sanitizeBody('deltaText'),
    sanitizeBody('stringText'),
    sanitizeBody('htmlText'),
    sanitizeBody('title'),
    sanitizeBody('tags'),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            var vis = '';
            if (req.body.visibility != undefined) {
                vis = 1;
            }
            res.render('write', { errors: errors.array(), posts: req.body.htmlText, title: req.body.title, tags: req.body.tags, vis: vis });
            return;
        }

        let time = new Date().toISOString();
        var visibility = 0;
        if (req.body.visibility != undefined) {
            visibility = 1;
        }

        //creates tags for this post, removes whitespace and then removes duplicates, then inserts into arrayOfTags
        let tags = [];
        if (req.body.tags.trim().length > 0) {
            tags = req.body.tags.split(" ");
        }
        tags.push(req.user.generated_username);
        tags.push(req.body.title);
        let lowercasedTags = tags.map(tag => tag.toLowerCase());

        const setTags = function (a) { return [...new Set(a)] };
        let arrayOfTags = Array.from(setTags(lowercasedTags));

        //Posts new post
        var newPost = {
            title: req.body.title,
            body_delta: req.body.deltaText,
            body_html: req.body.htmlText,
            date_posted: time,
            author: req.user.generated_username,
            visibility: visibility,
            id_account: req.user.id,
            tags: arrayOfTags,
            body: req.body.stringText
        };
        const insertedPost = await Posts.query().insertAndFetch(newPost);
        console.log('Success' + insertedPost);

        //insert tags
        for (let i = 0; i < arrayOfTags.length; i++) {
            const insertedTag = await Posts.query().findById(insertedPost.id).patch({
                tags: raw('array_append("tags", ?)', [arrayOfTags[i].toString()])
            });
        }

        res.redirect('/');
    }
]

//Controller to get tags page
exports.get_tags = async (req, res, next) => {
    const current_post = await Posts.query().findById(req.params.id);
    if (req.user && (req.user.id == current_post.id_account || req.user.permission > 0)) {
        const queried_tags = await Posts.query().select('tags').findById(req.params.id);
        console.log(queried_tags);
        res.render('tags', { tags: queried_tags.tags, errors: '', postId: req.params.id });
    } else {
        var err = new Error('Cannot edit another users posts tags');
        err.status = 403;
        return next(err);
    }


}

//Controller for when tag is edited
exports.post_tags = [

    //Validate
    body('tags').isLength({ min: 1 }).trim().withMessage('Tags required'),

    //sanitize
    sanitizeBody('tags'),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            const queried_tags = await Posts.query().select('tags').findById(req.params.id);
            console.log(queried_tags);
            res.render('tags', { tags: queried_tags.tags, errors: errors.array() });
            return;
        }
        //separates tags, trims it, removes duplicates
        let tags = '';
        if (req.body.tags.trim().length > 0) {
            tags = req.body.tags.split(" ");
        }
        const setTags = function (a) { return [...new Set(a)] };
        const queried_tags = await Posts.query().select('tags', 'id_account').findById(req.params.id);

        if (!req.user || (req.user.id != queried_tags.id_account && req.user.permission == 0)) {
            var err = new Error('Unauthorized access');
            err.status = 403;
            return next(err);
        }

        //Add's queried tags to a set, then adds them to the db
        if (req.body.btn_submit == 'add') {
            if (tags != '') {
                let setOfTags = setTags(tags);
                for (let i = 0; i < setOfTags.length; i++) {
                    var newTag = setOfTags[i];
                    if (queried_tags.tags.includes(newTag.toLowerCase())) {
                        continue;
                    } else {
                        queried_tags.tags.push(newTag.toLowerCase());
                    }
                }
                console.log(queried_tags);

                //roundabout way of dropping all elements in array and then adding.  Removes duplicates first, then adds them.
                //raw only works using one element at a time, can't insert multiple elements at once apparently
                console.log(queried_tags.tags);
                for (let i = 0; i < queried_tags.tags.length; i++) {
                    const deletedTag = await Posts.query().findById(req.params.id).patch({
                        tags: raw('array_remove("tags", ?)', [queried_tags.tags[i]])
                    });
                }
                for (let i = 0; i < queried_tags.tags.length; i++) {
                    const insertedTag = await Posts.query().findById(req.params.id).patch({
                        tags: raw('array_append("tags", ?)', [queried_tags.tags[i]])
                    });
                }

            }

            //Deletes tags one by one
        } else {
            if (tags != '') {
                let setOfTags = setTags(tags);
                for (let i = 0; i < setOfTags.length; i++) {
                    const deletedTag = await Posts.query().findById(req.params.id).patch({
                        tags: raw('array_remove("tags", ?)', [setOfTags[i].toLowerCase()])
                    });
                }
            }
        }
        res.redirect('/read/' + req.params.id);
    }
]