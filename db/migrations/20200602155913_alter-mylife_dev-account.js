
exports.up = function(knex) {
    return Promise.all([
        knex.schema.alterTable('account', function(table){
            table.integer('emailEnabled').notNullable().defaultTo(0);
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.alterTable('account', function(table){
          table.dropColumn('emailEnabled');
        })
    ])
};
