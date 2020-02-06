const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

//Controller to get static page
exports.get_write = (req, res) => {
    if (req.user) {
        res.render('write');
    } else {
        res.redirect('/login');
    }
}

exports.post_write = [

    //sanitize
    sanitizeBody('postText'),
    sanitizeBody('title'),

    //test
    (req, res, next) => {
        //var delta = req.body.editor.getContents();
        //console.log(req.body.title);
        console.log(req.body.title);
        console.log(req.body.postText);
        res.redirect('/');
    }


]
