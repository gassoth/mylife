exports.up = function(knex) {
    return Promise.all([
        knex.schema.alterTable('posts', function(table){
          table.timestamp('date_posted', { useTz: true }).notNullable().alter();
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.alterTable('posts', function(table){
          table.timestamp('date_posted', { useTz: false }).notNullable().alter();
        })
    ])
};
