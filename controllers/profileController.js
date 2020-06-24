var Account = require('../db/models/account.js');
var Post = require('../db/models/posts.js');
var Comment = require('../db/models/comments.js');
var async = require('async');
const path = require('path');
var fs = require('fs');
const resize = require('../resize');

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
                const post = await Post.query().select('posts.*').where('id_account', Number(req.params.id));
                const postPublic = await Post.query().select('posts.*').where('id_account', Number(req.params.id)).where('visibility', 1);
                return [post,postPublic];
            } catch (err) {
                var err = new Error('Posts returned an error.  Please email ohthatemailaddress@gmail.com');
                err.status = 404;
                return next(err);
            }
        }
    }, function(err, results) {
        if (err) { return next(err); }
        let userId = '';
        if (results.account != '') {
            userId = results.account.id;
        }

        console.log(userId);
        if (results.posts[0]<1) { // No results.
            res.render('profile_none', { id: req.params.id });
            return;
        }
        if (userId == req.params.id || results.account.permission > 0) {
            // Successful and correct user is logged in, so private and public posts displayed
            res.render('profile_posts', { posts: results.posts[0]} );
            return;
        }
        //Post authors is not logged in, so only public posts are displayed
        if (results.posts[1]<1)  {//no public posts available 
            res.render('profile_none', { id: req.params.id } );
            return;
        }
        res.render('profile_posts', { posts: results.posts[1]} );
    });
};

//Controller for getting a users comments
exports.get_profile_comments = function(req, res, next) {
    async.parallel({
        comments: async function(callback) {
                try {
                    const comment = await Comment.query().select('comments.*').where('id_account', Number(req.params.id));
                    return comment;
                } catch (err) {
                    var err = new Error('Comments returned an error.  Please email ohthatemailaddress@gmail.com');
                    err.status = 404;
                    return next(err);
                }
            }
        }, function(err, results) {
            if (err) { return next(err); }
            if (results.comments<1) { // No results.
                res.render('profile_none', { id: req.params.id });
            } else {
            // Successful, so render.
            res.render('profile_comments', { comments: results.comments} );
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
            res.render('profile_settings', { id: req.params.id, emailSetting: results.account.email_enabled });
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

    async (req, res, next) => {

        //Handle the email switch
        console.log(req.body.email_enabled);
        let switchValue = 0;
        if (req.body.email_enabled) {
            switchValue = 1;
        }

        const updatedAccount = await Account.query().findById(req.params.id).patch({
            email_enabled: switchValue
        });

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
]