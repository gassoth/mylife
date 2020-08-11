const faker = require('faker');
var bcrypt = require('bcryptjs');

const createFakeUser = () => ({
  email: faker.internet.email(),
  password: bcrypt.hashSync('password', 10),
  permission: 0,
  generated_username: faker.hacker.adjective() + " " + faker.hacker.noun(),
  date_created: faker.date.recent(100),
  about: faker.lorem.paragraph(),
  last_logged: faker.date.recent(10),
  email_enabled: 0

})


exports.seed = async function(knex) {
  // Deletes ALL existing entries
  return knex('account').del().then(await knex.raw('TRUNCATE TABLE account RESTART IDENTITY CASCADE'))
    .then(function () {
      // Inserts seed entries
      const fakeUsers = [];
      const desiredFakeUsers = 15;
      for (let i = 0; i < desiredFakeUsers; i++) {
        fakeUsers.push(createFakeUser());
      }
      return knex("account").insert(fakeUsers);
    });
};
