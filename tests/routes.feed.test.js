const request = require('supertest')
const app = require('../app')
var Account = require('../db/models/account.js');
var Post = require('../db/models/posts.js');
var Comment = require('../db/models/comments.js');
var bcrypt = require('bcryptjs');
var serverUserOne = request.agent(app);
var serverUserTwo = request.agent(app);
const { convertHtmlToDelta } = require('node-quill-converter');
const { raw } = require('objection');

async function initializeAccountDatabase() {
  var currentdate = new Date().toISOString();
  let user = {
    email: 'jjj@email.com',
    password: bcrypt.hashSync('password', 10),
    permission: 0,
    generated_username: 'hot tub',
    date_created: currentdate,
    about: 'some test words yo',
    last_logged: currentdate,
    email_enabled: 1,
    tz_preference: 7
  }
  let user2 = {
    email: 'jjjj@email.com',
    password: bcrypt.hashSync('password', 10),
    permission: 0,
    generated_username: 'tub tub',
    date_created: currentdate,
    about: 'some test words yo',
    last_logged: currentdate,
    email_enabled: 0,
    tz_preference: 7
  }
  const insert = await Account.query().insert(user);
  const insert2 = await Account.query().insert(user2);

  return insert;
}

async function clearAccountDatabase() {
  const deleteAcct = await Account.query().deleteById(1);
  const deleteAcct2 = await Account.query().deleteById(2);

  return deleteAcct;
}

async function updateTags(tags, id) {
  for (let i = 0; i < tags.length; i++) {
    const insertedTag = await Post.query().findById(id).patch({
      tags: raw('array_append("tags", ?)', [tags[i]])
    });
  }
}

async function initializePostDatabase() {
  var currentdate = new Date().toISOString();
  var weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let p = {
    title: 'das boot',
    body_delta: convertHtmlToDelta('<p>we in here</p>').toString(),
    body_html: '<p>we in here</p>',
    date_posted: currentdate,
    author: 'hot tub',
    visibility: 1,
    id_account: 1,
    tags: [],
    body: 'we in here'
  }
  let p2 = {
    title: 'das boot 2',
    body_delta: convertHtmlToDelta('<p>we in here</p>').toString(),
    body_html: '<p>we in here</p>',
    date_posted: currentdate,
    author: 'hot tub',
    visibility: 1,
    id_account: 1,
    tags: ['red', 'cherry', 'rum'],
    body: 'we in here'
  }
  let p3 = {
    title: 'das boot 3',
    body_delta: convertHtmlToDelta('<p>we in here</p>').toString(),
    body_html: '<p>we in here</p>',
    date_posted: currentdate,
    author: 'hot tub',
    visibility: 0,
    id_account: 1,
    tags: ['blue', 'cherry', 'rum'],
    body: 'we in here'
  }
  let p4 = {
    title: 'das boot 4',
    body_delta: convertHtmlToDelta('<p>we in here</p>').toString(),
    body_html: '<p>we in here</p>',
    date_posted: weekAgo,
    author: 'tub tub',
    visibility: 1,
    id_account: 2,
    tags: ['green', 'cherry', 'rum'],
    body: 'we in here'
  }
  let p5 = {
    title: 'das boot 5',
    body_delta: convertHtmlToDelta('<p>we in here</p>').toString(),
    body_html: '<p>we in here</p>',
    date_posted: currentdate,
    author: 'tub tub',
    visibility: 1,
    id_account: 2,
    tags: ['white', 'cherry', 'rum'],
    body: 'we in here'
  }

  const insert = await Post.query().insert(p);
  const insert2 = await Post.query().insert(p2);
  const insert3 = await Post.query().insert(p3);
  const insert4 = await Post.query().insert(p4);
  const insert5 = await Post.query().insert(p5);
  await updateTags(['black', 'cherry', 'rum'], 1), await updateTags(['white', 'cherry', 'rum'], 2),
    await updateTags(['red', 'cherry', 'rum'], 3), await updateTags(['blue', 'cherry', 'rum'], 4), await updateTags(['green', 'cherry', 'rum'], 5)

}

async function clearPostDatabase() {
  const deletePost = await Post.query().deleteById(1);
  const deletePost2 = await Post.query().deleteById(2);
  const deletePost3 = await Post.query().deleteById(3);
  const deletePost4 = await Post.query().deleteById(4);
  const deletePost5 = await Post.query().deleteById(5);
}

async function initializeBookmarkDatabase() {
  const post = await Post.query().findById(4);
  const acct = await Account.query().findById(1);
  await acct.$relatedQuery('bookmarks').relate(post);
}

