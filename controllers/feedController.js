var Post = require('../db/models/posts.js');
var Account = require('../db/models/account.js');
var async = require('async');

//Controller to get static page
exports.get_feed = async (req, res) => {
    try {
        //Gets the page specified, also checks if there are more posts after that.
        let uid,nextPage = 0;
        if (req.user) {
            uid = req.user.id;
        }

        //Uses user id, read (val 1 for read or 0 for all), and sb (2 for sub, 1 for bookmark, 0 for all))
        //Gets ids of posts that were read or all posts
        //returns querys posts of those ids to either return the bookmarked ones, posts by a subscribed-to user, or none.
        //TODO - error handling, testing
        async function feedFilter(usrId, rd, sb) {
            let queryIds;
            if (rd) {
                queryIds = await Post.query().select('posts.id')
                .innerJoin('read as r', 'posts.id', 'r.id_posts')
                .where('r.id_account', usrId).map(a => a.id);
            } else {
                queryIds = await Post.query().select('posts.id').map(a => a.id);
            }
            if (sb == 2) {
                return await Post.query().findByIds(queryIds).select('posts.id')
                    .innerJoin('account as a', 'posts.id_account', 'a.id')
                    .innerJoin('subscriptions as s', 'a.id', 's.id_subscribed')
                    .where('s.id_subscriber', usrId).map(a => a.id);
            } else if (sb == 1) {
                return await Post.query().findByIds(queryIds).select('posts.id')
                    .innerJoin('bookmarks as b', 'posts.id', 'b.id_post')
                    .where('b.id_account', usrId).map(a => a.id);
            } else {
                return await Post.query().findByIds(queryIds).select('posts.id').map(a => a.id);
            }
        }

        let selectAllTest = await feedFilter(5, 0, 0);
        //test select all
        const listPostsTest = await Post.query().findByIds(selectAllTest).where('visibility', 1).orderBy('date_posted', 'desc').page(req.params.pageNum-1, 10);
        const nextCheckTest = await Post.query().findByIds(selectAllTest).where('visibility', 1).orderBy('date_posted', 'desc').page(req.params.pageNum, 10);
        //Sets whether there is another page.
        if (nextCheckTest.results.length != 0) {
            nextPage = 1;
        }

        res.render('feed', { posts: listPostsTest.results, isNextPage: nextPage, pageNum: req.params.pageNum });
    } catch(err) {
        console.log(err);
        res.redirect('/');
    }
}



/*

date(default)/views(query number of views per post in read table)/comments(query number of comments per post)  

subscribed(only query people im subscribed to)/bookmarked(only query posts i've bookmarked)/read/unread/all


posts/account/account_post/read/comments

need comment counter for a post?
    -different comment count than database might break, headache to fix



let db-result;

if (read/unread/all)
    db-result = filter by read/unread/all

if (subscribed or bookmarked)
   db-result = db-result.filter(subscribed or bookmarked)//not both

<search would be here i think>

result = db-result.query (date/function for views/function for comments).paginated

send result?
*/