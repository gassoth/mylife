var Account = require('../db/models/account.js');
var Post = require('../db/models/posts.js');
var Comment = require('../db/models/comments.js');
var async = require('async');
const path = require('path');
var fs = require('fs');
const resize = require('../resize');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

//Controller for a profile
exports.get_profile = function(req, res, next) {
    async.parallel({
        account: async function(callback) {
            try {
                const user_profile = await Account.query().findById(req.params.id);
                return user_profile;
            } catch (err) {
                var err = new Error('Account not found');
                err.status = 404;
                return next(err);
            }
        },
        //posts count
        posts: async function(callback) {
            try {
                const post = await Post.query().count('posts.*').where('id_account', Number(req.params.id));
                return post;
            } catch (err) {
                var err = new Error('Posts returned an error.  Please email ohthatemailaddress@gmail.com');
                err.status = 404;
                return next(err);
            }
        },
        //comments count
        comments: async function(callback) {
            try {
                const comment = await Comment.query().count('comments.*').where('id_account', Number(req.params.id));
                return comment;
            } catch (err) {
                var err = new Error('Comment returned an error.  Please email ohthatemailaddress@gmail.com');
                err.status = 404;
                return next(err);
            }
        },
        //subscribers for a user
        subscribers: async function(callback) {
            try {
                const user_profile = await Account.query().findById(req.params.id);
                const subscriber = user_profile.$relatedQuery('subscribed');
                return subscriber;
            } catch (err) {
                console.log(err);
                var err = new Error('Subscriber error');
                err.status = 404;
                return next(err);
            }
        }
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.account==null) { // No results.
            var err = new Error('Account not found');
            err.status = 404;
            return next(err);
        }
        
        //Stores subscriberids so all subscribers isn't passed into the html page
        let subscriberIds = [];
        for (let i = 0; i < results.subscribers.length; i++) {
            subscriberIds.push(results.subscribers[i].id);
        }

        //Checks if the count of users posts is valid and sends the correct value
        let postsCount = 0;
        let commentsCount = 0;

        //Handles check if profile picture is found, if not, then use default
        const imgLocation = searchPicInUploads(convertToUnderscore(results.account.generated_username)).toString();
        let relImgLocation = imgLocation;
        if (imgLocation != "/images/test.jpg") {
            relImgLocation = imgLocation.split('/public')[1];
        }

        if (results.posts[0].count != '0') {
            postsCount = results.posts[0].count;
        }
        if (results.comments[0].count != '0') {
            commentsCount = results.comments[0].count;
        }
        // Successful, so render.  Either send in defined user or empty user since gives error if user not found
        if (req.user){
            res.render('profile', { account: results.account, user: req.user, postsCount: postsCount, commentsCount: commentsCount, subscribers: subscriberIds, img: relImgLocation} );
        } else {
            res.render('profile', { account: results.account, user: '', postsCount: postsCount, commentsCount: commentsCount, subscribers: subscriberIds, img: relImgLocation} );
        }
    });
};

