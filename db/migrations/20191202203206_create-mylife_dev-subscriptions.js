exports.up = function(knex) {
    return Promise.all([
        knex.schema.createTable('subscriptions', function(table){
          table.increments('id').primary();
          table.timestamp('date_subscribed').notNullable();
          table.integer('id_subscriber').references('id').inTable('account').notNullable().onDelete('CASCADE');
          table.integer('id_subscribed').references('id').inTable('account').notNullable().onDelete('CASCADE');
        })
    ])  
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.dropTable('subscriptions')
    ])
};
