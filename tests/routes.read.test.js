const request = require('supertest')
const app = require('../app')
var Account = require('../db/models/account.js');
var Post = require('../db/models/posts.js');
var Comment = require('../db/models/comments.js');
const { convertHtmlToDelta } = require('node-quill-converter');


var server = request.agent(app);
var server2 = request.agent(app);
var bcrypt = require('bcryptjs');


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
        email_enabled: 1
    }
    let user2 = {
        email: 'jjjj@email.com',
        password: bcrypt.hashSync('password', 10),
        permission: 0,
        generated_username: 'tub tub',
        date_created: currentdate,
        about: 'some test words yo',
        last_logged: currentdate,
        email_enabled: 0
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

async function initializePostDatabase() {
    var currentdate = new Date().toISOString(); 
    let p = {
            title: 'das boot',
            body_delta: convertHtmlToDelta('<p>we in here</p>').toString(),
            body_html: '<p>we in here</p>',
            date_posted: currentdate,
            author: 'hot tub',
            visibility: 0,
            id_account: 1,
            tags: ''
    }
    let p2 = {
        title: 'das boot boot',
        body_delta: convertHtmlToDelta('<p>we in here</p>').toString(),
        body_html: '<p>we in here</p>',
        date_posted: currentdate,
        author: 'hot tub',
        visibility: 0,
        id_account: 1,
        tags: ''
    }
    const insert = await Post.query().insert(p);
    const insert2 = await Post.query().insert(p2);
}

async function clearPostDatabase() {
    const deletePost = await Post.query().deleteById(1);
    const deletePost2 = await Post.query().deleteById(2);
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

async function initializeBookmarkDatabase() {
    const post = await Post.query().findById(1);
    const acct = await Account.query().findById(1);
    await acct.$relatedQuery('bookmarks').relate(post);
}

async function clearBookmarkDatabase() {
    const acct = await Account.query().findById(1);
    await acct.$relatedQuery('bookmarks').unrelate().where({id_post: 1});
}

beforeAll(async () => {
    const accountKnex = Account.knex();
    await accountKnex.raw('TRUNCATE TABLE account RESTART IDENTITY CASCADE');
    await accountKnex.raw('TRUNCATE TABLE posts RESTART IDENTITY CASCADE');
    await accountKnex.raw('TRUNCATE TABLE comments RESTART IDENTITY CASCADE');

    return await initializeAccountDatabase(),await initializePostDatabase(), await initializeCommentDatabase(), await initializeBookmarkDatabase();
  });

afterAll(async () => {
    return await clearBookmarkDatabase(),await clearAccountDatabase(),await clearPostDatabase(), await clearCommentDatabase();
});

function loginUser() {
    return function(done) {
        server
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
    return function(done) {
        server2
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

describe('Read route endpoints', () => {
    it('404 for post not found', async () => {
        const res = await request(app)
            .get('/read/100')
        expect(res.statusCode).toEqual(404);
    });
    it('login', loginUser());
    it('should get post since it exists and user logged in', async () => {
        const res = await server
        .get('/read/1')
        expect(res.statusCode).toEqual(200);
    });
    it('should get 403 error since user not logged in', async () => {
        const res = await request(app)
        .get('/read/1')
        expect(res.statusCode).toEqual(403);
    });
    it('should not post comment and instead redirect since not logged in', async () => {
        const res = await request(app)
            .post('/read/1')
            .send({ 
                comment: 'test comment'
            })
        expect(res.statusCode).toEqual(302);
        const comment = await Comment.query().findById(2);
        expect(comment).toBeUndefined();
    });
    it('should post comment since logged in', async () => {
        const res = await server
            .post('/read/1')
            .send({ 
                comment: 'test comment'
            })
        expect(res.statusCode).toEqual(302);
        const comment = await Comment.query().findById(2);
        expect(comment).toBeDefined();
    });
    it('login second user', loginUserTwo());
    it('should attempt to delete post but fail since not logged in', async () => {
        const res = await request(app)
            .get('/read/delete/1')
        expect(res.statusCode).toEqual(404);
    });
    it('should attempt to delete post but fail since not have permissions', async () => {
        const res = await server2
            .get('/read/delete/2')
        expect(res.statusCode).toEqual(403);
    });
    it('should delete post successfully', async () => {
        const res = await server
            .get('/read/delete/2')
        expect(res.statusCode).toEqual(302);
        const post = await Post.query().findById(2);
        expect(post).toBeUndefined();
    });
    it('should attempt to delete comment but fail since not logged in', async () => {
        const res = await request(app)
            .get('/read/delete/comment/1')
        expect(res.statusCode).toEqual(404);
        const comment = await Comment.query().findById(1);
        expect(comment).toBeDefined();
    });
    it('should attempt to delete comment but fail since not have permissions', async () => {
        const res = await server2
            .get('/read/delete/comment/1')
        expect(res.statusCode).toEqual(403);
        const comment = await Comment.query().findById(1);
        expect(comment).toBeDefined();
    });
    it('should delete comment successfully', async () => {
        const res = await server
            .get('/read/delete/comment/1')
        expect(res.statusCode).toEqual(302);
        const comment = await Comment.query().findById(1);
        expect(comment).toBeUndefined();
    });
    it('should attempt to bookmark but not logged in', async () => {
        const res = await request(app)
            .get('/read/bookmark/1')
        expect(res.statusCode).toEqual(404);
    });
    it('should attempt to bookmark but already bookmarked', async () => {
        const res = await server
            .get('/read/bookmark/1')
        const post = await Post.query().findById(1);
        var bookmarks = await post.$relatedQuery('bookmarks');
        expect(res.statusCode).toEqual(302);
        expect(bookmarks.length).toEqual(1);
    });
    it('should attempt to bookmark and succeed', async () => {
        const res = await server2
            .get('/read/bookmark/1')
        const post = await Post.query().findById(1);
        var bookmarks = await post.$relatedQuery('bookmarks');
        expect(res.statusCode).toEqual(302);
        expect(bookmarks.length).toEqual(2);
    });
    it('should attempt to unbookmark', async () => {
        const res = await server
            .get('/read/bookmark/remove/1')
        expect(res.statusCode).toEqual(302);
        const post = await Post.query().findById(1);
        var bookmarks = await post.$relatedQuery('bookmarks');
        expect(bookmarks.length).toEqual(1);

    });
})
