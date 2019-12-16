//CURRENT STATUS
//28-nov login and logout working, but needs to be tested.  also need to add error messages and try catches or something along with some comments
//tests for creating accounts.



//requires
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var sassMiddleware = require('node-sass-middleware');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var loginRouter = require('./routes/login');
var profileRouter = require('./routes/profile');
const passport = require('passport');
var session = require('express-session');
const flash = require('connect-flash');
const { Model } = require('objection');

const Knex = require('knex');
const knexConfig = require('./knexfile');
const knex = Knex(knexConfig.development);
// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
Model.knex(knex);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: false, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use( express.static( "public" ) );


//passport config
require('./passport.js')(passport);
//Warning The default server-side session storage, MemoryStore, 
//is purposely not designed for a production environment. It will 
//leak memory under most conditions, does not scale past a single process, and is meant for debugging and developing.
app.use(session({
    secret: 'stick lick the pick',
    resave: true,
    saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

//routes
app.use('/', indexRouter);
app.use('/login', loginRouter);

//users just used for debugging, remove later
app.use('/users', usersRouter);

//profile
app.use('/profile', profileRouter);

//logout route
app.get('/logout',
	function(req, res) {
	    req.logout();
	    res.redirect('/');
	});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
