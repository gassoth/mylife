//feed route
var express = require('express');
var router = express.Router();

//Require login controller modules
var write_controller = require('../controllers/writeController.js');

//Get feed route
router.get('/', write_controller.get_write);

module.exports = router;