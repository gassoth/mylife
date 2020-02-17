var Post = require('../db/models/posts.js');
var async = require('async');


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
        }
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.posts==null) { // No results.
            var err = new Error('Post not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render.
        res.render('read', { posts: results.posts} );
    });
};
