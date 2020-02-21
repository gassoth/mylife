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


module.exports = router;