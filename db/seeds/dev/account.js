exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('account').del()
    .then(function () {
      // Inserts seed entries
      return knex('account').insert([
          {id: 0, email: 'rowValue1@gmail.com', password: 'aaa', permission: 0, generated_username: 'aaa', date_created: '2001-09-29 00:00:00'},
          {id: 1, email: 'rowValue1@yahoo.com', password: 'bbb', permission: 0, generated_username: 'bbb', date_created: '2001-09-29 00:00:00'},
          {id: 2, email: 'rowValue1@hotmail.com', password: 'ccc', permission: 0, generated_username: 'ccc', date_created: '2001-09-29 00:00:00'}
      ]);
    });
};


