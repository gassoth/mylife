var base64 = require('js-base64').Base64;
var Posts = require('./db/models/posts.js');
var Account = require('./db/models/account.js');
var Tickets = require('./db/models/tickets.js');
var replyParser = require("node-email-reply-parser");
const { convertHtmlToDelta } = require('node-quill-converter');
const { raw } = require('objection');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const simpleParser = require('mailparser').simpleParser;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  gmail.users.labels.list({
    userId: 'me',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const labels = res.data.labels;
    if (labels.length) {
      console.log('Labels:');
      labels.forEach((label) => {
        console.log(`- ${label.name}`);
      });
    } else {
      console.log('No labels found.');
    }
  });
}

//Initial timezone to send the email to (Starting at US EAST 6PM)
let tzCounter = 8;

//extracts re: from email subject
function extractReply(str) {
  var rx = /^.{0,3}:\s/g;
  var arr = rx.exec(str);
  return arr;
}

//Function to add email to database. Email is the email, parsedEmailObject is extra data from the ticket or from the email.
async function postMessage(email, parsedEmailObject) {
  let delta = convertHtmlToDelta(parsedEmailObject.body_html);
  let subject = email.subject;
  if (extractReply(subject) != null) {
    subject = subject.substring(4);
  }

  //creates the title and username tags for the post
  let tags = [subject, parsedEmailObject.generated_username];

  var newPost = {
    title: subject,
    body: parsedEmailObject.body,
    body_delta: JSON.stringify(delta),
    body_html: parsedEmailObject.body_html,
    date_posted: parsedEmailObject.ticket_date.toISOString(),
    author: parsedEmailObject.generated_username,
    visibility: 0,
    id_account: parsedEmailObject.id_account,
    tags: []
  };
  const insertedPost = await Posts.query().insertAndFetch(newPost);

  //insert tags
  for (let i = 0; i < tags.length; i++) {
    const insertedTag = await Posts.query().findById(insertedPost.id).patch({
      tags: raw('array_append("tags", ?)', [tags[i].toString().toLowerCase()])
    });
  }
  const finalInsertedPost = await Posts.query().findById(insertedPost.id);
  return finalInsertedPost;
}

//Function to get the html version of reply email. (Strip out the original email in the html email)
//Parsed is the parsed object using replyparser library, htmlEmail is the original htmlEmail.
function getParsedHtmlEmail(parsed, htmlEmail) {
  //Gets the original message from the full message
  const htmlString = parsed.getFragments()[1].getContent();

  //Trims whitespace, splits based on '\n' delimiter, gets the first section of that (hopefully the line that say "You replied to this email on xx\yy\zz w.e")
  //then gets the first 20 characters (which are hopefully unique enough that it'll find the correct words).  This will be used
  //to split the html because that is the only part of the html that doesn't have html tags in it.
  const htmlStringSplitter = htmlString.trim().split("\n")[0].substring(0, 20);

  //Splits the html email based on htmlStringSplitter, gets the first half, and then removes the whitespace and trims the trailing <p> tag.
  const htmlEmailSplit = htmlEmail.split(htmlStringSplitter)[0].trimRight().slice(0, -3);
  //If the original htmlEmail sent in equals the split htmlEmail (which means a match was not found) we just use the original htmlEmail
  //Means that user will need to edit it on their own once its posted.
  if (htmlEmailSplit === htmlEmail) {
    console.log("htmlEmail encountered an error and is returning the original htmlEmail");
    return htmlEmail;
  } else {
    console.log("Parsed htmlEmail with no errors");
    return htmlEmailSplit;
  }
}

