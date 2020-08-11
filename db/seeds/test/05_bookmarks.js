const faker = require('faker');

const createFakeBookmark = () => ({
  id_post: faker.random.number({min: 1, max: 50}),
  id_account: faker.random.number({min: 1, max: 15})
})

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  return knex('bookmarks').del().then(await knex.raw('TRUNCATE TABLE bookmarks RESTART IDENTITY CASCADE'))
    .then(function () {
      // Inserts seed entries
      const fakeBookmarks = [];
      const desiredFakeBookmarks = 30;
      for (let i = 0; i < desiredFakeBookmarks; i++) {
        fakeBookmarks.push(createFakeBookmark());
      }
      return knex("bookmarks").insert(fakeBookmarks);
    });
};
