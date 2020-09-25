//feed route
var express = require('express');
var router = express.Router();

//Require feed controller modules
var feed_controller = require('../controllers/feedController.js');

//Get feed route
router.get('/:pageNum', feed_controller.get_feed);

module.exports = router;