async function clearBookmarkDatabase() {
  const acct = await Account.query().findById(1);
  await acct.$relatedQuery('bookmarks').unrelate().where({ id_post: 1 });
}

async function initializeReadDatabase() {
  const post = await Post.query().findById(4);
  const acct = await Account.query().findById(1);
  await acct.$relatedQuery('read').relate(post);
}

async function clearReadDatabase() {
  const acct = await Account.query().findById(1);
  await acct.$relatedQuery('read').unrelate().where({ id_posts: 1 });
}


async function initializeSubscribeDatabase() {
  const acctOne = await Account.query().findById(1);
  var currentdate = new Date().toISOString();
  await acctOne.$relatedQuery('subscriber').relate({ id: 2, date_subscribed: currentdate });
}

async function clearSubscribeDatabase() {
  const acct = await Account.query().findById(1);
  await acct.$relatedQuery('subscriber').unrelate().where({ id_subscribed: 2 });;
}

async function initializeCommentDatabase() {
  var currentdate = new Date().toISOString();
  let c = {
    author: 'hot tub',
    body: 'test comment',
    date_posted: currentdate,
    id_posts: 1,
    id_account: 1
  }
  const insert = await Comment.query().insert(c);
}

async function clearCommentDatabase() {
  const deletePost = await Comment.query().deleteById(1);
}

function loginUserOne() {
  return function (done) {
    serverUserOne
      .post('/login/')
      .send({ username: 'jjj@email.com', password: 'password' })
      .expect(302)
      .expect('Location', '/')
      .end(onResponse);

    function onResponse(err, res) {
      if (err) return done(err);
      return done();
    }
  };
};

function loginUserTwo() {
  return function (done) {
    serverUserTwo
      .post('/login/')
      .send({ username: 'jjjj@email.com', password: 'password' })
      .expect(302)
      .expect('Location', '/')
      .end(onResponse);

    function onResponse(err, res) {
      if (err) return done(err);
      return done();
    }
  };
};

beforeAll(async () => {
  const accountKnex = Account.knex();
  await accountKnex.raw('TRUNCATE TABLE account RESTART IDENTITY CASCADE');
  await accountKnex.raw('TRUNCATE TABLE posts RESTART IDENTITY CASCADE');
  await accountKnex.raw('TRUNCATE TABLE comments RESTART IDENTITY CASCADE');
  await accountKnex.raw('TRUNCATE TABLE bookmarks RESTART IDENTITY CASCADE');
  await accountKnex.raw('TRUNCATE TABLE subscriptions RESTART IDENTITY CASCADE');
  return await initializeAccountDatabase(), await initializePostDatabase(),
    await initializeSubscribeDatabase(), await initializeBookmarkDatabase(), await initializeCommentDatabase(), await initializeReadDatabase();
});

afterAll(async () => {
  return await clearReadDatabase(), await clearCommentDatabase(), await clearBookmarkDatabase(), await clearSubscribeDatabase(),
    await clearPostDatabase(), await clearAccountDatabase()
})

