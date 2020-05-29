const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
var base64 = require('js-base64').Base64;
const simpleParser = require('mailparser').simpleParser;
var Check = require('./check');
var Posts = require('./db/models/posts.js');
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

//Function to add email to database. Not done but it does add to db which is what i wanted
async function postMessage(emails) {
  let delta = convertHtmlToDelta(emails[0].textAsHtml);
  let time = new Date().toISOString();

  var newPost = {
    title: emails[0].subject,
    body_delta: JSON.stringify(delta),
    body_html: emails[0].textAsHtml,
    date_posted: emails[0].date.toISOString(),
    author: 'a@gmail.com',
    visibility: 0,
    id_account: 5,
    tags: []
  };
  const insertedPost = await Posts.query().insert(newPost);
  console.log(insertedPost);
}


//Function to check emails against tickets.  Not done.
function checkUnreadAgainstTickets(emails) {
  console.log(emails);  
  //postMessage(emails);
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
    console.log(e);
    return;
  }
  checkUnreadAgainstTickets(unreadEmails);
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
        res.redirect('/');
      });
}


//read how to handle gmail api promises and returns stackoverflow..
//create an async get all gmail emails..
//create async get unread emails that also sets emails to read - done sans async
//create function that interacts with db using the unread emails - done
//create tickets table and also add field to users that sets to email or not email
//implement scheduler
//create function that sends emails once a day
//modify add to db function with tickets 