const faker = require('faker');
const { Model } = require('objection');
const Knex = require('knex');
const knexConfig = require('../../../knexfile');
const knex = Knex(knexConfig.test);
Model.knex(knex);

async function createFakeComment() {
  let accountId = faker.random.number({min: 1, max: 15});
  let commentAuthor = await knex('account').where('id',accountId).select('generated_username');

  const comment = {
  author: commentAuthor[0].generated_username,
  date_posted: faker.date.recent(15),
  id_account: accountId,
  body: faker.lorem.sentences(2),
  id_posts: faker.random.number({min: 1, max: 50})
  }
  return comment;
}

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  return knex('comments').del().then(await knex.raw('TRUNCATE TABLE comments RESTART IDENTITY CASCADE'))
    .then(async function () {
      // Inserts seed entries
      const fakeComments = [];
      const desiredFakeComments = 50;
      for (let i = 0; i < desiredFakeComments; i++) {
        const comment = await createFakeComment();
        fakeComments.push(comment);
      }
      return knex("comments").insert(fakeComments);
    });
};
