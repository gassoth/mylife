const request = require('supertest')
const app = require('../app')
var Account = require('../db/models/account.js');
var Post = require('../db/models/posts.js');
const { convertHtmlToDelta } = require('node-quill-converter');


var server = request.agent(app);
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

beforeAll(async () => {
    const accountKnex = Account.knex();
    await accountKnex.raw('TRUNCATE TABLE account RESTART IDENTITY CASCADE');
    await accountKnex.raw('TRUNCATE TABLE posts RESTART IDENTITY CASCADE');
    return await initializeAccountDatabase();
  });

afterAll(async () => {
    return await clearAccountDatabase();
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

describe('Write route endpoints', () => {
    it('should redirect to login page bc tryna write without logged in', async () => {
        const res = await request(app)
            .get('/write')
        expect(res.statusCode).toEqual(302);
    });
    it('login', loginUser());
    it('should redirect to write page since user logged in', async () => {
        const res = await server
            .get('/write')
        expect(res.statusCode).toEqual(200);
    });
    it('should post a new post', async () => {
        const res = await server
            .post('/write')
            .send({
                title: 'quick brown fox',
                tags: 'tag',
                visibility: 0,
                htmlText: '<p>test post</p>',
                deltaText: convertHtmlToDelta('<p>test post</p>').toString(),
                stringText: 'test post'
            });
        expect(res.statusCode).toEqual(302);
        const newPost = await Post.query().findById(1);
        expect(newPost.title).toEqual('quick brown fox');
    });
    it('should get edit post page but not logged in', async () => {
        const res = await request(app)
            .get('/write/1')
        expect(res.statusCode).toEqual(302);
    });
    it('should get edit post page', async () => {
        const res = await server
            .get('/write/1')
        expect(res.statusCode).toEqual(200);
    });
    it('should get edit post page fail', async () => {
        const res = await server
            .get('/write/10')
        expect(res.statusCode).toEqual(404);
    });
    it('should edit a post', async () => {
        const res = await server
            .post('/write/1')
            .send({
                title: 'quick brown',
                visibility: 0,
                htmlText: '<p>test post</p>',
                deltaText: convertHtmlToDelta('<p>test post</p>').toString(),
                stringText: 'test post'
            });
        expect(res.statusCode).toEqual(302);
        const newPost = await Post.query().findById(1);
        expect(newPost.title).toEqual('quick brown');
    });
    it('should get tags page', async () => {
        const res = await server
            .get('/write/tags/1')
        expect(res.statusCode).toEqual(200);
    });
    it('should get tags page but fail since not logged in', async () => {
        const res = await request(app)
            .get('/write/tags/1')
        expect(res.statusCode).toEqual(403);
    });
})