//Function to check emails against tickets.
async function checkUnreadAgainstTickets(emails) {
  if (emails.length == 0) {
    console.log('There are no unread emails');
    return;
  }

  //Parse code and email from the whole email and check that against the tickets table.  If we did delete(found) a ticket, we want to add the email to the 
  //database using that information (should store the ticket id_account before deletion).  If we dont delete anything, then we just do nothing. We
  //call the post message function to add it to the database as a post.
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const to = email.to;
    const from = email.from;
    const fromEmail = from.substring(
      from.lastIndexOf("<") + 1,
      from.lastIndexOf(">")
    );
    const toEmail = to.substring(
      to.lastIndexOf("<") + 1,
      to.lastIndexOf(">")
    );
    const ticketCode = to.substring(
      to.lastIndexOf("+") + 1,
      to.lastIndexOf("@")
    );

    if (toEmail == 'mylifejournalapp@gmail.com') {
      continue;
    }

    try {
      //Gets ticket.  If ticket doesn't exist eventually error will occur and console will log it.
      const ticket = await Tickets.query().select('id', 'id_account', 'date_created')
        .where('email', fromEmail)
        .where('ticket_code', ticketCode);
      const ticketIdAccount = ticket[0].id_account;
      const ticketDate = ticket[0].date_created;

      //replyParser gives us only the reply email, specifically an object that uses getters to get specific emails from a chain and from there we can get the reply
      //Similarly, getParsedHtmlEmail gets us the html that corresponds to that reply email.
      const e = replyParser(email.text);

      //getParsedHtmlEmail takes in the reply email (e) and the html from the email (reply + original), then attempts to strip out the original from
      //the HTML version of the email.
      const f = getParsedHtmlEmail(e, email.textAsHtml.trim());
      const message = e.getFragments()[0].getContent().trim();
      const ticketDeleted = await Tickets.query().deleteById(ticket[0].id);
      const username = await Account.query().select('generated_username').findById(ticket[0].id_account);
      const parsedEmailObject = {
        body: message,
        body_html: f,
        from: fromEmail,
        ticket_date: ticketDate,
        id_account: ticketIdAccount,
        generated_username: username.generated_username
      }
      if (ticketDeleted == 1) {
        const postedMessage = await postMessage(email, parsedEmailObject);
        console.log(postedMessage);
      } else {
        throw new Error('No ticket found');
      }
    } catch (e) {
      console.log("Most likely email did not match format, so we want to ignore it or potentially save it for manual review.");
      console.log(email);
      console.log(e);
    }
  }
}

//Function to get unread emails and set them as read.
async function getUnreadFunction(auth) {

  //Query is unread emails.  
  var query = "is:unread";
  const gmail = google.gmail({ version: 'v1', auth });
  const g = await gmail.users.messages.list({
    userId: 'me',
    q: query
  });
  let unreadEmails = [];

  //If unread emails were found, we want to add those emails to unreadEmails and also set them as read.
  try {

    //Uses simpleparser to decode the raw email, set it as read, and parse the object then push it into unreadEmails.
    for (let i = 0; i < g.data.messages.length; i++) {
      const mail = await gmail.users.messages.get({
        userId: 'me',
        'id': g.data.messages[i].id,
        format: 'raw'
      });
      let parsed = await simpleParser(base64.decode(mail.data.raw));
      const makeRead = await gmail.users.messages.modify({
        userId: 'me',
        'id': g.data.messages[i].id,
        'addLabelIds': [],
        'removeLabelIds': ['UNREAD']
      });
      const parsedEmail = {
        date: parsed.date,
        subject: parsed.subject,
        to: parsed.to.text,
        from: parsed.from.text,
        text: parsed.text,
        textAsHtml: parsed.textAsHtml
      }
      unreadEmails.push(parsedEmail);
    }
    //If fail just log
  } catch (e) {
    if (e instanceof TypeError) {
      console.log(e);
      console.log('Most likely there were no unread emails, so we do not have to worry.');
      return;
    }
    console.log(e);
    return;
  }

  //Finally checks if these unread emails are messages to be posted
  if (unreadEmails.length != 0) {
    checkUnreadAgainstTickets(unreadEmails);
  }
  return unreadEmails;
}

//Function that creates an email in the format that gmail api can send.
exports.makeBody = function (to, from, subject, message) {
  var str = ["Content-Type: text/plain; charset=\"UTF-8\"\n",
    "MIME-Version: 1.0\n",
    "Content-Transfer-Encoding: 7bit\n",
    "to: ", to, "\n",
    "from: ", from, "\n",
    "subject: ", subject, "\n\n",
    message
  ].join('');

  var encodedMail = new Buffer.from(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
  return encodedMail;
}

//Function that uses the gmail api to send an email.
async function sendEmailFunction(gmailObj, email) {
  gmailObj.users.messages.send({
    userId: 'me',
    resource: {
      raw: email
    }
  }, function (err, response) {
    console.log(err || response);
  });
}

//Function to create the subject line.  Match function parses a timestamp string and gets the day, month, and year.  It then turns that into a string
//that can be used as the subject line in the format Month Day Year (Mar 5 2019)
exports.createSubject = function (dateObject) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var parts = dateObject.match(/(\d+)/g);
  const parsedTime = new Date(parts[0], parts[1] - 1, parts[2]);
  const subject = monthNames[parsedTime.getMonth()] + " " + parsedTime.getDate() + ", " + parsedTime.getFullYear();
  return subject;
}

