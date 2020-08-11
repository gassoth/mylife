const faker = require('faker');

function createFakeSubscription() {
  const subscriber = faker.random.number({min: 1, max: 15});
  let subscribed = subscriber;
  while (subscribed == subscriber) {
    subscribed = faker.random.number({min: 1, max: 15});
  }

  const subscription = {
    date_subscribed: faker.date.recent(5),
    id_subscriber: subscriber,
    id_subscribed: subscribed
  }

  return subscription;
}

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  return knex('subscriptions').del().then(await knex.raw('TRUNCATE TABLE subscriptions RESTART IDENTITY CASCADE'))
    .then(function () {
      // Inserts seed entries
      const fakeSubscriptions = [];
      const desiredFakeSubscriptions = 20;
      for (let i = 0; i < desiredFakeSubscriptions; i++) {
        fakeSubscriptions.push(createFakeSubscription());
      }
      return knex("subscriptions").insert(fakeSubscriptions);
    });
};
