//write route
var express = require('express');
var router = express.Router();

//Require write controller modules
var write_controller = require('../controllers/writeController.js');

//Get write route
router.get('/', write_controller.get_write);

//Get write route but edited
router.get('/:id', write_controller.get_edit);

//post edit write (edit blogpost)
router.post('/:id', write_controller.post_edit);

//post write (create blogpost)
router.post('/', write_controller.post_write);

//get edit tags page
router.get('/tags/:id', write_controller.get_tags);

//post edit tags page (add or remove tags)
router.post('/tags/:id', write_controller.post_tags);


module.exports = router;