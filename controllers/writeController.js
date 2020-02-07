const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

//Controller to get static page
exports.get_write = (req, res) => {
    if (req.user) {
        res.render('write', {errors: undefined });
    } else {
        res.redirect('/login');
    }
}

//Controller for when form is posted
exports.post_write = [

    //Validate
    //TODO
    //need validation styling and need to figure out maxlength
    body('postText').isLength({ min: 4 }).trim().withMessage('Content required'),
    body('title').isLength({ min: 1 }).trim().withMessage('Title required'),

    //sanitize
    sanitizeBody('postText'),
    sanitizeBody('title'),

    //test
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render('write', { errors: errors.array() });
            return;
        }
        let time = new Date().toISOString();
        //var delta = req.body.editor.getContents();
        //console.log(req.body.title);
        console.log(req.body.title);
        console.log(req.body.postText);
        if (req.body.visibility == undefined) {
            console.log('0');
        }
        else
        {
            console.log(req.body.visibility);
        }
        console.log(time);
        console.log(req.user.id);
        console.log(req.user.generated_username);

        res.redirect('/');
    }


]
