const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
var base64 = require('js-base64').Base64;
const simpleParser = require('mailparser').simpleParser;
var Check = require('./check');
var Posts = require('./db/models/posts.js');
var Account = require('./db/models/account.js');
var Tickets = require('./db/models/tickets.js');
var replyParser = require("node-email-reply-parser");

const { convertHtmlToDelta } = require('node-quill-converter');

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
  const {client_secret, client_id, redirect_uris} = credentials.installed;
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
  const gmail = google.gmail({version: 'v1', auth});
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

//Function to add email to database.
async function postMessage(email, parsedEmailObject) {
  let delta = convertHtmlToDelta(parsedEmailObject.body_html);
  let subject = email.subject;
  if (subject.includes("Re: ")) {
    subject = subject.split("Re: ")[1];
  }
  var newPost = {
    title: subject,
    body_delta: JSON.stringify(delta),
    body_html: parsedEmailObject.body_html,
    date_posted: parsedEmailObject.ticket_date.toISOString(),
    author: parsedEmailObject.from,
    visibility: 0,
    id_account: parsedEmailObject.id_account,
    tags: []
  };
  const insertedPost = await Posts.query().insert(newPost);
  return insertedPost;
}

//Function to get the html version of reply email.  This function does not work for double replies, so improvement for the future
//is to try to make this function work for double replies or at least check for double replies.
function getParsedHtmlEmail(parsed, htmlEmail) {
  //Gets the fragment that has the reply emails
  const htmlString = parsed.getFragments()[1].getContent();

  //Trims whitespace, splits based on \n, gets the first section of that (hopefully the line that say "You replied to this email on xx\yy\zz w.e")
  //then gets the first 20 characters (which are hopefully unique enough that it'll find the correct words).  This will be used
  //to split the html because that is the only part of the html that doesn't have html tags in it.
  const htmlStringSplitter = htmlString.trim().split("\n")[0].substring(0,20);

  //Splits the html email based on htmlStringSplitter, gets the first half, and then removes the whitespace and trims the trailing <p> tag.
  const htmlEmailSplit = htmlEmail.split(htmlStringSplitter)[0].trimRight().slice(0, -3);
  console.log(htmlStringSplitter);
  //If the original htmlEmail sent in equals the split htmlEmail (which means a match was not found) we just use the original htmlEmail
  //Means that user will need to edit it on their own once its posted.
  if (htmlEmailSplit === htmlEmail) {
    return htmlEmail;
  } else {
    return htmlEmailSplit;
  }
}


