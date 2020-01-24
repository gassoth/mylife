//feed route
var express = require('express');
var router = express.Router();

//Require login controller modules
var feed_controller = require('../controllers/feedController.js');

//Get feed route
router.get('/', feed_controller.get_feed);

module.exports = router;