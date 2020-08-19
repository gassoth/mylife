const request = require('supertest')
const app = require('../app')
const faker = require('faker');
var Account = require('../db/models/account.js');
var bcrypt = require('bcryptjs');
var server = request.agent(app);

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
        email_enabled: 0
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

beforeAll(async () => {
    return await initializeAccountDatabase();
  });

afterAll(async () => {
    return await clearAccountDatabase();
});
  
describe('Profile Endpoints', () => {
    it('should get profile page', async () => {
        const res = await request(app)
            .get('/profile/1')
        expect(res.statusCode).toEqual(200)
    });
    it('should get error', async () => {
        const res = await request(app)
            .get('/profile/20')
        expect(res.statusCode).toEqual(404)
    });
    it('should get profile posts page (blank)', async () => {
        const res = await request(app)
            .get('/profile/posts/1/1')
        expect(res.statusCode).toEqual(200)
    });
    it('should get profile comments page (blank)', async () => {
        const res = await request(app)
            .get('/profile/comments/1/1')
        expect(res.statusCode).toEqual(200)
    });
    it('should redirect to home for profile settings since user not logged in', async () => {
        const res = await request(app)
            .get('/profile/settings/1')
        expect(res.statusCode).toEqual(302)
    });
    it('login', loginUser());
    it('should subscribe a user to a user', async () => {
        const res = await server
            .get('/profile/subscribe/2');
        expect(res.statusCode).toEqual(302);
        const newSub = await Account.query().findById(1);
        const newSubs = await newSub.$relatedQuery('subscriber');
        expect(newSubs.length).toEqual(1);
    });
    it('should get settings page since logged in', async () => {
        const res = await server
            .get('/profile/settings/1')
        expect(res.statusCode).toEqual(200)
    });
    it('should unsubscribe a user to a user', async () => {
        const res = await server
            .get('/profile/unsubscribe/2');
        expect(res.statusCode).toEqual(302);
        const newSub = await Account.query().findById(1);
        const newSubs = await newSub.$relatedQuery('subscriber');
        expect(newSubs.length).toEqual(0);
    });
})