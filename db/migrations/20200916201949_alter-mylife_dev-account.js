
exports.up = function(knex) {
    return Promise.all([
        knex.schema.alterTable('account', function(table){
            table.integer('tz_preference').notNullable().defaultTo(7);
        }),
        knex.schema.alterTable('account', function(table){
            table.integer('tz_preference').notNullable().alter();
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.alterTable('account', function(table){
            table.dropColumn('tz_preference');
        })
    ])
};
