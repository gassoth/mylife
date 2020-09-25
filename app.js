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
var feedRouter = require('./routes/feed');
var writeRouter = require('./routes/write');
var readRouter = require('./routes/read');
const passport = require('passport');
var session = require('express-session');
const flash = require('connect-flash');
const { Model } = require('objection');
var schedule = require('node-schedule');

//Sends daily email and updates email
const emailer = require('./emailer.js');

//Used for database stuff.
const Knex = require('knex');
const knexConfig = require('./knexfile');
const knex = Knex(knexConfig.development);
// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
Model.knex(knex);

//init app
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//setup the app for logging, sass compilation
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
//app.use(express.static(path.join(__dirname, 'public')));
app.use( express.static( "public" ) );


//passport config uses simple user/pass auth.  Detailed in passport.js
//Creates session, flassh used for error messages, and then starts session for a user.
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

//routes for index and login page
app.use('/', indexRouter);
app.use('/login', loginRouter);

//profile page route
app.use('/profile', profileRouter);

//feed page route
app.use('/feed', feedRouter);

//write page route
app.use('/write', writeRouter);

//read page route
app.use('/read', readRouter);

//logout route redirects home at logout
app.get('/logout',
	function(req, res) {
	    req.logout();
	    res.redirect('/');
  });

//scheduler to run send email function once a day, and a rule to check emails once an hour
var ruleCheck = new schedule.RecurrenceRule();
var ruleSend = new schedule.RecurrenceRule();
ruleSend.minute = 45;
ruleCheck.minute = 15;

var getUnreadEmails = schedule.scheduleJob(ruleCheck, emailer.getUnread);
var sendEmails = schedule.scheduleJob(ruleSend, emailer.sendEmail);

app.get('/testunread', emailer.getUnread);
app.get('/testsend', emailer.sendEmail);

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
  //console.log(err);
  res.render('errorpage');
});

module.exports = app;
