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

        let selectAll = await feedFilter(5, 0, 0);

        //Function to sort feed based on views count (2), comments count(1), or date (0). Need to test it.
        //posts is the posts that are being sorted, and pagenum is which page is needed
        async function feedSorter(sort, posts, pageNum) {
            if (sort == 2) {
                let sort = await Post.query().findByIds(posts).select('posts.id', 'posts.title', 'posts.date_posted', 'posts.author', 'posts.id_account')
                    .leftOuterJoin('read as r', 'r.id_posts', 'posts.id')
                    .groupBy('posts.id')
                    .count('posts.id')
                    .where('visibility', 1)
                    .orderBy('count', 'desc').page(pageNum-1, 10);
                let sortNext = await Post.query().findByIds(posts).select('posts.id')
                    .leftOuterJoin('read as r', 'r.id_posts', 'posts.id')
                    .groupBy('posts.id')
                    .count('posts.id')
                    .where('visibility', 1)
                    .orderBy('count', 'desc').page(pageNum, 10);

                //checks whether or not theres a next page
                if (sortNext.results.length != 0) {
                    return [sort, 1];
                } else {
                    return [sort, 0];
                }
            } else if (sort == 1) {
                let sort = await Post.query().findByIds(posts).select('posts.id')
                    .leftOuterJoin('read as r', 'r.id_posts', 'posts.id')
                    .groupBy('posts.id')
                    .count('posts.id')
                    .where('visibility', 1)
                    .orderBy('count', 'desc').page(pageNum-1, 10);
                let sortNext = await Post.query().findByIds(posts).select('posts.id')
                    .leftOuterJoin('read as r', 'r.id_posts', 'posts.id')
                    .groupBy('posts.id')
                    .count('posts.id')
                    .where('visibility', 1)
                    .orderBy('count', 'desc').page(pageNum, 10);

                //checks whether or not theres a next page
                if (sortNext.results.length != 0) {
                    return [sort, 1];
                } else {
                    return [sort, 0];
                }
            } else {
                const sort = await Post
                    .query()
                    .findByIds(posts).select('posts.id')
                    .where('visibility', 1)
                    .orderBy('date_posted', 'desc')
                    .page(pageNum-1, 10);
                const sortNext = await Post
                    .query().select('posts.id')
                    .findByIds(selectAll)
                    .where('visibility', 1)
                    .orderBy('date_posted', 'desc')
                    .page(pageNum, 10);

                //checks whether or not theres a next page
                if (sortNext.results.length != 0) {
                    return [sort, 1];
                } else {
                    return [sort, 0];
                }
            }
        }
        
        let result = await feedSorter(2, selectAll, req.params.pageNum);
        //console.log(result[0]);
        //console.log(result[1]);
        //console.log(await Post.query().findByIds(selectAll).select('posts.id').where('visibility', 1).orderBy('date_posted', 'desc'));

        res.render('feed', { posts: result[0].results, isNextPage: result[1], pageNum: req.params.pageNum });
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


/*
        
        let selectAll = await feedFilter(5, 0, 0);
        let sortTest = await Post.query().findByIds(selectAll).select('posts.id')
            .leftOuterJoin('read as r', 'r.id_posts', 'posts.id')
            .groupBy('posts.id')
            .count('posts.id')
            .where('visibility', 1)
            .orderBy('count', 'desc');
        console.log(sortTest); 
        console.log(await Post.query().findByIds(selectAll).select('posts.id').where('visibility', 1).orderBy('date_posted', 'desc'))

        //rn working on sorting based on comments or views or date.  none currently implemented 
        let commentTest = await Post.query().findByIds(selectAll).select('posts.id')
            .leftOuterJoin('comments as c', 'c.id_posts', 'posts.id')
            .groupBy('posts.id')
            .count('c.id')
            .where('visibility', 1)
            .orderBy('count', 'desc');
        console.log(commentTest);

        //test select all
        const listPosts = await Post.query().findByIds(selectAll).where('visibility', 1).orderBy('date_posted', 'desc').page(req.params.pageNum-1, 10);
        const nextCheck = await Post.query().findByIds(selectAll).where('visibility', 1).orderBy('date_posted', 'desc').page(req.params.pageNum, 10);
        //Sets whether there is another page.
        if (nextCheck.results.length != 0) {
            nextPage = 1;
        } 
*/
