
exports.up = function(knex) {
    return Promise.all([
        knex.schema.createTable('tickets', function(table){
          table.increments('id').primary();
          table.string('email').notNullable();
          table.string('ticket_code').notNullable();
          table.unique(['email','ticket_code']);
          table.index(['email','ticket_code'], 'ticket_index');
          table.integer('id_account').references('id').inTable('account').notNullable().onDelete('CASCADE');
        })
    ])  
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.dropTable('tickets')
    ])
};
