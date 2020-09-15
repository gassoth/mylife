
exports.up = function(knex) {
    return Promise.all([
        knex.schema.alterTable('posts', function(table){
            table.text('body').notNullable().defaultTo('text');
        }),
        knex.schema.alterTable('posts', function(table){
            table.text('body').notNullable().alter();
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.alterTable('posts', function(table){
            table.dropColumn('body');
        })
    ])
};
