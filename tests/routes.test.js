const request = require('supertest')
const app = require('../app')
const faker = require('faker');
var Account = require('../db/models/account.js');
var bcrypt = require('bcryptjs');

beforeAll(async () => {
    const accountKnex = Account.knex();
    await accountKnex.raw('TRUNCATE TABLE account RESTART IDENTITY CASCADE');
});

afterAll(async () => {
    const accountKnex = Account.knex();
    await accountKnex.raw('TRUNCATE TABLE account RESTART IDENTITY CASCADE');
})

describe('Index Endpoints', () => {
    it('should get index page', async () => {
        const res = await request(app)
            .get('/')
        expect(res.statusCode).toEqual(200)
    })
})

describe('Login Endpoints', () => {
    it('should get login page', async () => {
        const res = await request(app)
            .get('/login/')
        expect(res.statusCode).toEqual(200);
    });
    it('should get login create user', async () => {
        const res = await request(app)
            .get('/login/create')
        expect(res.statusCode).toEqual(200);
    });
    it('should login user that does not exist', async () => {
        const res = await request(app)
            .post('/login/')
            .send({
                username: 'jj@email.com',
                password: 'passwordwordpass',
            });
        expect(res.header.location).toEqual('/login/');
    });
    it('should post new user', async () => {
        const res = await request(app)
            .post('/login/create')
            .send({
                username: 'jj@email.com',
                password: 'passwordwordpass',
                password_validate: 'passwordwordpass',
                timezones: 'US/Eastern'
            });
        expect(res.statusCode).toEqual(302);
        const newUser = await Account.query().findById(1);
        expect(newUser.email).toEqual('jj@email.com');
    });
    it('should login username too short', async () => {
        const res = await request(app)
            .post('/login/')
            .send({
                username: '',
                password: 'passwordwordpass',
            });
        expect(res.statusCode).toEqual(200);
    });
    it('should login password too short', async () => {
        const res = await request(app)
            .post('/login/')
            .send({
                username: 'jj@email.com',
                password: 'pp',
            });
            expect(res.statusCode).toEqual(200);
        });
    it('should login new user', async () => {
        const res = await request(app)
            .post('/login/')
            .send({
                username: 'jj@email.com',
                password: 'passwordwordpass',
            });
        expect(res.header.location).toEqual('/');
    });
    it('should fail posting new user because username empty', async () => {
        const res = await request(app)
            .post('/login/create')
            .send({
                username: '',
                password: 'passwordwordpass',
                password_validate: 'passwordwordpass'
            });
        expect(res.statusCode).toEqual(200);
        const newUser = await Account.query().findById(2);
        expect(newUser).toBeUndefined();
    });
    it('should fail posting new user because password short', async () => {
        const res = await request(app)
            .post('/login/create')
            .send({
                username: 'jj@email.com',
                password: 'p',
                password_validate: 'passwordwordpass'
            });
        expect(res.statusCode).toEqual(200);
        const newUser = await Account.query().findById(2);
        expect(newUser).toBeUndefined();
    });
    it('should fail posting new user because password_validate empty', async () => {
        const res = await request(app)
            .post('/login/create')
            .send({
                username: 'jj@email.com',
                password: 'passwordpass',
                password_validate: ''
            });
        expect(res.statusCode).toEqual(200);
        const newUser = await Account.query().findById(2);
        expect(newUser).toBeUndefined();
    });
    it('should fail posting new user because password and password_validate does not match', async () => {
        const res = await request(app)
            .post('/login/create')
            .send({
                username: 'jj@email.com',
                password: 'passwordpass',
                password_validate: 'passwordpassword'
            });
        expect(res.statusCode).toEqual(200);
        const newUser = await Account.query().findById(2);
        expect(newUser).toBeUndefined();
    });
    it('should fail posting new user because user exists', async () => {
        const res = await request(app)
            .post('/login/create')
            .send({
                username: 'jj@email.com',
                password: 'passwordpass',
                password_validate: 'passwordpass'
            });
        expect(res.statusCode).toEqual(200);
        const newUser = await Account.query().findById(2);
        expect(newUser).toBeUndefined();
    });
})