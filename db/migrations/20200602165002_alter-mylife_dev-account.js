
exports.up = function(knex) {
    return Promise.all([
        knex.schema.alterTable('account', function(table){
            table.renameColumn('emailEnabled', 'email_enabled');
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.alterTable('account', function(table){
            table.renameColumn('email_enabled', 'emailEnabled');
        })
    ])
};