//Controller for getting a users posts
exports.get_profile_posts = function(req, res, next) {
    async.parallel({
        account: async function(callback) {
            try {
                if (req.user == undefined) {
                    return '';
                }
                const user_profile = await Account.query().findById(req.user.id);
                return user_profile;
            } catch (err) {
                console.log(err);
                var err = new Error('Account not found');
                err.status = 404;
                return next(err);
            }
        },
        posts: async function(callback) {
            try {
                const post = await Post.query().select('posts.*').where('id_account', Number(req.params.id)).orderBy('date_posted', 'desc').page(req.params.pageNum-1, 10);
                const postPublic = await Post.query().select('posts.*').where('id_account', Number(req.params.id)).where('visibility', 1).orderBy('date_posted', 'desc').page(req.params.pageNum-1, 10);
                return [post.results,postPublic.results];
            } catch (err) {
                var err = new Error('Posts returned an error.  Please email ohthatemailaddress@gmail.com');
                err.status = 404;
                return next(err);
            }
        },
        //check if theres a next page
        postsNext: async function(callback) {
            try {
                const post = await Post.query().select('id', 'id_account').where('id_account', Number(req.params.id)).page(req.params.pageNum, 10);
                const postPublic = await Post.query().select('id','visibility').where('id_account', Number(req.params.id)).where('visibility', 1).page(req.params.pageNum, 10);
                let postVis = 0; let postPublicVis = 0;
                if (post.results.length > 0) {
                    postVis = 1;
                }
                if (postPublic.results.length > 0) {
                    postPublicVis = 1;
                }
                return [postVis,postPublicVis];
            } catch (err) {
                var err = new Error('Comments returned an error.  Please email ohthatemailaddress@gmail.com');
                err.status = 404;
                return next(err);
            }
        }
    }, async function(err, results) {
        if (err) { return next(err); }

        //Adds an R to read (1) posts, and U (0) to unread posts
        async function setRead(posts, uid) {
            let modifiedPosts = [];
            let readPosts = [];

            if (uid == 0) {
                for (let i = 0; i < posts.length; i++) {
                    let modifiedPost = posts[i];
                    modifiedPost.isRead = 0;
                    modifiedPosts.push(modifiedPost);
                }
                return modifiedPosts;
            } else {
                let readPostsIds = await Account.query().findById(uid);
                readPosts = await readPostsIds.$relatedQuery('read');
            }
            for (let i = 0; i < posts.length; i++) {
                let modifiedPost = posts[i];
                if (readPosts.some(e => e.id === modifiedPost.id)) {
                    modifiedPost.isRead = 1;
                    modifiedPosts.push(modifiedPost);
                } else {
                    modifiedPost.isRead = 0;
                    modifiedPosts.push(modifiedPost);
                }

            }
            return modifiedPosts;
        }

        let userId = 0;
        if (results.account != 0) {
            userId = results.account.id;
        }
        console.log(userId);
        if (results.posts[0]<1) { // No results.
            res.render('profile_none', { id: req.params.id });
            return;
        }
        if (userId == req.params.id || results.account.permission > 0) {
            // Successful and correct user is logged in, so private and public posts displayed
            const finalPosts = await setRead(results.posts[0], userId);
            res.render('profile_posts', { posts: finalPosts, isNextPage: results.postsNext[0], pageNum: req.params.pageNum} );
            return;
        }
        //Post authors is not logged in, so only public posts are displayed
        if (results.posts[1]<1)  {//no public posts available 
            res.render('profile_none', { id: req.params.id } );
            return;
        }
        const finalPosts = await setRead(results.posts[0], userId);
        res.render('profile_posts', { posts: finalPosts, isNextPage: results.postsNext[1], pageNum: req.params.pageNum} );
    });
};

//Controller for getting a users comments
exports.get_profile_comments = function(req, res, next) {
    async.parallel({
        comments: async function(callback) {
                try {
                    console.log(req.params.pageNum);
                    const comment = await Comment.query().select('comments.*').where('id_account', Number(req.params.id)).orderBy('date_posted', 'desc').page(req.params.pageNum-1, 10);
                    return comment;
                } catch (err) {
                    var err = new Error('Comments returned an error.  Please email ohthatemailaddress@gmail.com');
                    err.status = 404;
                    return next(err);
                }
            },

        //check if theres a next page
        commentsNext: async function(callback) {
                try {
                    var commentsNext = await Comment.query().select('comments.*').where('id_account', Number(req.params.id)).orderBy('date_posted', 'desc').page(req.params.pageNum, 10);
                    if (commentsNext.results.length == 0) {
                        return 0;
                    }
                    return 1;
                } catch (err) {
                    var err = new Error('Comments returned an error.  Please email ohthatemailaddress@gmail.com');
                    err.status = 404;
                    return next(err);
                }
            }
        }, function(err, results) {
            if (err) { return next(err); }
            if (results.comments.results<1) { // No results.
                res.render('profile_none', { id: req.params.id });
            } else {
            // Successful, so render.
            res.render('profile_comments', { comments: results.comments.results, isNextPage: results.commentsNext, pageNum: req.params.pageNum } );
            }
        });
    };

//Controller for getting a users settings
exports.get_profile_settings = function (req, res, next) {
    async.parallel({
        account: async function (callback) {
            try {
                const user_profile = await Account.query().findById(req.params.id);
                return user_profile;
            } catch (err) {
                console.log(err);
                var err = new Error('Account not found');
                err.status = 404;
                return next(err);
            }
        },
    }, function (err, results) {
        if (err) { return next(err); }
        // Successful, so render.
        if (req.user && req.user.id == results.account.id) {
            res.render('profile_settings', { id: req.params.id, emailSetting: results.account.email_enabled, about: results.account.about, errors: '' });
        } else {
            res.redirect('/');
        }
    });
};
    

