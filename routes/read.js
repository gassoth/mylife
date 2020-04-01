//read route
var express = require('express');
var router = express.Router();

//Require read controller modules
var read_controller = require('../controllers/readController.js');

//Get debug read route
router.get('/', read_controller.get_debug);

//Read page route. Gets blog post with id match.
router.get('/:id', read_controller.get_read);

//Read page route. Gets blog post with id match.
router.post('/:id', read_controller.post_read);

//read delete route.  preps to delete blog post with id match
router.get('/delete/:id', read_controller.get_delete_post);

//read delete comment route.  preps to delete blog comment with id match
router.get('/delete/comment/:id', read_controller.get_delete_comment);

//read bookmark route.  preps to bookmark a blog post
router.get('/bookmark/:id', read_controller.get_bookmark);

//read bookmark route.  removes a bookmark
router.get('/bookmark/remove/:id', read_controller.get_delete_bookmark);


module.exports = router;