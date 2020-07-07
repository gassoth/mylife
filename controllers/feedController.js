var Post = require('../db/models/posts.js');
var Account = require('../db/models/account.js');
var async = require('async');

///currently integrating, need to check if flags is a good method.

//Controller to get static page
exports.get_feed = async (req, res) => {
    try {
        //Gets the page specified, also checks if there are more posts after that.
        let uid = 0, sortFlag = 0, displayedPostsFlag = 0;
        let allFlag = 1;
        let searchValue = '';

        //function used to parse search.  Creates an array of sets, each set is a query if separated by or, else it will just be one set.
        function parseSearch(q) {
            let searchQueries = [];
            const query = String(q).split(' ');
            let subquery = new Set();
            for (let i = 0; i < query.length; i++) {
                if (String(query[i]).toLowerCase() == "or") {
                    searchQueries.push(subquery);
                    subquery = new Set();
                    continue;
                }
                if (String(query[i]).toLowerCase() == "and") {
                    continue;
                }
                subquery.add(String(query[i]));
            }
            searchQueries.push(subquery);
            return searchQueries.filter(s => s.size > 0);
        }
        //Uses user id, read (val 0 for unread only or 1 for all), and sb (2 for sub, 1 for bookmark, 0 for all))
        //Gets ids of posts that were read or all posts
        //returns querys posts of those ids to either return the bookmarked ones, posts by a subscribed-to user, or none.
        async function feedFilter(usrId, all, sb, tagSearch) {
            let searchFilteredQueryIdsSet = new Set();
            let tagSearchQuery = tagSearch;
            if (tagSearchQuery.length == 0) {
                tagSearchQuery.push([]);
            }
            for (let i = 0; i < tagSearchQuery.length; i++) {
                let queryIds; 
                if (all == 0) {
                    queryIds = await Post.query().select('posts.id').where('tags', '@>', tagSearchQuery[i])
                    .leftOuterJoin('read as r', joinBuilder => { 
                        joinBuilder.on('posts.id', '=', 'r.id_posts')
                        .andOn('r.id_account', usrId);
                    })
                    .whereNull('r.id_posts').map(a => a.id);
                    } else {
                        queryIds = await Post.query().where('tags', '@>', tagSearchQuery[i]).select('posts.id').map(a => a.id);
                    }
                queryIds.forEach(item => searchFilteredQueryIdsSet.add(item));
            }
            let searchFilteredQueryIds = Array.from(searchFilteredQueryIdsSet);
            console.log(searchFilteredQueryIds);
            if (sb == 2) {
                return await Post.query().findByIds(searchFilteredQueryIds).select('posts.id')
                    .innerJoin('account as a', 'posts.id_account', 'a.id')
                    .innerJoin('subscriptions as s', 'a.id', 's.id_subscribed')
                    .where('s.id_subscriber', usrId).map(a => a.id);
            } else if (sb == 1) {
                return await Post.query().findByIds(searchFilteredQueryIds).select('posts.id')
                    .innerJoin('bookmarks as b', 'posts.id', 'b.id_post')
                    .where('b.id_account', usrId).map(a => a.id);
            } else {
                return await Post.query().findByIds(searchFilteredQueryIds).select('posts.id').map(a => a.id);
            }
        }
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
                let sort = await Post.query().findByIds(posts).select('posts.id', 'posts.title', 'posts.date_posted', 'posts.author', 'posts.id_account')
                    .leftOuterJoin('comments as c', 'c.id_posts', 'posts.id')
                    .groupBy('posts.id')
                    .count('c.id')
                    .where('visibility', 1)
                    .orderBy('count', 'desc').page(pageNum-1, 10);
                let sortNext = await Post.query().findByIds(posts).select('posts.id')
                    .leftOuterJoin('comments as c', 'c.id_posts', 'posts.id')
                    .groupBy('posts.id')
                    .count('c.id')
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
                    .findByIds(posts).select('posts.id', 'posts.title', 'posts.date_posted', 'posts.author', 'posts.id_account')
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

        //Function ridiculously inefficient, look into improving it
        async function setRead(posts, uid) {
            let modifiedPosts = [];
            if (uid == 0) {
                for (let i = 0; i < posts.length; i++) {
                    let modifiedPost = posts[i];
                    modifiedPost.isRead = 0;
                    modifiedPosts.push(modifiedPost);
                }
                return modifiedPosts;
            }
            for (let i = 0; i < posts.length; i++) {
                let modifiedPost = posts[i];
                const readList = await modifiedPost.$relatedQuery('read');
                var swi = 0;
                for (let j = 0; j < readList.length; j++) {
                    if (uid == readList[j].id) {
                        swi = 1;
                        break;
                    }
                }
                if (swi == 1) {
                    modifiedPost.isRead = 1;
                } else {
                    modifiedPost.isRead = 0;
                }
                modifiedPosts.push(modifiedPost);
                //check if in read where post.id and user.id
                //if there, then modifiedPost.isRead = 1;
                //else modifiePost.isRead = 0;
                //modifiedPosts.push(modifiedPost);
            }
            return modifiedPosts;
        }
        //then in view, if post.isRead, set R, else set U

        let parsedQuery = [];
        if (req.query.input_search) {
            searchValue = req.query.input_search;
            if (req.query.input_search.length > 0) {
                parsedQuery = parseSearch(searchValue);
                parsedQuery = parsedQuery.map(s => Array.from(s));
            }
        }

        if (req.query.sortFlag) {
            sortFlag = parseInt(req.query.sortFlag);
        }
        if (req.query.allFlag) {
            allFlag = req.query.allFlag;
        }
        if (req.query.displayedPostsFlag) {
            displayedPostsFlag = req.query.displayedPostsFlag;
        }

        //set to 0 and 1 bc anon users don't have read history or bookmarks
        if (req.user) {
            uid = req.user.id;
        } else {
            displayedPostsFlag = 0;
            allFlag = 1;
        }
        console.log('booty');
        console.log(uid);
        let selectAll = await feedFilter(uid, allFlag, displayedPostsFlag, parsedQuery);
        let result = await feedSorter(sortFlag, selectAll, req.params.pageNum);
        let resultModified = await setRead(result[0].results, uid);
        //console.log(result[0]);
        //console.log(result[1]);
        //console.log(await Post.query().findByIds(selectAll).select('posts.id').where('visibility', 1).orderBy('date_posted', 'desc'));
        console.log(allFlag);
        console.log(parsedQuery);
        res.render('feed', { posts: resultModified, 
            isNextPage: result[1], 
            pageNum: req.params.pageNum, 
            sortMethod: sortFlag,
            isAll: allFlag,
            displayedPosts: displayedPostsFlag,
            currentSearch: searchValue,
            isLoggedIn: uid
        });
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

        async function feedFilter(usrId, all, sb, tagSearch) {
            let searchFilteredQueryIdsSet = new Set();
            for (let i = 0; i < tagSearch.length; i++) {
                let queryIds; 
                if (all == 0) {
                    queryIds = await Post.query().select('posts.id').where('tags', '@>', tagSearch[i])
                    .leftOuterJoin('read as r', joinBuilder => { 
                        joinBuilder.on('posts.id', '=', 'r.id_posts')
                        .andOn('r.id_account', usrId);
                    })
                    .whereNull('r.id_posts').map(a => a.id);
                } else {
                    queryIds = await Post.query().where('tags', '@>', tagSearch[i]).select('posts.id').map(a => a.id);
                }
                queryIds.forEach(item => searchFilteredQueryIds.add(item));
            }
            let searchFilteredQueryIds = Array.from(searchFilteredQueryIdsSet);


*/
