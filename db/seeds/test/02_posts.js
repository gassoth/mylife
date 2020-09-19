const faker = require('faker');
const { convertHtmlToDelta } = require('node-quill-converter');
const { Model } = require('objection');
const Knex = require('knex');
const knexConfig = require('../../../knexfile');
const knex = Knex(knexConfig.test);
Model.knex(knex);

async function createFakePost() {
  let postHtml = '<p>'+faker.lorem.paragraphs(2,'\n')+'</p>';
  let postDelta = convertHtmlToDelta(postHtml);
  let accountId = faker.random.number({min: 1, max: 15});
  let postAuthor = await knex('account').where('id',accountId).select('generated_username');

  const post = {
  title: faker.company.catchPhrase(),
  visibility: 1,
  author: postAuthor[0].generated_username,
  date_posted: faker.date.recent(100),
  id_account: accountId,
  tags: [faker.hacker.adjective(),faker.hacker.noun(),faker.hacker.adjective(),faker.hacker.noun()],
  body_delta: postDelta,
  body_html: postHtml,
  body: postHtml
  }
  return post;
}

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  return knex('posts').del().then(await knex.raw('TRUNCATE TABLE posts RESTART IDENTITY CASCADE'))
    .then(async function () {
      // Inserts seed entries
      const fakePosts = [];
      const desiredFakePosts = 50;
      for (let i = 0; i < desiredFakePosts; i++) {
        const post = await createFakePost();
        fakePosts.push(post);
      }
      return knex("posts").insert(fakePosts);
    });
};
