var Post = require('../db/models/posts.js');
var async = require('async');

//Controller to get static page
exports.get_feed = async (req, res) => {
    try {
        //Gets the page specified, also checks if there are more posts after that.
        let nextPage = 0;
        const listPosts = await Post.query().where('visibility', 1).orderBy('date_posted', 'desc').page(req.params.pageNum-1, 10);
        const nextCheck = await Post.query().where('visibility', 1).orderBy('date_posted', 'desc').page(req.params.pageNum, 10);

        //Sets whether there is another page.
        if (nextCheck.results.length != 0) {
            nextPage = 1;
        }
        
        console.log(listPosts);
        res.render('feed', { posts: listPosts.results, isNextPage: nextPage, pageNum: req.params.pageNum });
    } catch(err) {
        console.log(err);
        res.redirect('/');
    }
}