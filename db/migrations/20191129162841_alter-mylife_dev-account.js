exports.up = function(knex) {
    return Promise.all([
        knex.schema.alterTable('account', function(table){
          table.timestamp('date_created', { useTz: true }).notNullable().alter();
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.alterTable('posts', function(table){
          table.timestamp('date_created', { useTz: false }).notNullable().alter();
        })
    ])
};
