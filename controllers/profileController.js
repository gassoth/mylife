var Account = require('../db/models/account.js');
var Post = require('../db/models/posts.js');
var Comment = require('../db/models/comments.js');
var async = require('async');
var fs = require('fs');
const path = require('path');
const resize = require('../resize');
const { body, validationResult, sanitizeBody } = require('express-validator');

//Controller for a profile
exports.get_profile = function(req, res, next) {
    async.parallel({
        account: async function(callback) {
            try {
                const user_profile = await Account.query().findById(req.params.id);
                return user_profile;
            } catch (err) {
                console.log(err);
                var updatedErr = new Error('Account not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
        //posts count
        posts: async function(callback) {
            try {
                const post = await Post.query().count('posts.*').where('id_account', Number(req.params.id));
                return post;
            } catch (err) {
                console.log(err)
                var updatedErr = new Error('Posts returned an error.  Please email ohthatemailaddress@gmail.com');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
        //comments count
        comments: async function(callback) {
            try {
                const comment = await Comment.query().count('comments.*').where('id_account', Number(req.params.id));
                return comment;
            } catch (err) {
                console.log(err);
                var updatedErr = new Error('Comment returned an error.  Please email ohthatemailaddress@gmail.com');
                updatedErr.status = 404;
                return next(updatedErr);
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
                var updatedErr = new Error('Subscriber error');
                updatedErr.status = 404;
                return next(updatedErr);
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
                var updatedErr = new Error('Account not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
        posts: async function(callback) {
            try {
                const post = await Post.query().select('posts.*').where('id_account', Number(req.params.id)).orderBy('date_posted', 'desc').page(req.params.pageNum-1, 10);
                const postPublic = await Post.query().select('posts.*').where('id_account', Number(req.params.id)).where('visibility', 1).orderBy('date_posted', 'desc').page(req.params.pageNum-1, 10);
                return [post.results,postPublic.results];
            } catch (err) {
                console.log(err)
                var updatedErr = new Error('Posts returned an error.  Please email ohthatemailaddress@gmail.com');
                updatedErr.status = 404;
                return next(updatedErr);
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
                console.log(err)
                var updatedErr = new Error('Comments returned an error.  Please email ohthatemailaddress@gmail.com');
                updatedErr.status = 404;
                return next(updatedErr);
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
        //If no posts found
        if (results.posts[1]<1)  {//no public posts available 
            res.render('profile_none', { id: req.params.id } );
            return;
        }
        //Else display public posts only
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
                    console.log(err)
                    var updatedErr = new Error('Comments returned an error.  Please email ohthatemailaddress@gmail.com');
                    updatedErr.status = 404;
                    return next(updatedErr);
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
                    console.log(err)
                    var updatedErr = new Error('Comments returned an error.  Please email ohthatemailaddress@gmail.com');
                    updatedErr.status = 404;
                    return next(updatedErr);
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
                var updatedErr = new Error('Account not found');
                updatedErr.status = 404;
                return next(updatedErr);
            }
        },
    }, function (err, results) {
        if (err) { return next(err); }
        // Successful, so render.
        if (req.user && (req.user.id == results.account.id || req.user.permission > 0)) {
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
                return err;
            }
        }
    }
    return "File not found"
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
            res.render('profile_settings', { id: req.params.id, emailSetting: req.body.email_enabled, about: req.body.description, errors: errors.array() });
            return;
        }
        else {
        
        //time zone object
        let tzInts = [
            {"label":"Pacific&#x2F;Auckland","value":-12},
            {"label":"Pacific&#x2F;Fiji","value":-12},
            {"label":"Etc&#x2F;GMT+12","value":-12},
            {"label":"Pacific&#x2F;Midway","value":-11},
            {"label":"Pacific&#x2F;Honolulu","value":-10},
            {"label":"US&#x2F;Alaska","value":-9},
            {"label":"America&#x2F;Los_Angeles","value":-8},
            {"label":"America&#x2F;Tijuana","value":-8},
            {"label":"US&#x2F;Arizona","value":-7},
            {"label":"America&#x2F;Chihuahua","value":-7},
            {"label":"US&#x2F;Mountain","value":-7},
            {"label":"America&#x2F;Managua","value":-6},
            {"label":"US&#x2F;Central","value":-6},
            {"label":"America&#x2F;Mexico_City","value":-5},
            {"label":"Canada&#x2F;Saskatchewan","value":-5},
            {"label":"America&#x2F;Bogota","value":-5},
            {"label":"US&#x2F;Eastern","value":-4},
            {"label":"US&#x2F;East-Indiana","value":-4},
            {"label":"Canada&#x2F;Atlantic","value":-4},
            {"label":"America&#x2F;Caracas","value":-4},
            {"label":"America&#x2F;Manaus","value":-3},
            {"label":"America&#x2F;Santiago","value":-3},
            {"label":"Canada&#x2F;Newfoundland","value":-3},
            {"label":"America&#x2F;Sao_Paulo","value":-3},
            {"label":"America&#x2F;Argentina&#x2FBuenos_Aires","value":-3},
            {"label":"America&#x2F;Godthab","value":-3},
            {"label":"America&#x2F;Montevideo","value":-3},
            {"label":"America&#x2F;Noronha","value":-2},
            {"label":"Atlantic&#x2F;Cape_Verde","value":-1},
            {"label":"Atlantic&#x2F;Azores","value":-1},
            {"label":"Africa&#x2F;Casablanca","value":0},
            {"label":"Etc&#x2F;Greenwich","value":0},
            {"label":"Europe&#x2F;Amsterdam","value":1},
            {"label":"Europe&#x2F;Belgrade","value":1},
            {"label":"Europe&#x2F;Brussels","value":1},
            {"label":"Europe&#x2F;Sarajevo","value":1},
            {"label":"Africa&#x2F;Lagos","value":1},
            {"label":"Asia&#x2F;Amman","value":2},
            {"label":"Europe&#x2F;Athens","value":2},
            {"label":"Asia&#x2F;Beirut","value":2},
            {"label":"Africa&#x2F;Cairo","value":2},
            {"label":"Africa&#x2F;Harare","value":2},
            {"label":"Europe&#x2F;Helsinki","value":2},
            {"label":"Asia&#x2F;Jerusalem","value":2},
            {"label":"Europe&#x2F;Minsk","value":2},
            {"label":"Africa&#x2F;Windhoek","value":2},
            {"label":"Asia&#x2F;Kuwait","value":3},
            {"label":"Europe&#x2F;Moscow","value":3},
            {"label":"Africa&#x2F;Nairobi","value":3},
            {"label":"Asia&#x2F;Tbilisi","value":3},
            {"label":"Asia&#x2F;Tehran","value":3},
            {"label":"Asia&#x2F;Muscat","value":4},
            {"label":"Asia&#x2F;Baku","value":4},
            {"label":"Asia&#x2F;Yerevan","value":4},
            {"label":"Asia&#x2F;Kabul","value":4},
            {"label":"Asia&#x2F;Yekaterinburg","value":5},
            {"label":"Asia&#x2F;Karachi","value":5},
            {"label":"Asia&#x2F;Calcutta","value":5},
            {"label":"Asia&#x2F;Calcutta","value":5},
            {"label":"Asia&#x2F;Katmandu","value":5},
            {"label":"Asia&#x2F;Almaty","value":6},
            {"label":"Asia&#x2F;Dhaka","value":6},
            {"label":"Asia&#x2F;Rangoon","value":6},
            {"label":"Asia&#x2F;Bangkok","value":7},
            {"label":"Asia&#x2F;Krasnoyarsk","value":7},
            {"label":"Asia&#x2F;Hong_Kong","value":8},
            {"label":"Asia&#x2F;Kuala_Lumpur","value":8},
            {"label":"Asia&#x2F;Irkutsk","value":8},
            {"label":"Australia&#x2F;Perth","value":8},
            {"label":"Asia&#x2F;Taipei","value":8},
            {"label":"Asia&#x2F;Tokyo","value":9},
            {"label":"Asia&#x2F;Seoul","value":9},
            {"label":"Asia&#x2F;Yakutsk","value":9},
            {"label":"Australia&#x2F;Adelaide","value":9},
            {"label":"Australia&#x2F;Darwin","value":9},
            {"label":"Australia&#x2F;Brisbane","value":10},
            {"label":"Australia&#x2F;Canberra","value":10},
            {"label":"Australia&#x2F;Hobart","value":10},
            {"label":"Pacific&#x2F;Guam","value":10},
            {"label":"Asia&#x2F;Vladivostok","value":10},
            {"label":"Asia&#x2F;Magadan","value":11},
            {"label":"Pacific&#x2F;Tongatapu","value":-11}
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
        let switchValue = 0;
        if (req.body.email_enabled) {
            switchValue = 1;
        }
        if (tz_preference != undefined) {
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
            if (t != "Success" && t != "File not found") {
                return next(t);
            }
            var finalImg = fs.createWriteStream(targetPath);
            resize("./"+tempPath, format, 750, 750).pipe(finalImg);
            fs.unlinkSync(tempPath);
            console.log("Image sucessfully uploaded");
        } else {
            var updatedErr = new Error('File not found');
            updatedErr.status = 404;
            return next(updatedErr);
        }
        res.redirect('/profile/'+req.params.id);
        }
    }
]

//Controller for confirming delete account
exports.get_delete_account = async function(req, res, next) {
        //check permissions if user is allowed to delete posts (admins have greater than 0 permission)
        if (!req.user || (req.params.id != req.user.id && req.user.permission == 0)) {
            var err = new Error('Attempted to delete another users account');
            err.status = 403;
            return next(err);
        }
        // Successful, so delete.
        req.logout();
        const numDeleted = await Account.query().deleteById(req.params.id);
        res.redirect('/');
    
};

exports.check_permission = function(req, res, next) {
    if (!req.user || (req.params.id != req.user.id && req.user.permission == 0)) {
        var err = new Error('Attempted to modify another users account');
        err.status = 403;
        return next(err);
    }
    next();
}