//Controller for subscribing
exports.get_profile_subscribe = async function(req, res, next) {
    //gets current logged in user, relates it to the profile they are subscribing to. Generic error if fail.
    try {
        let time = new Date().toISOString();
        const subscriber = await Account.query().findById(req.user.id);
        await subscriber.$relatedQuery('subscriber').relate({id: req.params.id, date_subscribed: time});
        res.redirect('/profile/'+req.params.id);
    } catch(err) {
        console.log(err);
        if (err instanceof TypeError) {
            res.redirect('/login/');
        } else {
            res.redirect('/');
        }
    }
};

//Controller for unsubscribing
exports.get_profile_unsubscribe = async function(req, res, next) {
    try {
        const subscriber = await Account.query().findById(req.user.id);
        await subscriber.$relatedQuery('subscriber').unrelate().where({id_subscribed: req.params.id});
        res.redirect('/profile/'+req.params.id);
    } catch(err) {
        console.log(err);
        res.redirect('/');
    }
};

//Searches for a phrase in the uploads folder and deletes that file
function deletePictureInUploads(filename) {
    const dir = path.join(__dirname, "../public/uploads/");
    var files = fs.readdirSync(dir);
    for (let i = 0; i < files.length; i++) {
        let matchedFileName = files[i].split(".")[0];
        if (matchedFileName === filename) {
            const matchedFilePath = path.join(dir, files[i]);
            try {
                fs.unlinkSync(matchedFilePath);
                console.log(matchedFilePath+' was deleted');
                return "Success";
            } catch(err) {
                console.error(err);
                return "Error";
            }
        }
    }
    return "FileNotFound";
}

//Searches for a phrase in uploads folder and gets the path to that file
function searchPicInUploads(filename) {
    const dir = path.join(__dirname, "../public/uploads/");
    var files = fs.readdirSync(dir);
    for (let i = 0; i < files.length; i++) {
        let matchedFileName = files[i].split(".")[0];
        if (matchedFileName === filename) {
            const matchedFilePath = path.join(dir, files[i]);
            return matchedFilePath;
        }
    }
    return "/images/test.jpg";
}

//Converts space to underscore so that we don't have %20 in the url
function convertToUnderscore(str) {
    const output = str.replace(/[ ,]+/g, "_");
    return output;
}

