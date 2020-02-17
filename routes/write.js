//write route
var express = require('express');
var router = express.Router();

//Require write controller modules
var write_controller = require('../controllers/writeController.js');

//Get write route
router.get('/', write_controller.get_write);

//post write (create blogpost)
router.post('/', write_controller.post_write);

module.exports = router;