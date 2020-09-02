const app = require('../app')
const request = require('supertest')
const emailer = require('../emailer')

describe('Emailer Endpoints', () => {
    it('should get index page', async () => {
        const res = await request(app)
            .get('/')
        expect(res.statusCode).toEqual(200)
    })
    it('should return string date subject', async () => {
        const d = new Date(2020, 5, 5, 0, 0, 0).toISOString();
        const subject = emailer.createSubject(d);
        expect(subject).toEqual('Jun 5, 2020')
    })
    it('should return email object', async () => {
        const to = 'you@you.com';
        const from = 'me@me.com';
        const subject = 'an email';
        const message = 'my message';
        const b = emailer.makeBody(to, from, subject, message);
        const emailStr = ["Content-Type: text/plain; charset=\"UTF-8\"\n",
        "MIME-Version: 1.0\n",
        "Content-Transfer-Encoding: 7bit\n",
        "to: ", to, "\n",
        "from: ", from, "\n",
        "subject: ", subject, "\n\n",
        message].join('');
        var encodedMail = new Buffer(emailStr).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
        expect(b).toEqual(encodedMail)
    })
})