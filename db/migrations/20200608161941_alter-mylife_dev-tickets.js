
exports.up = function(knex) {
    return Promise.all([
        knex.schema.alterTable('tickets', function(table){
          table.timestamp('date_created', { useTz: true });
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.alterTable('tickets', function(table){
          table.dropColumn('date_created');
        })
    ])
};