//Function to check emails against tickets.
async function checkUnreadAgainstTickets(emails) {
  if (emails.length == 0) {
    console.log('There are no unread emails');
    return;
  }
  //Parse code and email from the whole email and check that against the tickets table.  If we did delete something, we want to add the email to the 
  //database using that information (should store the ticket id_account before deletion).  If we dont delete anything, then we just do nothing. We
  //call the post message function to add it to the database as a post.
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const to = email.to;
    const from = email.from;
    const fromEmail = from.substring(
      from.lastIndexOf("<")+1,
      from.lastIndexOf(">")
    );
    const toEmail = to.substring(
      from.lastIndexOf("<")+1,
      from.lastIndexOf(">")
    );
    const ticketCode = to.substring(
      to.lastIndexOf("+")+1,
      to.lastIndexOf("@")
    );

    try {
      const ticket = await Tickets.query().select('id','id_account', 'date_created')
      .where('email', fromEmail)
      .where('ticket_code', ticketCode);
      const ticketIdAccount = ticket[0].id_account;
      const ticketDate = ticket[0].date_created;

      //found a way to more reliably strip out the original message.  Now just need to find a way to maybe get the reply line from that strip, and 
      //parse out the original message when it comes to html.
      const e = replyParser(email.text);
      const f = getParsedHtmlEmail(e, email.textAsHtml.trim());
      const message = e.getFragments()[0].getContent().trim();
      const ticketDeleted = await Tickets.query().deleteById(ticket[0].id);
      const parsedEmailObject = {
        body: message,
        body_html: f,
        from: fromEmail,
        ticket_date: ticketDate,
        id_account: ticketIdAccount
      }
      if (ticketDeleted == 1) {
        const postedMessage = await postMessage(email, parsedEmailObject);
        console.log(postedMessage);
      } else {
        throw new Error('No ticket found');
      }
    } catch (e) {
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
  checkUnreadAgainstTickets(unreadEmails);
}

//Function that creates an email in the format that gmail api can send.
function makeBody(to, from, subject, message) {
  var str = ["Content-Type: text/plain; charset=\"UTF-8\"\n",
      "MIME-Version: 1.0\n",
      "Content-Transfer-Encoding: 7bit\n",
      "to: ", to, "\n",
      "from: ", from, "\n",
      "subject: ", subject, "\n\n",
      message
  ].join('');

  var encodedMail = new Buffer(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
      return encodedMail;
}

//Function that uses the gmail api to send an email.
async function sendEmailFunction(gmailObj, email) {
  gmailObj.users.messages.send({
    userId: 'me',
    resource: {
      raw: email
    }
  }, function(err, response) {
    console.log(err || response);
  });
}

//Function to create the subject line.  Match function parses a timestamp string and gets the day, month, and year.  It then turns that into a string
//that can be used as the subject line.
function createSubject(dateObject) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var parts = dateObject.match(/(\d+)/g);
  const parsedTime = new Date(parts[0], parts[1]-1, parts[2]);
  const subject = monthNames[parsedTime.getMonth()] + " " + parsedTime.getDate() + ", " + parsedTime.getFullYear();
  return subject;
}

//Function to send emails to all users that have requested that they want emails.
async function emailUsersFunction(auth) {

  //Gets the users that have elected to receive emails.
  const gmail = google.gmail({ version: 'v1', auth });
  let users;
  try {
    users = await Account.query().select('email', 'id').where('email_enabled', 1);
  } catch (e) {
    console.log(e);
  }

  //Formats a message, creates a ticket with a unique ticket email+ticketCode that can be used to verify a response, and then
  //adds that ticket to the ticket table.  It then calls sendEmailFunction to send the email.
  const message = "How was your day today? Reply to this message with a journal entry and view your entry on the website! "
    +"If you would like to change the title of the journal post, just change the subject of the email.  Please make sure to not change the reply address!";
  const time = new Date().toISOString();
  const subject = createSubject(time);
  for (let i = 0; i < users.length; i++) {
    const ticketCode = [...Array(10)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
    let ticket = {
      email: users[i].email,
      id_account: users[i].id,
      ticket_code: ticketCode,
      date_created: time
    }
    try {
      ticketInsert = await Tickets.query().insert(ticket);
      let replyAddress = 'mylifejournalapp+'.concat(ticketCode).concat('@gmail.com');
      console.log(replyAddress);
      let email = makeBody(users[i].email, replyAddress, subject, message)
      let sent = await sendEmailFunction(gmail, email);
    } catch (e) {
      console.log(e);
    }
    console.log(ticketInsert);
  }
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
exports.getLabels = function(req, res, next) {
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Gmail API.
        authorize(JSON.parse(content), listLabels);
        res.redirect('/');
      });
  }

//Function used to get the unread emails and then set them as read.
exports.getUnread = function(req, res, next) {
    fs.readFile('credentials.json', async (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Gmail API.
        authorize(JSON.parse(content), getUnreadFunction);
      });
}

//Function used to test send emails
exports.sendEmail = function(req, res, next) {
    fs.readFile('credentials.json', async (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Gmail API.
        authorize(JSON.parse(content), emailUsersFunction);
      });
}

//Scheduler test function
exports.scheduleTest = function(req, res, next) {
  console.log('The answer to life, the universe, and everything!');
}