//Function to send emails to all users that have requested that they want emails.
async function emailUsersFunction(auth) {

  //Gets the users that have elected to receive emails.
  const gmail = google.gmail({ version: 'v1', auth });
  let users;
  
  //Gets the users where in their timezone it is 6pm
  try {
    if (tzCounter == 0) {
      tzCounter = 23;
    } else {
      tzCounter -= 1;
    }
    users = await Account.query().select('email', 'id')
      .where('email_enabled', 1)
      .where('tz_preference', tzCounter);
  } catch (e) {
    console.log(e);
    return 0;
  }
  users = await Account.query().select('email', 'id')
    .where('email_enabled', 1)
  //Formats a message, creates a ticket with a unique ticket email+ticketCode that can be used to verify a response, and then
  //adds that ticket to the ticket table.  It then calls sendEmailFunction to send the email.
  const message = "How was your day today? Reply to this message with a journal entry and view your entry on the website! "
    + "If you would like to change the title of the journal post, just change the subject of the email.  Please make sure to not change the reply address!";
  const time = new Date();
  const subject = exports.createSubject(time.toISOString());
  for (let i = 0; i < users.length; i++) {
    const ticketCode = [...Array(10)].map(i => (~~(Math.random() * 36)).toString(36)).join('');
    let ticket = {
      email: users[i].email,
      id_account: users[i].id,
      ticket_code: ticketCode,
      date_created: time.toISOString()
    }

    //Adds a previously posted message to the user if it exists
    var lastWeek = new Date(time.getFullYear(), time.getMonth(), time.getDate() - 7);
    var lastWeekPlus = new Date(time.getFullYear(), time.getMonth(), time.getDate() - 6);
    var lastMonth = new Date(time.getFullYear(), time.getMonth() - 1, time.getDate());
    var lastMonthPlus = new Date(time.getFullYear(), time.getMonth() - 1, time.getDate() + 1);
    var lastYear = new Date(time.getFullYear() - 1, time.getMonth(), time.getDate());
    var lastYearPlus = new Date(time.getFullYear() - 1, time.getMonth(), time.getDate() + 1);
    const postsLastYear = await Posts.query().select('body', 'id', 'date_posted')
      .whereBetween('date_posted', [lastYear, lastYearPlus])
      .where('id_account', users[i].id);
    const postsLastMonth = await Posts.query().select('body', 'id', 'date_posted')
      .whereBetween('date_posted', [lastMonth, lastMonthPlus])
      .where('id_account', users[i].id);
    const postsLastWeek = await Posts.query().select('body', 'id', 'date_posted')
      .whereBetween('date_posted', [lastWeek, lastWeekPlus])
      .where('id_account', users[i].id);

    let p = '';
    let timePosted = '';
    if (postsLastYear.length != 0) {
      p = postsLastYear[0];
      timePosted = 'Last year on this day';
    } else if (postsLastMonth.length != 0) {
      p = postsLastMonth[0];
      timePosted = 'Last month on this day';
    } else if (postsLastWeek.length != 0) {
      p = postsLastWeek[0];
      timePosted = 'Last week on this day';
    } else {
      p = 'None';
    }
    console.log(p);
    let previousMessage = '';
    if (p != 'None') {
      previousMessage = '\n\nDo you remember this message? ' + timePosted + ' you posted this.\n\n' + p.body;
    }
    previousMessage = previousMessage + '\n\n' + 'Find your posts at localhost:3000/profile/' + users[i].id.toString();

    //Sends the final email
    try {
      ticketInsert = await Tickets.query().insert(ticket);
      let replyAddress = 'mylifejournalapp+'.concat(ticketCode).concat('@gmail.com');
      let email = exports.makeBody(users[i].email, replyAddress, subject, message + previousMessage)
      let sent = await sendEmailFunction(gmail, email);
    } catch (e) {
      console.log(e);
      return 0;
    }
    console.log(ticketInsert);
  }
  return 1;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
exports.getLabels = function (req, res, next) {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Gmail API.
    authorize(JSON.parse(content), listLabels);
    res.redirect('/');
  });
}

//Function used to get the unread emails and then set them as read.
exports.getUnread = function (req, res, next) {
  fs.readFile('credentials.json', async (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Gmail API.
    const time = new Date().toISOString();
    console.log('got unread' + time)
    authorize(JSON.parse(content), getUnreadFunction);
  });
}

//Function used to send emails
exports.sendEmail = function (req, res, next) {
  fs.readFile('credentials.json', async (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Gmail API.
    const time = new Date().toISOString();
    console.log('sent email' + time);
    authorize(JSON.parse(content), emailUsersFunction);
  });
}

//Send the email that contains the special url to reset
async function emailResetAccount(auth, user, hash) {
  try {
    //gmail obj
    const gmail = google.gmail({ version: 'v1', auth });
    //message
    const message = "You have requested a password reset.  Please click the link below to do so\n\n" + hash;
    const email = exports.makeBody(user, 'mylifejournalapp@gmail.com', 'Reset password for Mylife', message);
    const sent = await sendEmailFunction(gmail, email);
    return 1;
  } catch (e) {
    console.log(e);
    return 0;
  }
}

//Authenticates server to send email to user
exports.authResetEmail = function (credentials, user, hash) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client);
    oAuth2Client.setCredentials(JSON.parse(token));
    emailResetAccount(oAuth2Client, user, hash)
  });
}