//Controller for modifying user settings
exports.post_profile_settings = [
        //Validate
        body('description').isLength({ max: 1000 }).withMessage('Description too long'),
    
        //Sanitize
        sanitizeBody('description').escape(),
        sanitizeBody('timezones').escape(),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            console.log(req.body.description);
            console.log(req.body.description.length);
            res.render('profile_settings', { id: req.params.id, emailSetting: req.body.email_enabled, about: req.body.description, errors: errors.array() });
            return;
        }
        else {
        
        //time zone object
        let tzInts = [
            {"label":"Etc/GMT+12","value":-12},
            {"label":"Pacific/Midway","value":-11},
            {"label":"Pacific/Honolulu","value":-10},
            {"label":"US/Alaska","value":-9},
            {"label":"America/Los_Angeles","value":-8},
            {"label":"America/Tijuana","value":-8},
            {"label":"US/Arizona","value":-7},
            {"label":"America/Chihuahua","value":-7},
            {"label":"US/Mountain","value":-7},
            {"label":"America/Managua","value":-6},
            {"label":"US/Central","value":-6},
            {"label":"America/Mexico_City","value":-5},
            {"label":"Canada/Saskatchewan","value":-5},
            {"label":"America/Bogota","value":-5},
            {"label":"US/Eastern","value":-4},
            {"label":"US/East-Indiana","value":-4},
            {"label":"Canada/Atlantic","value":-4},
            {"label":"America/Caracas","value":-4},
            {"label":"America/Manaus","value":-3},
            {"label":"America/Santiago","value":-3},
            {"label":"Canada/Newfoundland","value":-3},
            {"label":"America/Sao_Paulo","value":-3},
            {"label":"America/Argentina/Buenos_Aires","value":-3},
            {"label":"America/Godthab","value":-3},
            {"label":"America/Montevideo","value":-3},
            {"label":"America/Noronha","value":-2},
            {"label":"Atlantic/Cape_Verde","value":-1},
            {"label":"Atlantic/Azores","value":-1},
            {"label":"Africa/Casablanca","value":0},
            {"label":"Etc/Greenwich","value":0},
            {"label":"Europe/Amsterdam","value":1},
            {"label":"Europe/Belgrade","value":1},
            {"label":"Europe/Brussels","value":1},
            {"label":"Europe/Sarajevo","value":1},
            {"label":"Africa/Lagos","value":1},
            {"label":"Asia/Amman","value":2},
            {"label":"Europe/Athens","value":2},
            {"label":"Asia/Beirut","value":2},
            {"label":"Africa/Cairo","value":2},
            {"label":"Africa/Harare","value":2},
            {"label":"Europe/Helsinki","value":2},
            {"label":"Asia/Jerusalem","value":2},
            {"label":"Europe/Minsk","value":2},
            {"label":"Africa/Windhoek","value":2},
            {"label":"Asia/Kuwait","value":3},
            {"label":"Europe/Moscow","value":3},
            {"label":"Africa/Nairobi","value":3},
            {"label":"Asia/Tbilisi","value":3},
            {"label":"Asia/Tehran","value":3},
            {"label":"Asia/Muscat","value":4},
            {"label":"Asia/Baku","value":4},
            {"label":"Asia/Yerevan","value":4},
            {"label":"Asia/Kabul","value":4},
            {"label":"Asia/Yekaterinburg","value":5},
            {"label":"Asia/Karachi","value":5},
            {"label":"Asia/Calcutta","value":5},
            {"label":"Asia/Calcutta","value":5},
            {"label":"Asia/Katmandu","value":5},
            {"label":"Asia/Almaty","value":6},
            {"label":"Asia/Dhaka","value":6},
            {"label":"Asia/Rangoon","value":6},
            {"label":"Asia/Bangkok","value":7},
            {"label":"Asia/Krasnoyarsk","value":7},
            {"label":"Asia/Hong_Kong","value":8},
            {"label":"Asia/Kuala_Lumpur","value":8},
            {"label":"Asia/Irkutsk","value":8},
            {"label":"Australia/Perth","value":8},
            {"label":"Asia/Taipei","value":8},
            {"label":"Asia/Tokyo","value":9},
            {"label":"Asia/Seoul","value":9},
            {"label":"Asia/Yakutsk","value":9},
            {"label":"Australia/Adelaide","value":9},
            {"label":"Australia/Darwin","value":9},
            {"label":"Australia/Brisbane","value":10},
            {"label":"Australia/Canberra","value":10},
            {"label":"Australia/Hobart","value":10},
            {"label":"Pacific/Guam","value":10},
            {"label":"Asia/Vladivostok","value":10},
            {"label":"Asia/Magadan","value":11},
            {"label":"Pacific/Auckland","value":-12},
            {"label":"Pacific/Fiji","value":-12},
            {"label":"Pacific/Tongatapu","value":-11}
        ]
        console.log(req.body);
        let tz_preference;
        for (let i = 0; i < tzInts.length; i++) {
            let entry = tzInts[i];
            if (entry.label == req.body.timezones) {
                tz_preference = entry.value+12;
            }
        }

        //Handle the email switch and account about section
        console.log(req.body.email_enabled);
        console.log(req.body.description);
        let switchValue = 0;
        if (req.body.email_enabled) {
            switchValue = 1;
        }
        if (tz_preference) {
            const updatedAccount = await Account.query().findById(req.params.id).patch({
                email_enabled: switchValue,
                about: req.body.description,
                tz_preference: tz_preference
            });
        } else {
            const updatedAccount = await Account.query().findById(req.params.id).patch({
                email_enabled: switchValue,
                about: req.body.description
            });
        }

        //Handle image upload
        if (req.file) {
            const tempPath = req.file.path;
            const targetPath = path.join(__dirname, "../public/uploads/"+convertToUnderscore(req.file.filename));
            const format = req.file.filename.split(".")[1];
            let t = deletePictureInUploads(convertToUnderscore(req.file.filename.split(".")[0]));
            var finalImg = fs.createWriteStream(targetPath);
            resize("./"+tempPath, format, 750, 750).pipe(finalImg);
            fs.unlinkSync(tempPath);
            console.log("Image sucessfully uploaded");
        } else {
            console.log("No file found");
        }

        res.redirect('/profile/'+req.params.id);
        }
    }
]

//go directly to comment stretch