//seed description
//5 posts (first 3 by u1, last 2 by u2), 2 accts u1 and u2, u1 subscribed to u2, u1 read one of u2's posts, u1 bookmarked that read u2 post, u1 has 1 private post
describe('Feed Endpoints', () => {
  it('should get feed, test with allFlag = 1 (all posts) and return 4 posts because das boot 3 is private', async () => {
    const res = await request(app)
      .get('/feed/1')
    expect(res.text).toMatch('das boot')
    expect(res.text).toMatch('das boot 2')
    expect(res.text).not.toMatch('das boot 3')
    expect(res.text).toMatch('das boot 4')
    expect(res.text).toMatch('das boot 5')
    expect(res.statusCode).toEqual(200)
  });
  it('login user one', loginUserOne());
  it('login user two', loginUserTwo());
  it('test with allFlag = 1 (all posts) and return 5 posts because das boot 3 is private, but user 1 posted it and user 1 is viewing', async () => {
    const res = await serverUserOne
      .get('/feed/1')
    expect(res.text).toMatch('das boot')
    expect(res.text).toMatch('das boot 2')
    expect(res.text).toMatch('das boot 3')
    expect(res.text).toMatch('das boot 4')
    expect(res.text).toMatch('das boot 5')
    expect(res.statusCode).toEqual(200)
  });
  it('test with allFlag = 0 (unread posts) and should not return post 4 because u1 read post 4', async () => {
    const res = await serverUserOne
      .get('/feed/1?input_search=&sortFlag=0&allFlag=0&displayedPostsFlag=0')
    expect(res.text).toMatch('das boot<')
    expect(res.text).not.toMatch('das boot 4')
    expect(res.statusCode).toEqual(200)
  });
  it('test allFlag = 0, should return 4 posts because not logged in user has not read any posts', async () => {
    const res = await request(app)
      .get('/feed/1?input_search=&sortFlag=0&allFlag=0&displayedPostsFlag=0')
    expect(res.text).toMatch('das boot')
    expect(res.text).toMatch('das boot 2')
    expect(res.text).not.toMatch('das boot 3')
    expect(res.text).toMatch('das boot 4')
    expect(res.text).toMatch('das boot 5')
    expect(res.statusCode).toEqual(200)
  });
  it('test with displayedPostsFlag=1 (bookmark) and return 1 post bc u1 bookmarked post 4', async () => {
    const res = await serverUserOne
      .get('/feed/1?input_search=&sortFlag=0&allFlag=1&displayedPostsFlag=1')
    expect(res.text).not.toMatch('das boot<')
    expect(res.text).toMatch('das boot 4')
    expect(res.statusCode).toEqual(200)
  });
  it('test with displayedPostsFlag=1 (bookmark) and allFlag=0 (unread) to return no posts bc no bookmarked posts unread', async () => {
    const res = await serverUserOne
      .get('/feed/1?input_search=&sortFlag=0&allFlag=0&displayedPostsFlag=1')
    expect(res.text).not.toMatch('das boot')
    expect(res.statusCode).toEqual(200)
  });
  it('test with displayedPostsFlag=1 (bookmark) to return no posts bc u2 never bookmarked any posts', async () => {
    const res = await serverUserTwo
      .get('/feed/1?input_search=&sortFlag=0&allFlag=1&displayedPostsFlag=1')
    expect(res.text).not.toMatch('das boot')
    expect(res.statusCode).toEqual(200)
  });
  it('test with displayedPostsFlag=2 (subscribed) to return 2 posts bc u1 subscribed to u2', async () => {
    const res = await serverUserOne
      .get('/feed/1?input_search=&sortFlag=0&allFlag=1&displayedPostsFlag=2')
    expect(res.text).toMatch('das boot 4')
    expect(res.text).toMatch('das boot 5')
    expect(res.statusCode).toEqual(200)
  });
  it('test with displayedPostsFlag=2 (subscribed) to return 1 posts bc u1 subscribed to u2 and u1 has only read p4 but not p5', async () => {
    const res = await serverUserOne
      .get('/feed/1?input_search=&sortFlag=0&allFlag=0&displayedPostsFlag=2')
    expect(res.text).not.toMatch('das boot 4')
    expect(res.text).toMatch('das boot 5')
    expect(res.statusCode).toEqual(200)
  });
  it('search query cherry rum returns 4 visible posts', async () => {
    const res = await request(app)
      .get('/feed/1?input_search=cherry+rum&sortFlag=0&allFlag=1&displayedPostsFlag=0')
    expect(res.text).toMatch('das boot')
    expect(res.text).toMatch('das boot 2')
    expect(res.text).not.toMatch('das boot 3')
    expect(res.text).toMatch('das boot 4')
    expect(res.text).toMatch('das boot 5')
    expect(res.statusCode).toEqual(200)
  });
  it('search query black cherry rum or blue cherry returns 2 visible posts', async () => {
    const res = await request(app)
      .get('/feed/1?input_search=black+cherry+rum+or+blue+cherry+rum&sortFlag=0&allFlag=1&displayedPostsFlag=0')
    expect(res.text).toMatch('das boot')
    expect(res.text).not.toMatch('das boot 2')
    expect(res.text).not.toMatch('das boot 3')
    expect(res.text).toMatch('das boot 4')
    expect(res.text).not.toMatch('das boot 5')
    expect(res.statusCode).toEqual(200)
  });
  it('search query black and cherry or blue cherry returns 2 visible posts', async () => {
    const res = await request(app)
      .get('/feed/1?input_search=black+and+cherry+or+blue+cherry+rum&sortFlag=0&allFlag=1&displayedPostsFlag=0')
    expect(res.text).toMatch('das boot')
    expect(res.text).not.toMatch('das boot 2')
    expect(res.text).not.toMatch('das boot 3')
    expect(res.text).toMatch('das boot 4')
    expect(res.text).not.toMatch('das boot 5')
    expect(res.statusCode).toEqual(200)
  });
  it('should get feed error', async () => {
    const res = await request(app)
      .get('/feed/')
    expect(res.statusCode).toEqual(404)
  });
})
