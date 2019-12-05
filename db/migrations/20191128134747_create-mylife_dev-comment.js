exports.up = function(knex) {
    return Promise.all([
        knex.schema.createTable('comments', function(table){
          table.increments('id').primary();
          table.string('author', 250).notNullable();
          table.text('body').notNullable();
          table.timestamp('date_posted').notNullable();
          table.integer('id_post').references('id').inTable('posts').notNullable().onDelete('CASCADE');
          table.integer('id_account').references('id').inTable('account').notNullable().onDelete('CASCADE');
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.dropTable('comments')
    ])
};