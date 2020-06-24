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

//users just used for debugging, remove later
app.use('/users', usersRouter);

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
ruleSend.hour = 16;
ruleSend.minute = 30;
ruleCheck.minute = 0;
var getUnreadEmails = schedule.scheduleJob(ruleCheck, emailer.getUnread);
var sendEmails = schedule.scheduleJob(ruleSend, emailer.sendEmail);

//var rule = new schedule.RecurrenceRule();
//rule.second = 30;
//var test = schedule.scheduleJob(ruleSend, emailer.scheduleTest);

//test email functions
app.get('/testemail', emailer.getLabels);
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
  res.render('error');
});

module.exports = app;

//TODO - potential automated unit tests maybe for like jenkins or smoething
//passwords match in authentication
//check the various test cases in the create user form like checking if an object is returned, or if syntax is correct when getting a username, database returns a user
//profile throws an error if you try to put a letter in the database query that checks for an id
//maybe possible to unit test a view?  profile.ejs has logic checking if a user is logged in or if a user is the currently viewed profile
//test logic that checks if user is logged in in general


/*
<!--
add permissions functionality
update user so that post shows up in history
update user so comments shows up in history
-->
<!--edit post
    stretch: referrer so that you can only get to write from the edit button.
    stretch: edit button location
    later: edit quill toolbaar
-->
<!--post comment
later: styling for comments and post page in general
stretch: reply to comments
-->

//current status
<!--
user functionality
user can delete own posts/comments - done but not auto tested
user can view posts/comments - untested
ensure other users cannot see private post  - untested
update counts on profile page - untested
allow superuser to delete/view post/comments - untested
allow superuser to edit comments - untested
add to subscription db - untested
add to read db - untested
bug -     err http headers when loading list of comments and list of posts for a user - fixed, untested
bug - private posts breaks lists of posts - fixed, untested
need to add profile pic editing lol - done, not tested
update profile pics on front end - done not tested

later - add to read db - probably a cleaner way to do this part other than throwing random exceptions.   look into it.
profile options

-->

<!--
feed functionality
tags - maybe need to add it when user actually posts, and then have way to add it after - done but not auto tested

display all posts  - done, untested
  -pagination - done, but not sure if this is best way to implement.  we'll see once we start working on tabs.
    implemented server side i think - done, not tested
    next page and previous page - done, not tested

implement bookmarking - done, untested
  -todo - add a page that says bookmarked already error

tabs - done but untested
  -comments
  -views
  -date

filters - done but untested
  -read/unread
  -subs
  -bookmarked

integrate into template - done but untested
  -tabs and filters

search tags
  -string parse - done but untested, 
  -delete tags, move them into posts as an array
    -make sure it is still possible to add and remove tags and all that - done but not auto tested
  -bin index - done but untested
  -integrate string parse to the database. - done but untested
 - fast search searches by tags - done but unteseted
-->

<!--
    bug
    write form doesn't actually autopopulate fields when it doesn't pass db check - untested
    spaces between lines of letters in reading post
    bug -     write form not autopopulating edits -partially done - need solution filling (save users progress? grab old post? different errors might need different results)
      -private vs public not autopopulated
    had some issues with all/unread/subs/bookmarked functionality.  wasn't working when not logged in (which is intended) but i thought it was a bug.  maybe
      need a way to clearly mark that you gotta login for it. - done but untested
    post tag - no check if user is logged in (for pretty mmuch any post request).
      

later - in relation to tabs filters and sorts
  -do not display private posts/ maybe display your own posts?
  -stretch is have page numbers.  difficult bc i dont know how many pages ill have/how to template it.
  TODO - feedSort and feedFilter need testing and error handling

later - search
  -stretch is full text search

-->
<!---->




<!--technical debt
styling - maybe try to put it into style sheets
unit testing - maybe figure out how to do that + automated testing
-->*/

//read how to handle gmail api promises and returns stackoverflow..
//create an async get all gmail emails..
//create async get unread emails that also sets emails to read - done sans async
//create function that interacts with db using the unread emails - done

//create tickets table and also add field to users that sets to email or not email and ability to turn on and off - done, not tested
  //requires a settings page - done, not tested
//need a function that parses the first message of email thread, not the reply part. - done, not tested

//create function that sends emails once a day and adds tickets - done but untested
//modify add to db function with tickets (see the bottom part titled tickets table) - done but untested
//implement scheduler
//need to add strategic logging messages and clean up the code a little bit.

//stretch - add function that adds "Last month today/last year today/ last week today type message to send emails."

/*
tickets table
email of user + 8 char code
tickets are generated every time email is sent
  need to confirm it is possible to send an email and set reply email using code - done, it is possible

user responds to email that is sent
  get users email + the reply code, search tickets table - done, not tested
    if found, post to db.  if not found, discard (it just logs error) - done, not tested
      concerns are if user replies to email and it isn't found
      */